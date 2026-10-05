const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { authenticateToken } = require('../middleware/auth');
const { passwordPolicyError, BCRYPT_COST } = require('../lib/passwordPolicy');
const { newReceiptNumber } = require('../lib/docNumbers');
const sessions = require('../lib/sessions');
const rzp = require('../lib/razorpay');
const { completePayment, paymentTimeLimitMinutes, expirePendingPayments, expireIfDue } = require('../lib/payments');

const router = express.Router();

// The exam unlocks only after every learning module of the track is completed.
// Tracks with no published modules stay locked — an empty curriculum is not
// "completed".
const isCourseCompleted = (enrollment) =>
  Number(enrollment.moduleCount) > 0 && Number(enrollment.courseProgress) >= 100;

// Submissions are accepted this long after the attempt window (duration +
// grace) for network/clock slop; anything later is graded as failed.
const EXAM_GRACE_MS = 3 * 60 * 1000;

// moduleIndex is a client-supplied 0-based position (moduleOrder - 1). It is
// used as an array element AND to compute progress, so reject anything that
// is not a plain non-negative integer inside the track's module count —
// otherwise a crafted body could push the index to 100% and unlock the exam.
// Returns { error } on rejection, or { total } (module count) on success.
async function validateModuleIndex(enrollment, moduleIndex) {
  if (typeof moduleIndex !== 'number' || !Number.isInteger(moduleIndex) || moduleIndex < 0) {
    return { error: 'Invalid module index' };
  }
  const totalModules = await db.get('SELECT COUNT(*) as count FROM learning_modules WHERE internshipId = ?', enrollment.internshipId);
  if (moduleIndex >= totalModules.count) {
    return { error: 'Invalid module index' };
  }
  return { total: totalModules.count };
}

// Lazy deadline sweep: fail expired pending invoices before they are read so
// the rows served to the client are always fresh (non-fatal if it errors).
const sweepPayments = () => expirePendingPayments().catch((err) => console.error('Payment expiry sweep failed:', err.message));

const PAYMENT_REQUIRED_MSG = 'Complete the payment for this internship to unlock learning modules.';

// Learning content is only for tracks whose payment succeeded: the enrollment
// row alone is not enough, the completed payment is re-checked so a failed or
// refunded invoice revokes access immediately.
async function paidEnrollmentFor(userId, internshipId) {
  return await db.get(`
    SELECT e.id FROM enrollments e
    WHERE e.userId = ? AND e.internshipId = ?
      AND e.status IN ('active', 'completed')
      AND EXISTS (SELECT 1 FROM payments p WHERE p.enrollmentId = e.id AND p.status = 'completed')
    LIMIT 1
  `, userId, internshipId);
}

async function hasCompletedPayment(enrollmentId, userId) {
  return !!(await db.get("SELECT 1 FROM payments WHERE enrollmentId = ? AND userId = ? AND status = 'completed' LIMIT 1", enrollmentId, userId));
}

// ===================== STUDENT PROFILE =====================
router.get('/profile', authenticateToken, async (req, res) => {
  const user = await db.get('SELECT id, firstName, lastName, email, phone, university, college, course, year, role, createdAt FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.course) user.course = user.course.toUpperCase();
  res.json({ user });
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { firstName, lastName, phone, university, college, course, year } = req.body;
  const user = await db.get('SELECT id FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  await db.run('UPDATE users SET firstName = ?, lastName = ?, phone = ?, university = ?, college = ?, course = ?, year = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', firstName, lastName, phone, university, college, course, year, req.user.id);

  const updated = await db.get('SELECT id, firstName, lastName, email, phone, university, college, course, year, role FROM users WHERE id = ?', req.user.id);
  if (updated && updated.course) updated.course = updated.course.toUpperCase();
  res.json({ message: 'Profile updated', user: updated });
});

router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  const policyError = passwordPolicyError(newPassword);
  if (policyError) {
    return res.status(400).json({ error: policyError });
  }
  const user = await db.get('SELECT password FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

  const salt = await bcrypt.genSalt(BCRYPT_COST);
  const hashed = await bcrypt.hash(newPassword, salt);
  await db.run('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', hashed, req.user.id);

  // Revoke every other device's token; keep the current session.
  await sessions.revokeAll(req.user.id, req.token);

  res.json({ message: 'Password changed successfully' });
});

// ===================== STUDENT DASHBOARD =====================
router.get('/dashboard', authenticateToken, async (req, res) => {
  await sweepPayments();

  const enrollments = await db.all(`
    SELECT e.*, i.title as internshipTitle, i.category, i.duration, i.modules, i.topics
    FROM enrollments e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.userId = ?
    ORDER BY e.enrolledAt DESC
  `, req.user.id);

  const payments = await db.all(`
    SELECT p.*, i.title as internshipTitle
    FROM payments p
    JOIN internships i ON i.id = p.internshipId
    WHERE p.userId = ?
    ORDER BY p.createdAt DESC
  `, req.user.id);

  const exams = (await db.all(`
    SELECT e.*, i.title as internshipTitle, en.progress as courseProgress, en.status as enrollmentStatus,
      (SELECT COUNT(*) FROM learning_modules lm WHERE lm.internshipId = i.id) as moduleCount
    FROM exams e
    JOIN internships i ON e.internshipId = i.id
    JOIN enrollments en ON en.id = e.enrollmentId
    WHERE e.userId = ?
    ORDER BY e.id DESC
  `, req.user.id)).map(exam => ({ ...exam, courseCompleted: isCourseCompleted(exam) }));

  const certificates = await db.all(`
    SELECT c.*, i.title as internshipTitle
    FROM certificates c
    JOIN enrollments e ON c.enrollmentId = e.id
    JOIN internships i ON e.internshipId = i.id
    WHERE c.userId = ?
      AND EXISTS (
        SELECT 1 FROM payments p WHERE p.enrollmentId = e.id AND p.status = 'completed'
      )
  `, req.user.id);

  // Profile completeness over the five fields a student can edit (mirrors
  // EditProfile). Missing keys are surfaced so the dashboard can prompt.
  const profileFields = ['phone', 'university', 'college', 'course', 'year'];
  const profileMissing = profileFields.filter((f) => !req.user[f] || !String(req.user[f]).trim());
  const profileCompletion = {
    pct: Math.round(((profileFields.length - profileMissing.length) / profileFields.length) * 100),
    missing: profileMissing,
  };

  // Earliest upcoming (or running) exam attempt for the countdown card.
  const nextExamRow = exams
    .filter((e) => (e.status === 'scheduled' || e.status === 'in_progress') && e.scheduledAt)
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))[0]
    || exams.filter((e) => e.status === 'in_progress')[0]
    || null;
  const nextExam = nextExamRow ? {
    id: nextExamRow.id,
    enrollmentId: nextExamRow.enrollmentId,
    internshipId: nextExamRow.internshipId,
    internshipTitle: nextExamRow.internshipTitle,
    scheduledAt: nextExamRow.scheduledAt,
    status: nextExamRow.status,
    duration: nextExamRow.duration,
    totalQuestions: nextExamRow.totalQuestions,
    passingMarks: nextExamRow.passingMarks,
    courseCompleted: nextExamRow.courseCompleted,
    courseProgress: nextExamRow.courseProgress || 0,
  } : null;

  // Days remaining on the active enrollment (ISO expiresAt from payments.js;
  // fall back to the plain UTC sweep format if ever written that way).
  const activeEnrollment = enrollments.find((e) => e.status === 'active') || null;
  let daysLeft = null;
  if (activeEnrollment?.expiresAt) {
    const raw = String(activeEnrollment.expiresAt);
    const expires = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
      ? new Date(`${raw.replace(' ', 'T')}Z`)
      : new Date(raw);
    if (!Number.isNaN(expires.getTime())) {
      daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000));
    }
  }

  // Latest announcements + the student's global unread count (same shape the
  // bell uses, capped so the dashboard stays one small query).
  const announcements = (await db.all(`
    SELECT a.id, a.title, a.message, a.createdAt,
      EXISTS(SELECT 1 FROM announcement_reads r WHERE r.announcementId = a.id AND r.userId = ?) AS isRead
    FROM announcements a
    ORDER BY a.createdAt DESC, a.id DESC
    LIMIT 3
  `, req.user.id)).map((a) => ({ id: a.id, title: a.title, message: a.message, createdAt: a.createdAt, read: !!a.isRead }));
  const announcementsUnread = (await db.get(`
    SELECT COUNT(*) as count FROM announcements a
    WHERE NOT EXISTS (SELECT 1 FROM announcement_reads r WHERE r.announcementId = a.id AND r.userId = ?)
  `, req.user.id)).count;
  const announcementsTotal = (await db.get('SELECT COUNT(*) as count FROM announcements')).count;

  res.json({
    enrollments, payments, exams, certificates,
    profileCompletion, nextExam, daysLeft, announcements, announcementsUnread, announcementsTotal,
  });
});

// ===================== ENROLLMENT STATUS CHECK =====================
router.get('/enrollment-status', authenticateToken, async (req, res) => {
  const enrollment = await db.get(`
    SELECT e.*, i.title as internshipTitle
    FROM enrollments e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.userId = ? AND e.status IN ('active', 'completed')
    ORDER BY e.enrolledAt DESC LIMIT 1
  `, req.user.id);

  res.json({ hasEnrollment: !!enrollment, enrollment: enrollment || null });
});

// ===================== SINGLE ENROLLMENT WITH MODULES =====================
router.get('/enrollment/:id', authenticateToken, async (req, res) => {
  const enrollment = await db.get(`
    SELECT e.*, i.title as internshipTitle, i.category, i.duration, i.modules, i.topics
    FROM enrollments e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.id = ? AND e.userId = ?
  `, req.params.id, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  res.json({ enrollment });
});

// ===================== COMPLETE MODULE =====================
router.post('/complete-module/:enrollmentId', authenticateToken, async (req, res) => {
  const enrollment = await db.get(`
    SELECT e.* FROM enrollments e
    WHERE e.id = ? AND e.userId = ?
  `, req.params.enrollmentId, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (!(await hasCompletedPayment(enrollment.id, req.user.id))) {
    return res.status(403).json({ error: PAYMENT_REQUIRED_MSG });
  }

  const { moduleIndex } = req.body;
  const check = await validateModuleIndex(enrollment, moduleIndex);
  if (check.error) return res.status(400).json({ error: check.error });

  let completed = [];
  try { completed = JSON.parse(enrollment.completedModules || '[]'); } catch { completed = []; }

  if (!completed.includes(moduleIndex)) {
    completed.push(moduleIndex);
  }

  const progress = check.total > 0 ? Math.round((completed.length / check.total) * 100) : 0;

  await db.run('UPDATE enrollments SET completedModules = ?, progress = ? WHERE id = ?', JSON.stringify(completed), progress, enrollment.id);

  res.json({ message: 'Module completed', completedModules: completed, progress });
});

// ===================== UNCOMPLETE MODULE =====================
router.post('/uncomplete-module/:enrollmentId', authenticateToken, async (req, res) => {
  const enrollment = await db.get(`
    SELECT e.* FROM enrollments e
    WHERE e.id = ? AND e.userId = ?
  `, req.params.enrollmentId, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  if (!(await hasCompletedPayment(enrollment.id, req.user.id))) {
    return res.status(403).json({ error: PAYMENT_REQUIRED_MSG });
  }

  const { moduleIndex } = req.body;
  const check = await validateModuleIndex(enrollment, moduleIndex);
  if (check.error) return res.status(400).json({ error: check.error });

  let completed = [];
  try { completed = JSON.parse(enrollment.completedModules || '[]'); } catch { completed = []; }

  completed = completed.filter(i => i !== moduleIndex);

  const progress = check.total > 0 ? Math.round((completed.length / check.total) * 100) : 0;

  await db.run('UPDATE enrollments SET completedModules = ?, progress = ? WHERE id = ?', JSON.stringify(completed), progress, enrollment.id);

  res.json({ message: 'Module uncompleted', completedModules: completed, progress });
});

// ===================== AVAILABLE INTERNSHIPS =====================
router.get('/internships', authenticateToken, async (req, res) => {
  const internships = await db.all('SELECT * FROM internships WHERE isActive = 1 ORDER BY createdAt DESC');

  // Check which tracks are actually paid for: a refunded payment leaves the
  // enrollment row behind (for history/repurchase) but must not read as
  // "enrolled" anywhere, or the student can never buy the track again.
  const enrolled = await db.all(`
    SELECT DISTINCT e.internshipId
    FROM enrollments e
    WHERE e.userId = ?
      AND EXISTS (
        SELECT 1 FROM payments p WHERE p.enrollmentId = e.id AND p.status = 'completed'
      )
  `, req.user.id);
  const enrolledIds = enrolled.map(e => e.internshipId);

  const internshipsWithStatus = internships.map(i => ({
    ...i,
    isEnrolled: enrolledIds.includes(i.id),
  }));

  res.json({ internships: internshipsWithStatus });
});

// ===================== ENROLL & PAY =====================
// Stores ONLY an unpaid invoice (pending payment) for the checkout. The
// enrollment row is created later by lib/payments.js — strictly after the
// payment is verified successful — so a pending payment can never surface
// anywhere as "already enrolled". The invoice carries a deadline (expiresAt);
// once it passes the payment is marked 'failed' and a fresh invoice must be
// created.
router.post('/enroll', authenticateToken, async (req, res) => {
  const { internshipId } = req.body;
  if (!internshipId) return res.status(400).json({ error: 'Internship ID required' });

  const internship = await db.get('SELECT * FROM internships WHERE id = ?', internshipId);
  if (!internship) return res.status(404).json({ error: 'Internship not found' });

  // Genuinely enrolled = a completed payment exists. Refunded/failed history
  // (and its leftover enrollment row) must NOT block a fresh purchase.
  const alreadyPaid = await db.get(
    "SELECT 1 FROM payments WHERE userId = ? AND internshipId = ? AND status = 'completed' LIMIT 1",
    req.user.id, internshipId,
  );
  if (alreadyPaid) return res.status(409).json({ error: 'Already enrolled in this internship' });

  // Reuse an unpaid invoice for this track instead of stacking duplicates —
  // unless its time limit already ran out, in which case it is failed and a
  // new invoice is issued below. Re-price reused invoices only while no order
  // exists yet: once a Razorpay order is open the amount must stay in lockstep
  // with that order (completion additionally reconciles the recorded amount to
  // the charged order amount).
  const pending = await expireIfDue(await db.get("SELECT * FROM payments WHERE userId = ? AND internshipId = ? AND status = 'pending' ORDER BY id DESC", req.user.id, internshipId));
  if (pending && pending.status === 'pending') {
    if (pending.amount !== internship.price && !pending.razorpayOrderId) {
      await db.run('UPDATE payments SET amount = ? WHERE id = ?', internship.price, pending.id);
      pending.amount = internship.price;
    }
    return res.json({ message: 'Payment pending for this internship.', payment: pending });
  }

  const receiptNumber = await newReceiptNumber(db);
  const insertInvoice = () => db.run(`
    INSERT INTO payments (userId, enrollmentId, internshipId, amount, receiptNumber, status, expiresAt)
    VALUES (?, NULL, ?, ?, ?, ?, to_char(now() at time zone 'UTC' + (? || ' minutes')::interval, 'YYYY-MM-DD HH24:MI:SS'))
  `, req.user.id, internshipId, internship.price, receiptNumber, 'pending', String(paymentTimeLimitMinutes()));

  let paymentResult;
  try {
    paymentResult = await insertInvoice();
  } catch (err) {
    // A concurrent request for the same track won the race and created the
    // invoice (uniq_payments_pending_user_track) — return that one.
    if (String(err.message).includes('duplicate key')) {
      const raced = await expireIfDue(await db.get("SELECT * FROM payments WHERE userId = ? AND internshipId = ? AND status = 'pending' ORDER BY id DESC", req.user.id, internshipId));
      if (raced && raced.status === 'pending') {
        return res.json({ message: 'Payment pending for this internship.', payment: raced });
      }
    }
    throw err;
  }

  const payment = await db.get('SELECT * FROM payments WHERE id = ?', paymentResult.lastInsertRowid);
  res.status(201).json({ message: 'Payment pending. Complete the payment to enroll.', payment });
});

// Create a Razorpay order for this payment. The amount always comes from the
// database — the client can never submit its own price.
router.post('/pay/:paymentId/order', authenticateToken, async (req, res) => {
  const payment = await expireIfDue(await db.get('SELECT * FROM payments WHERE id = ? AND userId = ?', req.params.paymentId, req.user.id));
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status === 'completed') return res.status(409).json({ error: 'Payment already completed' });
  if (payment.status === 'refunded') return res.status(409).json({ error: 'This payment has been refunded' });
  if (payment.status !== 'pending') {
    return res.status(410).json({
      error: 'The time limit for this payment has expired, so it was marked unsuccessful. Select the track again to start a new payment.',
    });
  }

  const amountPaise = Math.round(payment.amount * 100);
  const orderResponse = (order) => ({
    demo: false,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });

  if (rzp.isLive()) {
    // REUSE the order already stored on this invoice. Creating a second order
    // would overwrite razorpayOrderId and orphan the first: a charge on the
    // orphan can never be matched back (verify rejects it, the webhook lookup
    // misses it and still answers 200, so Razorpay never retries) — the
    // customer pays and nothing completes.
    if (payment.razorpayOrderId) {
      try {
        const existingOrder = await rzp.fetchOrder(payment.razorpayOrderId);
        if (existingOrder.status === 'paid') {
          // Money captured but the row is still pending (both verify and the
          // webhook missed it). Complete straight from the authoritative API
          // response; 409 makes the client reload into the completed state.
          const captured = (await rzp.fetchPaymentsForOrder(existingOrder.id))
            .find((p) => p.status === 'captured');
          if (captured) {
            await completePayment(payment, {
              transactionId: captured.id,
              razorpayOrderId: existingOrder.id,
              razorpayPaymentId: captured.id,
              amount: Number(captured.amount) / 100,
            });
          }
          return res.status(409).json({ error: 'This order has already been paid. Refresh the page to see the updated status.' });
        }
        // Order still open (created/attempted) — hand it back to the client.
        return res.json(orderResponse(existingOrder));
      } catch (err) {
        // Stale/foreign order id (e.g. deleted in the Razorpay dashboard) —
        // drop it and fall through to a fresh order.
        console.error('Razorpay order reuse failed:', err.message);
        payment.razorpayOrderId = null;
      }
    }

    try {
      const order = await rzp.createOrder({
        amountPaise,
        receipt: payment.receiptNumber,
        notes: { paymentId: String(payment.id), enrollmentId: String(payment.enrollmentId) },
      });
      // Bind atomically: a concurrent request may have stored its order first.
      // Whoever wins, BOTH tabs get the same winning order — never an orphan.
      const claim = await db.run(
        'UPDATE payments SET razorpayOrderId = ?, method = ? WHERE id = ? AND razorpayOrderId IS NULL',
        order.id, 'razorpay', payment.id,
      );
      if (claim.changes === 0) {
        const fresh = await db.get('SELECT razorpayOrderId FROM payments WHERE id = ?', payment.id);
        if (fresh && fresh.razorpayOrderId) {
          try {
            return res.json(orderResponse(await rzp.fetchOrder(fresh.razorpayOrderId)));
          } catch (err) {
            console.error('Razorpay order fetch after claim race failed:', err.message);
            return res.status(502).json({ error: 'Could not start the payment. Please try again shortly.' });
          }
        }
        // The winning id was cleared again (concurrent re-price) — ask the
        // client to retry rather than return an unbound order.
        return res.status(502).json({ error: 'Could not start the payment. Please try again shortly.' });
      }
      return res.json(orderResponse(order));
    } catch (err) {
      console.error('Razorpay order creation failed:', err.message);
      return res.status(502).json({ error: 'Could not start the payment. Please try again shortly.' });
    }
  }

  // No keys configured — payments are disabled (there is no simulated checkout)
  return res.status(503).json({
    error: 'Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file and restart the server.',
  });
});

// Verify the Razorpay checkout signature. This is the ONLY way a payment can
// be completed — there is no route that marks a payment paid on its own.
router.post('/pay/:paymentId/verify', authenticateToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification details' });
  }

  const payment = await db.get('SELECT * FROM payments WHERE id = ? AND userId = ?', req.params.paymentId, req.user.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status === 'completed') return res.json({ message: 'Payment already completed', payment });
  if (payment.status === 'refunded') return res.status(409).json({ error: 'This payment has been refunded' });

  // The signature is only honoured for the order this payment was bound to
  if (!payment.razorpayOrderId || payment.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ error: 'This order does not match the payment' });
  }

  // Only Razorpay can produce a valid HMAC signature for this order
  if (!rzp.verifyPaymentSignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  // A valid signature means the charge was actually captured, so it is
  // honoured even if the invoice deadline passed while the checkout was open
  // (the row may already read 'failed'). Nothing unpaid ever reaches here.
  // The recorded amount is reconciled to the charged order amount in case the
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
});

// ===================== EXAM =====================
router.get('/exam/:enrollmentId', authenticateToken, async (req, res) => {
  const exam = await db.get(`
    SELECT e.*, i.title as internshipTitle, i.topics, en.progress as courseProgress, en.status as enrollmentStatus,
      (SELECT COUNT(*) FROM learning_modules lm WHERE lm.internshipId = i.id) as moduleCount
    FROM exams e
    JOIN internships i ON e.internshipId = i.id
    JOIN enrollments en ON en.id = e.enrollmentId AND en.userId = e.userId
    WHERE e.enrollmentId = ? AND e.userId = ?
  `, req.params.enrollmentId, req.user.id);

  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  exam.courseCompleted = isCourseCompleted(exam);
  res.json({ exam });
});

router.post('/exam/:examId/start', authenticateToken, async (req, res) => {
  const exam = await db.get(`
    SELECT e.*, i.category, en.progress as courseProgress, en.status as enrollmentStatus,
      (SELECT COUNT(*) FROM learning_modules lm WHERE lm.internshipId = i.id) as moduleCount
    FROM exams e
    JOIN internships i ON e.internshipId = i.id
    JOIN enrollments en ON en.id = e.enrollmentId AND en.userId = e.userId
    WHERE e.id = ? AND e.userId = ?
  `, req.params.examId, req.user.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  // Access follows the money: a refunded/revoked enrollment must not be able
  // to start (or resume) an attempt.
  if (!(await hasCompletedPayment(exam.enrollmentId, req.user.id))) {
    return res.status(403).json({ error: PAYMENT_REQUIRED_MSG });
  }
  if (exam.status === 'completed' || exam.status === 'failed') {
    return res.status(400).json({ error: 'Exam already completed. Check your result on the dashboard.' });
  }
  // Resume an in-progress attempt without re-checking; fresh starts require
  // every learning module to be completed first.
  if (exam.status !== 'in_progress' && !isCourseCompleted(exam)) {
    return res.status(403).json({
      error: exam.moduleCount === 0
        ? 'Learning modules for this track are not available yet. Please check back soon.'
        : `Complete all learning modules first to unlock the exam. Current progress: ${exam.courseProgress || 0}%`,
    });
  }

  const questions = await db.all('SELECT id, question, optionA, optionB, optionC, optionD FROM questions WHERE track = ? AND isActive = 1 ORDER BY RANDOM() LIMIT ?', exam.category, exam.totalQuestions);

  if (questions.length === 0) {
    return res.status(400).json({ error: 'No questions available for this track. Please contact admin.' });
  }

  const questionsForClient = questions.map(q => ({
    id: q.id,
    question: q.question,
    options: [q.optionA, q.optionB, q.optionC, q.optionD],
  }));

  // Persist exactly which questions this attempt served — grading at submit
  // time uses this list, so the score can never be diluted by active track
  // questions the student was never shown.
  await db.run(
    "UPDATE exams SET status = 'in_progress', startedAt = CURRENT_TIMESTAMP, servedQuestionIds = ? WHERE id = ?",
    JSON.stringify(questions.map((q) => q.id)), exam.id,
  );
  res.json({ message: 'Exam started', questions: questionsForClient, duration: exam.duration, totalQuestions: questions.length });
});

router.post('/exam/:examId/submit', authenticateToken, async (req, res) => {
  const { answers } = req.body;
  const exam = await db.get(`
    SELECT e.*, i.category
    FROM exams e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.id = ? AND e.userId = ?
  `, req.params.examId, req.user.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (exam.status !== 'in_progress') return res.status(400).json({ error: 'Exam is not in progress' });

  // Server-side time limit — the client timer is cosmetic. The attempt
  // window runs from the last start (start/resume refresh startedAt) for
  // `duration` minutes plus a small grace for network/clock slop. Past that
  // the submission is still graded below, but the result is forced to failed
  // so the attempt resolves instead of hanging in_progress. Unparseable
  // legacy startedAt values fail open (normal grading).
  let expired = false;
  const startedRaw = exam.startedAt ? String(exam.startedAt).trim() : '';
  if (startedRaw && Number(exam.duration) > 0) {
    const iso = startedRaw.replace(' ', 'T');
    const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    const startedMs = Date.parse(hasZone ? iso : iso + 'Z');
    if (!Number.isNaN(startedMs)) {
      expired = Date.now() - startedMs > Number(exam.duration) * 60000 + EXAM_GRACE_MS;
    }
  }

  // Fetch correct answers from DB
  const dbQuestions = await db.all('SELECT id, correct FROM questions WHERE track = ? AND isActive = 1', exam.category);
  const correctMap = {};
  dbQuestions.forEach(q => { correctMap[q.id] = q.correct; });

  // Grade against the questions this attempt actually served (recorded at
  // start). Falling back to every active track question would understate the
  // score whenever the bank is bigger than the served set (e.g. 50 served of
  // 53 active → a perfect attempt reported as 94%).
  let servedIds = null;
  try {
    const parsed = JSON.parse(exam.servedQuestionIds || 'null');
    if (Array.isArray(parsed)) servedIds = parsed;
  } catch { servedIds = null; }

  let score = 0;
  let answered = 0;
  if (Array.isArray(answers)) {
    for (const ans of answers) {
      if (ans && ans.questionId && correctMap[ans.questionId] !== undefined &&
          (!servedIds || servedIds.includes(ans.questionId))) {
        answered++;
        if (ans.selectedOption === correctMap[ans.questionId]) {
          score++;
        }
      }
    }
  }
  const total = servedIds
    ? servedIds.filter((id) => correctMap[id] !== undefined).length
    : dbQuestions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  let status = percentage >= 40 ? 'completed' : 'failed';
  if (expired) status = 'failed';

  await db.run("UPDATE exams SET status = ?, score = ?, answers = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?", status, percentage, JSON.stringify(answers || []), exam.id);

  // No certificate (and no enrollment completion) without a successful
  // payment — an unpaid/failed payment must never yield a certificate.
  if (status === 'completed') {
    const paid = await hasCompletedPayment(exam.enrollmentId, req.user.id);
    if (paid) {
      const existingCert = await db.get('SELECT id FROM certificates WHERE enrollmentId = ?', exam.enrollmentId);
      if (!existingCert) {
        const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : 'D';
        let certId;
        let isUnique = false;
        while (!isUnique) {
          certId = `IQI-${new Date().getFullYear()}-${crypto.randomBytes(4).readUInt32BE(0) % 1000000}`;
          const existing = await db.get('SELECT id FROM certificates WHERE certificateId = ?', certId);
          if (!existing) isUnique = true;
        }
        await db.run('INSERT INTO certificates (userId, enrollmentId, examId, certificateId, grade, score) VALUES (?, ?, ?, ?, ?, ?)', req.user.id, exam.enrollmentId, exam.id, certId, grade, percentage);
      }
      await db.run("UPDATE enrollments SET status = 'completed' WHERE id = ?", exam.enrollmentId);
    } else {
      console.warn(`Exam ${exam.id} passed but payment for enrollment ${exam.enrollmentId} is not completed — certificate withheld.`);
    }
  }

  const updatedExam = await db.get('SELECT * FROM exams WHERE id = ?', exam.id);
  res.json({
    message: expired ? 'Time limit exceeded. Your attempt was graded as failed.' : 'Exam submitted',
    exam: updatedExam, score: percentage, total, correct: score, status,
  });
});

// ===================== DOWNLOADS (designs live in routes/documents.js) =====================
router.use(require('./documents'));

// ===================== LEARNING MODULES =====================
// Content is served only for tracks whose payment succeeded — a pending,
// failed or refunded payment leaves the internship's modules invisible.
router.get('/learning-modules/:internshipId', authenticateToken, async (req, res) => {
  const internshipId = parseInt(req.params.internshipId);
  if (isNaN(internshipId)) return res.status(400).json({ error: 'Invalid internship ID' });

  if (!(await paidEnrollmentFor(req.user.id, internshipId))) {
    return res.status(403).json({ error: PAYMENT_REQUIRED_MSG });
  }

  const modules = await db.all(`
    SELECT id, internshipId, title, description, moduleOrder, durationMinutes, difficulty, topics,
           learningObjectives, contentSections, quizQuestions, resources, videoUrl
    FROM learning_modules
    WHERE internshipId = ?
    ORDER BY moduleOrder ASC
  `, internshipId);
  
  // Parse JSON fields for each module
  const parsed = modules.map(m => ({
    ...m,
    learningObjectives: JSON.parse(m.learningObjectives || '[]'),
    contentSections: JSON.parse(m.contentSections || '[]'),
    quizQuestions: JSON.parse(m.quizQuestions || '[]'),
    resources: JSON.parse(m.resources || '[]'),
    topics: m.topics ? m.topics.split(',') : []
  }));

  res.json({ modules: parsed });
});

router.get('/learning-module/:moduleId', authenticateToken, async (req, res) => {
  const moduleId = parseInt(req.params.moduleId);
  if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

  const module = await db.get(`
    SELECT * FROM learning_modules WHERE id = ?
  `, moduleId);
  
  if (!module) return res.status(404).json({ error: 'Module not found' });

  if (!(await paidEnrollmentFor(req.user.id, module.internshipId))) {
    return res.status(403).json({ error: PAYMENT_REQUIRED_MSG });
  }

  // Parse JSON fields
  module.learningObjectives = JSON.parse(module.learningObjectives || '[]');
  module.contentSections = JSON.parse(module.contentSections || '[]');
  module.quizQuestions = JSON.parse(module.quizQuestions || '[]');
  module.resources = JSON.parse(module.resources || '[]');
  module.topics = module.topics ? module.topics.split(',') : [];
  
  res.json({ module });
});

router.get('/learning-progress/:internshipId', authenticateToken, async (req, res) => {
  const internshipId = parseInt(req.params.internshipId);
  if (isNaN(internshipId)) return res.status(400).json({ error: 'Invalid internship ID' });

  if (!(await paidEnrollmentFor(req.user.id, internshipId))) {
    return res.status(403).json({ error: PAYMENT_REQUIRED_MSG });
  }

  const modules = await db.all(`
    SELECT id FROM learning_modules WHERE internshipId = ?
  `, internshipId);
  
  const enrollment = await db.get(`
    SELECT completedModules FROM enrollments
    WHERE userId = ? AND internshipId = ?
  `, req.user.id, internshipId);
  
  let completed = [];
  if (enrollment) {
    try { completed = JSON.parse(enrollment.completedModules || '[]'); } catch { completed = []; }
  }
  
  const totalModules = modules.length;
  const completedCount = completed.length;
  const percentage = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
  
  res.json({ progress: { totalModules, completedCount, percentage, completedModules: completed } });
});

module.exports = router;
