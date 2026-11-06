// Shared payment completion logic — used by the checkout verify route, the
// Razorpay webhook and the admin manual-completion path. Always runs inside a
// transaction and is idempotent so double verification / webhook retries can
// never double-activate anything.
const db = require('../db');
const crypto = require('crypto');
const rzp = require('./razorpay');
const { ensureEnrollmentNumber } = require('./docNumbers');

// A pending payment must be paid within this window (minutes). Once it
// passes, the invoice is marked 'failed' and can never produce an
// enrollment, exam, certificate, documents or learning-module access.
function paymentTimeLimitMinutes() {
  const n = Number(process.env.PAYMENT_TIME_LIMIT_MINUTES);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

// The payments.expiresAt column stores UTC 'YYYY-MM-DD HH24:MI:SS' (same
// format as createdAt), so it parses without a timezone guess.
function parseUtc(value) {
  if (!value) return NaN;
  const s = String(value).trim().replace(' ', 'T');
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
  return Date.parse(hasZone ? s : s + 'Z');
}

// Marks every pending payment past its deadline as 'failed'. Runs at startup
// (db init), on an interval (server.js) and lazily before payment/dashboard
// reads, so an expired invoice is never presented as payable anywhere.
async function expirePendingPayments() {
  const result = await db.run(`
    UPDATE payments
    SET status = 'failed'
    WHERE status = 'pending'
      AND expiresAt IS NOT NULL
      AND expiresAt <= to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  `);
  return result.changes || 0;
}

// Single-row version used right after a payment is read: returns the row with
// its status flipped to 'failed' when its deadline has already passed.
async function expireIfDue(payment) {
  if (!payment || payment.status !== 'pending') return payment;
  const due = parseUtc(payment.expiresAt);
  if (Number.isNaN(due) || Date.now() <= due) return payment;
  const result = await db.run("UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'pending'", payment.id);
  if (result.changes > 0) return { ...payment, status: 'failed' };
  return payment;
}

// The enrollment row comes into existence HERE — and only here, i.e. strictly
// after the payment succeeded. Pending payments hold no enrollment, so an
// unpaid user can never be presented as "enrolled" anywhere in the app.
async function ensureEnrollment(db, payment) {
  if (payment.enrollmentId) {
    const existing = await db.get('SELECT * FROM enrollments WHERE id = ?', payment.enrollmentId);
    if (existing) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);
      await db.run("UPDATE enrollments SET status = CASE WHEN status IN ('pending', 'refunded') THEN 'active' ELSE status END, expiresAt = ? WHERE id = ?", expiresAt.toISOString(), existing.id);
      return existing;
    }
  }

  const internshipId = payment.internshipId;
  if (!internshipId) throw new Error(`Payment ${payment.id} has no internshipId — cannot provision an enrollment`);

  // Account-level referral (partner-registered students, users.partnerId) is
  // copied onto every enrollment so partner reports that group by
  // enrollments.partnerId keep counting them.
  const creator = await db.get('SELECT createdAt, createdByAdmin, partnerId FROM users WHERE id = ?', payment.userId);
  const referrerId = creator && creator.partnerId ? creator.partnerId : null;

  // A refunded enrollment (repurchase) or a duplicate invoice can leave an
  // enrollment row for this user+track that this payment isn't linked to.
  // Reuse it — inserting would violate UNIQUE(userId, internshipId) and roll
  // the whole completion back, stranding a charge that was already captured.
  const already = await db.get('SELECT * FROM enrollments WHERE userId = ? AND internshipId = ?', payment.userId, internshipId);
  if (already) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);
    await db.run("UPDATE enrollments SET status = CASE WHEN status IN ('pending', 'refunded') THEN 'active' ELSE status END, expiresAt = ?, partnerId = COALESCE(partnerId, ?) WHERE id = ?", expiresAt.toISOString(), referrerId, already.id);
    await db.run('UPDATE payments SET enrollmentId = ? WHERE id = ?', already.id, payment.id);
    payment.enrollmentId = already.id;
    return await db.get('SELECT * FROM enrollments WHERE id = ?', already.id);
  }

  // Admin-registered users start the internship from their (possibly backdated)
  // registration date instead of the payment date
  const enrolledAt = creator && creator.createdByAdmin
    ? creator.createdAt
    : new Date().toISOString().replace('T', ' ').slice(0, 19);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  // A fresh enrollment always starts at 0% — progress is derived from
  // completed learning modules (see isCourseCompleted in routes/student.js).
  const result = await db.run('INSERT INTO enrollments (userId, internshipId, status, expiresAt, enrolledAt, progress, partnerId) VALUES (?, ?, ?, ?, ?, ?, ?)', payment.userId, internshipId, 'active', expiresAt.toISOString(), enrolledAt, 0, referrerId);

  // Non-sequential document numbers for this enrollment (offer/report/attendance)
  const created = { id: result.lastInsertRowid };
  await ensureEnrollmentNumber(db, created, 'offerNo');
  await ensureEnrollmentNumber(db, created, 'reportNo');
  await ensureEnrollmentNumber(db, created, 'attendanceNo');

  await db.run('UPDATE payments SET enrollmentId = ? WHERE id = ?', created.id, payment.id);
  payment.enrollmentId = created.id;

  return await db.get('SELECT * FROM enrollments WHERE id = ?', created.id);
}

// Idempotent completion used by verify/webhook/admin. A payment whose
// deadline passed but whose charge was actually captured (valid Razorpay
// signature or webhook) is still completed here — the deadline only kills
// invoices nobody ever paid. `amount` (rupees, from the authoritative order/
// payment entity) reconciles the recorded total with what was actually
// charged if the invoice was re-priced after the order was created.
async function completePayment(payment, { transactionId = null, razorpayOrderId = null, razorpayPaymentId = null, amount = null } = {}) {
  if (payment.status === 'completed') {
    return await db.get('SELECT * FROM payments WHERE id = ?', payment.id);
  }

  const run = db.transaction(async () => {
    await db.run(`
      UPDATE payments
      SET status = 'completed',
          amount = COALESCE(?, amount),
          transactionId = COALESCE(?, transactionId),
          razorpayOrderId = COALESCE(?, razorpayOrderId),
          razorpayPaymentId = COALESCE(?, razorpayPaymentId),
          paidAt = to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ?
    `, amount, transactionId, razorpayOrderId, razorpayPaymentId, payment.id);

    const enrollment = await ensureEnrollment(db, payment);

    const internship = await db.get('SELECT * FROM internships WHERE id = ?', enrollment.internshipId);
    const existingExam = await db.get('SELECT id FROM exams WHERE enrollmentId = ?', enrollment.id);
    if (!existingExam && internship) {
      await db.run('INSERT INTO exams (userId, internshipId, enrollmentId, scheduledAt) VALUES (?, ?, ?, ?)', payment.userId, enrollment.internshipId, enrollment.id, internship.examDate || null);
    }
  });
  await run();

  return await db.get('SELECT * FROM payments WHERE id = ?', payment.id);
}

// Creates (or reuses) the Razorpay order bound to an invoice and returns
// `{ order, alreadyPaid? }`. Used by the partner register-and-pay flow;
// routes/student.js /pay/:id/order carries the original inline copy — the two
// must stay behaviourally identical, because a SECOND order for the same
// invoice orphans any charge made on the first one (verify rejects it, the
// webhook lookup misses it and still answers 200, so Razorpay never retries).
//
// Throws an Error with `.code` of 'NOT_CONFIGURED' or 'ORDER_BIND_RACE' so the
// route can map it to the right HTTP status.
async function createOrderForPayment(payment) {
  if (!rzp.isLive()) {
    const err = new Error('Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file and restart the server.');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  // REUSE the order already stored on this invoice rather than creating a
  // second one and overwriting razorpayOrderId.
  if (payment.razorpayOrderId) {
    try {
      const existingOrder = await rzp.fetchOrder(payment.razorpayOrderId);
      if (existingOrder.status === 'paid') {
        // Money captured but the row is still pending (both verify and the
        // webhook missed it). Complete straight from the authoritative API.
        const captured = (await rzp.fetchPaymentsForOrder(existingOrder.id))
          .find((p) => p.status === 'captured');
        if (captured) {
          await completePayment(payment, {
            transactionId: captured.id,
            razorpayOrderId: existingOrder.id,
            razorpayPaymentId: captured.id,
            amount: Number(captured.amount) / 100,
          });
          return { order: existingOrder, alreadyPaid: true };
        }
      }
      return { order: existingOrder };
    } catch (err) {
      // Stale/foreign order id (e.g. deleted in the Razorpay dashboard) —
      // drop it and fall through to a fresh order.
      console.error('Razorpay order reuse failed:', err.message);
      payment.razorpayOrderId = null;
    }
  }

  const order = await rzp.createOrder({
    amountPaise: Math.round(Number(payment.amount) * 100),
    receipt: payment.receiptNumber,
    notes: { paymentId: String(payment.id), enrollmentId: String(payment.enrollmentId ?? 'null') },
  });

  // Bind atomically: a concurrent request may have stored its order first.
  const claim = await db.run(
    'UPDATE payments SET razorpayOrderId = ?, method = ? WHERE id = ? AND razorpayOrderId IS NULL',
    order.id, 'razorpay', payment.id,
  );
  if (claim.changes === 0) {
    const fresh = await db.get('SELECT razorpayOrderId FROM payments WHERE id = ?', payment.id);
    if (fresh && fresh.razorpayOrderId) {
      try {
        return { order: await rzp.fetchOrder(fresh.razorpayOrderId) };
      } catch (err) {
        console.error('Razorpay order fetch after claim race failed:', err.message);
        const race = new Error('Could not start the payment. Please try again shortly.');
        race.code = 'ORDER_BIND_RACE';
        throw race;
      }
    }
    const race = new Error('Could not start the payment. Please try again shortly.');
    race.code = 'ORDER_BIND_RACE';
    throw race;
  }

  return { order };
}

// Reference stamped on a payment an admin completes by hand. The `adm_` prefix
// is deliberately visible (admin list, receipts) so a manual approval can never
// be mistaken for a Razorpay capture: any transactionId starting with `adm_`
// means "a human granted this access", not "money moved through Razorpay".
// A caller-supplied reference is kept and only prefixed, so a bank/UPI
// reference stays readable.
const ADMIN_TXN_PREFIX = 'adm_';
const ADMIN_TXN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

async function makeAdminTransactionId(provided) {
  const raw = String(provided == null ? '' : provided).trim();
  if (raw) return raw.startsWith(ADMIN_TXN_PREFIX) ? raw : ADMIN_TXN_PREFIX + raw;

  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = crypto.randomBytes(8);
    let candidate = ADMIN_TXN_PREFIX;
    for (let i = 0; i < bytes.length; i++) candidate += ADMIN_TXN_ALPHABET[bytes[i] % ADMIN_TXN_ALPHABET.length];
    const clash = await db.get('SELECT 1 FROM payments WHERE transactionId = ?', candidate);
    if (!clash) return candidate;
  }
  throw new Error('Could not allocate a unique admin transaction id');
}

module.exports = { completePayment, paymentTimeLimitMinutes, expirePendingPayments, expireIfDue, makeAdminTransactionId, createOrderForPayment };
