-- ═══════════════════════════════════════════════════════════
-- Company Operation — Seed Data for S.D.A. Group
-- Based on SAP Blueprint actual data
-- ═══════════════════════════════════════════════════════════

-- 1. Company
INSERT INTO companies (id, name, slug, tax_id, address, phone) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'บริษัท เอส.ดี.เอ. กรุ๊ป จำกัด',
  'sda-group',
  '0105529041298',
  '367/1 อาคารเดชะรินทร์ ซอยศูนย์วิจัย 4 ถนนพระรามที่ 9 แขวงบางกะปิ เขตห้วยขวาง กรุงเทพมหานคร 10310',
  '02-3195588'
);

-- 2. Users (19 users from SAP Blueprint)
INSERT INTO users (company_id, email, first_name, first_name_th, last_name, last_name_th, role, position, department, sap_user_code, sap_license, can_approve, approval_limit, password_hash) VALUES
-- Executive
('11111111-1111-1111-1111-111111111111', 'somparat@sda-group.com', 'Somparat', 'ศมพรัตร์', 'Decharintr', 'เดชะรินทร์', 'executive', 'Assistant MD', 'MD', 'Somparat D', 'Professional', true, 999999999, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'warit@sda-group.com', 'Warit', 'วริศ', 'Decharintr', 'เดชะรินทร์', 'executive', 'CEO', 'CEO', 'Warit D', 'Professional', true, 999999999, crypt('demo1234', gen_salt('bf'))),
-- PM
('11111111-1111-1111-1111-111111111111', 'jathuthep@sda-group.com', 'Jathuthep', 'จตุเทพ', 'Kueadam', 'เกื้อดำ', 'pm', 'Manager', 'PRJ', 'Jathuthep K', 'Limited - Logistics', true, 100000, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'winit@sda-group.com', 'Winit', 'วินิจ', 'Navee', 'นาวี', 'pm', 'Head', 'PRJ', 'Winit N', 'Limited - Logistics', true, 100000, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'phuchong@sda-group.com', 'Phuchong', 'ภุชงค์', 'Mongkol', 'มงคล', 'pm', 'Head', 'PRJ', 'Phuchong M', 'Limited - Logistics', true, 100000, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'norawat@sda-group.com', 'Norawat', 'นรวัฒน์', 'Sappachang', 'สรรพช่าง', 'pm', 'Manager', 'Ass.MD', 'Norawat S', 'Limited - Logistics', true, 100000, crypt('demo1234', gen_salt('bf'))),
-- Finance
('11111111-1111-1111-1111-111111111111', 'sukanya@sda-group.com', 'Sukanya', 'สุกัญญา', 'Duangsintham', 'ดวงศีลธรรม', 'finance', 'Senior', 'FIN', 'Sukanya D', 'Limited - Financials', true, 100000, crypt('demo1234', gen_salt('bf'))),
-- Accounting
('11111111-1111-1111-1111-111111111111', 'pranee@sda-group.com', 'Pranee', 'ปราณี', 'Samritmeephon', 'สัมฤทธิ์มีผล', 'accounting', 'Manager', 'ACC', 'Pranee S', 'Limited - Financials', false, 0, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'wachirapron@sda-group.com', 'Wachirapron', 'วชิราภรณ์', 'Sunthorn', 'สุนทร', 'accounting', 'Senior', 'ACC', 'Wachirapron S', 'Limited - Financials', false, 0, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'nuanwan@sda-group.com', 'Nuanwan', 'นวลวรรณ', 'Wongpanich', 'ว่องพานิช', 'accounting', 'Staff', 'ACC', 'Nuanwan W', 'Limited - Financials', false, 0, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'kanganavadee@sda-group.com', 'Kanganavadee', 'กาญจนาวดี', 'Konpetch', 'ก้อนเพชร', 'accounting', 'Staff', 'ACC', 'Kanganavadee K', 'Limited - Financials', false, 0, crypt('demo1234', gen_salt('bf'))),
-- Procurement
('11111111-1111-1111-1111-111111111111', 'pimradaporn@sda-group.com', 'Pimradaporn', 'พิมรดาภรณ์', 'Sunahu', 'สูน่าหู', 'procurement', 'Senior', 'PRC-Domestic', 'Pimradaporn S', 'Limited - Logistics', true, 50000, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'mayurachat@sda-group.com', 'Mayurachat', 'มยุรฉัตร', 'Chantawongwut', 'ฉันทวงศ์วุฒิ', 'procurement', 'Senior', 'PRC-International', 'Mayurachat C', 'Limited - Logistics', true, 50000, crypt('demo1234', gen_salt('bf'))),
-- Admin
('11111111-1111-1111-1111-111111111111', 'phetcharat@sda-group.com', 'Phetcharat', 'เพชรรัตน์', 'Saenkaew', 'แสนแก้ว', 'admin', 'Staff', 'WHL', 'Phetcharat S', 'Limited - Logistics', false, 0, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'teera@sda-group.com', 'Teera', 'ธีระ', 'Suppakomolkit', 'ศุภโกมลกิจ', 'admin', 'Senior', 'IT', 'Teera S', 'Limited - Logistics', false, 0, crypt('demo1234', gen_salt('bf'))),
-- Staff
('11111111-1111-1111-1111-111111111111', 'ampai@sda-group.com', 'Ampai', 'อำไพ', 'Santadratanawong', 'สันทัดรัตนวงศ์', 'staff', 'Head', 'SAL', 'Ampai T', 'Limited - Logistics', false, 0, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'donnapa@sda-group.com', 'Donnapa', 'ดลนภา', 'Inphupimon', 'อินภู่พิมล', 'staff', 'Senior', 'SAL', 'Donnapa I', 'Limited - Logistics', false, 0, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'sirikwan@sda-group.com', 'Sirikwan', 'ศิริขวัญ', 'Prakobkit', 'ประกอบกิจ', 'staff', 'Senior', 'PRJ', 'Sirikwan P', 'Limited - Logistics', false, 0, crypt('demo1234', gen_salt('bf'))),
('11111111-1111-1111-1111-111111111111', 'noppamas@sda-group.com', 'Noppamas', 'นพมาศ', 'Burana', 'บูรณะ', 'staff', 'Staff', 'PRJ', 'Noppamas B', 'Limited - Logistics', false, 0, crypt('demo1234', gen_salt('bf')));

-- 3. Vehicles (3 cars)
INSERT INTO vehicles (company_id, plate_number, name, vehicle_type, seats, status, current_km) VALUES
('11111111-1111-1111-1111-111111111111', 'กก-1234 กทม', 'Toyota Hilux Revo', 'Pickup', 5, 'available', 45230),
('11111111-1111-1111-1111-111111111111', 'ขข-5678 กทม', 'Toyota Commuter', 'Van', 12, 'in_use', 68100),
('11111111-1111-1111-1111-111111111111', 'คค-9012 กทม', 'Honda City', 'Sedan', 5, 'maintenance', 32400);

-- 4. Approval Matrix (default)
INSERT INTO approval_matrix (company_id, doc_type, min_amount, max_amount, step_order, required_role) VALUES
-- PR: Tier 1
('11111111-1111-1111-1111-111111111111', 'pr', 0, 10000, 1, 'pm'),
-- PR: Tier 2
('11111111-1111-1111-1111-111111111111', 'pr', 10001, 100000, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'pr', 10001, 100000, 2, 'finance'),
-- PR: Tier 3
('11111111-1111-1111-1111-111111111111', 'pr', 100001, 999999999, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'pr', 100001, 999999999, 2, 'finance'),
('11111111-1111-1111-1111-111111111111', 'pr', 100001, 999999999, 3, 'executive'),
-- Expense: same tiers
('11111111-1111-1111-1111-111111111111', 'expense', 0, 10000, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'expense', 10001, 100000, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'expense', 10001, 100000, 2, 'finance'),
('11111111-1111-1111-1111-111111111111', 'expense', 100001, 999999999, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'expense', 100001, 999999999, 2, 'finance'),
('11111111-1111-1111-1111-111111111111', 'expense', 100001, 999999999, 3, 'executive'),
-- Budget: always exec
('11111111-1111-1111-1111-111111111111', 'budget', 0, 999999999, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'budget', 0, 999999999, 2, 'executive'),
-- OT: always exec
('11111111-1111-1111-1111-111111111111', 'ot', 0, 999999999, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'ot', 0, 999999999, 2, 'executive'),
-- Vehicle: manager only
('11111111-1111-1111-1111-111111111111', 'vehicle', 0, 999999999, 1, 'pm'),
-- Travel
('11111111-1111-1111-1111-111111111111', 'travel', 0, 100000, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'travel', 100001, 999999999, 1, 'pm'),
('11111111-1111-1111-1111-111111111111', 'travel', 100001, 999999999, 2, 'executive');

-- 5. Number Series (May 2026)
INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number) VALUES
('11111111-1111-1111-1111-111111111111', 'PR', 'PR', '2605', 18),
('11111111-1111-1111-1111-111111111111', 'PO', 'PO', '2605', 8),
('11111111-1111-1111-1111-111111111111', 'EXP', 'EXP', '2605', 5),
('11111111-1111-1111-1111-111111111111', 'ADV', 'ADV', '2605', 1),
('11111111-1111-1111-1111-111111111111', 'TRV', 'TRV', '2605', 3),
('11111111-1111-1111-1111-111111111111', 'OT', 'OT', '2605', 12),
('11111111-1111-1111-1111-111111111111', 'VHC', 'VHC', '2605', 4),
('11111111-1111-1111-1111-111111111111', 'BG', 'BG', '2605', 3);

-- Admin user — login must ALWAYS work: admin@sala-daeng.com / 111111
-- Self-healing: re-running this seed restores the password + active flag.
INSERT INTO users (company_id, email, password_hash, first_name, last_name, first_name_th, last_name_th, role, position, department, can_approve, approval_limit, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'admin@sala-daeng.com', crypt('111111', gen_salt('bf')), 'Admin', 'Sala-Daeng', 'แอดมิน', 'ศาลาแดง', 'executive', 'System Administrator', 'IT', true, 999999999, true)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active     = true,
  role          = 'executive';
