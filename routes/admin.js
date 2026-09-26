const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const registry = require('../lib/supabaseRegistry');
const { completePayment } = require('../lib/payments');

const router = express.Router();

// Admin middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ===================== DASHBOARD STATS =====================
router.get('/dashboard', authenticateToken, adminOnly, (req, res) => {
  const stats = {
    totalStudents: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count,
    totalInternships: db.prepare('SELECT COUNT(*) as count FROM internships').get().count,
    totalEnrollments: db.prepare('SELECT COUNT(*) as count FROM enrollments').get().count,
    totalRevenue: db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'").get().total,
    pendingPayments: db.prepare("SELECT COUNT(*) as count FROM payments WHERE status = 'pending'").get().count,
    completedExams: db.prepare("SELECT COUNT(*) as count FROM exams WHERE status = 'completed'").get().count,
    certificatesIssued: db.prepare('SELECT COUNT(*) as count FROM certificates').get().count,
    activeStudents: db.prepare("SELECT COUNT(*) as count FROM enrollments WHERE status = 'active'").get().count,
  };

  const recentEnrollments = db.prepare(`
    SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM enrollments e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY e.enrolledAt DESC LIMIT 10
  `).all();

  const recentPayments = db.prepare(`
    SELECT p.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM payments p
    JOIN users u ON p.userId = u.id
    JOIN internships i ON i.id = p.internshipId
    ORDER BY p.createdAt DESC LIMIT 10
  `).all();

  res.json({ stats, recentEnrollments, recentPayments });
});

// ===================== SITE ANALYTICS =====================
const ANALYTICS_RANGES = {
  '1d': { days: 1, hourly: true },
  '7d': { days: 7, hourly: false },
  '30d': { days: 30, hourly: false },
};
const pad2 = (n) => String(n).padStart(2, '0');
// Stored timestamps are 'YYYY-MM-DD HH:MM:SS' in UTC — format JS dates the
// same way so string comparisons line up on boundary days.
const utcStamp = (d) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
const localDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const localHour = (d) => `${localDay(d)} ${pad2(d.getHours())}:00`;

router.get('/analytics', authenticateToken, adminOnly, (req, res) => {
  const range = ANALYTICS_RANGES[req.query.range] ? req.query.range : '7d';
  const { days, hourly } = ANALYTICS_RANGES[range];

  const now = new Date();
  const start = hourly
    ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const startStamp = utcStamp(start);
  const prevStart = new Date(start.getTime() - (hourly ? 24 : days) * 24 * 60 * 60 * 1000);
  const prevStartStamp = utcStamp(prevStart);

  // Per-bucket traffic series (local time buckets)
  const bucketExpr = hourly
    ? "strftime('%Y-%m-%d %H:00', createdAt, 'localtime')"
    : "date(createdAt, 'localtime')";
  const eventRows = db.prepare(`
    SELECT ${bucketExpr} AS bucket,
           COUNT(DISTINCT visitorId) AS visitors,
           COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
           COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS pageviews,
           COALESCE(SUM(CASE WHEN type = 'visit' THEN 1 ELSE 0 END), 0) AS visits
    FROM analytics_events
    WHERE createdAt >= ?
    GROUP BY bucket
  `).all(startStamp);

  // Window totals — current period and the equally-long previous period (deltas)
  const eventTotals = (from, to) => db.prepare(`
    SELECT COUNT(DISTINCT visitorId) AS visitors,
           COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
           COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS pageviews,
           COALESCE(SUM(CASE WHEN type = 'visit' THEN 1 ELSE 0 END), 0) AS visits
    FROM analytics_events
    WHERE createdAt >= ?${to ? ' AND createdAt < ?' : ''}
  `).get(...(to ? [from, to] : [from])) || {};

  const summary = { ...eventTotals(startStamp) };
  const previous = { ...eventTotals(prevStartStamp, startStamp) };
  summary.avgClicks = summary.visitors ? Math.round((summary.clicks / summary.visitors) * 10) / 10 : 0;
  previous.avgClicks = previous.visitors ? Math.round((previous.clicks / previous.visitors) * 10) / 10 : 0;

  // Business metrics for the same windows
  const bizTotals = (from, to) => db.prepare(`
    SELECT (SELECT COUNT(*) FROM users WHERE createdAt >= ?${to ? ' AND createdAt < ?' : ''}) AS signups,
           (SELECT COUNT(*) FROM payments WHERE status = 'completed' AND paidAt >= ?${to ? ' AND paidAt < ?' : ''}) AS enrollments,
           (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND paidAt >= ?${to ? ' AND paidAt < ?' : ''}) AS revenue
  `).get(...(to ? [from, to, from, to, from, to] : [from, from, from])) || {};
  Object.assign(summary, bizTotals(startStamp));
  Object.assign(previous, bizTotals(prevStartStamp, startStamp));

  const signupRows = db.prepare(`
    SELECT ${bucketExpr} AS bucket, COUNT(*) AS signups
    FROM users WHERE createdAt >= ? GROUP BY bucket
  `).all(startStamp);
  const revenueRows = db.prepare(`
    SELECT ${hourly ? "strftime('%Y-%m-%d %H:00', paidAt, 'localtime')" : "date(paidAt, 'localtime')"} AS bucket,
           COUNT(*) AS enrollments, COALESCE(SUM(amount), 0) AS revenue
    FROM payments WHERE status = 'completed' AND paidAt >= ? GROUP BY bucket
  `).all(startStamp);

  const topPages = db.prepare(`
    SELECT path,
           COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS views,
           COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
    FROM analytics_events
    WHERE createdAt >= ? AND path IS NOT NULL
    GROUP BY path
    ORDER BY views DESC, clicks DESC
    LIMIT 8
  `).all(startStamp);

  // Fill every bucket so charts render continuous series
  const eventMap = new Map(eventRows.map((r) => [r.bucket, r]));
  const signupMap = new Map(signupRows.map((r) => [r.bucket, r.signups]));
  const revenueMap = new Map(revenueRows.map((r) => [r.bucket, r]));
  const series = [];
  const pushBucket = (key) => {
    const ev = eventMap.get(key) || {};
    const rv = revenueMap.get(key) || {};
    series.push({
      bucket: key,
      visitors: ev.visitors || 0,
      clicks: ev.clicks || 0,
      pageviews: ev.pageviews || 0,
      visits: ev.visits || 0,
      signups: signupMap.get(key) || 0,
      enrollments: rv.enrollments || 0,
      revenue: rv.revenue || 0,
    });
  };
  if (hourly) {
    const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    for (let i = 23; i >= 0; i--) pushBucket(localHour(new Date(cur.getTime() - i * 60 * 60 * 1000)));
  } else {
    const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = days - 1; i >= 0; i--) pushBucket(localDay(new Date(cur.getTime() - i * 24 * 60 * 60 * 1000)));
  }

  res.json({ range, hourly, summary, previous, series, topPages });
});

// ===================== INTERNSHIPS CRUD =====================
router.get('/internships', authenticateToken, adminOnly, (req, res) => {
  const internships = db.prepare('SELECT * FROM internships ORDER BY createdAt DESC').all();
  res.json({ internships });
});

router.get('/internships/:id', authenticateToken, adminOnly, (req, res) => {
  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id);
  if (!internship) return res.status(404).json({ error: 'Internship not found' });
  res.json({ internship });
});

router.post('/internships', authenticateToken, adminOnly, (req, res) => {
  const { title, description, category, duration, price, originalPrice, modules, topics, examDate } = req.body;
  if (!title || !description || !category || !price) {
    return res.status(400).json({ error: 'Title, description, category, and price are required' });
  }
  const result = db.prepare(`
    INSERT INTO internships (title, description, category, duration, price, originalPrice, modules, topics, examDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, category, duration || 28, price, originalPrice || price, modules || 10, topics || '', examDate || null);

  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Internship created', internship });
});

router.put('/internships/:id', authenticateToken, adminOnly, (req, res) => {
  const { title, description, category, duration, price, originalPrice, modules, topics, isActive, examDate } = req.body;
  const existing = db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Internship not found' });

  db.prepare(`
    UPDATE internships
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        duration = COALESCE(?, duration),
        price = COALESCE(?, price),
        originalPrice = COALESCE(?, originalPrice),
        modules = COALESCE(?, modules),
        topics = COALESCE(?, topics),
        isActive = COALESCE(?, isActive),
        examDate = COALESCE(?, examDate),
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, category, duration, price, originalPrice, modules, topics, isActive, examDate, req.params.id);

  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id);
  res.json({ message: 'Internship updated', internship });
});

router.delete('/internships/:id', authenticateToken, adminOnly, (req, res) => {
  const existing = db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Internship not found' });
  const affectedEnrollments = db.prepare('SELECT id FROM enrollments WHERE internshipId = ?')
    .all(req.params.id).map((row) => row.id);
  db.prepare('DELETE FROM internships WHERE id = ?').run(req.params.id);
  if (affectedEnrollments.length > 0) registry.enqueueRemoveEnrollments(affectedEnrollments);
  res.json({ message: 'Internship deleted' });
});

// ===================== USERS MANAGEMENT =====================
router.get('/users', authenticateToken, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, firstName, lastName, email, phone, university, college, course, year, role, createdAt FROM users ORDER BY createdAt DESC').all();
  res.json({ users });
});

// Register a student on behalf of the admin, with a chosen registration date
router.post('/users', authenticateToken, adminOnly, (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, university, college, course, year,
      password, gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
      registeredAt,
    } = req.body;

    if (!firstName || !email || !phone || !university || !college || !course || !year || !password) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const regDate = registeredAt || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(regDate) || isNaN(new Date(regDate).getTime()) || regDate > today) {
      return res.status(400).json({ error: 'Registration date must be a valid date on or before today' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(12));

    const result = db.prepare(`
      INSERT INTO users (firstName, lastName, email, phone, university, college, course, year,
                         gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
                         password, role, createdAt, createdByAdmin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'student', ?, 1)
    `).run(
      firstName, lastName || '', String(email).toLowerCase(), phone, university, college, course, year,
      gender || '', dob || '', rollNo || '', regNo || '',
      guardianName || '', guardianPhone || '', guardianRelation || '',
      hashedPassword, `${regDate} 12:00:00`
    );

    const user = db.prepare('SELECT id, firstName, lastName, email, role, createdAt FROM users WHERE id = ?')
      .get(result.lastInsertRowid);
    registry.enqueueStudent(user.id);
    res.status(201).json({ message: 'Registration created', user });
  } catch (err) {
    console.error('Admin registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', authenticateToken, adminOnly, (req, res) => {
  const user = db.prepare('SELECT id, firstName, lastName, email, phone, university, college, course, year, role, createdAt FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const enrollments = db.prepare(`
    SELECT e.*, i.title as internshipTitle
    FROM enrollments e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.userId = ?
  `).all(req.params.id);

  const payments = db.prepare('SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC').all(req.params.id);
  const exams = db.prepare('SELECT * FROM exams WHERE userId = ? ORDER BY id DESC').all(req.params.id);
  const certificates = db.prepare('SELECT * FROM certificates WHERE userId = ?').all(req.params.id);

  res.json({ user, enrollments, payments, exams, certificates });
});

router.put('/users/:id/role', authenticateToken, adminOnly, (req, res) => {
  const { role } = req.body;
  if (!['student', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  db.prepare('UPDATE users SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(role, req.params.id);
  registry.enqueueRoleChange(Number(req.params.id), role);
  res.json({ message: 'User role updated' });
});

router.delete('/users/:id', authenticateToken, adminOnly, (req, res) => {
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin users' });

  db.prepare('DELETE FROM certificates WHERE userId = ?').run(req.params.id);
  db.prepare('DELETE FROM exams WHERE userId = ?').run(req.params.id);
  db.prepare('DELETE FROM payments WHERE userId = ?').run(req.params.id);
  db.prepare('DELETE FROM enrollments WHERE userId = ?').run(req.params.id);
  db.prepare('DELETE FROM sessions WHERE userId = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  registry.enqueueRemoveStudent(Number(req.params.id));

  res.json({ message: 'User deleted successfully' });
});

// ===================== ENROLLMENTS MANAGEMENT =====================
router.get('/enrollments', authenticateToken, adminOnly, (req, res) => {
  const enrollments = db.prepare(`
    SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM enrollments e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY e.enrolledAt DESC
  `).all();
  res.json({ enrollments });
});

router.put('/enrollments/:id/status', authenticateToken, adminOnly, (req, res) => {
  const { status } = req.body;
  if (!['pending', 'active', 'completed', 'expired'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE enrollments SET status = ? WHERE id = ?').run(status, req.params.id);
  registry.enqueueEnrollment(Number(req.params.id));
  res.json({ message: 'Enrollment status updated' });
});

router.put('/enrollments/:id/progress', authenticateToken, adminOnly, (req, res) => {
  const { progress } = req.body;
  db.prepare('UPDATE enrollments SET progress = ? WHERE id = ?').run(progress, req.params.id);
  registry.enqueueEnrollment(Number(req.params.id));
  res.json({ message: 'Progress updated' });
});

// ===================== SETTINGS =====================
const { getAllSettings, setSettings } = require('../lib/settings');

const SETTING_KEYS = ['attendanceDateMode', 'companyName', 'companyAddress', 'companyCin', 'directorName', 'siteUrl'];

router.get('/settings', authenticateToken, adminOnly, (req, res) => {
  res.json({ settings: getAllSettings(db) });
});

// Partial update: only keys present in the body are written
router.put('/settings', authenticateToken, adminOnly, (req, res) => {
  const updates = {};
  for (const key of SETTING_KEYS) {
    if (req.body[key] === undefined) continue;
    updates[key] = String(req.body[key]).trim();
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No settings provided' });
  }
  if (updates.attendanceDateMode !== undefined && !['forward', 'backward'].includes(updates.attendanceDateMode)) {
    return res.status(400).json({ error: 'Invalid date mode. Use forward or backward.' });
  }
  if (updates.companyName !== undefined && !updates.companyName) {
    return res.status(400).json({ error: 'Company name is required' });
  }
  if (updates.companyAddress !== undefined && !updates.companyAddress) {
    return res.status(400).json({ error: 'Company address is required' });
  }
  if (updates.siteUrl !== undefined && updates.siteUrl && !/^https?:\/\/\S+$/.test(updates.siteUrl)) {
    return res.status(400).json({ error: 'Verification link must start with http:// or https://' });
  }
  setSettings(db, updates);
  res.json({ message: 'Settings updated', settings: getAllSettings(db) });
});

// ===================== PAYMENTS MANAGEMENT =====================
router.get('/payments', authenticateToken, adminOnly, (req, res) => {
  const payments = db.prepare(`
    SELECT p.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM payments p
    JOIN users u ON p.userId = u.id
    JOIN internships i ON i.id = p.internshipId
    ORDER BY p.createdAt DESC
  `).all();
  res.json({ payments });
});

router.put('/payments/:id/status', authenticateToken, adminOnly, (req, res) => {
  const { status, transactionId } = req.body;
  if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  if (status === 'completed' && payment.status !== 'completed') {
    // Same provisioning path as Razorpay verification: completes the payment,
    // creates/activates the enrollment and opens the exam — one transaction
    completePayment(payment, { transactionId: transactionId || null });
  } else {
    db.prepare('UPDATE payments SET status = ?, transactionId = COALESCE(?, transactionId), paidAt = CASE WHEN ? = "completed" THEN CURRENT_TIMESTAMP ELSE paidAt END WHERE id = ?')
      .run(status, transactionId, status, req.params.id);
    registry.enqueuePayment(Number(req.params.id));
    if (payment.enrollmentId) registry.enqueueEnrollment(payment.enrollmentId);
  }
  res.json({ message: 'Payment status updated' });
});

// ===================== EXAMS MANAGEMENT =====================
router.get('/exams', authenticateToken, adminOnly, (req, res) => {
  const exams = db.prepare(`
    SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM exams e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY e.id DESC
  `).all();
  res.json({ exams });
});

router.put('/exams/:id/schedule', authenticateToken, adminOnly, (req, res) => {
  const { scheduledAt } = req.body;
  db.prepare('UPDATE exams SET scheduledAt = ? WHERE id = ?').run(scheduledAt, req.params.id);
  res.json({ message: 'Exam scheduled' });
});

const loadExamForAdmin = (id) => db.prepare(`
  SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle, i.category
  FROM exams e
  JOIN users u ON e.userId = u.id
  JOIN internships i ON e.internshipId = i.id
  WHERE e.id = ?
`).get(id);

const gradeFor = (score) => score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';

// Keeps certificate + enrollment consistent with an exam result
const applyResult = (exam, score, status) => {
  const existingCert = db.prepare('SELECT id FROM certificates WHERE enrollmentId = ?').get(exam.enrollmentId);

  if (status === 'completed') {
    if (!existingCert) {
      let certId;
      let isUnique = false;
      while (!isUnique) {
        certId = `IQI-${new Date().getFullYear()}-${crypto.randomBytes(4).readUInt32BE(0) % 1000000}`;
        const existing = db.prepare('SELECT id FROM certificates WHERE certificateId = ?').get(certId);
        if (!existing) isUnique = true;
      }
      db.prepare('INSERT INTO certificates (userId, enrollmentId, examId, certificateId, grade, score) VALUES (?, ?, ?, ?, ?, ?)')
        .run(exam.userId, exam.enrollmentId, exam.id, certId, gradeFor(score), score);
    } else {
      // Keep marks on an existing certificate in sync with the edited result
      db.prepare('UPDATE certificates SET score = ?, grade = ? WHERE enrollmentId = ?')
        .run(score, gradeFor(score), exam.enrollmentId);
    }
    db.prepare("UPDATE enrollments SET status = 'completed' WHERE id = ?").run(exam.enrollmentId);
  } else if (existingCert) {
    db.prepare('DELETE FROM certificates WHERE enrollmentId = ?').run(exam.enrollmentId);
    db.prepare("UPDATE enrollments SET status = 'active' WHERE id = ? AND status = 'completed'").run(exam.enrollmentId);
  }
  registry.enqueueEnrollment(exam.enrollmentId);
};

router.put('/exams/:id/result', authenticateToken, adminOnly, (req, res) => {
  const { score, status } = req.body;
  if (!['completed', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const exam = loadExamForAdmin(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  db.prepare('UPDATE exams SET score = ?, status = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?')
    .run(score, status, exam.id);

  applyResult(exam, score, status);

  res.json({ message: 'Exam result updated' });
});

// ===================== EXAM ATTEMPT REVIEW / EDIT =====================
router.get('/exams/:id/attempt', authenticateToken, adminOnly, (req, res) => {
  const exam = loadExamForAdmin(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  let saved = [];
  try { saved = JSON.parse(exam.answers || '[]'); } catch { saved = []; }
  const savedMap = {};
  saved.forEach((a) => { if (a && a.questionId != null) savedMap[a.questionId] = a.selectedOption; });

  const trackQuestions = db.prepare(`
    SELECT id, question, optionA, optionB, optionC, optionD, correct
    FROM questions WHERE track = ? AND isActive = 1
  `).all(exam.category);

  const attemptedIds = new Set(Object.keys(savedMap).map(Number));
  const questions = trackQuestions
    .filter((q) => attemptedIds.has(q.id))
    .map((q) => ({
      id: q.id,
      question: q.question,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correct: q.correct,
      selectedOption: savedMap[q.id] ?? null,
    }));

  res.json({
    exam,
    questions,
    totalQuestions: trackQuestions.length,
    passingMarks: exam.passingMarks ?? 40,
  });
});

router.put('/exams/:id/attempt', authenticateToken, adminOnly, (req, res) => {
  const exam = loadExamForAdmin(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array' });

  const trackQuestions = db.prepare('SELECT id, correct FROM questions WHERE track = ? AND isActive = 1').all(exam.category);
  const correctMap = {};
  trackQuestions.forEach((q) => { correctMap[q.id] = q.correct; });

  const clean = [];
  let score = 0;
  for (const a of answers) {
    if (!a || a.questionId == null) continue;
    const correct = correctMap[a.questionId];
    if (correct === undefined) continue;
    const selected = a.selectedOption == null ? -1 : Number(a.selectedOption);
    clean.push({ questionId: Number(a.questionId), selectedOption: selected });
    if (selected === correct) score++;
  }

  const total = trackQuestions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const status = percentage >= (exam.passingMarks ?? 40) ? 'completed' : 'failed';

  db.prepare('UPDATE exams SET answers = ?, score = ?, status = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?')
    .run(JSON.stringify(clean), percentage, status, exam.id);

  applyResult(exam, percentage, status);

  res.json({
    message: 'Exam result updated',
    exam: db.prepare('SELECT * FROM exams WHERE id = ?').get(exam.id),
    score: percentage,
    correct: score,
    total,
    status,
  });
});

// ===================== CERTIFICATES =====================
router.get('/certificates', authenticateToken, adminOnly, (req, res) => {
  const certificates = db.prepare(`
    SELECT c.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM certificates c
    JOIN users u ON c.userId = u.id
    JOIN enrollments e ON c.enrollmentId = e.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY c.issuedAt DESC
  `).all();
  res.json({ certificates });
});

// ===================== EDIT STUDENT MARKS =====================
router.put('/certificates/:id/marks', authenticateToken, adminOnly, (req, res) => {
  const score = Number(req.body.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Score must be between 0 and 100' });
  }

  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  const rounded = Math.round(score);
  const exam = cert.examId ? db.prepare('SELECT * FROM exams WHERE id = ?').get(cert.examId) : null;
  const passingMarks = exam?.passingMarks ?? 40;
  const status = rounded >= passingMarks ? 'completed' : 'failed';

  if (exam) {
    db.prepare('UPDATE exams SET score = ?, status = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?')
      .run(rounded, status, exam.id);
  }

  if (status === 'completed') {
    db.prepare('UPDATE certificates SET score = ?, grade = ? WHERE id = ?').run(rounded, gradeFor(rounded), cert.id);
    db.prepare("UPDATE enrollments SET status = 'completed' WHERE id = ?").run(cert.enrollmentId);
    registry.enqueueEnrollment(cert.enrollmentId);
    const updated = db.prepare('SELECT * FROM certificates WHERE id = ?').get(cert.id);
    return res.json({ message: `Marks updated to ${rounded}% (${updated.grade})`, certificate: updated });
  }

  // Failing score — revoke certificate, same rule as a failed exam submission
  db.prepare('DELETE FROM certificates WHERE id = ?').run(cert.id);
  db.prepare("UPDATE enrollments SET status = 'active' WHERE id = ? AND status = 'completed'").run(cert.enrollmentId);
  registry.enqueueEnrollment(cert.enrollmentId);
  res.json({ message: `Marks updated to ${rounded}% — below passing (${passingMarks}%), certificate revoked`, revoked: true });
});

// ===================== QUESTIONS MANAGEMENT =====================
// A track is valid if some internship uses that category
const isValidTrack = (track) =>
  !!db.prepare('SELECT 1 AS ok FROM internships WHERE category = ?').get(track);

router.get('/questions', authenticateToken, adminOnly, (req, res) => {
  const { track } = req.query;
  let questions;
  if (track) {
    questions = db.prepare('SELECT * FROM questions WHERE track = ? ORDER BY id ASC').all(track);
  } else {
    questions = db.prepare('SELECT * FROM questions ORDER BY track, id ASC').all();
  }
  res.json({ questions });
});

router.get('/questions/stats', authenticateToken, adminOnly, (req, res) => {
  const stats = db.prepare('SELECT track, COUNT(*) as count, SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeCount FROM questions GROUP BY track').all();
  res.json({ stats });
});

router.get('/questions/:id', authenticateToken, adminOnly, (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  res.json({ question });
});

router.post('/questions', authenticateToken, adminOnly, (req, res) => {
  const { track, question, optionA, optionB, optionC, optionD, correct } = req.body;
  if (!track || !question || !optionA || !optionB || !optionC || !optionD || correct === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!isValidTrack(track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  if (![0, 1, 2, 3].includes(correct)) {
    return res.status(400).json({ error: 'Correct answer must be 0-3 (A-D)' });
  }

  const result = db.prepare('INSERT INTO questions (track, question, optionA, optionB, optionC, optionD, correct) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(track, question, optionA, optionB, optionC, optionD, correct);

  const newQ = db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Question added', question: newQ });
});

router.post('/questions/bulk', authenticateToken, adminOnly, (req, res) => {
  const { track, questions: newQuestions } = req.body;
  if (!track || !Array.isArray(newQuestions) || newQuestions.length === 0) {
    return res.status(400).json({ error: 'Track and questions array are required' });
  }
  if (!isValidTrack(track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }

  const insert = db.prepare('INSERT INTO questions (track, question, optionA, optionB, optionC, optionD, correct) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertMany = db.transaction((items) => {
    let added = 0;
    for (const q of items) {
      if (q.question && q.optionA && q.optionB && q.optionC && q.optionD && [0, 1, 2, 3].includes(q.correct)) {
        insert.run(track, q.question, q.optionA, q.optionB, q.optionC, q.optionD, q.correct);
        added++;
      }
    }
    return added;
  });

  const added = insertMany(newQuestions);
  res.status(201).json({ message: `${added} questions added`, count: added });
});

router.put('/questions/:id', authenticateToken, adminOnly, (req, res) => {
  const { question, optionA, optionB, optionC, optionD, correct, isActive } = req.body;
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });

  if (correct !== undefined && ![0, 1, 2, 3].includes(correct)) {
    return res.status(400).json({ error: 'Correct answer must be 0-3 (A-D)' });
  }

  db.prepare(`UPDATE questions SET
    question = COALESCE(?, question),
    optionA = COALESCE(?, optionA),
    optionB = COALESCE(?, optionB),
    optionC = COALESCE(?, optionC),
    optionD = COALESCE(?, optionD),
    correct = COALESCE(?, correct),
    isActive = COALESCE(?, isActive)
    WHERE id = ?
  `).run(question, optionA, optionB, optionC, optionD, correct, isActive, req.params.id);

  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  res.json({ message: 'Question updated', question: updated });
});

router.delete('/questions/:id', authenticateToken, adminOnly, (req, res) => {
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Question deleted' });
});

router.delete('/questions/track/:track', authenticateToken, adminOnly, (req, res) => {
  if (!isValidTrack(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  const result = db.prepare('DELETE FROM questions WHERE track = ?').run(req.params.track);
  res.json({ message: `${result.changes} questions deleted from ${req.params.track}` });
});

// ===================== CONTACT MESSAGES (ISSUES) =====================
router.get('/contact-messages', authenticateToken, adminOnly, (req, res) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY createdAt DESC, id DESC').all();
  const unread = db.prepare("SELECT COUNT(*) AS count FROM contact_messages WHERE status = 'new'").get().count;
  res.json({ messages, unread });
});

router.put('/contact-messages/:id/status', authenticateToken, adminOnly, (req, res) => {
  const status = req.body.status === 'read' ? 'read' : 'new';
  const result = db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Message not found' });
  res.json({ message: 'Status updated' });
});

router.delete('/contact-messages/:id', authenticateToken, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Message not found' });
  res.json({ message: 'Message deleted' });
});

module.exports = router;
