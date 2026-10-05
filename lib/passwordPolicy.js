// Shared password strength policy for every password-setting endpoint.

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_RULE_MESSAGE =
  'Password must be at least 6 characters and include an uppercase letter, a lowercase letter, a number and a symbol';

// bcrypt work factor for every NEW password hash (~4x faster than 12, still
// safely above the offline-cracking floor). Existing hashes embed their own
// cost and keep verifying unchanged.
const BCRYPT_COST = 10;

function passwordPolicyError(password) {
  const pw = String(password ?? '');
  if (pw.length < PASSWORD_MIN_LENGTH) return PASSWORD_RULE_MESSAGE;
  if (!/[A-Z]/.test(pw)) return PASSWORD_RULE_MESSAGE;
  if (!/[a-z]/.test(pw)) return PASSWORD_RULE_MESSAGE;
  if (!/[0-9]/.test(pw)) return PASSWORD_RULE_MESSAGE;
  if (!/[^A-Za-z0-9\s]/.test(pw)) return PASSWORD_RULE_MESSAGE;
  return null;
}

module.exports = { passwordPolicyError, BCRYPT_COST };
