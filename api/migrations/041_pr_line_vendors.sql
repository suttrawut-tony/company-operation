-- Migration 041: Add vendor_quotes JSONB to pr_lines
-- Feature 7.5: Per-line-item vendor comparison (up to 3 vendors with prices)

ALTER TABLE pr_lines ADD COLUMN IF NOT EXISTS vendor_quotes JSONB DEFAULT '[]';
