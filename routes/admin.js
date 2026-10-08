const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { completePayment, expirePendingPayments } = require('../lib/payments');
const { refreshBrand } = require('../lib/documentBrand');
const { streamAnswerKey } = require('../lib/answerKeyPdf');
const { passwordPolicyError, BCRYPT_COST } = require('../lib/passwordPolicy');

const router = express.Router();

// Admin middleware
const adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// List endpoints cap their rows so responses stay bounded as tables grow
// (they used to ship every row — multi-MB payloads and full sorts as data
// accumulated). ?limit= overrides, clamped to 1..5000.
const listLimit = (req, def = 1000) => {
  const n = Number(req.query.limit);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 5000) : def;
};

// ===================== DASHBOARD STATS =====================
// 10 queries per hit; admin pages re-fetch on every navigation. Cache the
// result for 30s (single-instance deployment) and share one in-flight
// computation across concurrent requests.
let dashboardCache = null;
let dashboardCacheAt = 0;
let dashboardInflight = null;
const DASHBOARD_TTL_MS = 30000;

const computeDashboard = async () => {
  const [students, internships, enrollments, revenue, pending, exams, certs, active, recentEnrollments, recentPayments] = await Promise.all([
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
    db.get('SELECT COUNT(*) as count FROM internships'),
    db.get('SELECT COUNT(*) as count FROM enrollments'),
    db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"),
    db.get("SELECT COUNT(*) as count FROM payments WHERE status = 'pending'"),
    db.get("SELECT COUNT(*) as count FROM exams WHERE status = 'completed'"),
    db.get('SELECT COUNT(*) as count FROM certificates'),
    db.get("SELECT COUNT(*) as count FROM enrollments WHERE status = 'active'"),
    db.all(`
      SELECT e.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
      FROM enrollments e
      JOIN users u ON e.userId = u.id
      JOIN internships i ON e.internshipId = i.id
      ORDER BY e.enrolledAt DESC LIMIT 10
    `),
    db.all(`
      SELECT p.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
      FROM payments p
      JOIN users u ON p.userId = u.id
      JOIN internships i ON i.id = p.internshipId
      ORDER BY p.createdAt DESC LIMIT 10
    `),
  ]);

  return {
    stats: {
      totalStudents: students.count,
      totalInternships: internships.count,
      totalEnrollments: enrollments.count,
      totalRevenue: revenue.total,
      pendingPayments: pending.count,
      completedExams: exams.count,
      certificatesIssued: certs.count,
      activeStudents: active.count,
    },
    recentEnrollments,
    recentPayments,
  };
};

router.get('/dashboard', authenticateToken, adminOnly, async (req, res) => {
  const now = Date.now();
  if (dashboardCache && now - dashboardCacheAt < DASHBOARD_TTL_MS) {
    return res.json(dashboardCache);
  }
  try {
    if (!dashboardInflight) {
      dashboardInflight = computeDashboard()
        .then((payload) => {
          dashboardCache = payload;
          dashboardCacheAt = Date.now();
          return payload;
        })
        .finally(() => {
          dashboardInflight = null;
        });
    }
    res.json(await dashboardInflight);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load dashboard' });
  }
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

  // Window totals — current period and the equally-long previous period (deltas)
  const eventTotals = async (from, to) => await db.get(`
    SELECT COUNT(DISTINCT visitorId) AS visitors,
           COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
           COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS pageviews,
           COALESCE(SUM(CASE WHEN type = 'visit' THEN 1 ELSE 0 END), 0) AS visits
    FROM analytics_events
    WHERE createdAt >= ?${to ? ' AND createdAt < ?' : ''}
  `, ...(to ? [from, to] : [from])) || {};

  // Business metrics for the same windows
  const bizTotals = async (from, to) => await db.get(`
    SELECT (SELECT COUNT(*) FROM users WHERE createdAt >= ?${to ? ' AND createdAt < ?' : ''}) AS signups,
           (SELECT COUNT(*) FROM payments WHERE status = 'completed' AND paidAt >= ?${to ? ' AND paidAt < ?' : ''}) AS enrollments,
           (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND paidAt >= ?${to ? ' AND paidAt < ?' : ''}) AS revenue
  `, ...(to ? [from, to, from, to, from, to] : [from, from, from])) || {};

  // Every window/bucket query is independent — run them together instead of
  // paying one remote round trip after another.
  const [eventRows, evSummary, evPrevious, bizSummary, bizPrevious, signupRows, revenueRows, topPages] = await Promise.all([
    db.all(`
      SELECT ${bucketExpr} AS bucket,
             COUNT(DISTINCT visitorId) AS visitors,
             COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
             COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS pageviews,
             COALESCE(SUM(CASE WHEN type = 'visit' THEN 1 ELSE 0 END), 0) AS visits
      FROM analytics_events
      WHERE createdAt >= ?
      GROUP BY bucket
    `, startStamp),
    eventTotals(startStamp),
    eventTotals(prevStartStamp, startStamp),
    bizTotals(startStamp),
    bizTotals(prevStartStamp, startStamp),
    db.all(`
      SELECT ${bucketExpr} AS bucket, COUNT(*) AS signups
      FROM users WHERE createdAt >= ? GROUP BY bucket
    `, startStamp),
    db.all(`
      SELECT ${hourly ? "to_char(NULLIF(paidAt, '')::timestamp, 'YYYY-MM-DD HH24:00')" : "to_char(NULLIF(paidAt, '')::timestamp, 'YYYY-MM-DD')"} AS bucket,
             COUNT(*) AS enrollments, COALESCE(SUM(amount), 0) AS revenue
      FROM payments WHERE status = 'completed' AND paidAt >= ? GROUP BY bucket
    `, startStamp),
    db.all(`
      SELECT path,
             COALESCE(SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END), 0) AS views,
             COALESCE(SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
      FROM analytics_events
      WHERE createdAt >= ? AND path IS NOT NULL
      GROUP BY path
      ORDER BY views DESC, clicks DESC
      LIMIT 8
    `, startStamp),
  ]);

  const summary = { ...evSummary };
  const previous = { ...evPrevious };
  summary.avgClicks = summary.visitors ? Math.round((summary.clicks / summary.visitors) * 10) / 10 : 0;
  previous.avgClicks = previous.visitors ? Math.round((previous.clicks / previous.visitors) * 10) / 10 : 0;
  Object.assign(summary, bizSummary);
  Object.assign(previous, bizPrevious);

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
// Students only — admin accounts live in /admins, partner accounts in /partners.
router.get('/users', authenticateToken, adminOnly, async (req, res) => {
  const users = await db.all("SELECT id, firstName, lastName, email, phone, university, college, course, year, role, createdAt FROM users WHERE role = 'student' ORDER BY createdAt DESC LIMIT ?", listLimit(req));
  res.json({ users: users.map((u) => (u.course ? { ...u, course: u.course.toUpperCase() } : u)) });
});

// Admin accounts (role = 'admin') for the Admins section of the admin panel.
router.get('/admins', authenticateToken, adminOnly, async (req, res) => {
  const admins = await db.all("SELECT id, firstName, lastName, email, phone, role, createdAt FROM users WHERE role = 'admin' ORDER BY createdAt DESC LIMIT ?", listLimit(req));
  res.json({ users: admins });
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

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

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
  if (user.course) user.course = user.course.toUpperCase();

  // Independent per-user lists fetched together (4 serial round trips → 1 wave)
  const [enrollments, payments, exams, certificates] = await Promise.all([
    db.all(`
      SELECT e.*, i.title as internshipTitle
      FROM enrollments e
      JOIN internships i ON e.internshipId = i.id
      WHERE e.userId = ?
    `, req.params.id),
    db.all('SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC', req.params.id),
    db.all('SELECT * FROM exams WHERE userId = ? ORDER BY id DESC', req.params.id),
    db.all('SELECT * FROM certificates WHERE userId = ?', req.params.id),
  ]);

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

  // Every child table (certificates, exams, payments, enrollments, sessions)
  // references users(id) ON DELETE CASCADE — the five explicit DELETEs above
  // this one were redundant round trips (6 → 1).
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
    LIMIT ?
  `, listLimit(req));
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
  // Both read the just-written state — run them together (2 RTTs → 1 wave)
  const [, settings] = await Promise.all([refreshBrand(), getAllSettings(db)]);
  res.json({ message: 'Settings updated', settings });
});

// ===================== PAYMENTS MANAGEMENT =====================
router.get('/payments', authenticateToken, adminOnly, async (req, res) => {
  // Fail expired pending invoices before listing so the admin never sees
  // (or approves) a payment whose time limit already ran out. Awaits first on
  // purpose: the list must reflect the sweep (admin-facing, low frequency).
  await expirePendingPayments().catch((err) => console.error('Payment expiry sweep failed:', err.message));

  const payments = await db.all(`
    SELECT p.*, u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM payments p
    JOIN users u ON p.userId = u.id
    JOIN internships i ON i.id = p.internshipId
    ORDER BY p.createdAt DESC
    LIMIT ?
  `, listLimit(req));
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
    // paidAt is a TEXT column storing the same 'YYYY-MM-DD HH24:MI:SS' format
    // as createdAt — CURRENT_TIMESTAMP (timestamptz) cannot be used directly
    // as a CASE branch here (type mismatch), and it must not be reset when an
    // already-completed payment row is re-saved. Payment update and enrollment
    // revoke commit together (or not at all) so a failed cascade can't leave
    // a refunded payment with an active enrollment.
    await db.tx(async () => {
      await db.run(`
        UPDATE payments
        SET status = ?,
            transactionId = COALESCE(?, transactionId),
            paidAt = CASE WHEN ? = 'completed' AND paidAt IS NULL
                          THEN to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
                          ELSE paidAt END
        WHERE id = ?
      `, status, transactionId, status, req.params.id);

      // A refund revokes the enrollment — unless another completed payment still
      // covers it (e.g. a duplicate invoice the admin is only partly refunding).
      if (status === 'refunded' && payment.enrollmentId) {
        await db.run(`
          UPDATE enrollments
          SET status = 'refunded'
          WHERE id = ?
            AND NOT EXISTS (
              SELECT 1 FROM payments WHERE enrollmentId = ? AND status = 'completed'
            )
        `, payment.enrollmentId, payment.enrollmentId);
      }
    });
  }
  res.json({ message: 'Payment status updated' });
});

// ===================== EXAMS MANAGEMENT =====================
router.get('/exams', authenticateToken, adminOnly, async (req, res) => {
  // answers/servedQuestionIds (per-exam JSON blobs, tens of KB each) are
  // intentionally excluded — the attempt editor fetches them via
  // GET /exams/:id/attempt. Shipping them in the list made the response
  // grow into megabytes.
  const exams = await db.all(`
    SELECT e.id, e.userId, e.internshipId, e.enrollmentId, e.totalQuestions,
           e.passingMarks, e.duration, e.scheduledAt, e.startedAt, e.completedAt,
           e.score, e.status,
           u.firstName, u.lastName, u.email, i.title as internshipTitle
    FROM exams e
    JOIN users u ON e.userId = u.id
    JOIN internships i ON e.internshipId = i.id
    ORDER BY e.id DESC
    LIMIT ?
  `, listLimit(req));
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

// Keeps certificate + enrollment consistent with an exam result. A
// certificate is only ever issued when the enrollment's payment completed —
// unsuccessful payments must not produce certificates.
const applyResult = async (exam, score, status) => {
  const existingCert = await db.get('SELECT id FROM certificates WHERE enrollmentId = ?', exam.enrollmentId);
  const paid = !!(await db.get("SELECT 1 FROM payments WHERE enrollmentId = ? AND status = 'completed' LIMIT 1", exam.enrollmentId));

  if (status === 'completed' && paid) {
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
    LIMIT ?
  `, listLimit(req));
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
    questions = await db.all('SELECT * FROM questions WHERE track = ? ORDER BY id ASC LIMIT ?', track, listLimit(req));
  } else {
    questions = await db.all('SELECT * FROM questions ORDER BY track, id ASC LIMIT ?', listLimit(req));
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

  // Batched multi-row INSERTs: one statement per 100 questions inside the
  // transaction instead of one round trip per question (100 questions used to
  // be 100 sequential RTTs holding a pooled connection the whole time).
  const CHUNK = 100;
  const insertMany = db.transaction(async (items) => {
    const valid = items.filter(
      (q) => q.question && q.optionA && q.optionB && q.optionC && q.optionD && [0, 1, 2, 3].includes(q.correct)
    );
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const tuples = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
      await db.run(
        `INSERT INTO questions (track, question, optionA, optionB, optionC, optionD, correct) VALUES ${tuples}`,
        ...chunk.flatMap((q) => [track, q.question, q.optionA, q.optionB, q.optionC, q.optionD, q.correct])
      );
    }
    return valid.length;
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
  const [messages, unreadRow] = await Promise.all([
    db.all('SELECT * FROM contact_messages ORDER BY createdAt DESC, id DESC LIMIT ?', listLimit(req)),
    db.get("SELECT COUNT(*) AS count FROM contact_messages WHERE status = 'new'"),
  ]);
  res.json({ messages, unread: unreadRow.count });
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

// ===================== PARTNERS =====================
const { listPartners, getPartnerDetail } = require('../lib/partnerStats');

// Partner roster with referral aggregates (students, payments, documents,
// logins) for the Partners table.
router.get('/partners', authenticateToken, adminOnly, async (req, res) => {
  try {
    const partners = await listPartners();
    res.json({ partners });
  } catch (err) {
    console.error('List partners error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// One partner's full activity: profile, KPIs, students, payments,
// documents and the merged activity timeline.
router.get('/partners/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const detail = await getPartnerDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ error: 'Partner not found' });
    res.json(detail);
  } catch (err) {
    console.error('Partner detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate / suspend a partner. Suspension revokes live sessions so the
// partner is logged out immediately (middleware also rejects new requests).
router.put('/partners/:id/status', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const partner = await db.get("SELECT id FROM users WHERE id = ? AND role = 'partner'", Number(req.params.id));
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    await db.run('UPDATE users SET accountStatus = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', status, partner.id);
    if (status === 'suspended') {
      await db.run('DELETE FROM sessions WHERE userId = ?', partner.id);
    }
    res.json({ message: status === 'suspended' ? 'Partner suspended' : 'Partner activated' });
  } catch (err) {
    console.error('Partner status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a partner account (org contact with role=partner). Credentials are
// returned to the admin to share with the partner.
router.post('/partners', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, partnerName, password } = req.body;

    if (!firstName || !email || !phone || !partnerName || !password) {
      return res.status(400).json({ error: 'All required fields must be filled' });
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
      INSERT INTO users (firstName, lastName, email, phone, college, course, year, partnerName, password, role)
      VALUES (?, ?, ?, ?, '', '', '', ?, ?, 'partner')
    `, firstName, lastName || '', normalized, phone, partnerName, hashedPassword);

    const partner = await db.get(`
      SELECT id, firstName, lastName, email, phone, partnerName, accountStatus, createdAt
      FROM users WHERE id = ?
    `, result.lastInsertRowid);
    res.status(201).json({ message: 'Partner created', partner });
  } catch (err) {
    console.error('Partner create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a partner account. Their registered students and attributed
// enrollments stay in place (only the partner user row is removed).
router.delete('/partners/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const partner = await db.get("SELECT id FROM users WHERE id = ? AND role = 'partner'", id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    if (req.user.id === id) return res.status(400).json({ error: 'You cannot delete your own account' });

    await db.run('DELETE FROM users WHERE id = ?', id);
    res.json({ message: 'Partner deleted' });
  } catch (err) {
    console.error('Partner delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
