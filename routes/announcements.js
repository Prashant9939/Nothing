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

const ANNOUNCEMENT_COLUMNS = 'id, title, message, createdAt';

const listForUser = (userId) => {
  const announcements = db.prepare(
    `SELECT ${ANNOUNCEMENT_COLUMNS}, (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcementId = a.id) AS readCount
     FROM announcements a ORDER BY a.createdAt DESC, a.id DESC`
  ).all();
  const readIds = new Set(
    db.prepare('SELECT announcementId FROM announcement_reads WHERE userId = ?')
      .all(userId).map((r) => r.announcementId)
  );
  return announcements.map((a) => ({ ...a, read: readIds.has(a.id) }));
};

// Logged-in users: announcements with this user's read flags
router.get('/', authenticateToken, (req, res) => {
  const items = listForUser(req.user.id);
  res.json({ announcements: items, unread: items.filter((i) => !i.read).length });
});

// ===================== ADMIN =====================
router.post('/', authenticateToken, adminOnly, (req, res) => {
  const title = (req.body.title || '').trim();
  const message = (req.body.message || '').trim();

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const info = db.prepare('INSERT INTO announcements (title, message) VALUES (?, ?)').run(title, message);
  const announcement = db.prepare(`SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE id = ?`)
    .get(info.lastInsertRowid);

  res.status(201).json({ message: 'Announcement published', announcement: { ...announcement, readCount: 0, read: false } });
});

router.put('/:id', authenticateToken, adminOnly, (req, res) => {
  const existing = db.prepare('SELECT id FROM announcements WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });

  const title = (req.body.title || '').trim();
  const message = (req.body.message || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!message) return res.status(400).json({ error: 'Message is required' });

  db.prepare('UPDATE announcements SET title = ?, message = ? WHERE id = ?').run(title, message, existing.id);

  const announcement = db.prepare(`SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE id = ?`).get(existing.id);
  const readCount = db.prepare('SELECT COUNT(*) AS count FROM announcement_reads WHERE announcementId = ?')
    .get(announcement.id).count;

  res.json({ message: 'Announcement updated', announcement: { ...announcement, readCount, read: false } });
});

router.delete('/:id', authenticateToken, adminOnly, (req, res) => {
  const existing = db.prepare('SELECT id, title FROM announcements WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });

  db.prepare('DELETE FROM announcements WHERE id = ?').run(existing.id);
  res.json({ message: `Deleted "${existing.title}"` });
});

// ===================== READ TRACKING =====================
router.post('/read-all', authenticateToken, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO announcement_reads (announcementId, userId) SELECT id, ? FROM announcements')
    .run(req.user.id);
  res.json({ message: 'All announcements marked as read' });
});

router.post('/:id/read', authenticateToken, (req, res) => {
  const announcement = db.prepare('SELECT id FROM announcements WHERE id = ?').get(req.params.id);
  if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

  db.prepare('INSERT OR IGNORE INTO announcement_reads (announcementId, userId) VALUES (?, ?)')
    .run(announcement.id, req.user.id);
  res.json({ message: 'Marked as read' });
});

module.exports = router;
