const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { passwordPolicyError, BCRYPT_COST } = require('../lib/passwordPolicy');
const { DOC_COLUMNS } = require('../lib/docNumbers');
const sessions = require('../lib/sessions');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// The contact form shares nothing with the auth budget — it gets its own,
// much smaller one so a single IP cannot flood the contact_messages table.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many messages sent. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Timing equalizer for the "no such user" path — computed lazily as a promise
// so module load never blocks the event loop on a bcrypt hash.
const DUMMY_HASH = bcrypt.hash('iqi-timing-equalizer', BCRYPT_COST);

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      // Unique per login: iat is second-granular, so two logins in the same
      // second would otherwise mint a byte-identical token and collapse into
      // ONE session row (logging out on one device would kill the other).
      jwtid: crypto.randomBytes(16).toString('hex'),
    }
  );
};

const publicUser = (u) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
  university: u.university || '',
  college: u.college || '',
  course: (u.course || '').toUpperCase(),
  year: u.year || '',
  gender: u.gender || '',
  dob: u.dob || '',
  rollNo: u.rollNo || '',
  regNo: u.regNo || '',
  guardianName: u.guardianName || '',
  guardianPhone: u.guardianPhone || '',
  guardianRelation: u.guardianRelation || '',
  role: u.role || 'student',
  partnerName: u.partnerName || '',
  accountStatus: u.accountStatus || 'active',
  createdAt: u.createdAt,
});

// ===================== REGISTER =====================
router.post('/register', async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, university, college, course, year,
      password, gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
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

    const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    const result = await db.run(`
      INSERT INTO users (firstName, lastName, email, phone, university, college, course, year,
                         gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
                         password, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'student')
    `, firstName, lastName || '', email.toLowerCase(), phone, university, college, course, year,
      gender || '', dob || '', rollNo || '', regNo || '',
      guardianName || '', guardianPhone || '', guardianRelation || '',
      hashedPassword);

    const user = await db.get('SELECT * FROM users WHERE id = ?', result.lastInsertRowid);
    const token = signToken(user);
    await sessions.issueSession(user.id, token);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: publicUser(user),
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================== LOGIN =====================
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // The identifier may be an email, phone number, registration number or roll number
    const raw = String(email).trim();
    const id = raw.toLowerCase();
    const compact = raw.replace(/[\s-]/g, '');

    let user = await db.get('SELECT * FROM users WHERE lower(email) = ?', id);
    if (!user) {
      user = await db.get("SELECT * FROM users WHERE phone = ? OR replace(replace(phone, ' ', ''), '-', '') = ?", raw, compact);
    }
    if (!user) {
      user = await db.get('SELECT * FROM users WHERE lower(trim(regNo)) = ? OR lower(trim(rollNo)) = ?', id, id);
    }
    if (!user) {
      await bcrypt.compare(password, await DUMMY_HASH);
      return res.status(401).json({ error: 'Invalid login details. Check your email or phone and password and try again.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid login details. Check your email or phone and password and try again.' });
    }

    // Checked after the password so the suspension state is never leaked to
    // someone probing emails with wrong passwords.
    if (user.role === 'partner' && user.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Partner account is suspended. Contact support.' });
    }

    const token = signToken(user);
    await sessions.issueSession(user.id, token);

    res.json({
      message: 'Login successful',
      token,
      user: publicUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================== LOGOUT =====================
router.post('/logout', authenticateToken, async (req, res) => {
  // Kill the session row so this token is rejected from now on — the JWT
  // itself cannot be invalidated, but the revocation check in the middleware
  // makes logout immediate instead of waiting for the 7-day expiry.
  await sessions.revoke(req.token);
  res.json({ message: 'Logged out successfully' });
});

// ===================== GET PROFILE =====================
router.get('/profile', authenticateToken, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ===================== UPDATE PROFILE =====================
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, university, college, course, year } = req.body;

    await db.run(`
      UPDATE users SET
        firstName = COALESCE(?, firstName),
        lastName = COALESCE(?, lastName),
        phone = COALESCE(?, phone),
        university = COALESCE(?, university),
        college = COALESCE(?, college),
        course = COALESCE(?, course),
        year = COALESCE(?, year),
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, firstName ?? null, lastName ?? null, phone ?? null,
      university ?? null, college ?? null, course ?? null, year ?? null,
      req.user.id);

    const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
    res.json({ message: 'Profile updated', user: publicUser(user) });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================== CHANGE PASSWORD =====================
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      return res.status(400).json({ error: policyError });
    }

    const user = await db.get('SELECT id, password FROM users WHERE id = ?', req.user.id);
    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_COST);
    await db.run('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', hashed, req.user.id);

    // Password changed: every OTHER device's token dies immediately. The
    // current session is kept so the user isn't logged out of the tab they
    // just changed the password in.
    await sessions.revokeAll(req.user.id, req.token);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================== CHECK SESSION =====================
router.get('/check', authenticateToken, async (req, res) => {
  res.json({ valid: true, user: publicUser(req.user) });
});

// ===================== FORGOT PASSWORD =====================
// Finds a user only when ALL FOUR registered details match
async function findUserByIdentity({ email, phone, regNo, rollNo }) {
  const e = String(email).trim().toLowerCase();
  const user = await db.get('SELECT * FROM users WHERE lower(trim(email)) = ?', e);
  if (!user) return null;

  const normPhone = (v) => {
    let p = String(v || '').replace(/[^\d]/g, '');
    if (p.length === 12 && p.startsWith('91')) p = p.slice(2);
    return p;
  };
  if (normPhone(user.phone) !== normPhone(phone)) return null;
  if (String(user.regNo || '').trim().toLowerCase() !== String(regNo || '').trim().toLowerCase()) return null;
  if (String(user.rollNo || '').trim().toLowerCase() !== String(rollNo || '').trim().toLowerCase()) return null;
  return user;
}

// Step 1: verify the account by all four registered details
router.post('/forgot-password', recoveryLimiter, async (req, res) => {
  try {
    const { email, phone, regNo, rollNo } = req.body;
    if (!email || !phone || !regNo || !rollNo) {
      return res.status(400).json({ error: 'Email, phone, registration number and roll number are all required' });
    }
    const user = await findUserByIdentity({ email, phone, regNo, rollNo });
    if (!user) {
      return res.status(404).json({ error: 'No account matches all of these details. Check each field and try again.' });
    }
    res.json({ message: 'Identity verified. You can now set a new password.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Step 2: set the new password after the same identity check
router.post('/reset-password', recoveryLimiter, async (req, res) => {
  try {
    const { email, phone, regNo, rollNo, newPassword, confirmPassword } = req.body;
    if (!email || !phone || !regNo || !rollNo) {
      return res.status(400).json({ error: 'Identity details are required' });
    }
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Both password fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      return res.status(400).json({ error: policyError });
    }

    const user = await findUserByIdentity({ email, phone, regNo, rollNo });
    if (!user) {
      return res.status(404).json({ error: 'No account matches all of these details. Check each field and try again.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
    await db.run('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, user.id);

    // Password reset (no authenticated session here): revoke EVERY issued
    // token for the account, so a thief already holding a JWT is locked out.
    await sessions.revokeAll(user.id);

    res.json({ message: 'Password updated successfully. You can now sign in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================== CONTACT FORM =====================
router.post('/contact', contactLimiter, async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  let result;
  try {
    result = await db.run('INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)', String(name).trim(), String(email).trim(), String(phone || '').trim(), String(subject || '').trim(), String(message).trim());
  } catch (err) {
    console.error('Contact save error:', err);
    return res.status(500).json({ error: 'Could not save your message. Please try again.' });
  }
  // Log only the row id — message contents and contact details are PII and
  // must not end up in plaintext server logs.
  console.log(`[CONTACT] message #${result.lastInsertRowid} received`);
  res.json({ message: 'Message received. We will get back to you soon.' });
});

// ===================== PUBLIC INTERNSHIPS =====================
router.get('/internships', async (req, res) => {
  const internships = await db.all('SELECT id, title, description, category, duration, price, originalPrice, modules, topics, isActive, examDate, createdAt FROM internships WHERE isActive = 1 ORDER BY createdAt DESC');
  res.json({ internships });
});

// ===================== VERIFY DOCUMENT (PUBLIC) =====================
// Accepts: certificateId | receiptNumber | IQI-OL-n | IQI-PR-n | IQI-ATT-n
router.post('/verify-certificate', async (req, res) => {
  const ref = (req.body.certificateId || '').trim().toUpperCase();
  if (!ref) return res.status(400).json({ error: 'Certificate ID is required' });

  // 1) Certificate — only valid while its enrollment is actually paid for;
  // a refunded payment must not leave a publicly verifiable certificate.
  const cert = await db.get(`
    SELECT c.certificateId, c.grade, c.score, c.issuedAt,
           u.firstName, u.lastName, u.college, u.course,
           i.title as internshipTitle, i.duration
    FROM certificates c
    JOIN users u ON c.userId = u.id
    JOIN enrollments e ON c.enrollmentId = e.id
    JOIN internships i ON e.internshipId = i.id
    WHERE UPPER(c.certificateId) = ?
      AND EXISTS (
        SELECT 1 FROM payments p WHERE p.enrollmentId = e.id AND p.status = 'completed'
      )
  `, ref);

  if (cert) {
    return res.json({
      valid: true,
      certificate: {
        type: 'certificate',
        id: cert.certificateId,
        name: `${cert.firstName} ${cert.lastName}`,
        college: cert.college,
        course: String(cert.course || '').toUpperCase(),
        program: cert.internshipTitle,
        duration: cert.duration,
        grade: cert.grade,
        score: cert.score,
        issuedAt: cert.issuedAt,
      },
    });
  }

  // 2) Payment receipt
  const receipt = await db.get(`
    SELECT p.receiptNumber, p.amount, p.paidAt, p.createdAt,
           u.firstName, u.lastName, u.college, u.course,
           i.title as internshipTitle, i.duration
    FROM payments p
    JOIN users u ON p.userId = u.id
    JOIN enrollments e ON p.enrollmentId = e.id
    JOIN internships i ON e.internshipId = i.id
    WHERE UPPER(p.receiptNumber) = ? AND p.status = 'completed'
  `, ref);

  if (receipt) {
    return res.json({
      valid: true,
      certificate: {
        type: 'receipt',
        id: receipt.receiptNumber,
        name: `${receipt.firstName} ${receipt.lastName}`,
        college: receipt.college,
        course: String(receipt.course || '').toUpperCase(),
        program: receipt.internshipTitle,
        duration: receipt.duration,
        grade: null,
        score: null,
        amount: receipt.amount,
        issuedAt: receipt.paidAt || receipt.createdAt,
      },
    });
  }

  // 3) Enrollment documents: offer letter / project report / attendance
  //    New style: IQI-OL-2026-483920 (stored random number)
  //    Legacy:    IQI-OL-1 (old enrollment-id based reference)
  const newStyle = ref.match(/^IQI-(OL|PR|ATT)-(\d{4})-(\d{6})$/);
  const legacy = ref.match(/^IQI-(OL|PR|ATT)-(\d+)$/);
  const m = newStyle || legacy;
  if (m) {
    const type = { OL: 'offer-letter', PR: 'project-report', ATT: 'attendance' }[m[1]];
    // DOC_COLUMNS maps column -> prefix (offerNo -> 'OL'); invert it for the regex capture.
    const column = Object.keys(DOC_COLUMNS).find((key) => DOC_COLUMNS[key] === m[1]);
    // Rows store the full reference (IQI-OL-2026-483920). Older rows may hold
    // only the bare serial (2026-483920), so accept both. Documents only
    // verify while the enrollment is paid for — refunded ⇒ invalid.
    const paidClause = `AND EXISTS (SELECT 1 FROM payments p WHERE p.enrollmentId = e.id AND p.status = 'completed')`;
    const condition = newStyle
      ? { clause: `WHERE e.${column} IN (?, ?) ${paidClause}`, params: [ref, `${m[2]}-${m[3]}`] }
      : { clause: `WHERE e.id = ? ${paidClause}`, params: [m[2]] };
    const row = await db.get(`
      SELECT e.id, e.enrolledAt, u.firstName, u.lastName, u.college, u.course,
             i.title as internshipTitle, i.duration,
             c.grade, c.score, c.issuedAt as certIssuedAt
      FROM enrollments e
      JOIN users u ON e.userId = u.id
      JOIN internships i ON e.internshipId = i.id
      LEFT JOIN certificates c ON c.enrollmentId = e.id
      ${condition.clause}
    `, ...condition.params);

    if (row) {
      return res.json({
        valid: true,
        certificate: {
          type,
          id: ref,
          name: `${row.firstName} ${row.lastName}`,
          college: row.college,
          course: String(row.course || '').toUpperCase(),
          program: row.internshipTitle,
          duration: row.duration,
          grade: row.grade ?? null,
          score: row.score ?? null,
          issuedAt: row.certIssuedAt || row.enrolledAt,
        },
      });
    }
  }

  res.status(404).json({ valid: false, error: 'Invalid reference. No record found.' });
});

module.exports = router;
