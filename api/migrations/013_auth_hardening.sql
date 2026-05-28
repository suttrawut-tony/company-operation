-- ═══════════════════════════════════════════════════════════
-- 013 — Auth hardening
-- 1) Lowercase all existing emails + case-insensitive unique index
-- 2) Force-change-password on first login
-- 3) Failed-login tracking (basic lockout signal)
-- 4) Password reset tokens
-- 5) Auth audit log
-- Run:  psql sda_operation < api/migrations/013_auth_hardening.sql
-- ═══════════════════════════════════════════════════════════
BEGIN;

-- ── 1. Normalize existing emails (lowercase) ───────────────────────
-- Avoid clobbering: if two users collide after lowercasing, fail loudly.
DO $$
DECLARE
  collisions int;
BEGIN
  SELECT COUNT(*) INTO collisions FROM (
    SELECT LOWER(email) AS le, COUNT(*) c
    FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1
  ) x;
  IF collisions > 0 THEN
    RAISE EXCEPTION 'Cannot lowercase emails: % collision group(s) found. Resolve duplicates first.', collisions;
  END IF;
END$$;

UPDATE users SET email = LOWER(email) WHERE email <> LOWER(email);

-- Case-insensitive uniqueness going forward
DROP INDEX IF EXISTS users_email_lower_unique;
CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email));

-- ── 2. Force change password + login tracking ──────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS failed_login_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_until         timestamptz;

-- Default admin must rotate the seed password '111111' on first login
UPDATE users SET must_change_password = true
WHERE email = 'admin@sala-daeng.com' AND password_changed_at IS NULL;

-- ── 3. Password reset tokens ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  varchar(128) NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  requested_ip varchar(64),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_user        ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash  ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_expires_at  ON password_reset_tokens(expires_at);

-- ── 4. Auth audit log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id           bigserial PRIMARY KEY,
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  email_tried  varchar(200),
  event        varchar(40) NOT NULL, -- login_success, login_fail, password_reset_request, password_reset_used, password_change, lockout
  success      boolean NOT NULL,
  ip           varchar(64),
  user_agent   text,
  detail       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aal_user_id    ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_aal_email      ON auth_audit_log(email_tried);
CREATE INDEX IF NOT EXISTS idx_aal_event_time ON auth_audit_log(event, created_at);

COMMIT;
