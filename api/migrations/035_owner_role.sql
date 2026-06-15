-- Add the "owner" role (website/product owner — Pakorn, Sattrawut).
-- Owner is above company Admin and is the only role allowed to see the
-- development Change Log. Adding the enum value must stand alone (the new
-- value cannot be USED in the same transaction), so the user/module wiring
-- is done by ensureOwnerSetup() in migrate.js after this commits.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
