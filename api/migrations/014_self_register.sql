-- ═══════════════════════════════════════════════════════════
-- 014 — Self-register with admin approval
-- 1) Track which user approved each account + when
-- 2) Flag self-registered (vs admin-created) accounts
-- 3) Backfill: all existing active users count as approved
-- Run:  psql sda_operation < api/migrations/014_self_register.sql
-- ═══════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by      uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS registered_self  boolean NOT NULL DEFAULT false;

-- All existing active users are already trusted — count them as approved
-- so they don't show up as "pending" in the admin UI.
UPDATE users
   SET approved_at = COALESCE(created_at, NOW())
 WHERE is_active = true AND approved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_pending_approval
  ON users (company_id)
  WHERE registered_self = true AND approved_at IS NULL;

COMMIT;
