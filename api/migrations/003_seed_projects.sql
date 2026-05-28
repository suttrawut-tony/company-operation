-- ═══════════════════════════════════════════════════════════
-- Seed: Sample Projects + Budgets + PRs + Expenses
-- ═══════════════════════════════════════════════════════════

-- Get user IDs
DO $$
DECLARE
  cid UUID := '11111111-1111-1111-1111-111111111111';
  jathuthep UUID;
  winit UUID;
  phuchong UUID;
  sirikwan UUID;
  noppamas UUID;
  pimradaporn UUID;
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID;
  b1 UUID; b2 UUID;
BEGIN
  SELECT id INTO jathuthep FROM users WHERE email = 'jathuthep@sda-group.com';
  SELECT id INTO winit FROM users WHERE email = 'winit@sda-group.com';
  SELECT id INTO phuchong FROM users WHERE email = 'phuchong@sda-group.com';
  SELECT id INTO sirikwan FROM users WHERE email = 'sirikwan@sda-group.com';
  SELECT id INTO noppamas FROM users WHERE email = 'noppamas@sda-group.com';
  SELECT id INTO pimradaporn FROM users WHERE email = 'pimradaporn@sda-group.com';

  -- ═══ Projects ═══
  INSERT INTO projects (id, company_id, code, name, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-001', 'Marine Navigation System - Phuket', 'active', '2026-01-15', '2026-06-30', jathuthep, 1280000, 1235000, 1028000, 80, jathuthep) RETURNING id INTO p1;
  INSERT INTO projects (id, company_id, code, name, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-002', 'Sonar System Installation - Rayong', 'active', '2026-02-01', '2026-07-31', winit, 950000, 920000, 460000, 50, winit) RETURNING id INTO p2;
  INSERT INTO projects (id, company_id, code, name, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-003', 'Radar System Upgrade - Bangkok', 'active', '2026-03-01', '2026-08-31', phuchong, 1100000, 1060000, 1130000, 20, phuchong) RETURNING id INTO p3;
  INSERT INTO projects (id, company_id, code, name, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-004', 'GPS Fleet Management - Samut Prakan', 'active', '2026-01-01', '2026-05-31', jathuthep, 650000, 630000, 598000, 95, jathuthep) RETURNING id INTO p4;
  INSERT INTO projects (id, company_id, code, name, status, start_date, end_date, pm_user_id, tor_amount, budget_amount, actual_amount, progress, created_by) VALUES
  (gen_random_uuid(), cid, 'SDA-2026-005', 'Satcom System - Chonburi', 'active', '2026-02-15', '2026-09-30', winit, 1800000, 1750000, 1137500, 65, winit) RETURNING id INTO p5;

  -- Project members
  INSERT INTO project_members (project_id, user_id, role) VALUES
  (p1, jathuthep, 'pm'), (p1, winit, 'engineer'), (p1, phuchong, 'engineer'), (p1, sirikwan, 'staff'), (p1, noppamas, 'staff'),
  (p2, winit, 'pm'), (p2, phuchong, 'engineer'), (p2, noppamas, 'staff'),
  (p3, phuchong, 'pm'), (p3, sirikwan, 'staff'),
  (p4, jathuthep, 'pm'), (p4, noppamas, 'staff'),
  (p5, winit, 'pm'), (p5, jathuthep, 'engineer'), (p5, sirikwan, 'staff');

  -- ═══ Budgets ═══
  INSERT INTO budgets (id, company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by, approved_by) VALUES
  (gen_random_uuid(), cid, p1, 'BG-2026-001', 'Budget Marine Nav Phuket', 'approved', 1280000, 1235000, 1028000, 2026, jathuthep, jathuthep) RETURNING id INTO b1;
  INSERT INTO budgets (company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (cid, p2, 'BG-2026-002', 'Budget Sonar Rayong', 'approved', 950000, 920000, 460000, 2026, winit);
  INSERT INTO budgets (company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (cid, p3, 'BG-2026-003', 'Budget Radar Bangkok', 'approved', 1100000, 1060000, 1130000, 2026, phuchong);
  INSERT INTO budgets (company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (cid, p4, 'BG-2026-004', 'Budget GPS Fleet', 'approved', 650000, 630000, 598000, 2026, jathuthep);
  INSERT INTO budgets (company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, created_by) VALUES
  (cid, p5, 'BG-2026-005', 'Budget Satcom Chonburi', 'approved', 1800000, 1750000, 1137500, 2026, winit);

  -- Budget lines for p1
  INSERT INTO budget_lines (budget_id, name, category, tor_amount, budget_amount, actual_amount, sap_account, sort_order) VALUES
  (b1, 'Material - Sounder', 'material', 500000, 480000, 320000, '114101', 1),
  (b1, 'Material - Sonar', 'material', 350000, 340000, 335000, '114101', 2),
  (b1, 'Labor - Installation', 'labor', 200000, 200000, 215000, '522601', 3),
  (b1, 'Labor - Calibration', 'labor', 100000, 95000, 72000, '522601', 4),
  (b1, 'Transportation', 'transport', 80000, 75000, 68000, '522701', 5),
  (b1, 'Misc / Contingency', 'misc', 50000, 45000, 18000, '522709', 6);

  -- ═══ Purchase Requests ═══
  INSERT INTO purchase_requests (company_id, project_id, doc_number, doc_date, status, vendor_code, vendor_name, total_amount, created_by) VALUES
  (cid, p1, 'PR26050005', '2026-05-02', 'sent_to_sap', 'VD0001', 'Marine Electronics Co.', 120000, jathuthep),
  (cid, p2, 'PR26050008', '2026-05-06', 'approved', 'VF0001', 'Furuno Japan', 62000, winit),
  (cid, p1, 'PR26050009', '2026-05-05', 'approved', 'VD0002', 'Navigation Systems Ltd.', 35500, pimradaporn),
  (cid, p4, 'PR26050010', '2026-05-04', 'approved', 'VD0001', 'Marine Electronics Co.', 7800, noppamas),
  (cid, p1, 'PR26050012', '2026-05-08', 'pending_manager', 'VD0001', 'Marine Electronics Co.', 85000, jathuthep),
  (cid, p2, 'PR26050013', '2026-05-09', 'pending_finance', 'VF0002', 'JRC Global', 45000, winit),
  (cid, p3, 'PR26050014', '2026-05-10', 'pending_executive', 'VD0002', 'Navigation Systems Ltd.', 180000, phuchong),
  (cid, p4, 'PR26050015', '2026-05-10', 'draft', 'VD0001', 'Marine Electronics Co.', 25000, noppamas),
  (cid, p1, 'PR26050016', '2026-05-11', 'draft', NULL, NULL, 8500, sirikwan),
  (cid, NULL, 'PR26050017', '2026-05-11', 'draft', NULL, NULL, 3200, noppamas);

  -- ═══ Expenses ═══
  INSERT INTO expenses (company_id, project_id, doc_number, doc_date, expense_type, status, description, amount, sap_account, created_by) VALUES
  (cid, p1, 'EXP26050001', '2026-05-05', 'reimbursement', 'paid', 'ค่าอาหารทีมงาน Workshop', 8700, '522603', winit),
  (cid, p1, 'EXP26050002', '2026-05-06', 'reimbursement', 'approved', 'ค่าขนส่งอุปกรณ์ Phuket', 35000, '522701', phuchong),
  (cid, p1, 'EXP26050003', '2026-05-09', 'reimbursement', 'pending_manager', 'ค่าที่พัก ภูเก็ต 2 คืน', 12500, '522602', sirikwan),
  (cid, p2, 'EXP26050004', '2026-05-10', 'reimbursement', 'pending_finance', 'ค่าน้ำมันเดินทาง Rayong-Bangkok', 2800, '522701', noppamas),
  (cid, NULL, 'EXP26050005', '2026-05-11', 'reimbursement', 'draft', 'ค่าเครื่องเขียนสำนักงาน', 1250, '522709', noppamas),
  (cid, p5, 'ADV26050001', '2026-05-07', 'advance', 'pending_executive', 'เงินทดรองจ่าย - เดินทาง Chonburi', 20000, '113103', jathuthep),
  (cid, p1, 'EXP26040015', '2026-04-28', 'reimbursement', 'sent_to_sap', 'ค่าวัสดุทดสอบ Calibration', 15400, '522709', sirikwan),
  (cid, p5, 'ADV26040003', '2026-04-25', 'advance_clear', 'sent_to_sap', 'เคลียร์เงินทดรอง - งาน Chonburi', 18200, '113103', jathuthep);

  -- ═══ OT Requests ═══
  INSERT INTO ot_requests (company_id, project_id, doc_number, user_id, ot_date, ot_type, hours, base_rate, multiplier, compensation, status, reason, created_by) VALUES
  (cid, p1, 'OT26050010', sirikwan, '2026-05-11', 'holiday', 8, 300, 2.0, 4800, 'pending_manager', 'Weekend Installation', sirikwan),
  (cid, p1, 'OT26050011', noppamas, '2026-05-10', 'normal', 4, 250, 1.5, 1500, 'pending_manager', 'Evening Documentation', noppamas),
  (cid, p3, 'OT26050012', jathuthep, '2026-05-09', 'holiday', 6, 450, 2.0, 5400, 'pending_executive', 'Emergency Repair', jathuthep),
  (cid, p2, 'OT26050007', winit, '2026-05-07', 'normal', 3, 450, 1.5, 2025, 'approved', 'System Testing', winit),
  (cid, p5, 'OT26050004', phuchong, '2026-05-04', 'holiday', 8, 450, 2.0, 7200, 'paid', 'Holiday Deployment', phuchong);

  -- ═══ Tasks ═══
  INSERT INTO tasks (project_id, title, status, priority, assigned_to, due_date, created_by) VALUES
  (p1, 'GPS module calibration — Phuket harbor', 'in_progress', 'high', phuchong, '2026-05-10', jathuthep),
  (p1, 'Wire routing for navigation display bridge', 'in_progress', 'medium', sirikwan, '2026-05-15', jathuthep),
  (p1, 'Sonar depth test — 50m, 100m, 200m range', 'review', 'medium', winit, '2026-05-08', jathuthep),
  (p1, 'Prepare UAT test cases document', 'todo', 'medium', noppamas, '2026-05-20', jathuthep),
  (p1, 'Order spare parts for warranty stock', 'todo', 'low', pimradaporn, '2026-06-01', jathuthep),
  (p1, 'Draft training manual for customer', 'todo', 'low', noppamas, '2026-06-10', jathuthep),
  (p1, 'Sounder transducer mounting', 'done', 'high', phuchong, '2026-05-05', jathuthep),
  (p1, 'Power supply installation for nav systems', 'done', 'medium', sirikwan, '2026-05-03', jathuthep),
  (p1, 'Equipment inventory check & photo', 'done', 'low', noppamas, '2026-05-01', jathuthep);

END $$;
