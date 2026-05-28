-- ═══════════════════════════════════════════════════════════
-- Migration 009: Advanced PR/PO Features
-- Document Chain, Partial Receipt, Approval Templates, Vendor Quotes, WHT
-- ═══════════════════════════════════════════════════════════

-- 1. Goods Receipt PO (GRPO)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  project_id    UUID REFERENCES projects(id),
  po_id         UUID REFERENCES purchase_orders(id),
  doc_number    VARCHAR(30) UNIQUE NOT NULL,
  doc_date      DATE DEFAULT CURRENT_DATE,
  status        VARCHAR(20) DEFAULT 'draft',  -- draft, posted, cancelled
  warehouse     VARCHAR(10) DEFAULT 'HQ01',
  remarks       TEXT,
  sap_doc_num   INTEGER,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grpo_lines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grpo_id       UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_line_id    UUID REFERENCES po_lines(id),
  item_code     VARCHAR(50),
  item_name     VARCHAR(300),
  ordered_qty   DECIMAL(15,2) DEFAULT 0,
  received_qty  DECIMAL(15,2) DEFAULT 0,
  uom           VARCHAR(20),
  unit_price    DECIMAL(15,2) DEFAULT 0,
  total_price   DECIMAL(15,2) DEFAULT 0,
  warehouse     VARCHAR(10),
  line_num      INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AP Invoice
CREATE TABLE IF NOT EXISTS ap_invoices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  project_id    UUID REFERENCES projects(id),
  grpo_id       UUID REFERENCES goods_receipts(id),
  po_id         UUID REFERENCES purchase_orders(id),
  doc_number    VARCHAR(30) UNIQUE NOT NULL,
  doc_date      DATE DEFAULT CURRENT_DATE,
  due_date      DATE,
  vendor_code   VARCHAR(20),
  vendor_name   VARCHAR(200),
  total_amount  DECIMAL(15,2) DEFAULT 0,
  wht_amount    DECIMAL(15,2) DEFAULT 0,
  net_amount    DECIMAL(15,2) DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'draft',  -- draft, posted, paid, cancelled
  payment_ref   VARCHAR(100),
  remarks       TEXT,
  sap_doc_num   INTEGER,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ap_invoice_lines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id    UUID NOT NULL REFERENCES ap_invoices(id) ON DELETE CASCADE,
  item_code     VARCHAR(50),
  item_name     VARCHAR(300),
  quantity      DECIMAL(15,2) DEFAULT 0,
  unit_price    DECIMAL(15,2) DEFAULT 0,
  total_price   DECIMAL(15,2) DEFAULT 0,
  tax_code      VARCHAR(10),
  wht_code      VARCHAR(10),
  wht_amount    DECIMAL(15,2) DEFAULT 0,
  sap_account   VARCHAR(10),
  line_num      INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Document Chain: link documents together
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS pr_id UUID REFERENCES purchase_requests(id);

ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES purchase_orders(id),
  ADD COLUMN IF NOT EXISTS grpo_id UUID REFERENCES goods_receipts(id),
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES ap_invoices(id);

-- 4. Partial Receipt: track received qty on PO lines
ALTER TABLE po_lines
  ADD COLUMN IF NOT EXISTS received_qty DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_qty     DECIMAL(15,2);

-- Calculate open_qty = quantity - received_qty
UPDATE po_lines SET open_qty = COALESCE(quantity, 0) - COALESCE(received_qty, 0)
WHERE open_qty IS NULL;

-- 5. Approval Templates: amount-based routing
CREATE TABLE IF NOT EXISTS approval_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  doc_type      VARCHAR(20) NOT NULL, -- pr, po, expense, budget, ot, travel
  min_amount    DECIMAL(15,2) DEFAULT 0,
  max_amount    DECIMAL(15,2) DEFAULT 999999999,
  steps         JSONB NOT NULL DEFAULT '[]',
  -- steps: [{"role":"pm","action":"approve"},{"role":"executive","action":"approve"}]
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default approval templates
INSERT INTO approval_templates (company_id, doc_type, min_amount, max_amount, steps) VALUES
('11111111-1111-1111-1111-111111111111', 'pr', 0, 50000,
 '[{"role":"pm","action":"approve"}]'),
('11111111-1111-1111-1111-111111111111', 'pr', 50001, 500000,
 '[{"role":"pm","action":"approve"},{"role":"finance","action":"approve"}]'),
('11111111-1111-1111-1111-111111111111', 'pr', 500001, 999999999,
 '[{"role":"pm","action":"approve"},{"role":"finance","action":"approve"},{"role":"executive","action":"approve"}]'),
('11111111-1111-1111-1111-111111111111', 'expense', 0, 10000,
 '[{"role":"pm","action":"approve"}]'),
('11111111-1111-1111-1111-111111111111', 'expense', 10001, 100000,
 '[{"role":"pm","action":"approve"},{"role":"finance","action":"approve"}]'),
('11111111-1111-1111-1111-111111111111', 'expense', 100001, 999999999,
 '[{"role":"pm","action":"approve"},{"role":"finance","action":"approve"},{"role":"executive","action":"approve"}]');

-- 6. Vendor Quotes
CREATE TABLE IF NOT EXISTS vendor_quotes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  project_id    UUID REFERENCES projects(id),
  pr_id         UUID REFERENCES purchase_requests(id),
  vendor_code   VARCHAR(20),
  vendor_name   VARCHAR(200),
  quote_date    DATE DEFAULT CURRENT_DATE,
  valid_until   DATE,
  total_amount  DECIMAL(15,2) DEFAULT 0,
  currency      VARCHAR(3) DEFAULT 'THB',
  status        VARCHAR(20) DEFAULT 'pending', -- pending, selected, rejected
  remarks       TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_quote_lines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id      UUID NOT NULL REFERENCES vendor_quotes(id) ON DELETE CASCADE,
  item_code     VARCHAR(50),
  item_name     VARCHAR(300),
  quantity      DECIMAL(15,2) DEFAULT 0,
  unit_price    DECIMAL(15,2) DEFAULT 0,
  total_price   DECIMAL(15,2) DEFAULT 0,
  lead_days     INTEGER DEFAULT 0,
  line_num      INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WHT Configuration
CREATE TABLE IF NOT EXISTS wht_codes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  code          VARCHAR(10) NOT NULL,
  description   VARCHAR(200),
  rate          DECIMAL(5,2) NOT NULL, -- percentage e.g. 3.00
  is_active     BOOLEAN DEFAULT true
);

INSERT INTO wht_codes (company_id, code, description, rate) VALUES
('11111111-1111-1111-1111-111111111111', '5360', 'ค่าบริการ', 3.00),
('11111111-1111-1111-1111-111111111111', '5362', 'ค่าจ้างเหมา', 3.00),
('11111111-1111-1111-1111-111111111111', '5350', 'ค่าขนส่ง', 1.00),
('11111111-1111-1111-1111-111111111111', '5361', 'ค่าเช่า', 5.00),
('11111111-1111-1111-1111-111111111111', '5363', 'ค่าโฆษณา', 2.00)
ON CONFLICT DO NOTHING;
