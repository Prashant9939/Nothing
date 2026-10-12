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

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

// Commission + payout-request summary for the partner's "Commission &
// Payout" quick action. Earned = rate% of every completed attributed payment;
// available = earned minus amounts already locked by pending/approved
// requests (rejected requests do not deduct).
async function getCommissionSummary(partnerId) {
  const partner = await db.get(
    "SELECT commissionPercent FROM users WHERE id = ? AND role = 'partner'", partnerId
  );
  const commissionPercent = Number(partner?.commissionPercent || 0);
  const paid = await db.get(`
    SELECT COALESCE(SUM(p.amount), 0) AS paid
    FROM payments p
    JOIN enrollments e ON e.id = p.enrollmentId
    WHERE e.partnerId = ? AND p.status = 'completed'
  `, partnerId);
  const requests = await db.all(`
    SELECT id, amount, upiId, status, priority, note, createdAt, updatedAt
    FROM payout_requests
    WHERE partnerId = ?
    ORDER BY createdAt DESC, id DESC
    LIMIT 50
  `, partnerId);
  const earned = round2(Number(paid.paid || 0) * commissionPercent / 100);
  const requested = round2(
    requests
      .filter((r) => r.status === 'pending' || r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  );
  return {
    commissionPercent,
    paidAmount: Number(paid.paid || 0),
    earned,
    requested,
    available: round2(Math.max(0, earned - requested)),
    requests,
  };
}

// The partner's own dashboard — same payload the admin sees on the partner
// detail screen, scoped to the logged-in partner.
router.get('/dashboard', authenticateToken, partnerOnly, async (req, res) => {
  try {
    const detail = await getPartnerDetail(req.user.id);
    if (!detail) return res.status(404).json({ error: 'Partner account not found' });
    // Commission terms and payout are admin-only — strip them from the
    // partner's own payload (clone first: kpis is a shared cache entry).
    const partnerKpis = { ...detail.kpis };
    delete partnerKpis.commissionPercent;
    delete partnerKpis.commissionAmount;
    res.json({ ...detail, kpis: partnerKpis });
  } catch (err) {
    console.error('Partner dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Commission summary + payout-request history for the quick action.
router.get('/commission', authenticateToken, partnerOnly, async (req, res) => {
  try {
    res.json(await getCommissionSummary(req.user.id));
  } catch (err) {
    console.error('Partner commission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request a payout of the partner's earned commission. The request lands in
// the admin's Issues panel with a priority tag for triage. The UPI ID is how
// the admin actually transfers the money.
router.post('/payout-request', authenticateToken, partnerOnly, async (req, res) => {
  try {
    const amount = round2(req.body.amount);
    const note = String(req.body.note || '').slice(0, 500);
    const upiId = String(req.body.upiId || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Enter a valid payout amount' });
    }
    if (!upiId || !/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.-]{2,64}$/.test(upiId)) {
      return res.status(400).json({ error: 'Enter a valid UPI ID (e.g. yourname@upi or 9876543210@okbank)' });
    }

    const summary = await getCommissionSummary(req.user.id);
    if (amount > summary.available) {
      return res.status(400).json({
        error: `Payout request cannot exceed your available commission of ₹${summary.available.toLocaleString('en-IN')}`,
      });
    }

    const result = await db.run(
      'INSERT INTO payout_requests (partnerId, amount, upiId, note) VALUES (?, ?, ?, ?)',
      req.user.id, amount, upiId, note
    );
    const request = await db.get(
      'SELECT id, amount, upiId, status, priority, note, createdAt FROM payout_requests WHERE id = ?',
      result.lastInsertRowid
    );
    res.status(201).json({
      message: 'Payout request submitted — the admin will review it shortly',
      request,
      available: round2(summary.available - amount),
    });
  } catch (err) {
    console.error('Payout request error:', err);
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
