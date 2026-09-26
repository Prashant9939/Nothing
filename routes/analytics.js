const express = require('express');
const db = require('../db');

const router = express.Router();

const TYPES = new Set(['visit', 'pageview', 'click']);
const VISITOR_ID = /^[A-Za-z0-9_-]{8,64}$/;

// Public beacon — receives visit / pageview / click events from the SPA.
// Mounted with its own rate limiter so click traffic never eats the global budget.
router.post('/', (req, res) => {
  const { visitorId, type, path } = req.body || {};

  if (typeof visitorId !== 'string' || !VISITOR_ID.test(visitorId)) {
    return res.status(400).json({ error: 'Invalid visitor id' });
  }
  if (!TYPES.has(type)) {
    return res.status(400).json({ error: 'Invalid event type' });
  }

  let pagePath = null;
  if (path !== undefined && path !== null) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.length > 500) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    // Strip query/hash so cardinals stay low and pages group cleanly
    pagePath = path.split(/[?#]/)[0].slice(0, 300);
  }

  try {
    db.prepare('INSERT INTO analytics_events (visitorId, type, path) VALUES (?, ?, ?)')
      .run(visitorId, type, pagePath);
    res.json({ ok: true });
  } catch (err) {
    console.error('analytics track failed:', err.message);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

module.exports = router;
