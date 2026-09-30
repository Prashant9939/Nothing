// Shared payment completion logic — used by the checkout verify route, the
// Razorpay webhook and the admin manual-completion path. Always runs inside a
// transaction and is idempotent so double verification / webhook retries can
// never double-activate anything.
const db = require('../db');
const { ensureEnrollmentNumber } = require('./docNumbers');

// The enrollment row comes into existence HERE — and only here, i.e. strictly
// after the payment succeeded. Pending payments hold no enrollment, so an
// unpaid user can never be presented as "enrolled" anywhere in the app.
async function ensureEnrollment(db, payment) {
  if (payment.enrollmentId) {
    const existing = await db.get('SELECT * FROM enrollments WHERE id = ?', payment.enrollmentId);
    if (existing) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);
      await db.run("UPDATE enrollments SET status = CASE WHEN status = 'pending' THEN 'active' ELSE status END, expiresAt = ? WHERE id = ?", expiresAt.toISOString(), existing.id);
      return existing;
    }
  }

  const internshipId = payment.internshipId;
  if (!internshipId) throw new Error(`Payment ${payment.id} has no internshipId — cannot provision an enrollment`);

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

async function completePayment(payment, { transactionId = null, razorpayOrderId = null, razorpayPaymentId = null } = {}) {
  if (payment.status === 'completed') {
    return await db.get('SELECT * FROM payments WHERE id = ?', payment.id);
  }

  const run = db.transaction(async () => {
    await db.run(`
      UPDATE payments
      SET status = 'completed',
          transactionId = COALESCE(?, transactionId),
          razorpayOrderId = COALESCE(?, razorpayOrderId),
          razorpayPaymentId = COALESCE(?, razorpayPaymentId),
          paidAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, transactionId, razorpayOrderId, razorpayPaymentId, payment.id);

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

module.exports = { completePayment };
