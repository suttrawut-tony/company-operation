-- ═══════════════════════════════════════════════════════════
-- Ensure admin login ALWAYS works:  admin@sala-daeng.com / 111111
-- Idempotent & self-healing. Run anytime to restore the admin login:
--   psql sda_operation < api/ensure-admin.sql
-- Requires: pgcrypto extension + company 'sda-group' to exist.
-- NOTE: The seed admin is flagged with must_change_password = true,
--       so the first successful login forces a password change.
-- ═══════════════════════════════════════════════════════════
INSERT INTO users (
  company_id, email, password_hash,
  first_name, last_name, first_name_th, last_name_th,
  role, position, department, can_approve, approval_limit, is_active
)
SELECT
  c.id, 'admin@sala-daeng.com', crypt('111111', gen_salt('bf')),
  'Admin', 'Sala-Daeng', 'แอดมิน', 'ศาลาแดง',
  'executive', 'System Administrator', 'IT', true, 999999999, true
FROM companies c WHERE c.slug = 'sda-group'
ON CONFLICT (email) DO UPDATE SET
  password_hash = crypt('111111', gen_salt('bf')),
  is_active     = true,
  role          = 'executive';

-- Force password change on first successful login (idempotent)
UPDATE users SET must_change_password = true
WHERE email = 'admin@sala-daeng.com'
  AND (password_changed_at IS NULL OR password_hash = crypt('111111', password_hash));
