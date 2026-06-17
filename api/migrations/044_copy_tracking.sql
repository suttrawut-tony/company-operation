-- Migration 044: Add copy tracking for PR→PO flow
-- pr_lines.copied_qty tracks how much of each PR line has been copied to POs
-- po_lines.pr_line_id links each PO line back to the source PR line

ALTER TABLE pr_lines ADD COLUMN IF NOT EXISTS copied_qty DECIMAL(15,2) DEFAULT 0;
ALTER TABLE po_lines ADD COLUMN IF NOT EXISTS pr_line_id UUID REFERENCES pr_lines(id);
