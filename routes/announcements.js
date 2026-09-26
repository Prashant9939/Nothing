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

const ANNOUNCEMENT_COLUMNS = 'id, title, message, createdAt';

const listForUser = async (userId) => {
  const announcements = await db.all(`SELECT ${ANNOUNCEMENT_COLUMNS}, (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcementId = a.id) AS readCount
     FROM announcements a ORDER BY a.createdAt DESC, a.id DESC`);
  const readRows = await db.all('SELECT announcementId FROM announcement_reads WHERE userId = ?', userId);
  const readIds = new Set(readRows.map((r) => r.announcementId));
  return announcements.map((a) => ({ ...a, read: readIds.has(a.id) }));
};

// Logged-in users: announcements with this user's read flags
router.get('/', authenticateToken, async (req, res) => {
  const items = await listForUser(req.user.id);
  res.json({ announcements: items, unread: items.filter((i) => !i.read).length });
});

// ===================== ADMIN =====================
router.post('/', authenticateToken, adminOnly, async (req, res) => {
  const title = (req.body.title || '').trim();
  const message = (req.body.message || '').trim();

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const info = await db.run('INSERT INTO announcements (title, message) VALUES (?, ?)', title, message);
  const announcement = await db.get(`SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE id = ?`, info.lastInsertRowid);

  res.status(201).json({ message: 'Announcement published', announcement: { ...announcement, readCount: 0, read: false } });
});

router.put('/:id', authenticateToken, adminOnly, async (req, res) => {
  const existing = await db.get('SELECT id FROM announcements WHERE id = ?', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });

  const title = (req.body.title || '').trim();
  const message = (req.body.message || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!message) return res.status(400).json({ error: 'Message is required' });

  await db.run('UPDATE announcements SET title = ?, message = ? WHERE id = ?', title, message, existing.id);

  const announcement = await db.get(`SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE id = ?`, existing.id);
  const readCount = (await db.get('SELECT COUNT(*) AS count FROM announcement_reads WHERE announcementId = ?', announcement.id)).count;

  res.json({ message: 'Announcement updated', announcement: { ...announcement, readCount, read: false } });
});

router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  const existing = await db.get('SELECT id, title FROM announcements WHERE id = ?', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });

  await db.run('DELETE FROM announcements WHERE id = ?', existing.id);
  res.json({ message: `Deleted "${existing.title}"` });
});

// ===================== READ TRACKING =====================
router.post('/read-all', authenticateToken, async (req, res) => {
  await db.run('INSERT INTO announcement_reads (announcementId, userId) SELECT id, ? FROM announcements ON CONFLICT DO NOTHING', req.user.id);
  res.json({ message: 'All announcements marked as read' });
});

router.post('/:id/read', authenticateToken, async (req, res) => {
  const announcement = await db.get('SELECT id FROM announcements WHERE id = ?', req.params.id);
  if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

  await db.run('INSERT INTO announcement_reads (announcementId, userId) VALUES (?, ?) ON CONFLICT DO NOTHING', announcement.id, req.user.id);
  res.json({ message: 'Marked as read' });
});

module.exports = router;
