const jwt = require('jsonwebtoken');
const db = require('../db');
const sessions = require('../lib/sessions');

const USER_COLUMNS = `
  id, firstName, lastName, email, phone, university, college, course, year,
  gender, dob, rollNo, regNo, guardianName, guardianPhone, guardianRelation,
  role, createdAt
`;

const loadUser = async (id) => db.get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, id);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await loadUser(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found. Please login again.' });
    }

    // Server-side revocation: a signed JWT is only honoured while its row in
    // `sessions` is alive (logout / password change / password reset delete it)
    if (!(await sessions.isActive(token))) {
      return res.status(401).json({ error: 'Session revoked. Please login again.' });
    }

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

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await loadUser(decoded.id);
    if (user && (await sessions.isActive(token))) {
      req.user = user;
      req.token = token;
    }
  } catch (_) {
    // Token invalid or revoked, continue without auth
  }

  next();
};

module.exports = { authenticateToken, optionalAuth };
