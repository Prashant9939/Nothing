const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const getUniversities = () => db.prepare(`
  SELECT id, name, shortName, location, type, createdAt
  FROM universities ORDER BY name COLLATE NOCASE ASC
`).all();

const getColleges = () => db.prepare(`
  SELECT id, universityId, name, district, createdAt
  FROM colleges ORDER BY name COLLATE NOCASE ASC
`).all();

// Public: registration + profile screens need this before/without login
router.get('/', (req, res) => {
  const universities = getUniversities();
  const colleges = getColleges();
  const grouped = universities.map((u) => ({
    ...u,
    colleges: colleges.filter((c) => c.universityId === u.id),
  }));
  res.json({ universities: grouped });
});

// ===================== ADMIN: UNIVERSITIES =====================
router.post('/universities', authenticateToken, adminOnly, (req, res) => {
  const name = (req.body.name || '').trim();
  const shortName = (req.body.shortName || '').trim();
  const location = (req.body.location || '').trim();
  const type = ['central', 'state', 'private', 'deemed'].includes(req.body.type) ? req.body.type : 'state';

  if (!name) return res.status(400).json({ error: 'University name is required' });

  const existing = db.prepare('SELECT id FROM universities WHERE LOWER(name) = LOWER(?)').get(name);
  if (existing) return res.status(400).json({ error: 'This university already exists' });

  const info = db.prepare('INSERT INTO universities (name, shortName, location, type) VALUES (?, ?, ?, ?)')
    .run(name, shortName, location, type);

  const university = db.prepare('SELECT id, name, shortName, location, type FROM universities WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json({ message: 'University added', university: { ...university, colleges: [] } });
});

router.put('/universities/:id', authenticateToken, adminOnly, (req, res) => {
  const university = db.prepare('SELECT id, name, shortName, location, type FROM universities WHERE id = ?').get(req.params.id);
  if (!university) return res.status(404).json({ error: 'University not found' });

  const name = (req.body.name ?? university.name).trim();
  const shortName = (req.body.shortName ?? university.shortName).trim();
  const location = (req.body.location ?? university.location).trim();
  const type = ['central', 'state', 'private', 'deemed'].includes(req.body.type) ? req.body.type : university.type;

  if (!name) return res.status(400).json({ error: 'University name is required' });

  const existing = db.prepare('SELECT id FROM universities WHERE LOWER(name) = LOWER(?) AND id != ?')
    .get(name, university.id);
  if (existing) return res.status(400).json({ error: 'This university already exists' });

  db.prepare('UPDATE universities SET name = ?, shortName = ?, location = ?, type = ? WHERE id = ?')
    .run(name, shortName, location, type, university.id);

  const updated = db.prepare('SELECT id, name, shortName, location, type FROM universities WHERE id = ?')
    .get(university.id);
  const colleges = db.prepare('SELECT id, universityId, name, district FROM colleges WHERE universityId = ? ORDER BY name COLLATE NOCASE ASC')
    .all(university.id);

  res.json({ message: `Updated ${name}`, university: { ...updated, colleges } });
});

router.delete('/universities/:id', authenticateToken, adminOnly, (req, res) => {
  const university = db.prepare('SELECT id, name FROM universities WHERE id = ?').get(req.params.id);
  if (!university) return res.status(404).json({ error: 'University not found' });

  const collegeCount = db.prepare('SELECT COUNT(*) as count FROM colleges WHERE universityId = ?').get(university.id).count;
  db.prepare('DELETE FROM universities WHERE id = ?').run(university.id);

  res.json({ message: `Removed ${university.name} and ${collegeCount} college${collegeCount === 1 ? '' : 's'}` });
});

// ===================== ADMIN: COLLEGES =====================
router.post('/colleges', authenticateToken, adminOnly, (req, res) => {
  const name = (req.body.name || '').trim();
  const district = (req.body.district || '').trim();
  const universityId = Number(req.body.universityId);

  if (!name) return res.status(400).json({ error: 'College name is required' });
  if (!universityId) return res.status(400).json({ error: 'Select a university first' });

  const university = db.prepare('SELECT id FROM universities WHERE id = ?').get(universityId);
  if (!university) return res.status(404).json({ error: 'University not found' });

  const existing = db.prepare('SELECT id FROM colleges WHERE universityId = ? AND LOWER(name) = LOWER(?)')
    .get(universityId, name);
  if (existing) return res.status(400).json({ error: 'This college already exists under the university' });

  const info = db.prepare('INSERT INTO colleges (universityId, name, district) VALUES (?, ?, ?)')
    .run(universityId, name, district);

  const college = db.prepare('SELECT id, universityId, name, district FROM colleges WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json({ message: 'College added', college });
});

router.put('/colleges/:id', authenticateToken, adminOnly, (req, res) => {
  const college = db.prepare('SELECT id, universityId, name, district FROM colleges WHERE id = ?').get(req.params.id);
  if (!college) return res.status(404).json({ error: 'College not found' });

  const name = (req.body.name ?? college.name).trim();
  const district = (req.body.district ?? college.district).trim();

  if (!name) return res.status(400).json({ error: 'College name is required' });

  const existing = db.prepare('SELECT id FROM colleges WHERE universityId = ? AND LOWER(name) = LOWER(?) AND id != ?')
    .get(college.universityId, name, college.id);
  if (existing) return res.status(400).json({ error: 'This college already exists under the university' });

  db.prepare('UPDATE colleges SET name = ?, district = ? WHERE id = ?')
    .run(name, district, college.id);

  const updated = db.prepare('SELECT id, universityId, name, district FROM colleges WHERE id = ?')
    .get(college.id);

  res.json({ message: `Updated ${name}`, college: updated });
});

router.delete('/colleges/:id', authenticateToken, adminOnly, (req, res) => {
  const college = db.prepare('SELECT id, name FROM colleges WHERE id = ?').get(req.params.id);
  if (!college) return res.status(404).json({ error: 'College not found' });

  db.prepare('DELETE FROM colleges WHERE id = ?').run(college.id);
  res.json({ message: `Removed ${college.name}` });
});

module.exports = router;
