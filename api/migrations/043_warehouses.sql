-- ═══════════════════════════════════════════════════════════
-- Migration 043: Warehouses & Warehouse Stock
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS warehouses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  code        VARCHAR(20) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  location    TEXT,
  status      VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warehouses_company ON warehouses(company_id);
CREATE UNIQUE INDEX idx_warehouses_code_company ON warehouses(company_id, code);

CREATE TABLE IF NOT EXISTS warehouse_stock (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity      DECIMAL(15,2) NOT NULL DEFAULT 0,
  min_quantity  DECIMAL(15,2) NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX idx_warehouse_stock_item ON warehouse_stock(item_id);
CREATE UNIQUE INDEX idx_warehouse_stock_wh_item ON warehouse_stock(warehouse_id, item_id);

-- Seed default warehouses for all existing companies
INSERT INTO warehouses (company_id, code, name, location, status)
SELECT c.id, wh.code, wh.name, wh.location, 'active'
FROM companies c
CROSS JOIN (VALUES
  ('HQ01', 'คลังสินค้าหลัก',       'สำนักงานใหญ่'),
  ('PJ00', 'คลังโครงการ',          'คลังสินค้าประจำโครงการ'),
  ('PJ01', 'คลังสินค้าคงเหลือ',    'คลังเก็บสินค้าคงเหลือจากโครงการ')
) AS wh(code, name, location)
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses w WHERE w.company_id = c.id AND w.code = wh.code
);
