-- ═══════════════════════════════════════════════════════════
-- SDA Operation — Full Sample Data
-- 12 Projects + Phases + Tasks + Budgets + PRs + POs
-- + Expenses + Vehicle Bookings + Travel + OT + Notifications
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  cid UUID := '11111111-1111-1111-1111-111111111111';
  -- Users
  warit UUID; somparat UUID; jathuthep UUID; winit UUID; phuchong UUID;
  norawat UUID; sukanya UUID; pranee UUID; pimradaporn UUID; mayurachat UUID;
  phetcharat UUID; teera UUID; sirikwan UUID; noppamas UUID;
  -- Projects
  p6 UUID; p7 UUID; p8 UUID; p9 UUID; p10 UUID; p11 UUID; p12 UUID;
  -- Existing projects
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID;
  -- Budget / Phase IDs
  b6 UUID; b7 UUID; b8 UUID;
  ph1 UUID; ph2 UUID; ph3 UUID; ph4 UUID;
  -- Vehicle IDs
  v1 UUID; v2 UUID; v3 UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO warit FROM users WHERE email = 'warit@sda-group.com';
  SELECT id INTO somparat FROM users WHERE email = 'somparat@sda-group.com';
  SELECT id INTO jathuthep FROM users WHERE email = 'jathuthep@sda-group.com';
  SELECT id INTO winit FROM users WHERE email = 'winit@sda-group.com';
  SELECT id INTO phuchong FROM users WHERE email = 'phuchong@sda-group.com';
  SELECT id INTO norawat FROM users WHERE email = 'norawat@sda-group.com';
  SELECT id INTO sukanya FROM users WHERE email = 'sukanya@sda-group.com';
  SELECT id INTO pranee FROM users WHERE email = 'pranee@sda-group.com';
  SELECT id INTO pimradaporn FROM users WHERE email = 'pimradaporn@sda-group.com';
  SELECT id INTO mayurachat FROM users WHERE email = 'mayurachat@sda-group.com';
  SELECT id INTO phetcharat FROM users WHERE email = 'phetcharat@sda-group.com';
  SELECT id INTO teera FROM users WHERE email = 'teera@sda-group.com';
  SELECT id INTO sirikwan FROM users WHERE email = 'sirikwan@sda-group.com';
  SELECT id INTO noppamas FROM users WHERE email = 'noppamas@sda-group.com';

  -- Get existing project IDs
  SELECT id INTO p1 FROM projects WHERE code = 'SDA-2026-001';
  SELECT id INTO p2 FROM projects WHERE code = 'SDA-2026-002';
  SELECT id INTO p3 FROM projects WHERE code = 'SDA-2026-003';
  SELECT id INTO p4 FROM projects WHERE code = 'SDA-2026-004';
  SELECT id INTO p5 FROM projects WHERE code = 'SDA-2026-005';

  -- Get vehicle IDs
  SELECT id INTO v1 FROM vehicles WHERE plate_number = 'กก-1234 กทม';
  SELECT id INTO v2 FROM vehicles WHERE plate_number = 'ขข-5678 กทม';
  SELECT id INTO v3 FROM vehicles WHERE plate_number = 'คค-9012 กทม';

  -- ═══════════════════════════════════════════
  -- NEW PROJECTS (6-12)
  -- ═══════════════════════════════════════════
  INSERT INTO projects (id, company_id, code, name, description, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-006', 'AIS Repeater System - Surat Thani', 'ติดตั้งระบบ AIS Repeater สำหรับท่าเรือสุราษฎร์ธานี', 'active', '2026-03-01', '2026-08-30', phuchong, 720000, 700000, 280000, 40, phuchong) RETURNING id INTO p6;
  INSERT INTO projects (id, company_id, code, name, description, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-007', 'Weather Station Network - Chumphon', 'ติดตั้งเครือข่ายสถานีตรวจอากาศ 5 จุด', 'active', '2026-04-01', '2026-10-31', winit, 1500000, 1450000, 362500, 25, winit) RETURNING id INTO p7;
  INSERT INTO projects (id, company_id, code, name, description, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-008', 'CCTV Monitoring Port - Laem Chabang', 'ระบบ CCTV ท่าเรือแหลมฉบัง 24 จุด', 'active', '2026-02-15', '2026-07-31', jathuthep, 2200000, 2100000, 1680000, 80, jathuthep) RETURNING id INTO p8;
  INSERT INTO projects (id, company_id, code, name, description, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-009', 'Radio Communication Upgrade - Navy', 'อัพเกรดระบบสื่อสารวิทยุ กองทัพเรือ', 'planning', '2026-06-01', '2026-12-31', norawat, 3500000, 0, 0, 0, norawat) RETURNING id INTO p9;
  INSERT INTO projects (id, company_id, code, name, description, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-010', 'Echo Sounder Maintenance - Songkhla', 'ซ่อมบำรุง Echo Sounder ประจำปี', 'active', '2026-01-15', '2026-04-30', winit, 350000, 340000, 340000, 100, winit) RETURNING id INTO p10;
  INSERT INTO projects (id, company_id, code, name, description, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-011', 'VTS System - Map Ta Phut', 'ระบบ Vessel Traffic Service ท่าเรือมาบตาพุด', 'active', '2026-03-15', '2026-11-30', phuchong, 4800000, 4600000, 920000, 20, phuchong) RETURNING id INTO p11;
  INSERT INTO projects (id, company_id, code, name, description, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-012', 'Gyro Compass Replacement - Ferry', 'เปลี่ยน Gyro Compass เรือเฟอร์รี่ 3 ลำ', 'completed', '2025-10-01', '2026-02-28', jathuthep, 900000, 880000, 865000, 100, jathuthep) RETURNING id INTO p12;

  -- Project members for new projects
  INSERT INTO project_members (project_id, user_id, role) VALUES
  (p6, phuchong, 'pm'), (p6, sirikwan, 'engineer'), (p6, noppamas, 'staff'),
  (p7, winit, 'pm'), (p7, phuchong, 'engineer'), (p7, noppamas, 'staff'), (p7, sirikwan, 'staff'),
  (p8, jathuthep, 'pm'), (p8, winit, 'engineer'), (p8, sirikwan, 'staff'), (p8, noppamas, 'staff'),
  (p9, norawat, 'pm'), (p9, jathuthep, 'engineer'), (p9, phuchong, 'engineer'),
  (p10, winit, 'pm'), (p10, noppamas, 'staff'),
  (p11, phuchong, 'pm'), (p11, winit, 'engineer'), (p11, jathuthep, 'engineer'), (p11, sirikwan, 'staff'),
  (p12, jathuthep, 'pm'), (p12, phuchong, 'engineer');

  -- ═══════════════════════════════════════════
  -- BUDGETS for new projects
  -- ═══════════════════════════════════════════
  INSERT INTO budgets (id, company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (gen_random_uuid(), cid, p6, 'BG-2026-006', 'Budget AIS Repeater', 'approved', 720000, 700000, 280000, 2026, phuchong) RETURNING id INTO b6;
  INSERT INTO budgets (id, company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (gen_random_uuid(), cid, p7, 'BG-2026-007', 'Budget Weather Station', 'approved', 1500000, 1450000, 362500, 2026, winit) RETURNING id INTO b7;
  INSERT INTO budgets (id, company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (gen_random_uuid(), cid, p8, 'BG-2026-008', 'Budget CCTV Laem Chabang', 'approved', 2200000, 2100000, 1680000, 2026, jathuthep) RETURNING id INTO b8;
  INSERT INTO budgets (company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (cid, p9, 'BG-2026-009', 'Budget Radio Navy', 'pending_manager', 3500000, 3400000, 0, 2026, norawat);
  INSERT INTO budgets (company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (cid, p10, 'BG-2026-010', 'Budget Echo Sounder', 'approved', 350000, 340000, 340000, 2026, winit);
  INSERT INTO budgets (company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (cid, p11, 'BG-2026-011', 'Budget VTS Map Ta Phut', 'approved', 4800000, 4600000, 920000, 2026, phuchong);
  INSERT INTO budgets (company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (cid, p12, 'BG-2026-012', 'Budget Gyro Ferry', 'approved', 900000, 880000, 865000, 2026, jathuthep);

  -- Budget lines for p6
  INSERT INTO budget_lines (budget_id, name, category, tor_amount, budget_amount, actual_amount, sap_account, sort_order) VALUES
  (b6, 'AIS Transponder x3', 'material', 360000, 350000, 180000, '114101', 1),
  (b6, 'Antenna & Cable', 'material', 120000, 115000, 60000, '114101', 2),
  (b6, 'Installation Labor', 'labor', 180000, 175000, 30000, '522601', 3),
  (b6, 'Transportation', 'transport', 60000, 60000, 10000, '522701', 4);

  -- Budget lines for p8
  INSERT INTO budget_lines (budget_id, name, category, tor_amount, budget_amount, actual_amount, sap_account, sort_order) VALUES
  (b8, 'CCTV Camera x24', 'material', 960000, 920000, 900000, '114101', 1),
  (b8, 'NVR Server x2', 'material', 400000, 380000, 370000, '114101', 2),
  (b8, 'Network Switch & Cable', 'material', 280000, 260000, 250000, '114101', 3),
  (b8, 'Installation Labor', 'labor', 350000, 340000, 100000, '522601', 4),
  (b8, 'Software License', 'material', 150000, 140000, 40000, '114101', 5),
  (b8, 'Misc', 'misc', 60000, 60000, 20000, '522709', 6);

  -- ═══════════════════════════════════════════
  -- PHASES for project p1 (Marine Nav Phuket)
  -- ═══════════════════════════════════════════
  INSERT INTO phases (id, project_id, name, sort_order, status, start_date, end_date, progress) VALUES
  (gen_random_uuid(), p1, 'Requirement & Design', 1, 'completed', '2026-01-15', '2026-02-28', 100) RETURNING id INTO ph1;
  INSERT INTO phases (id, project_id, name, sort_order, status, start_date, end_date, progress) VALUES
  (gen_random_uuid(), p1, 'Procurement & Preparation', 2, 'completed', '2026-03-01', '2026-03-30', 100) RETURNING id INTO ph2;
  INSERT INTO phases (id, project_id, name, sort_order, status, start_date, end_date, progress) VALUES
  (gen_random_uuid(), p1, 'Installation & Testing', 3, 'active', '2026-04-01', '2026-05-31', 65) RETURNING id INTO ph3;
  INSERT INTO phases (id, project_id, name, sort_order, status, start_date, end_date, progress) VALUES
  (gen_random_uuid(), p1, 'Handover & Warranty', 4, 'upcoming', '2026-06-01', '2026-06-30', 0) RETURNING id INTO ph4;

  -- Phase steps
  INSERT INTO phase_steps (phase_id, name, sort_order, status, assigned_to, start_date, end_date) VALUES
  (ph1, 'Site survey & requirement gathering', 1, 'done', jathuthep, '2026-01-15', '2026-01-20'),
  (ph1, 'System design & specification', 2, 'done', winit, '2026-01-21', '2026-02-10'),
  (ph1, 'Customer sign-off design document', 3, 'done', jathuthep, '2026-02-28', '2026-02-28'),
  (ph2, 'Create PR for Sounder + Sonar + GPS', 1, 'done', pimradaporn, '2026-03-01', '2026-03-05'),
  (ph2, 'PO approved & sent to SAP', 2, 'done', mayurachat, '2026-03-10', '2026-03-10'),
  (ph2, 'Equipment received & QC checked', 3, 'done', winit, '2026-03-25', '2026-03-25'),
  (ph3, 'Sounder installation & wiring', 1, 'done', phuchong, '2026-04-01', '2026-04-15'),
  (ph3, 'Sonar module installation', 2, 'done', winit, '2026-04-16', '2026-04-30'),
  (ph3, 'GPS integration & calibration', 3, 'active', phuchong, '2026-05-01', '2026-05-15'),
  (ph3, 'System integration test', 4, 'pending', sirikwan, '2026-05-16', '2026-05-25'),
  (ph3, 'UAT with customer', 5, 'pending', jathuthep, '2026-05-26', '2026-05-31'),
  (ph4, 'Documentation & manual', 1, 'pending', noppamas, '2026-06-01', '2026-06-10'),
  (ph4, 'Customer training', 2, 'pending', jathuthep, '2026-06-11', '2026-06-20'),
  (ph4, 'Final sign-off & warranty start', 3, 'pending', jathuthep, '2026-06-30', '2026-06-30');

  -- ═══════════════════════════════════════════
  -- MORE TASKS (across projects)
  -- ═══════════════════════════════════════════
  INSERT INTO tasks (project_id, phase_id, title, status, priority, assigned_to, due_date, created_by) VALUES
  -- p2 Sonar Rayong
  (p2, NULL, 'ทดสอบ Sonar transducer ระยะ 500m', 'in_progress', 'high', winit, '2026-05-15', winit),
  (p2, NULL, 'เดินสาย cable ใต้น้ำ', 'in_progress', 'medium', phuchong, '2026-05-18', winit),
  (p2, NULL, 'ติดตั้ง display unit ห้องควบคุม', 'todo', 'medium', sirikwan, '2026-05-20', winit),
  (p2, NULL, 'สอบเทียบค่า depth reading', 'todo', 'high', winit, '2026-05-25', winit),
  -- p6 AIS Surat
  (p6, NULL, 'สำรวจจุดติดตั้ง AIS Repeater 3 จุด', 'done', 'high', phuchong, '2026-03-20', phuchong),
  (p6, NULL, 'ติดตั้ง AIS Transponder จุดที่ 1', 'done', 'medium', sirikwan, '2026-04-05', phuchong),
  (p6, NULL, 'ติดตั้ง AIS Transponder จุดที่ 2', 'in_progress', 'medium', sirikwan, '2026-05-10', phuchong),
  (p6, NULL, 'ติดตั้ง AIS Transponder จุดที่ 3', 'todo', 'medium', noppamas, '2026-05-25', phuchong),
  (p6, NULL, 'ทดสอบสัญญาณ AIS ครบ 3 จุด', 'todo', 'high', phuchong, '2026-06-05', phuchong),
  -- p8 CCTV Laem Chabang
  (p8, NULL, 'ติดตั้งกล้อง Zone A (8 ตัว)', 'done', 'high', jathuthep, '2026-03-15', jathuthep),
  (p8, NULL, 'ติดตั้งกล้อง Zone B (8 ตัว)', 'done', 'high', winit, '2026-04-01', jathuthep),
  (p8, NULL, 'ติดตั้งกล้อง Zone C (8 ตัว)', 'review', 'high', sirikwan, '2026-05-01', jathuthep),
  (p8, NULL, 'ตั้งค่า NVR + Software', 'in_progress', 'medium', teera, '2026-05-15', jathuthep),
  (p8, NULL, 'ทดสอบ Live streaming + Playback', 'todo', 'medium', teera, '2026-05-20', jathuthep),
  (p8, NULL, 'อบรมเจ้าหน้าที่ท่าเรือ', 'todo', 'low', jathuthep, '2026-06-01', jathuthep),
  -- p11 VTS
  (p11, NULL, 'Survey สถานที่ติดตั้ง Radar', 'done', 'high', phuchong, '2026-04-01', phuchong),
  (p11, NULL, 'ออกแบบ Network topology', 'in_progress', 'high', teera, '2026-05-15', phuchong),
  (p11, NULL, 'สั่งซื้ออุปกรณ์ Radar + AIS', 'in_progress', 'high', pimradaporn, '2026-05-20', phuchong),
  (p11, NULL, 'เตรียม Server room', 'todo', 'medium', winit, '2026-06-01', phuchong);

  -- ═══════════════════════════════════════════
  -- MORE PURCHASE REQUESTS
  -- ═══════════════════════════════════════════
  INSERT INTO purchase_requests (company_id, project_id, doc_number, doc_date, status, vendor_code, vendor_name, total_amount, created_by) VALUES
  (cid, p6, 'PR26040018', '2026-04-15', 'sent_to_sap', 'VD0001', 'Marine Electronics Co.', 350000, phuchong),
  (cid, p8, 'PR26030010', '2026-03-05', 'received', 'VD0002', 'Navigation Systems Ltd.', 920000, jathuthep),
  (cid, p8, 'PR26040020', '2026-04-20', 'received', 'VF0001', 'Furuno Japan', 380000, jathuthep),
  (cid, p7, 'PR26050019', '2026-05-08', 'pending_manager', 'VD0001', 'Marine Electronics Co.', 450000, winit),
  (cid, p11, 'PR26050020', '2026-05-09', 'pending_finance', 'VF0002', 'JRC Global', 1200000, phuchong),
  (cid, p11, 'PR26050021', '2026-05-10', 'draft', 'VD0002', 'Navigation Systems Ltd.', 850000, phuchong),
  (cid, p6, 'PR26050022', '2026-05-11', 'pending_manager', 'VD0001', 'Marine Electronics Co.', 60000, sirikwan),
  (cid, p2, 'PR26050023', '2026-05-11', 'draft', 'VF0001', 'Furuno Japan', 28000, noppamas);

  -- ═══════════════════════════════════════════
  -- PURCHASE ORDERS
  -- ═══════════════════════════════════════════
  INSERT INTO purchase_orders (company_id, project_id, pr_id, doc_number, doc_date, status, vendor_code, vendor_name, total_amount, created_by) VALUES
  (cid, p1, (SELECT id FROM purchase_requests WHERE doc_number='PR26050005'), 'PO26050001', '2026-05-03', 'received', 'VD0001', 'Marine Electronics Co.', 120000, pimradaporn),
  (cid, p8, (SELECT id FROM purchase_requests WHERE doc_number='PR26030010'), 'PO26030005', '2026-03-08', 'received', 'VD0002', 'Navigation Systems Ltd.', 920000, mayurachat),
  (cid, p8, (SELECT id FROM purchase_requests WHERE doc_number='PR26040020'), 'PO26040012', '2026-04-22', 'received', 'VF0001', 'Furuno Japan', 380000, mayurachat),
  (cid, p6, (SELECT id FROM purchase_requests WHERE doc_number='PR26040018'), 'PO26040015', '2026-04-18', 'sent_to_sap', 'VD0001', 'Marine Electronics Co.', 350000, pimradaporn),
  (cid, p2, NULL, 'PO26050003', '2026-05-07', 'approved', 'VF0001', 'Furuno Japan', 62000, pimradaporn),
  (cid, p1, NULL, 'PO26050004', '2026-05-06', 'approved', 'VD0002', 'Navigation Systems Ltd.', 35500, pimradaporn),
  (cid, p7, NULL, 'PO26050005', '2026-05-10', 'draft', 'VD0001', 'Marine Electronics Co.', 450000, mayurachat),
  (cid, p11, NULL, 'PO26050006', '2026-05-11', 'pending_manager', 'VF0002', 'JRC Global', 1200000, pimradaporn);

  -- ═══════════════════════════════════════════
  -- MORE EXPENSES
  -- ═══════════════════════════════════════════
  INSERT INTO expenses (company_id, project_id, doc_number, doc_date, expense_type, status, description, amount, sap_account, created_by) VALUES
  (cid, p8, 'EXP26040010', '2026-04-10', 'reimbursement', 'sent_to_sap', 'ค่าเช่ารถเครน ติดตั้งกล้อง', 45000, '522601', jathuthep),
  (cid, p8, 'EXP26040011', '2026-04-15', 'reimbursement', 'sent_to_sap', 'ค่าที่พักแหลมฉบัง 5 คืน', 25000, '522602', winit),
  (cid, p6, 'EXP26050006', '2026-05-05', 'reimbursement', 'approved', 'ค่าเรือข้ามฟาก สุราษฎร์', 3500, '522601', phuchong),
  (cid, p6, 'EXP26050007', '2026-05-06', 'reimbursement', 'approved', 'ค่าอาหาร ทีมงาน 3 คน 2 วัน', 4800, '522603', sirikwan),
  (cid, p7, 'EXP26050008', '2026-05-08', 'reimbursement', 'pending_manager', 'ค่าขนส่งอุปกรณ์ Weather Station', 18500, '522701', winit),
  (cid, p11, 'EXP26050009', '2026-05-09', 'reimbursement', 'pending_manager', 'ค่าเช่าเรือสำรวจ Map Ta Phut', 35000, '522601', phuchong),
  (cid, p8, 'EXP26050010', '2026-05-10', 'reimbursement', 'pending_finance', 'ค่า Software License CCTV', 85000, '522709', teera),
  (cid, p11, 'ADV26050002', '2026-05-10', 'advance', 'pending_executive', 'เบิกล่วงหน้า สำรวจ VTS มาบตาพุด', 50000, '113103', phuchong),
  (cid, p7, 'ADV26050003', '2026-05-11', 'advance', 'pending_manager', 'เงินทดรอง เดินทาง Chumphon', 15000, '113103', noppamas),
  (cid, NULL, 'EXP26050011', '2026-05-11', 'reimbursement', 'draft', 'ค่าซ่อมเครื่องพิมพ์', 2800, '522709', phetcharat),
  (cid, p10, 'EXP26030005', '2026-03-15', 'reimbursement', 'sent_to_sap', 'ค่าอะไหล่ Echo Sounder', 42000, '511120', winit),
  (cid, p12, 'EXP26020008', '2026-02-10', 'reimbursement', 'sent_to_sap', 'ค่าเปลี่ยน Gyro Sensor', 185000, '511120', jathuthep);

  -- ═══════════════════════════════════════════
  -- VEHICLE BOOKINGS
  -- ═══════════════════════════════════════════
  INSERT INTO vehicle_bookings (vehicle_id, project_id, status, start_date, end_date, purpose, passengers, booked_by, km_start, km_end) VALUES
  -- Past bookings
  (v1, p1, 'checked_in', '2026-05-05', '2026-05-07', 'Site visit Phuket harbor', 'Jathuthep, Sirikwan', jathuthep, 44380, 45230),
  (v2, p2, 'checked_in', '2026-04-20', '2026-04-23', 'Sonar installation Rayong', 'Winit, Phuchong, Noppamas, Sirikwan', winit, 66800, 67600),
  (v3, p4, 'checked_in', '2026-04-28', '2026-04-28', 'Delivery Samut Prakan', 'Noppamas', noppamas, 32100, 32250),
  -- Current booking
  (v2, p2, 'checked_out', '2026-05-09', '2026-05-12', 'Sonar testing Rayong', 'Phuchong, Sirikwan, Noppamas + 3 technicians', phuchong, 67600, NULL),
  -- Upcoming bookings
  (v1, p5, 'approved', '2026-05-15', '2026-05-17', 'Chonburi survey', 'Winit, Noppamas', winit, NULL, NULL),
  (v3, p3, 'pending', '2026-05-15', '2026-05-17', 'Bangkok delivery', 'Sirikwan', sirikwan, NULL, NULL),
  (v2, p7, 'approved', '2026-05-20', '2026-05-22', 'Weather station setup Chumphon', 'Winit, Noppamas, Phuchong', winit, NULL, NULL),
  (v1, p6, 'pending', '2026-05-25', '2026-05-27', 'AIS install Surat Thani', 'Phuchong, Sirikwan', phuchong, NULL, NULL);

  -- ═══════════════════════════════════════════
  -- TRAVEL REQUESTS
  -- ═══════════════════════════════════════════
  INSERT INTO travel_requests (id, company_id, project_id, doc_number, destination, purpose, start_date, end_date, status, estimated_cost, advance_amount, lead_user_id, created_by)
  VALUES
  (gen_random_uuid(), cid, p1, 'TRV26050001', 'ภูเก็ต', 'Site Survey & Installation ระบบนำร่อง', '2026-05-15', '2026-05-17', 'approved', 35000, 20000, phuchong, phuchong),
  (gen_random_uuid(), cid, p5, 'TRV26050002', 'ชลบุรี', 'Satcom Equipment Delivery & Setup', '2026-05-20', '2026-05-21', 'pending_executive', 120000, 50000, jathuthep, jathuthep),
  (gen_random_uuid(), cid, p2, 'TRV26050003', 'ระยอง', 'Sonar System Testing', '2026-05-05', '2026-05-07', 'completed', 18200, 0, winit, winit),
  (gen_random_uuid(), cid, p7, 'TRV26050004', 'ชุมพร', 'Weather Station Installation', '2026-05-20', '2026-05-22', 'pending_manager', 45000, 15000, winit, winit),
  (gen_random_uuid(), cid, p6, 'TRV26050005', 'สุราษฎร์ธานี', 'AIS Repeater ติดตั้งจุดที่ 3', '2026-05-25', '2026-05-27', 'draft', 28000, 10000, phuchong, phuchong),
  (gen_random_uuid(), cid, p11, 'TRV26050006', 'มาบตาพุด', 'VTS Site Survey', '2026-05-28', '2026-05-30', 'pending_manager', 55000, 30000, phuchong, phuchong);

  -- Travel members
  INSERT INTO travel_members (travel_id, user_id, is_lead, confirmed) VALUES
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050001'), phuchong, true, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050001'), sirikwan, false, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050001'), noppamas, false, false),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050002'), jathuthep, true, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050002'), winit, false, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050002'), noppamas, false, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050002'), teera, false, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050003'), winit, true, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050003'), phuchong, false, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050004'), winit, true, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050004'), noppamas, false, false),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050004'), phuchong, false, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050005'), phuchong, true, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050005'), sirikwan, false, false),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050006'), phuchong, true, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050006'), winit, false, true),
  ((SELECT id FROM travel_requests WHERE doc_number='TRV26050006'), jathuthep, false, false);

  -- ═══════════════════════════════════════════
  -- MORE OT REQUESTS
  -- ═══════════════════════════════════════════
  INSERT INTO ot_requests (company_id, project_id, doc_number, user_id, ot_date, ot_type, hours, base_rate, multiplier, compensation, status, reason, created_by) VALUES
  (cid, p8, 'OT26050001', jathuthep, '2026-05-03', 'holiday', 8, 450, 2.0, 7200, 'paid', 'ติดตั้งกล้อง Zone B วันหยุด', jathuthep),
  (cid, p8, 'OT26050002', winit, '2026-05-03', 'holiday', 8, 450, 2.0, 7200, 'paid', 'ติดตั้งกล้อง Zone B วันหยุด', winit),
  (cid, p8, 'OT26050003', sirikwan, '2026-05-03', 'holiday', 6, 300, 2.0, 3600, 'paid', 'ช่วยติดตั้งกล้อง Zone B', sirikwan),
  (cid, p2, 'OT26050005', phuchong, '2026-05-05', 'normal', 3, 450, 1.5, 2025, 'approved', 'ทดสอบ Sonar หลังเลิกงาน', phuchong),
  (cid, p2, 'OT26050006', noppamas, '2026-05-05', 'normal', 2, 250, 1.5, 750, 'approved', 'เก็บข้อมูลทดสอบ Sonar', noppamas),
  (cid, p6, 'OT26050008', sirikwan, '2026-05-06', 'normal', 4, 300, 1.5, 1800, 'approved', 'เดินสาย AIS จุดที่ 2', sirikwan),
  (cid, p6, 'OT26050009', phuchong, '2026-05-07', 'normal', 3, 450, 1.5, 2025, 'approved', 'ทดสอบสัญญาณ AIS', phuchong),
  (cid, p11, 'OT26050013', teera, '2026-05-11', 'normal', 4, 400, 1.5, 2400, 'pending_manager', 'ออกแบบ Network VTS', teera),
  (cid, p8, 'OT26050014', teera, '2026-05-10', 'holiday', 8, 400, 2.0, 6400, 'pending_executive', 'ตั้งค่า NVR วันเสาร์', teera),
  (cid, p7, 'OT26050015', noppamas, '2026-05-11', 'normal', 3, 250, 1.5, 1125, 'pending_manager', 'เตรียมเอกสาร Weather Station', noppamas);

  -- ═══════════════════════════════════════════
  -- NOTIFICATIONS
  -- ═══════════════════════════════════════════
  INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, is_read, created_at) VALUES
  (cid, warit, 'PR ฿180,000 รออนุมัติ', 'PR26050014 — Wave Radar System จาก Phuchong M.', 'pr-po.html?hl=pending', 'pr', false, NOW() - INTERVAL '2 hours'),
  (cid, warit, 'Budget BG-2026-009 รออนุมัติ', 'งบ Radio Navy ฿3.4M จาก Norawat S.', 'budget.html?hl=pending', 'budget', false, NOW() - INTERVAL '5 hours'),
  (cid, warit, 'Advance ฿50,000 รออนุมัติ', 'ADV26050002 — VTS มาบตาพุด จาก Phuchong M.', 'expense.html?hl=pending', 'expense', false, NOW() - INTERVAL '1 day'),
  (cid, warit, 'Travel TRV26050002 รออนุมัติ', 'เดินทาง ชลบุรี 20-21 May — Jathuthep K.', 'travel.html?hl=pending', 'travel', false, NOW() - INTERVAL '1 day'),
  (cid, warit, 'OT ฿6,400 รออนุมัติ', 'OT26050014 — Teera S. ตั้งค่า NVR วันเสาร์', 'ot.html?hl=pending', 'ot', false, NOW() - INTERVAL '6 hours'),
  (cid, jathuthep, 'PR26050012 ถูกส่งให้อนุมัติ', 'Sounder Transducer ฿85,000 รอคุณอนุมัติ', 'pr-po.html?hl=pending', 'pr', false, NOW() - INTERVAL '3 days'),
  (cid, jathuthep, 'Travel Phuket ก่อนเดินทาง 1 วัน', 'TRV26050001 — Noppamas B. ยังไม่ confirm', 'travel.html?hl=pending', 'travel', false, NOW() - INTERVAL '12 hours'),
  (cid, sukanya, 'Expense ฿85,000 รอ Finance อนุมัติ', 'EXP26050010 — Software License CCTV', 'expense.html?hl=pending', 'expense', false, NOW() - INTERVAL '1 day'),
  (cid, sukanya, 'PR ฿1.2M รอ Finance อนุมัติ', 'PR26050020 — VTS Radar Equipment', 'pr-po.html?hl=pending', 'pr', false, NOW() - INTERVAL '2 days'),
  (cid, pimradaporn, 'PO26050006 รอ Procurement ตรวจสอบ', 'JRC Global ฿1.2M — VTS Map Ta Phut', 'pr-po.html?hl=pending', 'po', false, NOW() - INTERVAL '6 hours'),
  (cid, phuchong, 'Budget BG-2026-006 อนุมัติแล้ว', 'งบ AIS Repeater ฿700K ผ่านแล้ว', 'budget.html', 'budget', true, NOW() - INTERVAL '10 days'),
  (cid, winit, 'PO26050003 อนุมัติแล้ว', 'Sonar Module ฿62,000 ผ่านแล้ว', 'pr-po.html', 'po', true, NOW() - INTERVAL '4 days');

  -- ═══════════════════════════════════════════
  -- ACTIVITY LOG
  -- ═══════════════════════════════════════════
  INSERT INTO activity_log (company_id, project_id, user_id, action, doc_type, description, created_at) VALUES
  (cid, p1, sirikwan, 'created', 'expense', 'สร้าง EXP26050003 ค่าที่พัก ภูเก็ต ฿12,500', NOW() - INTERVAL '2 hours'),
  (cid, p1, jathuthep, 'approved', 'pr', 'อนุมัติ PR26050008 Sonar Module ฿62,000', NOW() - INTERVAL '5 hours'),
  (cid, p1, noppamas, 'created', 'attachment', 'อัปโหลด Calibration Report', NOW() - INTERVAL '1 day'),
  (cid, p1, winit, 'updated', 'task', 'เสร็จ task "Sonar Module Test #3"', NOW() - INTERVAL '2 days'),
  (cid, p1, phuchong, 'created', 'vehicle', 'จองรถ กก-1234 เดินทาง Phuket 15-17 May', NOW() - INTERVAL '3 days'),
  (cid, p8, jathuthep, 'created', 'pr', 'สร้าง PR26030010 CCTV Camera x24 ฿920,000', NOW() - INTERVAL '2 months'),
  (cid, p8, teera, 'created', 'expense', 'สร้าง EXP26050010 Software License ฿85,000', NOW() - INTERVAL '1 day'),
  (cid, p11, phuchong, 'created', 'pr', 'สร้าง PR26050020 VTS Radar ฿1,200,000', NOW() - INTERVAL '2 days'),
  (cid, p11, phuchong, 'created', 'travel', 'สร้าง TRV26050006 สำรวจ VTS มาบตาพุด', NOW() - INTERVAL '1 day'),
  (cid, p6, sirikwan, 'updated', 'task', 'กำลังติดตั้ง AIS จุดที่ 2', NOW() - INTERVAL '1 day'),
  (cid, p7, winit, 'created', 'pr', 'สร้าง PR26050019 Weather Station ฿450,000', NOW() - INTERVAL '3 days'),
  (cid, p2, phuchong, 'created', 'vehicle', 'เช็คเอาท์รถ ขข-5678 ไป Rayong', NOW() - INTERVAL '2 days'),
  (cid, NULL, warit, 'approved', 'budget', 'อนุมัติ BG-2026-006 AIS Repeater ฿700K', NOW() - INTERVAL '10 days'),
  (cid, p10, winit, 'updated', 'project', 'Project Echo Sounder Maintenance เสร็จ 100%', NOW() - INTERVAL '11 days');

  -- ═══════════════════════════════════════════
  -- DISCUSSIONS (sample)
  -- ═══════════════════════════════════════════
  INSERT INTO discussions (project_id, user_id, message, created_at) VALUES
  (p1, jathuthep, 'ทีม GPS calibration Phuket 15-17 May ใครไปบ้าง confirm ด้วยครับ', NOW() - INTERVAL '3 days'),
  (p1, phuchong, 'ผมไปครับ + คุณศิริขวัญ', NOW() - INTERVAL '3 days'),
  (p1, noppamas, 'ขอเลื่อน confirm เป็นวันพรุ่งนี้ได้ไหมคะ', NOW() - INTERVAL '2 days'),
  (p8, jathuthep, 'Zone C ติดตั้งเสร็จแล้ว รอ review จากคุณวินิจ', NOW() - INTERVAL '1 day'),
  (p8, winit, 'รับทราบครับ จะ review ภายในวันนี้', NOW() - INTERVAL '1 day'),
  (p8, teera, 'NVR Software ต้องใช้ license ตัวใหม่ ราคา 85K ส่ง expense แล้วครับ', NOW() - INTERVAL '1 day'),
  (p11, phuchong, 'VTS scope ใหญ่มาก ต้องจัดทีม 4 คนลงพื้นที่', NOW() - INTERVAL '5 days'),
  (p11, winit, 'ผมว่างช่วง 28-30 May ครับ', NOW() - INTERVAL '4 days');

  -- ═══════════════════════════════════════════
  -- NOTES (meeting notes)
  -- ═══════════════════════════════════════════
  INSERT INTO notes (project_id, title, content, note_type, created_by, created_at) VALUES
  (p1, 'Meeting: Phuket Site Survey', 'สรุปการประชุม:\n- จุดติดตั้ง GPS ตรงห้องควบคุมเรือ\n- ต้องเดินสายใหม่ทั้งหมด\n- ลูกค้าต้องการ test ก่อน 31 May', 'meeting', jathuthep, NOW() - INTERVAL '2 months'),
  (p1, 'SOW: Marine Navigation System', 'Scope of Work:\n1. Sounder + Sonar + GPS installation\n2. System integration\n3. Training & handover\n4. 1 year warranty', 'sow', jathuthep, NOW() - INTERVAL '3 months'),
  (p8, 'Meeting: CCTV Progress Review', 'Zone A, B เสร็จแล้ว\nZone C กำลัง review\nSoftware license ต้องซื้อเพิ่ม\nเป้าหมาย go-live: มิ.ย. 2026', 'meeting', jathuthep, NOW() - INTERVAL '1 week'),
  (p11, 'Meeting: VTS Kickoff', 'โปรเจกต์ใหญ่ ฿4.8M\nต้อง survey 3 จุด\nRadar + AIS + Software\nทีม: Phuchong (PM), Winit, Jathuthep, Sirikwan', 'meeting', phuchong, NOW() - INTERVAL '2 months');

END $$;
