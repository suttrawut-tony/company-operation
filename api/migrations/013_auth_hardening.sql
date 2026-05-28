-- ═══════════════════════════════════════════════════════════
-- 013 — Auth hardening (safe, idempotent, additive only)
-- Adds optional columns and the password-reset-tokens table.
-- Auth code works whether or not this migration has been applied.
-- Re-runnable: every operation uses IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at  timestamptz;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL,
  token_hash   varchar(128) NOT NULL,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  requested_ip varchar(64),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON password_reset_tokens(expires_at);

COMMIT;
