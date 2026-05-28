/**
 * SDA Operation — Password rules + reset-token helpers
 */
const crypto = require('crypto');

const MIN_LEN = 8;

/**
 * @returns {string|null} null if OK, otherwise the violation message.
 */
function validateStrength(pw) {
  if (typeof pw !== 'string') return 'Password is required';
  if (pw.length < MIN_LEN) return `Password must be at least ${MIN_LEN} characters`;
  if (!/[A-Za-z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
  return null;
}

function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('hex'); // 64-char URL-safe
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashResetToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { validateStrength, generateResetToken, hashResetToken, MIN_LEN };
