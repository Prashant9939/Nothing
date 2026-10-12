// Set (or reset) a user's password from the CLI and revoke all their sessions.
// Usage: node scripts/setAdminPassword.js <email> <newPassword>
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { passwordPolicyError, BCRYPT_COST } = require('../lib/passwordPolicy');
const db = require('../db');

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error('Usage: node scripts/setAdminPassword.js <email> <newPassword>');
    process.exit(1);
  }

  const policyError = passwordPolicyError(newPassword);
  if (policyError) {
    console.error(policyError);
    process.exit(1);
  }

  await db.init();

  const user = await db.get('SELECT id, role FROM users WHERE email = ?', email.toLowerCase());
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await db.run('UPDATE users SET password = ? WHERE id = ?', hash, user.id);
  // Kill every existing session so devices holding the old password's tokens
  // are signed out immediately (password change invalidates them).
  const revoked = await db.run('DELETE FROM sessions WHERE userId = ?', user.id);

  console.log(
    `Password updated for ${email} (role: ${user.role}). ${revoked.changes} session(s) revoked.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
