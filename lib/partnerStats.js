// Partner activity aggregation — shared by the admin Partners screens
// (routes/admin.js) and the partner's own portal (routes/partner.js), so
// both views always report identical numbers.
const db = require('../db');

// Roster for the admin list: one row per partner with referral aggregates.
async function listPartners() {
  return db.all(`
    SELECT u.id, u.firstName, u.lastName, u.email, u.phone, u.partnerName, u.accountStatus, u.createdAt,
      COALESCE(e.registrations, 0) AS registrations,
      COALESCE(e.students, 0) + COALESCE(rf.referredOnly, 0) AS students,
      COALESCE(e.activeStudents, 0) AS activeStudents,
      COALESCE(e.lastRegistration, u.createdAt) AS lastRegistration,
      COALESCE(pay.paidAmount, 0) AS paidAmount,
      COALESCE(pay.paidCount, 0) AS paidCount,
      COALESCE(pay.pendingAmount, 0) AS pendingAmount,
      COALESCE(d.documents, 0) AS documents,
      COALESCE(s.logins, 0) AS logins,
      s.lastLogin
    FROM users u
    LEFT JOIN (
      SELECT partnerId,
        COUNT(*) AS registrations,
        COUNT(DISTINCT userId) AS students,
        COUNT(*) FILTER (WHERE status IN ('active', 'completed')) AS activeStudents,
        MAX(enrolledAt) AS lastRegistration
      FROM enrollments
      WHERE partnerId IS NOT NULL
      GROUP BY partnerId
    ) e ON e.partnerId = u.id
    -- Partner-registered accounts that have no attributed enrollment yet.
    -- Excludes anyone already counted via an enrollment above.
    LEFT JOIN (
      SELECT u2.partnerId AS partnerId, COUNT(*) AS referredOnly
      FROM users u2
      WHERE u2.partnerId IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM enrollments e2 WHERE e2.userId = u2.id AND e2.partnerId = u2.partnerId
        )
      GROUP BY u2.partnerId
    ) rf ON rf.partnerId = u.id
    LEFT JOIN (
      SELECT en.partnerId AS partnerId,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS paidAmount,
        COUNT(*) FILTER (WHERE p.status = 'completed') AS paidCount,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0) AS pendingAmount
      FROM payments p
      JOIN enrollments en ON en.id = p.enrollmentId
      WHERE en.partnerId IS NOT NULL
      GROUP BY en.partnerId
    ) pay ON pay.partnerId = u.id
    LEFT JOIN (
      SELECT en.partnerId AS partnerId,
        COUNT(*) AS documents
      FROM enrollments en
      WHERE en.partnerId IS NOT NULL
        AND (en.offerNo IS NOT NULL OR en.reportNo IS NOT NULL OR en.attendanceNo IS NOT NULL
          OR EXISTS (SELECT 1 FROM certificates c WHERE c.enrollmentId = en.id))
      GROUP BY en.partnerId
    ) d ON d.partnerId = u.id
    LEFT JOIN (
      SELECT userId, COUNT(*) AS logins, MAX(createdAt) AS lastLogin
      FROM sessions
      GROUP BY userId
    ) s ON s.userId = u.id
    WHERE u.role = 'partner'
    ORDER BY u.createdAt DESC
    LIMIT 500
  `);
}

// Full activity package for ONE partner: profile, KPIs and the four lists
// (students, payments, documents, merged timeline). Returns null when the
// id is not a partner.
async function getPartnerDetail(partnerId) {
  const partner = await db.get(`
    SELECT id, firstName, lastName, email, phone, partnerName, accountStatus, createdAt
    FROM users
    WHERE id = ? AND role = 'partner'
  `, partnerId);
  if (!partner) return null;

  const [sessionStats, students, referredOnly, payments, documents, loginEvents, regEvents, paymentEvents, certEvents] = await Promise.all([
    db.get('SELECT COUNT(*) AS logins, MAX(createdAt) AS lastLogin FROM sessions WHERE userId = ?', partnerId),
    db.all(`
      SELECT e.id AS enrollmentId, e.status AS enrollmentStatus, e.progress, e.enrolledAt,
        i.title AS programTitle, i.duration AS programDuration,
        u2.id AS studentId, u2.firstName AS studentFirstName, u2.lastName AS studentLastName,
        u2.email AS studentEmail, u2.phone AS studentPhone, u2.college AS studentCollege, u2.course AS studentCourse,
        p.paymentStatus, p.paymentAmount, p.receiptNumber, p.paidAt,
        c.certificateId, c.grade, c.score, c.issuedAt AS certificateIssuedAt
      FROM enrollments e
      JOIN users u2 ON u2.id = e.userId
      JOIN internships i ON i.id = e.internshipId
      LEFT JOIN LATERAL (
        SELECT pp.status AS paymentStatus, pp.amount AS paymentAmount, pp.receiptNumber, pp.paidAt
        FROM payments pp
        WHERE pp.enrollmentId = e.id
        ORDER BY pp.id DESC
        LIMIT 1
      ) p ON true
      LEFT JOIN certificates c ON c.enrollmentId = e.id
      WHERE e.partnerId = ?
      ORDER BY e.enrolledAt DESC
      LIMIT 500
    `, partnerId),
    // Partner-registered accounts with no attributed enrollment yet — shown
    // as "not enrolled" rows so they still count as the partner's students.
    db.all(`
      SELECT NULL AS enrollmentId, 'none' AS enrollmentStatus, 0 AS progress,
        u2.createdAt AS enrolledAt,
        NULL AS programTitle, NULL AS programDuration,
        u2.id AS studentId, u2.firstName AS studentFirstName, u2.lastName AS studentLastName,
        u2.email AS studentEmail, u2.phone AS studentPhone, u2.college AS studentCollege, u2.course AS studentCourse,
        NULL AS paymentStatus, NULL AS paymentAmount, NULL AS receiptNumber, NULL AS paidAt,
        NULL AS certificateId, NULL AS grade, NULL AS score, NULL AS certificateIssuedAt
      FROM users u2
      WHERE u2.partnerId = ?
        AND NOT EXISTS (
          SELECT 1 FROM enrollments e2 WHERE e2.userId = u2.id AND e2.partnerId = u2.partnerId
        )
      ORDER BY u2.createdAt DESC
      LIMIT 500
    `, partnerId),
    db.all(`
      SELECT p.id, p.amount, p.method, p.status, p.receiptNumber, p.transactionId, p.paidAt, p.createdAt,
        p.enrollmentId AS enrollmentId,
        u2.firstName AS studentFirstName, u2.lastName AS studentLastName,
        i.title AS programTitle
      FROM payments p
      JOIN enrollments e ON e.id = p.enrollmentId
      JOIN users u2 ON u2.id = p.userId
      JOIN internships i ON i.id = e.internshipId
      WHERE e.partnerId = ?
      ORDER BY p.createdAt DESC, p.id DESC
      LIMIT 500
    `, partnerId),
    db.all(`
      SELECT e.id AS enrollmentId, e.offerNo, e.reportNo, e.attendanceNo, e.status AS enrollmentStatus,
        u2.id AS studentId, u2.firstName AS studentFirstName, u2.lastName AS studentLastName,
        i.title AS programTitle,
        c.certificateId, c.grade, c.score, c.issuedAt AS certificateIssuedAt,
        EXISTS (SELECT 1 FROM payments pp WHERE pp.enrollmentId = e.id AND pp.status = 'completed') AS paid
      FROM enrollments e
      JOIN users u2 ON u2.id = e.userId
      JOIN internships i ON i.id = e.internshipId
      LEFT JOIN certificates c ON c.enrollmentId = e.id
      WHERE e.partnerId = ?
        AND (e.offerNo IS NOT NULL OR e.reportNo IS NOT NULL OR e.attendanceNo IS NOT NULL OR c.id IS NOT NULL)
      ORDER BY e.enrolledAt DESC
      LIMIT 500
    `, partnerId),
    db.all('SELECT createdAt FROM sessions WHERE userId = ? ORDER BY createdAt DESC LIMIT 25', partnerId),
    db.all(`
      SELECT e.enrolledAt AS at, u2.firstName AS studentFirstName, u2.lastName AS studentLastName,
        i.title AS programTitle
      FROM enrollments e
      JOIN users u2 ON u2.id = e.userId
      JOIN internships i ON i.id = e.internshipId
      WHERE e.partnerId = ?
      ORDER BY e.enrolledAt DESC
      LIMIT 30
    `, partnerId),
    db.all(`
      SELECT COALESCE(p.paidAt, p.createdAt) AS at, p.amount, p.receiptNumber,
        u2.firstName AS studentFirstName, u2.lastName AS studentLastName, i.title AS programTitle
      FROM payments p
      JOIN enrollments e ON e.id = p.enrollmentId
      JOIN users u2 ON u2.id = p.userId
      JOIN internships i ON i.id = e.internshipId
      WHERE e.partnerId = ? AND p.status = 'completed'
      ORDER BY at DESC
      LIMIT 30
    `, partnerId),
    db.all(`
      SELECT c.issuedAt AS at, c.certificateId,
        u2.firstName AS studentFirstName, u2.lastName AS studentLastName, i.title AS programTitle
      FROM certificates c
      JOIN enrollments e ON e.id = c.enrollmentId
      JOIN users u2 ON u2.id = c.userId
      JOIN internships i ON i.id = e.internshipId
      WHERE e.partnerId = ?
      ORDER BY c.issuedAt DESC
      LIMIT 30
    `, partnerId),
  ]);

  // Timeline: derived from the raw events above (logins, registrations,
  // completed payments, certificates) — newest first, bounded.
  const activity = [
    ...loginEvents.map((e) => ({ at: e.createdAt, type: 'login', title: 'Partner signed in', detail: '' })),
    ...regEvents.map((e) => ({
      at: e.at, type: 'registration',
      title: `Registered ${e.studentFirstName} ${e.studentLastName}`,
      detail: e.programTitle,
    })),
    ...paymentEvents.map((e) => ({
      at: e.at, type: 'payment',
      title: `Payment of ₹${Number(e.amount).toLocaleString('en-IN')} received`,
      detail: `${e.studentFirstName} ${e.studentLastName}${e.receiptNumber ? ` · ${e.receiptNumber}` : ''}`,
    })),
    ...certEvents.map((e) => ({
      at: e.at, type: 'certificate',
      title: `Certificate ${e.certificateId} issued`,
      detail: `${e.studentFirstName} ${e.studentLastName} · ${e.programTitle}`,
    })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 60);

  // Referred accounts without an enrollment join the enrollment-backed rows;
  // registrations only counts real enrollments.
  const allStudents = [...students, ...referredOnly];

  const kpis = {
    students: new Set(allStudents.map((s) => s.studentId)).size,
    registrations: allStudents.filter((s) => s.enrollmentId != null).length,
    activeStudents: allStudents.filter((s) => s.enrollmentStatus === 'active' || s.enrollmentStatus === 'completed').length,
    paidCount: payments.filter((p) => p.status === 'completed').length,
    paidAmount: payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount || 0), 0),
    pendingAmount: payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount || 0), 0),
    certificates: documents.filter((d) => d.certificateId).length,
    documents: documents.reduce(
      (n, d) => n + [d.offerNo, d.reportNo, d.attendanceNo, d.certificateId].filter(Boolean).length, 0
    ),
    logins: Number(sessionStats.logins || 0),
    lastLogin: sessionStats.lastLogin || null,
  };

  return { partner, kpis, students: allStudents, payments, documents, activity };
}

module.exports = { listPartners, getPartnerDetail };
