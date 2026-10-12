const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Public: registration + profile screens need this before/without login.
// One round trip (LEFT JOIN LATERAL-style json_agg) instead of two full-table
// SELECTs + O(universities × colleges) grouping in JS, plus a short shared
// cache: the data only changes through the admin CRUD below.
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  const universities = await db.all(`
    SELECT u.id, u.name, u.shortName, u.location, u.type, u.createdAt,
      COALESCE((
        SELECT json_agg(
          json_build_object('id', c.id, 'universityId', c.universityId, 'name', c.name, 'district', c.district, 'createdAt', c.createdAt)
          ORDER BY LOWER(c.name) ASC
        )
        FROM colleges c WHERE c.universityId = u.id
      ), '[]'::json) AS colleges
    FROM universities u
    ORDER BY LOWER(u.name) ASC
  `);
  res.json({ universities });
});

// ===================== ADMIN: UNIVERSITIES =====================
router.post('/universities', authenticateToken, adminOnly, async (req, res) => {
  const name = (req.body.name || '').trim();
  const shortName = (req.body.shortName || '').trim();
  const location = (req.body.location || '').trim();
  const type = ['central', 'state', 'private', 'deemed'].includes(req.body.type) ? req.body.type : 'state';

  if (!name) return res.status(400).json({ error: 'University name is required' });

  const existing = await db.get('SELECT id FROM universities WHERE LOWER(name) = LOWER(?)', name);
  if (existing) return res.status(400).json({ error: 'This university already exists' });

  const info = await db.run('INSERT INTO universities (name, shortName, location, type) VALUES (?, ?, ?, ?)', name, shortName, location, type);

  const university = await db.get('SELECT id, name, shortName, location, type FROM universities WHERE id = ?', info.lastInsertRowid);

  res.status(201).json({ message: 'University added', university: { ...university, colleges: [] } });
});

router.put('/universities/:id', authenticateToken, adminOnly, async (req, res) => {
  const university = await db.get('SELECT id, name, shortName, location, type FROM universities WHERE id = ?', req.params.id);
  if (!university) return res.status(404).json({ error: 'University not found' });

  const name = (req.body.name ?? university.name).trim();
  const shortName = (req.body.shortName ?? university.shortName).trim();
  const location = (req.body.location ?? university.location).trim();
  const type = ['central', 'state', 'private', 'deemed'].includes(req.body.type) ? req.body.type : university.type;

  if (!name) return res.status(400).json({ error: 'University name is required' });

  const existing = await db.get('SELECT id FROM universities WHERE LOWER(name) = LOWER(?) AND id != ?', name, university.id);
  if (existing) return res.status(400).json({ error: 'This university already exists' });

  await db.run('UPDATE universities SET name = ?, shortName = ?, location = ?, type = ? WHERE id = ?', name, shortName, location, type, university.id);

  const updated = await db.get('SELECT id, name, shortName, location, type FROM universities WHERE id = ?', university.id);
  const colleges = await db.all('SELECT id, universityId, name, district FROM colleges WHERE universityId = ? ORDER BY LOWER(name) ASC', university.id);

  res.json({ message: `Updated ${name}`, university: { ...updated, colleges } });
});

router.delete('/universities/:id', authenticateToken, adminOnly, async (req, res) => {
  const university = await db.get('SELECT id, name FROM universities WHERE id = ?', req.params.id);
  if (!university) return res.status(404).json({ error: 'University not found' });

  const collegeCount = (await db.get('SELECT COUNT(*) as count FROM colleges WHERE universityId = ?', university.id)).count;
  await db.run('DELETE FROM universities WHERE id = ?', university.id);

  res.json({ message: `Removed ${university.name} and ${collegeCount} college${collegeCount === 1 ? '' : 's'}` });
});

// ===================== ADMIN: COLLEGES =====================
router.post('/colleges', authenticateToken, adminOnly, async (req, res) => {
  const name = (req.body.name || '').trim();
  const district = (req.body.district || '').trim();
  const universityId = Number(req.body.universityId);

  if (!name) return res.status(400).json({ error: 'College name is required' });
  if (!universityId) return res.status(400).json({ error: 'Select a university first' });

  const university = await db.get('SELECT id FROM universities WHERE id = ?', universityId);
  if (!university) return res.status(404).json({ error: 'University not found' });

  const existing = await db.get('SELECT id FROM colleges WHERE universityId = ? AND LOWER(name) = LOWER(?)', universityId, name);
  if (existing) return res.status(400).json({ error: 'This college already exists under the university' });

  const info = await db.run('INSERT INTO colleges (universityId, name, district) VALUES (?, ?, ?)', universityId, name, district);

  const college = await db.get('SELECT id, universityId, name, district FROM colleges WHERE id = ?', info.lastInsertRowid);

  res.status(201).json({ message: 'College added', college });
});

router.put('/colleges/:id', authenticateToken, adminOnly, async (req, res) => {
  const college = await db.get('SELECT id, universityId, name, district FROM colleges WHERE id = ?', req.params.id);
  if (!college) return res.status(404).json({ error: 'College not found' });

  const name = (req.body.name ?? college.name).trim();
  const district = (req.body.district ?? college.district).trim();

  if (!name) return res.status(400).json({ error: 'College name is required' });

  const existing = await db.get('SELECT id FROM colleges WHERE universityId = ? AND LOWER(name) = LOWER(?) AND id != ?', college.universityId, name, college.id);
  if (existing) return res.status(400).json({ error: 'This college already exists under the university' });

  await db.run('UPDATE colleges SET name = ?, district = ? WHERE id = ?', name, district, college.id);

  const updated = await db.get('SELECT id, universityId, name, district FROM colleges WHERE id = ?', college.id);

  res.json({ message: `Updated ${name}`, college: updated });
});

router.delete('/colleges/:id', authenticateToken, adminOnly, async (req, res) => {
  const college = await db.get('SELECT id, name FROM colleges WHERE id = ?', req.params.id);
  if (!college) return res.status(404).json({ error: 'College not found' });

  await db.run('DELETE FROM colleges WHERE id = ?', college.id);
  res.json({ message: `Removed ${college.name}` });
});

module.exports = router;
