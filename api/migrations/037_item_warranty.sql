-- Warranty config per item (Item Master). When has_warranty is true, a sale
-- of this item should alert the seller and produce a warranty document.
ALTER TABLE items ADD COLUMN IF NOT EXISTS has_warranty   BOOLEAN     DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS warranty_months INTEGER    DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS warranty_terms  TEXT;
