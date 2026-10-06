const jwt = require('jsonwebtoken');
const db = require('../db');

const USER_COLUMNS = `
  u.id, u.firstName, u.lastName, u.email, u.phone, u.university, u.college, u.course, u.year,
  u.gender, u.dob, u.rollNo, u.regNo, u.guardianName, u.guardianPhone, u.guardianRelation,
  u.role, u.createdAt
`;

// Same UTC 'YYYY-MM-DD HH:MM:SS' format lib/sessions.js writes expiresAt with.
const utcNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Single round trip: user row + session liveness in one query (the token
    // is unique, so the LEFT JOIN yields at most one row). The LEFT JOIN keeps
    // "user deleted" and "session revoked" distinguishable for the message.
    const row = await db.get(`
      SELECT ${USER_COLUMNS}, (s.token IS NOT NULL) AS sessionOk
      FROM users u
      LEFT JOIN sessions s ON s.token = ? AND s.userId = u.id AND s.expiresAt > ?
      WHERE u.id = ?
    `, token, utcNow(), decoded.id);

    if (!row) {
      return res.status(401).json({ error: 'User not found. Please login again.' });
    }

    // Server-side revocation: a signed JWT is only honoured while its row in
    // `sessions` is alive (logout / password change / password reset delete it)
    if (!row.sessionOk) {
      return res.status(401).json({ error: 'Session revoked. Please login again.' });
    }

    const { sessionOk, ...user } = row;
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please login again.' });
  }
};

module.exports = { authenticateToken };
