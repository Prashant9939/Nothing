// Server-side session registry for JWTs.
//
// JWTs are stateless, so revocation needs a lookup table: every issued token
// gets a row in `sessions`, and middleware rejects tokens with no live row.
//   issueSession(userId, token)  -> register a freshly signed token
//   isActive(token)              -> middleware gate (SELECT only)
//   revoke(token)                -> logout (one device)
//   revokeAll(userId, except?)   -> password change (keep current device)
//                                   or password reset (kill everything)
// Rows expire with the token itself (exp claim) and are pruned on startup
// (see db.js) plus opportunistically on issue.
const db = require('../db');

// Timestamps are stored as 'YYYY-MM-DD HH:MM:SS' in UTC — the same format the
// rest of the schema uses for to_char(now() at time zone 'UTC', ...) columns —
// so string comparison is chronological.
const utcNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function expiryForToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'));
    if (payload.exp) return new Date(payload.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');
  } catch (_) { /* fall through to default window */ }
  // Match the default JWT_EXPIRES_IN of 7d when the claim is unreadable.
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

async function issueSession(userId, token) {
  await db.run(
    'INSERT INTO sessions (userId, token, expiresAt) VALUES (?, ?, ?) ON CONFLICT (token) DO UPDATE SET userId = EXCLUDED.userId, expiresAt = EXCLUDED.expiresAt',
    userId, token, expiryForToken(token)
  );
}

async function isActive(token) {
  const row = await db.get('SELECT 1 AS ok FROM sessions WHERE token = ? AND expiresAt > ? LIMIT 1', token, utcNow());
  return !!row;
}

async function revoke(token) {
  if (token) await db.run('DELETE FROM sessions WHERE token = ?', token);
}

async function revokeAll(userId, exceptToken = null) {
  if (exceptToken) {
    await db.run('DELETE FROM sessions WHERE userId = ? AND token != ?', userId, exceptToken);
  } else {
    await db.run('DELETE FROM sessions WHERE userId = ?', userId);
  }
}

module.exports = { issueSession, isActive, revoke, revokeAll };
