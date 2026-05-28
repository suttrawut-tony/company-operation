/**
 * SDA Operation — Static (no-DB) login support
 *
 * When STATIC_LOGIN_EMAIL and STATIC_LOGIN_PASSWORD are both set, the
 * login route accepts that one credential pair WITHOUT touching the
 * database, and the authenticate middleware honors JWTs minted from it
 * by returning a hardcoded admin user — also without DB.
 *
 * Useful when the database isn't reachable yet but you still want to
 * see the product UI. Other API endpoints that read from the DB will
 * still fail until the DB is connected.
 */

const SEED_COMPANY_ID = '11111111-1111-1111-1111-111111111111'; // matches api/database.sql seed
const STATIC_USER_ID  = '00000000-0000-0000-0000-000000000001';

function staticConfigured() {
  return !!(process.env.STATIC_LOGIN_EMAIL && process.env.STATIC_LOGIN_PASSWORD);
}

function staticEmail() {
  return (process.env.STATIC_LOGIN_EMAIL || '').toLowerCase().trim();
}

function staticCredentialMatches(emailNormalized, password) {
  if (!staticConfigured()) return false;
  return emailNormalized === staticEmail()
      && password === process.env.STATIC_LOGIN_PASSWORD;
}

function buildStaticUser() {
  const email = staticEmail() || 'admin@local';
  return {
    id:                 STATIC_USER_ID,
    company_id:         process.env.STATIC_LOGIN_COMPANY_ID || SEED_COMPANY_ID,
    email,
    role:               'executive',
    first_name:         process.env.STATIC_LOGIN_NAME || 'Admin',
    last_name:          '',
    first_name_th:      '',
    last_name_th:       '',
    position:           'System Administrator',
    department:         'IT',
    can_approve:        true,
    approval_limit:     999999999,
    is_active:          true,
    must_change_password: false,
    password_hash:      null,
  };
}

module.exports = {
  STATIC_USER_ID,
  staticConfigured,
  staticEmail,
  staticCredentialMatches,
  buildStaticUser,
};
