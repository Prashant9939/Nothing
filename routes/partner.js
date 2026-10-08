const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { passwordPolicyError, BCRYPT_COST } = require('../lib/passwordPolicy');
const { getPartnerDetail } = require('../lib/partnerStats');

const router = express.Router();

const partnerOnly = (req, res, next) => {
  if (req.user.role !== 'partner') {
    return res.status(403).json({ error: 'Partner access required' });
  }
  next();
};

// The partner's own dashboard — same payload the admin sees on the partner
// detail screen, scoped to the logged-in partner.
router.get('/dashboard', authenticateToken, partnerOnly, async (req, res) => {
  try {
    const detail = await getPartnerDetail(req.user.id);
    if (!detail) return res.status(404).json({ error: 'Partner account not found' });
    res.json(detail);
  } catch (err) {
    console.error('Partner dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register a student on behalf of this partner. The account is attributed to
// the partner (users.partnerId) so it shows up in their Students list right
// away, and lib/payments.js stamps enrollments.partnerId when the student
// later pays for a program.
router.post('/students', authenticateToken, partnerOnly, async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, university, college, course, year,
      password, gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
    } = req.body;

    if (!firstName || !email || !phone || !university || !college || !course || !year || !password) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (dob && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || isNaN(new Date(dob).getTime()) || dob > today)) {
      return res.status(400).json({ error: 'Date of birth must be a valid date on or before today' });
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
      INSERT INTO users (firstName, lastName, email, phone, university, college, course, year,
                         gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
                         password, role, partnerId, createdByAdmin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'student', ?, 1)
    `, firstName, lastName || '', normalized, phone, university, college, course, year,
      gender || '', dob || '', rollNo || '', regNo || '',
      guardianName || '', guardianPhone || '', guardianRelation || '',
      hashedPassword, req.user.id);

    const user = await db.get('SELECT id, firstName, lastName, email, role, createdAt FROM users WHERE id = ?', result.lastInsertRowid);
    res.status(201).json({ message: 'Student registered', user });
  } catch (err) {
    console.error('Partner registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
