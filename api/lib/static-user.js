/**
 * Company Operation — Static (no-DB) login support
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
  if (!(process.env.STATIC_LOGIN_EMAIL && process.env.STATIC_LOGIN_PASSWORD)) {
    return false;
  }
  // P1-5: the static login is a no-DB executive back door (role=executive,
  // approval_limit 999M). NEVER enable it in production unless an operator has
  // explicitly opted in with STATIC_LOGIN_ALLOW_PROD=true.
  if (process.env.NODE_ENV === 'production' && process.env.STATIC_LOGIN_ALLOW_PROD !== 'true') {
    if (!staticConfigured._prodBlockWarned) {
      console.warn('[security] STATIC_LOGIN env is set but DISABLED in production '
        + '(set STATIC_LOGIN_ALLOW_PROD=true to force-enable — not recommended).');
      staticConfigured._prodBlockWarned = true;
    }
    return false;
  }
  if (!staticConfigured._enabledWarned) {
    console.warn('[security] STATIC_LOGIN is ENABLED — no-DB executive back door '
      + `active for "${(process.env.STATIC_LOGIN_EMAIL || '').toLowerCase().trim()}".`);
    staticConfigured._enabledWarned = true;
  }
  return true;
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
