const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { authenticateToken } = require('../middleware/auth');
const { newReceiptNumber } = require('../lib/docNumbers');
const rzp = require('../lib/razorpay');
const { completePayment } = require('../lib/payments');
const registry = require('../lib/supabaseRegistry');

const router = express.Router();

// The exam unlocks only after every learning module of the track is completed.
// Tracks with no published modules stay locked — an empty curriculum is not
// "completed".
const isCourseCompleted = (enrollment) =>
  Number(enrollment.moduleCount) > 0 && Number(enrollment.courseProgress) >= 100;

// ===================== STUDENT PROFILE =====================
router.get('/profile', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, firstName, lastName, email, phone, university, college, course, year, role, createdAt FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

router.put('/profile', authenticateToken, (req, res) => {
  const { firstName, lastName, phone, university, college, course, year } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET firstName = ?, lastName = ?, phone = ?, university = ?, college = ?, course = ?, year = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
    .run(firstName, lastName, phone, university, college, course, year, req.user.id);
  registry.enqueueStudent(req.user.id);

  const updated = db.prepare('SELECT id, firstName, lastName, email, phone, university, college, course, year, role FROM users WHERE id = ?').get(req.user.id);
  res.json({ message: 'Profile updated', user: updated });
});

router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(newPassword, salt);
  db.prepare('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, req.user.id);

  res.json({ message: 'Password changed successfully' });
});

// ===================== STUDENT DASHBOARD =====================
router.get('/dashboard', authenticateToken, (req, res) => {
  const enrollments = db.prepare(`
    SELECT e.*, i.title as internshipTitle, i.category, i.duration, i.modules, i.topics
    FROM enrollments e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.userId = ?
    ORDER BY e.enrolledAt DESC
  `).all(req.user.id);

  const payments = db.prepare(`
    SELECT p.*, i.title as internshipTitle
    FROM payments p
    JOIN internships i ON i.id = p.internshipId
    WHERE p.userId = ?
    ORDER BY p.createdAt DESC
  `).all(req.user.id);

  const exams = db.prepare(`
    SELECT e.*, i.title as internshipTitle, en.progress as courseProgress, en.status as enrollmentStatus,
      (SELECT COUNT(*) FROM learning_modules lm WHERE lm.internshipId = i.id) as moduleCount
    FROM exams e
    JOIN internships i ON e.internshipId = i.id
    JOIN enrollments en ON en.id = e.enrollmentId
    WHERE e.userId = ?
    ORDER BY e.id DESC
  `).all(req.user.id).map(exam => ({ ...exam, courseCompleted: isCourseCompleted(exam) }));

  const certificates = db.prepare(`
    SELECT c.*, i.title as internshipTitle
    FROM certificates c
    JOIN enrollments e ON c.enrollmentId = e.id
    JOIN internships i ON e.internshipId = i.id
    WHERE c.userId = ?
  `).all(req.user.id);

  res.json({ enrollments, payments, exams, certificates });
});

// ===================== ENROLLMENT STATUS CHECK =====================
router.get('/enrollment-status', authenticateToken, (req, res) => {
  const enrollment = db.prepare(`
    SELECT e.*, i.title as internshipTitle
    FROM enrollments e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.userId = ? AND e.status IN ('active', 'completed')
    ORDER BY e.enrolledAt DESC LIMIT 1
  `).get(req.user.id);

  res.json({ hasEnrollment: !!enrollment, enrollment: enrollment || null });
});

// ===================== SINGLE ENROLLMENT WITH MODULES =====================
router.get('/enrollment/:id', authenticateToken, (req, res) => {
  const enrollment = db.prepare(`
    SELECT e.*, i.title as internshipTitle, i.category, i.duration, i.modules, i.topics
    FROM enrollments e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.id = ? AND e.userId = ?
  `).get(req.params.id, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  res.json({ enrollment });
});

// ===================== COMPLETE MODULE =====================
router.post('/complete-module/:enrollmentId', authenticateToken, (req, res) => {
  const enrollment = db.prepare(`
    SELECT e.* FROM enrollments e
    WHERE e.id = ? AND e.userId = ?
  `).get(req.params.enrollmentId, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

  const { moduleIndex } = req.body;
  let completed = [];
  try { completed = JSON.parse(enrollment.completedModules || '[]'); } catch { completed = []; }

  if (!completed.includes(moduleIndex)) {
    completed.push(moduleIndex);
  }

  const totalModules = db.prepare('SELECT COUNT(*) as count FROM learning_modules WHERE internshipId = ?').get(enrollment.internshipId);
  const progress = totalModules.count > 0 ? Math.round((completed.length / totalModules.count) * 100) : 0;

  db.prepare('UPDATE enrollments SET completedModules = ?, progress = ? WHERE id = ?')
    .run(JSON.stringify(completed), progress, enrollment.id);
  registry.enqueueEnrollment(enrollment.id);

  res.json({ message: 'Module completed', completedModules: completed, progress });
});

// ===================== UNCOMPLETE MODULE =====================
router.post('/uncomplete-module/:enrollmentId', authenticateToken, (req, res) => {
  const enrollment = db.prepare(`
    SELECT e.* FROM enrollments e
    WHERE e.id = ? AND e.userId = ?
  `).get(req.params.enrollmentId, req.user.id);

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

  const { moduleIndex } = req.body;
  let completed = [];
  try { completed = JSON.parse(enrollment.completedModules || '[]'); } catch { completed = []; }

  completed = completed.filter(i => i !== moduleIndex);

  const totalModules = db.prepare('SELECT COUNT(*) as count FROM learning_modules WHERE internshipId = ?').get(enrollment.internshipId);
  const progress = totalModules.count > 0 ? Math.round((completed.length / totalModules.count) * 100) : 0;

  db.prepare('UPDATE enrollments SET completedModules = ?, progress = ? WHERE id = ?')
    .run(JSON.stringify(completed), progress, enrollment.id);
  registry.enqueueEnrollment(enrollment.id);

  res.json({ message: 'Module uncompleted', completedModules: completed, progress });
});

// ===================== AVAILABLE INTERNSHIPS =====================
router.get('/internships', authenticateToken, (req, res) => {
  const internships = db.prepare('SELECT * FROM internships WHERE isActive = 1 ORDER BY createdAt DESC').all();

  // Check which ones user is enrolled in
  const enrolled = db.prepare('SELECT internshipId FROM enrollments WHERE userId = ?').all(req.user.id);
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
// anywhere as "already enrolled".
router.post('/enroll', authenticateToken, (req, res) => {
  const { internshipId } = req.body;
  if (!internshipId) return res.status(400).json({ error: 'Internship ID required' });

  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(internshipId);
  if (!internship) return res.status(404).json({ error: 'Internship not found' });

  const existing = db.prepare('SELECT * FROM enrollments WHERE userId = ? AND internshipId = ?').get(req.user.id, internshipId);
  if (existing) return res.status(409).json({ error: 'Already enrolled in this internship' });

  // Reuse an unpaid invoice for this track instead of stacking duplicates —
  // and re-price it, since it still hasn't been paid and the price may have changed
  const pending = db.prepare("SELECT * FROM payments WHERE userId = ? AND internshipId = ? AND status = 'pending' ORDER BY id DESC").get(req.user.id, internshipId);
  if (pending) {
    if (pending.amount !== internship.price) {
      db.prepare('UPDATE payments SET amount = ? WHERE id = ?').run(internship.price, pending.id);
      pending.amount = internship.price;
      registry.enqueuePayment(pending.id);
    }
    return res.json({ message: 'Payment pending for this internship.', payment: pending });
  }

  const paymentResult = db.prepare('INSERT INTO payments (userId, enrollmentId, internshipId, amount, receiptNumber, status) VALUES (?, NULL, ?, ?, ?, ?)')
    .run(req.user.id, internshipId, internship.price, newReceiptNumber(db), 'pending');
  registry.enqueuePayment(paymentResult.lastInsertRowid);

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentResult.lastInsertRowid);
  res.status(201).json({ message: 'Payment pending. Complete the payment to enroll.', payment });
});

// Create a Razorpay order for this payment. The amount always comes from the
// database — the client can never submit its own price.
router.post('/pay/:paymentId/order', authenticateToken, async (req, res) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ? AND userId = ?').get(req.params.paymentId, req.user.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status === 'completed') return res.status(409).json({ error: 'Payment already completed' });

  const amountPaise = Math.round(payment.amount * 100);

  if (rzp.isLive()) {
    try {
      const order = await rzp.createOrder({
        amountPaise,
        receipt: payment.receiptNumber,
        notes: { paymentId: String(payment.id), enrollmentId: String(payment.enrollmentId) },
      });
      db.prepare("UPDATE payments SET razorpayOrderId = ?, method = 'razorpay' WHERE id = ?").run(order.id, payment.id);
      return res.json({
        demo: false,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
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
router.post('/pay/:paymentId/verify', authenticateToken, (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification details' });
  }

  const payment = db.prepare('SELECT * FROM payments WHERE id = ? AND userId = ?').get(req.params.paymentId, req.user.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status === 'completed') return res.json({ message: 'Payment already completed', payment });

  // The signature is only honoured for the order this payment was bound to
  if (!payment.razorpayOrderId || payment.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ error: 'This order does not match the payment' });
  }

  // Only Razorpay can produce a valid HMAC signature for this order
  if (!rzp.verifyPaymentSignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  const updated = completePayment(payment, {
    transactionId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
  });
  res.json({ message: 'Payment successful', payment: updated });
});

// ===================== EXAM =====================
router.get('/exam/:enrollmentId', authenticateToken, (req, res) => {
  const exam = db.prepare(`
    SELECT e.*, i.title as internshipTitle, i.topics, en.progress as courseProgress, en.status as enrollmentStatus,
      (SELECT COUNT(*) FROM learning_modules lm WHERE lm.internshipId = i.id) as moduleCount
    FROM exams e
    JOIN internships i ON e.internshipId = i.id
    JOIN enrollments en ON en.id = e.enrollmentId AND en.userId = e.userId
    WHERE e.enrollmentId = ? AND e.userId = ?
  `).get(req.params.enrollmentId, req.user.id);

  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  exam.courseCompleted = isCourseCompleted(exam);
  res.json({ exam });
});

router.post('/exam/:examId/start', authenticateToken, (req, res) => {
  const exam = db.prepare(`
    SELECT e.*, i.category, en.progress as courseProgress, en.status as enrollmentStatus,
      (SELECT COUNT(*) FROM learning_modules lm WHERE lm.internshipId = i.id) as moduleCount
    FROM exams e
    JOIN internships i ON e.internshipId = i.id
    JOIN enrollments en ON en.id = e.enrollmentId AND en.userId = e.userId
    WHERE e.id = ? AND e.userId = ?
  `).get(req.params.examId, req.user.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
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

  const questions = db.prepare('SELECT id, question, optionA, optionB, optionC, optionD FROM questions WHERE track = ? AND isActive = 1 ORDER BY RANDOM() LIMIT ?')
    .all(exam.category, exam.totalQuestions);

  if (questions.length === 0) {
    return res.status(400).json({ error: 'No questions available for this track. Please contact admin.' });
  }

  const questionsForClient = questions.map(q => ({
    id: q.id,
    question: q.question,
    options: [q.optionA, q.optionB, q.optionC, q.optionD],
  }));

  db.prepare("UPDATE exams SET status = 'in_progress', startedAt = CURRENT_TIMESTAMP WHERE id = ?").run(exam.id);
  res.json({ message: 'Exam started', questions: questionsForClient, duration: exam.duration, totalQuestions: questions.length });
});

router.post('/exam/:examId/submit', authenticateToken, (req, res) => {
  const { answers } = req.body;
  const exam = db.prepare(`
    SELECT e.*, i.category
    FROM exams e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.id = ? AND e.userId = ?
  `).get(req.params.examId, req.user.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (exam.status !== 'in_progress') return res.status(400).json({ error: 'Exam is not in progress' });

  // Fetch correct answers from DB
  const dbQuestions = db.prepare('SELECT id, correct FROM questions WHERE track = ? AND isActive = 1').all(exam.category);
  const correctMap = {};
  dbQuestions.forEach(q => { correctMap[q.id] = q.correct; });

  let score = 0;
  let answered = 0;
  if (Array.isArray(answers)) {
    for (const ans of answers) {
      if (ans && ans.questionId && correctMap[ans.questionId] !== undefined) {
        answered++;
        if (ans.selectedOption === correctMap[ans.questionId]) {
          score++;
        }
      }
    }
  }
  const total = dbQuestions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const status = percentage >= 40 ? 'completed' : 'failed';

  db.prepare("UPDATE exams SET status = ?, score = ?, answers = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?")
    .run(status, percentage, JSON.stringify(answers || []), exam.id);

  if (status === 'completed') {
    const existingCert = db.prepare('SELECT id FROM certificates WHERE enrollmentId = ?').get(exam.enrollmentId);
    if (!existingCert) {
      const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : 'D';
      let certId;
      let isUnique = false;
      while (!isUnique) {
        certId = `IQI-${new Date().getFullYear()}-${crypto.randomBytes(4).readUInt32BE(0) % 1000000}`;
        const existing = db.prepare('SELECT id FROM certificates WHERE certificateId = ?').get(certId);
        if (!existing) isUnique = true;
      }
      db.prepare('INSERT INTO certificates (userId, enrollmentId, examId, certificateId, grade, score) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.user.id, exam.enrollmentId, exam.id, certId, grade, percentage);
    }
    db.prepare("UPDATE enrollments SET status = 'completed' WHERE id = ?").run(exam.enrollmentId);
    registry.enqueueEnrollment(exam.enrollmentId);
  }

  const updatedExam = db.prepare('SELECT * FROM exams WHERE id = ?').get(exam.id);
  res.json({ message: 'Exam submitted', exam: updatedExam, score: percentage, total, correct: score, status });
});

// ===================== DOWNLOADS (designs live in routes/documents.js) =====================
router.use(require('./documents'));

// ===================== LEARNING MODULES =====================
router.get('/learning-modules/:internshipId', authenticateToken, (req, res) => {
  const internshipId = parseInt(req.params.internshipId);
  if (isNaN(internshipId)) return res.status(400).json({ error: 'Invalid internship ID' });

  const modules = db.prepare(`
    SELECT id, internshipId, title, description, moduleOrder, durationMinutes, difficulty, topics,
           learningObjectives, contentSections, quizQuestions, resources, videoUrl
    FROM learning_modules
    WHERE internshipId = ?
    ORDER BY moduleOrder ASC
  `).all(internshipId);
  
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

router.get('/learning-module/:moduleId', authenticateToken, (req, res) => {
  const moduleId = parseInt(req.params.moduleId);
  if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

  const module = db.prepare(`
    SELECT * FROM learning_modules WHERE id = ?
  `).get(moduleId);
  
  if (!module) return res.status(404).json({ error: 'Module not found' });
  
  // Parse JSON fields
  module.learningObjectives = JSON.parse(module.learningObjectives || '[]');
  module.contentSections = JSON.parse(module.contentSections || '[]');
  module.quizQuestions = JSON.parse(module.quizQuestions || '[]');
  module.resources = JSON.parse(module.resources || '[]');
  module.topics = module.topics ? module.topics.split(',') : [];
  
  res.json({ module });
});

router.get('/learning-progress/:internshipId', authenticateToken, (req, res) => {
  const internshipId = parseInt(req.params.internshipId);
  if (isNaN(internshipId)) return res.status(400).json({ error: 'Invalid internship ID' });

  const modules = db.prepare(`
    SELECT id FROM learning_modules WHERE internshipId = ?
  `).all(internshipId);
  
  const enrollment = db.prepare(`
    SELECT completedModules FROM enrollments
    WHERE userId = ? AND internshipId = ?
  `).get(req.user.id, internshipId);
  
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
