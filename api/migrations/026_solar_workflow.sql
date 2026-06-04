-- 026: Solar Cell workflow — Survey → Items → Quotation → Project

-- Survey fields on bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phase VARCHAR(20) DEFAULT 'survey';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gps_lat NUMERIC(10,7);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gps_lng NUMERIC(10,7);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS roof_area NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS roof_type VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS orientation VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recommended_kwp NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS survey_photos TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS survey_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS electrical_info TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quotation_id UUID;

-- Booking items (selected after survey)
CREATE TABLE IF NOT EXISTS booking_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_id UUID,
  item_code VARCHAR(50),
  item_name VARCHAR(200) NOT NULL,
  qty NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'ea',
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bi_booking ON booking_items(booking_id);

-- Quotations (Sales Quotation)
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  sq_number VARCHAR(30) UNIQUE,
  booking_id UUID REFERENCES bookings(id),
  project_id UUID REFERENCES projects(id),
  customer_name VARCHAR(200),
  customer_phone VARCHAR(50),
  customer_address TEXT,
  site_name VARCHAR(200),
  site_location VARCHAR(200),
  system_capacity NUMERIC(10,2),
  roof_type VARCHAR(50),
  roof_area NUMERIC(10,2),
  subtotal NUMERIC(14,2) DEFAULT 0,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  discount_amt NUMERIC(14,2) DEFAULT 0,
  vat_pct NUMERIC(5,2) DEFAULT 7,
  vat_amt NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  terms TEXT,
  validity_days INT DEFAULT 30,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sq_company ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_sq_status ON quotations(status);

-- Quotation items
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_id UUID,
  item_code VARCHAR(50),
  item_name VARCHAR(200) NOT NULL,
  qty NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'ea',
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_qi_quotation ON quotation_items(quotation_id);

-- Add Quotation module to sidebar
INSERT INTO company_modules (company_id, module_id, module_name, module_group, icon, href, is_enabled, sort_order, allowed_roles)
SELECT c.id, 'quotation', 'Quotation', 'document', 'expense', 'quotation.html', true, 35,
  ARRAY['executive','manager','admin','finance','procurement']
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_modules WHERE company_id = c.id AND module_id = 'quotation'
);

-- Seed Solar Cell items into items table (uses item_code, item_name, item_name_th, uom, unit_price, category)
INSERT INTO items (company_id, item_code, item_name, item_name_th, category, uom, unit_price)
SELECT c.id, v.code, v.name, v.name_th, 'Solar Cell Equipment', v.unit, v.price
FROM companies c,
(VALUES
  ('SOL-PNL-550', 'Solar Panel 550W Mono', 'แผงโซลาร์เซลล์ 550W', 'EA', 5500),
  ('SOL-PNL-450', 'Solar Panel 450W Mono', 'แผงโซลาร์เซลล์ 450W', 'EA', 4200),
  ('SOL-INV-05H', 'Inverter 5kW Hybrid', 'อินเวอร์เตอร์ไฮบริด 5kW', 'EA', 35000),
  ('SOL-INV-10H', 'Inverter 10kW Hybrid', 'อินเวอร์เตอร์ไฮบริด 10kW', 'EA', 55000),
  ('SOL-INV-15G', 'Inverter 15kW On-Grid', 'อินเวอร์เตอร์ออนกริด 15kW', 'EA', 42000),
  ('SOL-BAT-05', 'Battery LiFePO4 5.12kWh', 'แบตเตอรี่ลิเธียม 5.12kWh', 'EA', 65000),
  ('SOL-BAT-10', 'Battery LiFePO4 10.24kWh', 'แบตเตอรี่ลิเธียม 10.24kWh', 'EA', 120000),
  ('SOL-MNT-RAIL', 'Mounting Rail Aluminum', 'รางยึดแผงอลูมิเนียม', 'M', 350),
  ('SOL-MNT-CLMP', 'Mounting Clamp Set', 'ชุดแคลมป์ยึดแผง', 'SET', 120),
  ('SOL-CBL-DC6', 'DC Cable 6mm²', 'สาย DC 6mm²', 'M', 45),
  ('SOL-CBL-AC4', 'AC Cable 4mm²', 'สาย AC 4mm²', 'M', 35),
  ('SOL-BRK-DC32', 'DC Breaker 32A', 'DC Breaker 32A', 'EA', 1200),
  ('SOL-BRK-AC32', 'AC Breaker 32A', 'AC Breaker 32A', 'EA', 450),
  ('SOL-SPD-DC', 'Surge Protector DC', 'กันฟ้าผ่า DC SPD', 'EA', 2500),
  ('SOL-SPD-AC', 'Surge Protector AC', 'กันฟ้าผ่า AC SPD', 'EA', 1800),
  ('SOL-MTR-SMART', 'Smart Meter', 'มิเตอร์อัจฉริยะวัดพลังงาน', 'EA', 3500),
  ('SOL-MC4', 'MC4 Connector Pair', 'ข้อต่อ MC4 คู่', 'PAIR', 80),
  ('SOL-TRAY', 'Cable Tray', 'รางเก็บสาย', 'M', 180),
  ('SOL-SEAL', 'Rooftop Sealant', 'ซีลกันรั่วหลังคา', 'TUBE', 250),
  ('SOL-LABOR', 'Installation Labor', 'ค่าแรงติดตั้ง (per kWp)', 'KWP', 8000)
) AS v(code, name, name_th, unit, price)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE items.item_code = v.code AND items.company_id = c.id)
LIMIT 20;
