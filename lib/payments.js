// Shared payment completion logic — used by the checkout verify route, the
// Razorpay webhook and the admin manual-completion path. Always runs inside a
// transaction and is idempotent so double verification / webhook retries can
// never double-activate anything.
const db = require('../db');
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

  // A refunded enrollment (repurchase) or a duplicate invoice can leave an
  // enrollment row for this user+track that this payment isn't linked to.
  // Reuse it — inserting would violate UNIQUE(userId, internshipId) and roll
  // the whole completion back, stranding a charge that was already captured.
  const already = await db.get('SELECT * FROM enrollments WHERE userId = ? AND internshipId = ?', payment.userId, internshipId);
  if (already) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);
    await db.run("UPDATE enrollments SET status = CASE WHEN status IN ('pending', 'refunded') THEN 'active' ELSE status END, expiresAt = ? WHERE id = ?", expiresAt.toISOString(), already.id);
    await db.run('UPDATE payments SET enrollmentId = ? WHERE id = ?', already.id, payment.id);
    payment.enrollmentId = already.id;
    return await db.get('SELECT * FROM enrollments WHERE id = ?', already.id);
  }

  // Admin-registered users start the internship from their (possibly backdated)
  // registration date instead of the payment date
  const creator = await db.get('SELECT createdAt, createdByAdmin FROM users WHERE id = ?', payment.userId);
  const enrolledAt = creator && creator.createdByAdmin
    ? creator.createdAt
    : new Date().toISOString().replace('T', ' ').slice(0, 19);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  // A fresh enrollment always starts at 0% — progress is derived from
  // completed learning modules (see isCourseCompleted in routes/student.js).
  const result = await db.run('INSERT INTO enrollments (userId, internshipId, status, expiresAt, enrolledAt, progress) VALUES (?, ?, ?, ?, ?, ?)', payment.userId, internshipId, 'active', expiresAt.toISOString(), enrolledAt, 0);

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

module.exports = { completePayment, paymentTimeLimitMinutes, expirePendingPayments, expireIfDue };
