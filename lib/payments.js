// Shared payment completion logic — used by the checkout verify route, the
// Razorpay webhook and the admin manual-completion path. Always runs inside a
// transaction and is idempotent so double verification / webhook retries can
// never double-activate anything.
const db = require('../db');
const registry = require('./supabaseRegistry');
const { ensureEnrollmentNumber } = require('./docNumbers');

// The enrollment row comes into existence HERE — and only here, i.e. strictly
// after the payment succeeded. Pending payments hold no enrollment, so an
// unpaid user can never be presented as "enrolled" anywhere in the app.
function ensureEnrollment(db, payment) {
  if (payment.enrollmentId) {
    const existing = db.prepare('SELECT * FROM enrollments WHERE id = ?').get(payment.enrollmentId);
    if (existing) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);
      db.prepare("UPDATE enrollments SET status = CASE WHEN status = 'pending' THEN 'active' ELSE status END, expiresAt = ? WHERE id = ?")
        .run(expiresAt.toISOString(), existing.id);
      return existing;
    }
  }

  const internshipId = payment.internshipId;
  if (!internshipId) throw new Error(`Payment ${payment.id} has no internshipId — cannot provision an enrollment`);

  // Admin-registered users start the internship from their (possibly backdated)
  // registration date instead of the payment date
  const creator = db.prepare('SELECT createdAt, createdByAdmin FROM users WHERE id = ?').get(payment.userId);
  const enrolledAt = creator && creator.createdByAdmin
    ? creator.createdAt
    : new Date().toISOString().replace('T', ' ').slice(0, 19);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  // A fresh enrollment always starts at 0% — progress is derived from
  // completed learning modules (see isCourseCompleted in routes/student.js).
  const result = db.prepare('INSERT INTO enrollments (userId, internshipId, status, expiresAt, enrolledAt, progress) VALUES (?, ?, ?, ?, ?, ?)')
    .run(payment.userId, internshipId, 'active', expiresAt.toISOString(), enrolledAt, 0);

  // Non-sequential document numbers for this enrollment (offer/report/attendance)
  const created = { id: result.lastInsertRowid };
  ensureEnrollmentNumber(db, created, 'offerNo');
  ensureEnrollmentNumber(db, created, 'reportNo');
  ensureEnrollmentNumber(db, created, 'attendanceNo');

  db.prepare('UPDATE payments SET enrollmentId = ? WHERE id = ?').run(created.id, payment.id);
  payment.enrollmentId = created.id;

  return db.prepare('SELECT * FROM enrollments WHERE id = ?').get(created.id);
}

function completePayment(payment, { transactionId = null, razorpayOrderId = null, razorpayPaymentId = null } = {}) {
  if (payment.status === 'completed') {
    return db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
  }

  const run = db.transaction(() => {
    db.prepare(`
      UPDATE payments
      SET status = 'completed',
          transactionId = COALESCE(?, transactionId),
          razorpayOrderId = COALESCE(?, razorpayOrderId),
          razorpayPaymentId = COALESCE(?, razorpayPaymentId),
          paidAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(transactionId, razorpayOrderId, razorpayPaymentId, payment.id);

    const enrollment = ensureEnrollment(db, payment);

    const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(enrollment.internshipId);
    const existingExam = db.prepare('SELECT id FROM exams WHERE enrollmentId = ?').get(enrollment.id);
    if (!existingExam && internship) {
      db.prepare('INSERT INTO exams (userId, internshipId, enrollmentId, scheduledAt) VALUES (?, ?, ?, ?)')
        .run(payment.userId, enrollment.internshipId, enrollment.id, internship.examDate || null);
    }
  });
  run();

  registry.enqueuePayment(payment.id);
  if (payment.enrollmentId) registry.enqueueEnrollment(payment.enrollmentId);

  return db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
}

module.exports = { completePayment, ensureEnrollment };
