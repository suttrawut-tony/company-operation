-- Migration 042: Add description, expiry_date, quantity_on_hand to items
-- Feature 5.1: Extra fields for Item Master

ALTER TABLE items ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS expiry_date       DATE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity_on_hand  DECIMAL(15,2) DEFAULT 0;
