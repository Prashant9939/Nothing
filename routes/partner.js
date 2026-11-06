const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { passwordPolicyError, BCRYPT_COST } = require('../lib/passwordPolicy');
const { getPartnerDetail } = require('../lib/partnerStats');
const { newReceiptNumber } = require('../lib/docNumbers');
const rzp = require('../lib/razorpay');
const { completePayment, paymentTimeLimitMinutes, expireIfDue, createOrderForPayment } = require('../lib/payments');

const router = express.Router();

const partnerOnly = (req, res, next) => {
  if (req.user.role !== 'partner') {
    return res.status(403).json({ error: 'Partner access required' });
  }
  next();
};

// Express 4 does NOT catch a rejected promise from an async handler — the
// request just hangs until the client times out, which reads to the user as a
// dead "Opening checkout..." button. Every payment handler below goes through
// this so a transient DB/Razorpay error becomes a clean JSON 500 (handled by
// the error middleware in server.js) instead of a stuck spinner.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

// Commission + payout-request summary for the partner's "Commission &
// Payout" quick action. Earned = rate% of every completed attributed payment;
// available = earned minus amounts already locked by pending/approved
// requests (rejected requests do not deduct).
async function getCommissionSummary(partnerId) {
  const partner = await db.get(
    "SELECT commissionPercent FROM users WHERE id = ? AND role = 'partner'", partnerId
  );
  const commissionPercent = Number(partner?.commissionPercent || 0);
  const paid = await db.get(`
    SELECT COALESCE(SUM(p.amount), 0) AS paid
    FROM payments p
    JOIN enrollments e ON e.id = p.enrollmentId
    WHERE e.partnerId = ? AND p.status = 'completed'
  `, partnerId);
  const requests = await db.all(`
    SELECT id, amount, upiId, status, priority, note, createdAt, updatedAt
    FROM payout_requests
    WHERE partnerId = ?
    ORDER BY createdAt DESC, id DESC
    LIMIT 50
  `, partnerId);
  const earned = round2(Number(paid.paid || 0) * commissionPercent / 100);
  const requested = round2(
    requests
      .filter((r) => r.status === 'pending' || r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  );
  return {
    commissionPercent,
    paidAmount: Number(paid.paid || 0),
    earned,
    requested,
    available: round2(Math.max(0, earned - requested)),
    requests,
  };
}

// The partner's own dashboard — same payload the admin sees on the partner
// detail screen, scoped to the logged-in partner.
router.get('/dashboard', authenticateToken, partnerOnly, async (req, res) => {
  try {
    const detail = await getPartnerDetail(req.user.id);
    if (!detail) return res.status(404).json({ error: 'Partner account not found' });
    // Commission terms and payout are admin-only — strip them from the
    // partner's own payload (clone first: kpis is a shared cache entry).
    const partnerKpis = { ...detail.kpis };
    delete partnerKpis.commissionPercent;
    delete partnerKpis.commissionAmount;
    res.json({ ...detail, kpis: partnerKpis });
  } catch (err) {
    console.error('Partner dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Commission summary + payout-request history for the quick action.
router.get('/commission', authenticateToken, partnerOnly, async (req, res) => {
  try {
    res.json(await getCommissionSummary(req.user.id));
  } catch (err) {
    console.error('Partner commission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request a payout of the partner's earned commission. The request lands in
// the admin's Issues panel with a priority tag for triage. The UPI ID is how
// the admin actually transfers the money.
router.post('/payout-request', authenticateToken, partnerOnly, async (req, res) => {
  try {
    const amount = round2(req.body.amount);
    const note = String(req.body.note || '').slice(0, 500);
    const upiId = String(req.body.upiId || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Enter a valid payout amount' });
    }
    if (!upiId || !/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.-]{2,64}$/.test(upiId)) {
      return res.status(400).json({ error: 'Enter a valid UPI ID (e.g. yourname@upi or 9876543210@okbank)' });
    }

    const summary = await getCommissionSummary(req.user.id);
    if (amount > summary.available) {
      return res.status(400).json({
        error: `Payout request cannot exceed your available commission of ₹${summary.available.toLocaleString('en-IN')}`,
      });
    }

    const result = await db.run(
      'INSERT INTO payout_requests (partnerId, amount, upiId, note) VALUES (?, ?, ?, ?)',
      req.user.id, amount, upiId, note
    );
    const request = await db.get(
      'SELECT id, amount, upiId, status, priority, note, createdAt FROM payout_requests WHERE id = ?',
      result.lastInsertRowid
    );
    res.status(201).json({
      message: 'Payout request submitted — the admin will review it shortly',
      request,
      available: round2(summary.available - amount),
    });
  } catch (err) {
    console.error('Payout request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register a student on behalf of this partner. The account is attributed to
// the partner (users.partnerId) so it shows up in their Students list right
// away, and lib/payments.js stamps enrollments.partnerId when the student
// later pays for a program.
router.post('/students', authenticateToken, partnerOnly, async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, university, college, course, major, year,
      password, gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
    } = req.body;

    if (!firstName || !email || !phone || !university || !college || !course || !year || !password) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (dob && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || isNaN(new Date(dob).getTime()) || dob > today)) {
      return res.status(400).json({ error: 'Date of birth must be a valid date on or before today' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const policyError = passwordPolicyError(password);
    if (policyError) {
      return res.status(400).json({ error: policyError });
    }

    const normalized = String(email).toLowerCase();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', normalized);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    const result = await db.run(`
      INSERT INTO users (firstName, lastName, email, phone, university, college, course, major, year,
                         gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
                         password, role, partnerId, createdByAdmin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'student', ?, 1)
    `, firstName, lastName || '', normalized, phone, university, college, course,
      major || '', year,
      gender || '', dob || '', rollNo || '', regNo || '',
      guardianName || '', guardianPhone || '', guardianRelation || '',
      hashedPassword, req.user.id);

    const user = await db.get('SELECT id, firstName, lastName, email, role, createdAt FROM users WHERE id = ?', result.lastInsertRowid);
    res.status(201).json({ message: 'Student registered', user });
  } catch (err) {
    console.error('Partner registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================== REGISTER-AND-PAY (STEP 2) =====================
// Price list for the "choose a track" step shown right after a partner
// registers a student. Ordered by price so it reads as a price list.
router.get('/internships', authenticateToken, partnerOnly, async (req, res) => {
  const internships = await db.all(`
    SELECT id, title, description, category, duration, price, originalPrice, modules, topics
    FROM internships
    WHERE isActive = 1
    ORDER BY price ASC, title ASC
  `);
  res.json({ internships });
});

// A partner may only act on students they own — never someone else's.
async function ownStudent(partnerId, studentId) {
  const student = await db.get("SELECT id, partnerId FROM users WHERE id = ? AND role = 'student'", Number(studentId));
  if (!student) return { error: 404, message: 'Student not found' };
  if (Number(student.partnerId) !== Number(partnerId)) {
    return { error: 403, message: 'You can only enroll students registered to your partner account' };
  }
  return { student };
}

// Creates the student's invoice AND its Razorpay order in one round trip so
// the partner can go straight into checkout. The amount always comes from the
// database — the client can never submit its own price.
router.post('/students/:studentId/enroll', authenticateToken, partnerOnly, wrap(async (req, res) => {
  const { internshipId } = req.body;
  if (!internshipId) return res.status(400).json({ error: 'Internship ID required' });

  const owner = await ownStudent(req.user.id, req.params.studentId);
  if (owner.error) return res.status(owner.error).json({ error: owner.message });

  const internship = await db.get('SELECT * FROM internships WHERE id = ?', internshipId);
  if (!internship || !internship.isActive) return res.status(404).json({ error: 'Internship not found' });

  // Genuinely enrolled = a completed payment exists. Refunded/failed history
  // must NOT block a fresh purchase (same rule as the student's own checkout).
  const alreadyPaid = await db.get(
    "SELECT 1 FROM payments WHERE userId = ? AND internshipId = ? AND status = 'completed' LIMIT 1",
    owner.student.id, internship.id,
  );
  if (alreadyPaid) return res.status(409).json({ error: 'Already enrolled in this internship' });

  // Reuse an unpaid invoice for this track instead of stacking duplicates.
  let payment = await expireIfDue(await db.get(
    "SELECT * FROM payments WHERE userId = ? AND internshipId = ? AND status = 'pending' ORDER BY id DESC",
    owner.student.id, internship.id,
  ));
  if (payment && payment.status === 'pending' && payment.amount !== internship.price && !payment.razorpayOrderId) {
    await db.run('UPDATE payments SET amount = ? WHERE id = ?', internship.price, payment.id);
    payment.amount = internship.price;
  }

  if (!payment || payment.status !== 'pending') {
    const receiptNumber = await newReceiptNumber(db);
    // Opaque token for the shareable payment link — the URL must not expose
    // the sequential payment id (a running count of payments on the site).
    const linkToken = crypto.randomBytes(9).toString('base64url');
    try {
      const inserted = await db.run(`
        INSERT INTO payments (userId, enrollmentId, internshipId, amount, receiptNumber, status, expiresAt, linkToken)
        VALUES (?, NULL, ?, ?, ?, ?, to_char(now() at time zone 'UTC' + (? || ' minutes')::interval, 'YYYY-MM-DD HH24:MI:SS'), ?)
      `, owner.student.id, internship.id, internship.price, receiptNumber, 'pending',
        String(paymentTimeLimitMinutes()), linkToken);
      payment = await db.get('SELECT * FROM payments WHERE id = ?', inserted.lastInsertRowid);
    } catch (err) {
      // A concurrent request for the same track won the race
      // (uniq_payments_pending_user_track) — return that one.
      if (String(err.message).includes('duplicate key')) {
        payment = await expireIfDue(await db.get(
          "SELECT * FROM payments WHERE userId = ? AND internshipId = ? AND status = 'pending' ORDER BY id DESC",
          owner.student.id, internship.id,
        ));
        if (!payment || payment.status !== 'pending') throw err;
      } else {
        throw err;
      }
    }
  }

  let outcome;
  try {
    outcome = await createOrderForPayment(payment);
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') return res.status(503).json({ error: err.message });
    console.error('Partner order creation failed:', err.message);
    return res.status(502).json({ error: err.message || 'Could not start the payment. Please try again shortly.' });
  }

  if (outcome.alreadyPaid) {
    const done = await db.get('SELECT * FROM payments WHERE id = ?', payment.id);
    return res.json({ message: 'Payment already completed', payment: done, alreadyPaid: true });
  }

  res.status(201).json({
    message: 'Payment pending. Complete the payment to enroll.',
    payment,
    orderId: outcome.order.id,
    amount: outcome.order.amount,
    currency: outcome.order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}));

// Same signature check as the student's checkout — only Razorpay can produce
// a valid HMAC for this order, so nothing unpaid can ever complete here.
router.post('/payments/:paymentId/verify', authenticateToken, partnerOnly, wrap(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification details' });
  }

  const payment = await db.get('SELECT * FROM payments WHERE id = ?', Number(req.params.paymentId));
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const owner = await db.get('SELECT id, partnerId FROM users WHERE id = ?', payment.userId);
  if (!owner || Number(owner.partnerId) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You can only verify payments for your own students' });
  }

  if (payment.status === 'completed') return res.json({ message: 'Payment already completed', payment });
  if (payment.status === 'refunded') return res.status(409).json({ error: 'This payment has been refunded' });

  // The signature is only honoured for the order this payment was bound to.
  if (!payment.razorpayOrderId || payment.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ error: 'This order does not match the payment' });
  }
  if (!rzp.verifyPaymentSignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  // Reconcile the recorded amount to what was actually charged in case the
  // invoice amount drifted after the order was created.
  let chargedAmount = null;
  try {
    const order = await rzp.fetchOrder(razorpay_order_id);
    if (order && Number(order.amount) > 0) chargedAmount = Number(order.amount) / 100;
  } catch (err) {
    console.error('Could not fetch order amount for reconciliation:', err.message);
  }

  const updated = await completePayment(payment, {
    transactionId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    amount: chargedAmount,
  });
  res.json({ message: 'Payment successful', payment: updated });
}));

module.exports = router;
