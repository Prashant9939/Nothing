const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { completePayment } = require('../lib/payments');
const { refreshBrand } = require('../lib/documentBrand');
const { streamAnswerKey } = require('../lib/answerKeyPdf');
const { passwordPolicyError } = require('../lib/passwordPolicy');

const router = express.Router();

// Admin middleware
const adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ===================== DASHBOARD STATS =====================
router.get('/dashboard', authenticateToken, adminOnly, async (req, res) => {
  const stats = {
    totalStudents: (await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'")).count,
    totalInternships: (await db.get('SELECT COUNT(*) as count FROM internships')).count,
    totalEnrollments: (await db.get('SELECT COUNT(*) as count FROM enrollments')).count,
    totalRevenue: (await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'")).total,
    pendingPayments: (await db.get("SELECT COUNT(*) as count FROM payments WHERE status = 'pending'")).count,
    completedExams: (await db.get("SELECT COUNT(*) as count FROM exams WHERE status = 'completed'")).count,
    certificatesIssued: (await db.get('SELECT COUNT(*) as count FROM certificates')).count,
    activeStudents: (await db.get("SELECT COUNT(*) as count FROM enrollments WHERE status = 'active'")).count,
  };

  const recentEnrollments = await db.all(`
    SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM enrollments e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY e.enrolledAt DESC LIMIT 10
  `);

  const recentPayments = await db.all(`
    SELECT p.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM payments p
    JOIN users u ON p.userId = u.id
    JOIN internships i ON i.id = p.internshipId
    ORDER BY p.createdAt DESC LIMIT 10
  `);

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

router.get('/analytics', authenticateToken, adminOnly, async (req, res) => {
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
    ? "to_char(NULLIF(createdAt, '')::timestamp, 'YYYY-MM-DD HH24:00')"
    : "to_char(NULLIF(createdAt, '')::timestamp, 'YYYY-MM-DD')";
  const eventRows = await db.all(`
    SELECT ${bucketExpr} AS bucket,
           COUNT(DISTINCT visitorId) AS visitors,
           COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
           COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS pageviews,
           COALESCE(SUM(CASE WHEN type = 'visit' THEN 1 ELSE 0 END), 0) AS visits
    FROM analytics_events
    WHERE createdAt >= ?
    GROUP BY bucket
  `, startStamp);

  // Window totals — current period and the equally-long previous period (deltas)
  const eventTotals = async (from, to) => await db.get(`
    SELECT COUNT(DISTINCT visitorId) AS visitors,
           COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
           COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS pageviews,
           COALESCE(SUM(CASE WHEN type = 'visit' THEN 1 ELSE 0 END), 0) AS visits
    FROM analytics_events
    WHERE createdAt >= ?${to ? ' AND createdAt < ?' : ''}
  `, ...(to ? [from, to] : [from])) || {};

  const summary = { ...(await eventTotals(startStamp)) };
  const previous = { ...(await eventTotals(prevStartStamp, startStamp)) };
  summary.avgClicks = summary.visitors ? Math.round((summary.clicks / summary.visitors) * 10) / 10 : 0;
  previous.avgClicks = previous.visitors ? Math.round((previous.clicks / previous.visitors) * 10) / 10 : 0;

  // Business metrics for the same windows
  const bizTotals = async (from, to) => await db.get(`
    SELECT (SELECT COUNT(*) FROM users WHERE createdAt >= ?${to ? ' AND createdAt < ?' : ''}) AS signups,
           (SELECT COUNT(*) FROM payments WHERE status = 'completed' AND paidAt >= ?${to ? ' AND paidAt < ?' : ''}) AS enrollments,
           (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND paidAt >= ?${to ? ' AND paidAt < ?' : ''}) AS revenue
  `, ...(to ? [from, to, from, to, from, to] : [from, from, from])) || {};
  Object.assign(summary, await bizTotals(startStamp));
  Object.assign(previous, await bizTotals(prevStartStamp, startStamp));

  const signupRows = await db.all(`
    SELECT ${bucketExpr} AS bucket, COUNT(*) AS signups
    FROM users WHERE createdAt >= ? GROUP BY bucket
  `, startStamp);
  const revenueRows = await db.all(`
    SELECT ${hourly ? "to_char(NULLIF(paidAt, '')::timestamp, 'YYYY-MM-DD HH24:00')" : "to_char(NULLIF(paidAt, '')::timestamp, 'YYYY-MM-DD')"} AS bucket,
           COUNT(*) AS enrollments, COALESCE(SUM(amount), 0) AS revenue
    FROM payments WHERE status = 'completed' AND paidAt >= ? GROUP BY bucket
  `, startStamp);

  const topPages = await db.all(`
    SELECT path,
           COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS views,
           COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
    FROM analytics_events
    WHERE createdAt >= ? AND path IS NOT NULL
    GROUP BY path
    ORDER BY views DESC, clicks DESC
    LIMIT 8
  `, startStamp);

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
router.get('/internships', authenticateToken, adminOnly, async (req, res) => {
  const internships = await db.all('SELECT * FROM internships ORDER BY createdAt DESC');
  res.json({ internships });
});

router.get('/internships/:id', authenticateToken, adminOnly, async (req, res) => {
  const internship = await db.get('SELECT * FROM internships WHERE id = ?', req.params.id);
  if (!internship) return res.status(404).json({ error: 'Internship not found' });
  res.json({ internship });
});

router.post('/internships', authenticateToken, adminOnly, async (req, res) => {
  const { title, description, category, duration, price, originalPrice, modules, topics, examDate } = req.body;
  if (!title || !description || !category || !price) {
    return res.status(400).json({ error: 'Title, description, category, and price are required' });
  }
  const result = await db.run(`
    INSERT INTO internships (title, description, category, duration, price, originalPrice, modules, topics, examDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, title, description, category, duration || 28, price, originalPrice || price, modules || 10, topics || '', examDate || null);

  const internship = await db.get('SELECT * FROM internships WHERE id = ?', result.lastInsertRowid);
  res.status(201).json({ message: 'Internship created', internship });
});

router.put('/internships/:id', authenticateToken, adminOnly, async (req, res) => {
  const { title, description, category, duration, price, originalPrice, modules, topics, isActive, examDate } = req.body;
  const existing = await db.get('SELECT * FROM internships WHERE id = ?', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Internship not found' });

  await db.run(`
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
  `, title, description, category, duration, price, originalPrice, modules, topics, isActive, examDate, req.params.id);

  const internship = await db.get('SELECT * FROM internships WHERE id = ?', req.params.id);
  res.json({ message: 'Internship updated', internship });
});

router.delete('/internships/:id', authenticateToken, adminOnly, async (req, res) => {
  const existing = await db.get('SELECT * FROM internships WHERE id = ?', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Internship not found' });
  await db.run('DELETE FROM internships WHERE id = ?', req.params.id);
  res.json({ message: 'Internship deleted' });
});

router.get('/internships/:id/answer-key', authenticateToken, adminOnly, async (req, res) => {
  const internship = await db.get('SELECT * FROM internships WHERE id = ?', req.params.id);
  if (!internship) return res.status(404).json({ error: 'Internship not found' });

  const questions = await db.all(
    'SELECT id, question, optionA, optionB, optionC, optionD, correct FROM questions WHERE track = ? AND isActive = 1 ORDER BY id',
    internship.category
  );
  if (!questions.length) return res.status(400).json({ error: 'No active questions for this internship track' });

  const generatedBy = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.email;
  const trackLabel = String(internship.category).replace(/(^|[-_])\w/g, (c) => c.replace(/[-_]/, ' ').toUpperCase());
  streamAnswerKey(res, { internship, questions, generatedBy, trackLabel });
});

// ===================== USERS MANAGEMENT =====================
router.get('/users', authenticateToken, adminOnly, async (req, res) => {
  const users = await db.all('SELECT id, firstName, lastName, email, phone, university, college, course, year, role, createdAt FROM users ORDER BY createdAt DESC');
  res.json({ users });
});

// Register a student on behalf of the admin, with a chosen registration date
router.post('/users', authenticateToken, adminOnly, async (req, res) => {
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

    const policyError = passwordPolicyError(password);
    if (policyError) {
      return res.status(400).json({ error: policyError });
    }

    const today = new Date().toISOString().slice(0, 10);
    const regDate = registeredAt || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(regDate) || isNaN(new Date(regDate).getTime()) || regDate > today) {
      return res.status(400).json({ error: 'Registration date must be a valid date on or before today' });
    }

    const existing = await db.get('SELECT id FROM users WHERE email = ?', String(email).toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(12));

    const result = await db.run(`
      INSERT INTO users (firstName, lastName, email, phone, university, college, course, year,
                         gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
                         password, role, createdAt, createdByAdmin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'student', ?, 1)
    `, firstName, lastName || '', String(email).toLowerCase(), phone, university, college, course, year,
      gender || '', dob || '', rollNo || '', regNo || '',
      guardianName || '', guardianPhone || '', guardianRelation || '',
      hashedPassword, `${regDate} 12:00:00`);

    const user = await db.get('SELECT id, firstName, lastName, email, role, createdAt FROM users WHERE id = ?', result.lastInsertRowid);
    res.status(201).json({ message: 'Registration created', user });
  } catch (err) {
    console.error('Admin registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', authenticateToken, adminOnly, async (req, res) => {
  const user = await db.get('SELECT id, firstName, lastName, email, phone, university, college, course, year, role, createdAt FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const enrollments = await db.all(`
    SELECT e.*, i.title as internshipTitle
    FROM enrollments e
    JOIN internships i ON e.internshipId = i.id
    WHERE e.userId = ?
  `, req.params.id);

  const payments = await db.all('SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC', req.params.id);
  const exams = await db.all('SELECT * FROM exams WHERE userId = ? ORDER BY id DESC', req.params.id);
  const certificates = await db.all('SELECT * FROM certificates WHERE userId = ?', req.params.id);

  res.json({ user, enrollments, payments, exams, certificates });
});

router.put('/users/:id/role', authenticateToken, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['student', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  await db.run('UPDATE users SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', role, req.params.id);
  res.json({ message: 'User role updated' });
});

router.delete('/users/:id', authenticateToken, adminOnly, async (req, res) => {
  const user = await db.get('SELECT id, role FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin users' });

  await db.run('DELETE FROM certificates WHERE userId = ?', req.params.id);
  await db.run('DELETE FROM exams WHERE userId = ?', req.params.id);
  await db.run('DELETE FROM payments WHERE userId = ?', req.params.id);
  await db.run('DELETE FROM enrollments WHERE userId = ?', req.params.id);
  await db.run('DELETE FROM sessions WHERE userId = ?', req.params.id);
  await db.run('DELETE FROM users WHERE id = ?', req.params.id);

  res.json({ message: 'User deleted successfully' });
});

// ===================== ENROLLMENTS MANAGEMENT =====================
router.get('/enrollments', authenticateToken, adminOnly, async (req, res) => {
  const enrollments = await db.all(`
    SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM enrollments e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY e.enrolledAt DESC
  `);
  res.json({ enrollments });
});

router.put('/enrollments/:id/status', authenticateToken, adminOnly, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'active', 'completed', 'expired'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.run('UPDATE enrollments SET status = ? WHERE id = ?', status, req.params.id);
  res.json({ message: 'Enrollment status updated' });
});

router.put('/enrollments/:id/progress', authenticateToken, adminOnly, async (req, res) => {
  const { progress } = req.body;
  await db.run('UPDATE enrollments SET progress = ? WHERE id = ?', progress, req.params.id);
  res.json({ message: 'Progress updated' });
});

// ===================== SETTINGS =====================
const { getAllSettings, setSettings } = require('../lib/settings');

const SETTING_KEYS = ['attendanceDateMode', 'companyName', 'companyAddress', 'companyCin', 'directorName', 'siteUrl'];

router.get('/settings', authenticateToken, adminOnly, async (req, res) => {
  res.json({ settings: await getAllSettings(db) });
});

// Partial update: only keys present in the body are written
router.put('/settings', authenticateToken, adminOnly, async (req, res) => {
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
  await setSettings(db, updates);
  await refreshBrand();
  res.json({ message: 'Settings updated', settings: await getAllSettings(db) });
});

// ===================== PAYMENTS MANAGEMENT =====================
router.get('/payments', authenticateToken, adminOnly, async (req, res) => {
  const payments = await db.all(`
    SELECT p.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM payments p
    JOIN users u ON p.userId = u.id
    JOIN internships i ON i.id = p.internshipId
    ORDER BY p.createdAt DESC
  `);
  res.json({ payments });
});

router.put('/payments/:id/status', authenticateToken, adminOnly, async (req, res) => {
  const { status, transactionId } = req.body;
  if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const payment = await db.get('SELECT * FROM payments WHERE id = ?', req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  if (status === 'completed' && payment.status !== 'completed') {
    // Same provisioning path as Razorpay verification: completes the payment,
    // creates/activates the enrollment and opens the exam — one transaction
    await completePayment(payment, { transactionId: transactionId || null });
  } else {
    await db.run('UPDATE payments SET status = ?, transactionId = COALESCE(?, transactionId), paidAt = CASE WHEN ? = "completed" THEN CURRENT_TIMESTAMP ELSE paidAt END WHERE id = ?', status, transactionId, status, req.params.id);
  }
  res.json({ message: 'Payment status updated' });
});

// ===================== EXAMS MANAGEMENT =====================
router.get('/exams', authenticateToken, adminOnly, async (req, res) => {
  const exams = await db.all(`
    SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM exams e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY e.id DESC
  `);
  res.json({ exams });
});

router.put('/exams/:id/schedule', authenticateToken, adminOnly, async (req, res) => {
  const { scheduledAt } = req.body;
  await db.run('UPDATE exams SET scheduledAt = ? WHERE id = ?', scheduledAt, req.params.id);
  res.json({ message: 'Exam scheduled' });
});

const loadExamForAdmin = async (id) => await db.get(`
  SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle, i.category
  FROM exams e
  JOIN users u ON e.userId = u.id
  JOIN internships i ON e.internshipId = i.id
  WHERE e.id = ?
`, id);

const gradeFor = (score) => score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';

// Keeps certificate + enrollment consistent with an exam result
const applyResult = async (exam, score, status) => {
  const existingCert = await db.get('SELECT id FROM certificates WHERE enrollmentId = ?', exam.enrollmentId);

  if (status === 'completed') {
    if (!existingCert) {
      let certId;
      let isUnique = false;
      while (!isUnique) {
        certId = `IQI-${new Date().getFullYear()}-${crypto.randomBytes(4).readUInt32BE(0) % 1000000}`;
        const existing = await db.get('SELECT id FROM certificates WHERE certificateId = ?', certId);
        if (!existing) isUnique = true;
      }
      await db.run('INSERT INTO certificates (userId, enrollmentId, examId, certificateId, grade, score) VALUES (?, ?, ?, ?, ?, ?)', exam.userId, exam.enrollmentId, exam.id, certId, gradeFor(score), score);
    } else {
      // Keep marks on an existing certificate in sync with the edited result
      await db.run('UPDATE certificates SET score = ?, grade = ? WHERE enrollmentId = ?', score, gradeFor(score), exam.enrollmentId);
    }
    await db.run("UPDATE enrollments SET status = 'completed' WHERE id = ?", exam.enrollmentId);
  } else if (existingCert) {
    await db.run('DELETE FROM certificates WHERE enrollmentId = ?', exam.enrollmentId);
    await db.run("UPDATE enrollments SET status = 'active' WHERE id = ? AND status = 'completed'", exam.enrollmentId);
  }
};

router.put('/exams/:id/result', authenticateToken, adminOnly, async (req, res) => {
  const { score, status } = req.body;
  if (!['completed', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const exam = await loadExamForAdmin(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  await db.run('UPDATE exams SET score = ?, status = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?', score, status, exam.id);

  await applyResult(exam, score, status);

  res.json({ message: 'Exam result updated' });
});

// ===================== EXAM ATTEMPT REVIEW / EDIT =====================
router.get('/exams/:id/attempt', authenticateToken, adminOnly, async (req, res) => {
  const exam = await loadExamForAdmin(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  let saved = [];
  try { saved = JSON.parse(exam.answers || '[]'); } catch { saved = []; }
  const savedMap = {};
  saved.forEach((a) => { if (a && a.questionId != null) savedMap[a.questionId] = a.selectedOption; });

  const trackQuestions = await db.all(`
    SELECT id, question, optionA, optionB, optionC, optionD, correct
    FROM questions WHERE track = ? AND isActive = 1
  `, exam.category);

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

router.put('/exams/:id/attempt', authenticateToken, adminOnly, async (req, res) => {
  const exam = await loadExamForAdmin(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array' });

  const trackQuestions = await db.all('SELECT id, correct FROM questions WHERE track = ? AND isActive = 1', exam.category);
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

  await db.run('UPDATE exams SET answers = ?, score = ?, status = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?', JSON.stringify(clean), percentage, status, exam.id);

  await applyResult(exam, percentage, status);

  res.json({
    message: 'Exam result updated',
    exam: await db.get('SELECT * FROM exams WHERE id = ?', exam.id),
    score: percentage,
    correct: score,
    total,
    status,
  });
});

// ===================== CERTIFICATES =====================
router.get('/certificates', authenticateToken, adminOnly, async (req, res) => {
  const certificates = await db.all(`
    SELECT c.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM certificates c
    JOIN users u ON c.userId = u.id
    JOIN enrollments e ON c.enrollmentId = e.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY c.issuedAt DESC
  `);
  res.json({ certificates });
});

// ===================== EDIT STUDENT MARKS =====================
router.put('/certificates/:id/marks', authenticateToken, adminOnly, async (req, res) => {
  const score = Number(req.body.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Score must be between 0 and 100' });
  }

  const cert = await db.get('SELECT * FROM certificates WHERE id = ?', req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  const rounded = Math.round(score);
  const exam = cert.examId ? await db.get('SELECT * FROM exams WHERE id = ?', cert.examId) : null;
  const passingMarks = exam?.passingMarks ?? 40;
  const status = rounded >= passingMarks ? 'completed' : 'failed';

  if (exam) {
    await db.run('UPDATE exams SET score = ?, status = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?', rounded, status, exam.id);
  }

  if (status === 'completed') {
    await db.run('UPDATE certificates SET score = ?, grade = ? WHERE id = ?', rounded, gradeFor(rounded), cert.id);
    await db.run("UPDATE enrollments SET status = 'completed' WHERE id = ?", cert.enrollmentId);
    const updated = await db.get('SELECT * FROM certificates WHERE id = ?', cert.id);
    return res.json({ message: `Marks updated to ${rounded}% (${updated.grade})`, certificate: updated });
  }

  // Failing score — revoke certificate, same rule as a failed exam submission
  await db.run('DELETE FROM certificates WHERE id = ?', cert.id);
  await db.run("UPDATE enrollments SET status = 'active' WHERE id = ? AND status = 'completed'", cert.enrollmentId);
  res.json({ message: `Marks updated to ${rounded}% — below passing (${passingMarks}%), certificate revoked`, revoked: true });
});

// ===================== QUESTIONS MANAGEMENT =====================
// A track is valid if some internship uses that category
const isValidTrack = async (track) =>
  !!await db.get('SELECT 1 AS ok FROM internships WHERE category = ?', track);

router.get('/questions', authenticateToken, adminOnly, async (req, res) => {
  const { track } = req.query;
  let questions;
  if (track) {
    questions = await db.all('SELECT * FROM questions WHERE track = ? ORDER BY id ASC', track);
  } else {
    questions = await db.all('SELECT * FROM questions ORDER BY track, id ASC');
  }
  res.json({ questions });
});

router.get('/questions/stats', authenticateToken, adminOnly, async (req, res) => {
  const stats = await db.all('SELECT track, COUNT(*) as count, SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeCount FROM questions GROUP BY track');
  res.json({ stats });
});

router.get('/questions/:id', authenticateToken, adminOnly, async (req, res) => {
  const question = await db.get('SELECT * FROM questions WHERE id = ?', req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  res.json({ question });
});

router.post('/questions', authenticateToken, adminOnly, async (req, res) => {
  const { track, question, optionA, optionB, optionC, optionD, correct } = req.body;
  if (!track || !question || !optionA || !optionB || !optionC || !optionD || correct === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!(await isValidTrack(track))) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  if (![0, 1, 2, 3].includes(correct)) {
    return res.status(400).json({ error: 'Correct answer must be 0-3 (A-D)' });
  }

  const result = await db.run('INSERT INTO questions (track, question, optionA, optionB, optionC, optionD, correct) VALUES (?, ?, ?, ?, ?, ?, ?)', track, question, optionA, optionB, optionC, optionD, correct);

  const newQ = await db.get('SELECT * FROM questions WHERE id = ?', result.lastInsertRowid);
  res.status(201).json({ message: 'Question added', question: newQ });
});

router.post('/questions/bulk', authenticateToken, adminOnly, async (req, res) => {
  const { track, questions: newQuestions } = req.body;
  if (!track || !Array.isArray(newQuestions) || newQuestions.length === 0) {
    return res.status(400).json({ error: 'Track and questions array are required' });
  }
  if (!(await isValidTrack(track))) {
    return res.status(400).json({ error: 'Invalid track' });
  }

  const insert = ('INSERT INTO questions (track, question, optionA, optionB, optionC, optionD, correct) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertMany = db.transaction(async (items) => {
    let added = 0;
    for (const q of items) {
      if (q.question && q.optionA && q.optionB && q.optionC && q.optionD && [0, 1, 2, 3].includes(q.correct)) {
        await db.run(insert, track, q.question, q.optionA, q.optionB, q.optionC, q.optionD, q.correct);
        added++;
      }
    }
    return added;
  });

  const added = await insertMany(newQuestions);
  res.status(201).json({ message: `${added} questions added`, count: added });
});

router.put('/questions/:id', authenticateToken, adminOnly, async (req, res) => {
  const { question, optionA, optionB, optionC, optionD, correct, isActive } = req.body;
  const existing = await db.get('SELECT * FROM questions WHERE id = ?', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });

  if (correct !== undefined && ![0, 1, 2, 3].includes(correct)) {
    return res.status(400).json({ error: 'Correct answer must be 0-3 (A-D)' });
  }

  await db.run(`UPDATE questions SET
    question = COALESCE(?, question),
    optionA = COALESCE(?, optionA),
    optionB = COALESCE(?, optionB),
    optionC = COALESCE(?, optionC),
    optionD = COALESCE(?, optionD),
    correct = COALESCE(?, correct),
    isActive = COALESCE(?, isActive)
    WHERE id = ?
  `, question, optionA, optionB, optionC, optionD, correct, isActive, req.params.id);

  const updated = await db.get('SELECT * FROM questions WHERE id = ?', req.params.id);
  res.json({ message: 'Question updated', question: updated });
});

router.delete('/questions/:id', authenticateToken, adminOnly, async (req, res) => {
  const existing = await db.get('SELECT * FROM questions WHERE id = ?', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });
  await db.run('DELETE FROM questions WHERE id = ?', req.params.id);
  res.json({ message: 'Question deleted' });
});

router.delete('/questions/track/:track', authenticateToken, adminOnly, async (req, res) => {
  if (!(await isValidTrack(req.params.track))) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  const result = await db.run('DELETE FROM questions WHERE track = ?', req.params.track);
  res.json({ message: `${result.changes} questions deleted from ${req.params.track}` });
});

// ===================== CONTACT MESSAGES (ISSUES) =====================
router.get('/contact-messages', authenticateToken, adminOnly, async (req, res) => {
  const messages = await db.all('SELECT * FROM contact_messages ORDER BY createdAt DESC, id DESC');
  const unread = (await db.get("SELECT COUNT(*) AS count FROM contact_messages WHERE status = 'new'")).count;
  res.json({ messages, unread });
});

router.put('/contact-messages/:id/status', authenticateToken, adminOnly, async (req, res) => {
  const status = req.body.status === 'read' ? 'read' : 'new';
  const result = await db.run('UPDATE contact_messages SET status = ? WHERE id = ?', status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Message not found' });
  res.json({ message: 'Status updated' });
});

router.delete('/contact-messages/:id', authenticateToken, adminOnly, async (req, res) => {
  const result = await db.run('DELETE FROM contact_messages WHERE id = ?', req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Message not found' });
  res.json({ message: 'Message deleted' });
});

module.exports = router;
