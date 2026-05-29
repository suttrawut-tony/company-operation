-- 017: Seed sample Petty Cash data
-- Uses actual users from the database (not hardcoded IDs)

DO $$
DECLARE
  v_company_id UUID;
  v_custodian1 UUID;
  v_custodian2 UUID;
  v_custodian3 UUID;
  v_user1 UUID;
  v_user2 UUID;
  v_user3 UUID;
  v_creator UUID;
  v_project1 UUID;
  v_project2 UUID;
  v_fund1 UUID;
  v_fund2 UUID;
  v_fund3 UUID;
BEGIN
  -- Skip if data already exists
  IF (SELECT count(*) FROM petty_cash_funds) >= 3 THEN
    RAISE NOTICE 'Petty Cash seed: already has data, skipping';
    RETURN;
  END IF;

  -- Get company
  SELECT id INTO v_company_id FROM users WHERE is_active = true LIMIT 1;
  IF v_company_id IS NULL THEN RETURN; END IF;
  SELECT company_id INTO v_company_id FROM users WHERE is_active = true LIMIT 1;

  -- Get users by role
  SELECT id INTO v_custodian1 FROM users WHERE company_id = v_company_id AND role IN ('accounting','finance') AND is_active = true LIMIT 1;
  SELECT id INTO v_custodian2 FROM users WHERE company_id = v_company_id AND role = 'pm' AND is_active = true LIMIT 1;
  SELECT id INTO v_custodian3 FROM users WHERE company_id = v_company_id AND role = 'finance' AND is_active = true LIMIT 1;
  SELECT id INTO v_user1 FROM users WHERE company_id = v_company_id AND role = 'procurement' AND is_active = true LIMIT 1;
  SELECT id INTO v_user2 FROM users WHERE company_id = v_company_id AND role = 'staff' AND is_active = true LIMIT 1;
  SELECT id INTO v_user3 FROM users WHERE company_id = v_company_id AND role = 'pm' AND is_active = true OFFSET 1 LIMIT 1;
  SELECT id INTO v_creator FROM users WHERE company_id = v_company_id AND role IN ('admin','executive') AND is_active = true LIMIT 1;

  -- Fallbacks
  IF v_custodian1 IS NULL THEN v_custodian1 := v_creator; END IF;
  IF v_custodian2 IS NULL THEN v_custodian2 := v_creator; END IF;
  IF v_custodian3 IS NULL THEN v_custodian3 := v_creator; END IF;
  IF v_user1 IS NULL THEN v_user1 := v_creator; END IF;
  IF v_user2 IS NULL THEN v_user2 := v_creator; END IF;
  IF v_user3 IS NULL THEN v_user3 := v_creator; END IF;

  -- Get projects
  SELECT id INTO v_project1 FROM projects WHERE company_id = v_company_id LIMIT 1;
  SELECT id INTO v_project2 FROM projects WHERE company_id = v_company_id OFFSET 1 LIMIT 1;

  -- Fund 1: Office Petty Cash
  INSERT INTO petty_cash_funds (id, company_id, project_id, fund_code, fund_name, fund_limit, current_balance, low_threshold, custodian_id, gl_account, status, created_by)
  VALUES (gen_random_uuid(), v_company_id, v_project1, 'PCF26050001', 'Office Petty Cash', 5000, 3200, 20, v_custodian1, '111101', 'active', v_creator)
  RETURNING id INTO v_fund1;

  -- Fund 2: Site Petty Cash
  INSERT INTO petty_cash_funds (id, company_id, project_id, fund_code, fund_name, fund_limit, current_balance, low_threshold, custodian_id, gl_account, status, created_by)
  VALUES (gen_random_uuid(), v_company_id, v_project2, 'PCF26050002', 'Site Petty Cash', 10000, 7500, 20, v_custodian2, '111101', 'active', v_creator)
  RETURNING id INTO v_fund2;

  -- Fund 3: General Petty Cash (low balance)
  INSERT INTO petty_cash_funds (id, company_id, project_id, fund_code, fund_name, fund_limit, current_balance, low_threshold, custodian_id, gl_account, status, created_by)
  VALUES (gen_random_uuid(), v_company_id, NULL, 'PCF26050003', 'General Petty Cash', 3000, 500, 20, v_custodian3, '111101', 'active', v_creator)
  RETURNING id INTO v_fund3;

  -- Disbursements for Fund 1
  INSERT INTO petty_cash_disbursements (fund_id, company_id, doc_number, doc_date, recipient, description, amount, category, receipt_status, status, created_by) VALUES
  (v_fund1, v_company_id, 'PCD26050001', '2026-05-20', 'Staff A', 'Taxi to client meeting', 350, 'travel', 'approved', 'approved', v_custodian1),
  (v_fund1, v_company_id, 'PCD26050002', '2026-05-22', 'Staff B', 'Office paper and ink', 480, 'office', 'approved', 'approved', v_user1),
  (v_fund1, v_company_id, 'PCD26050003', '2026-05-25', 'Staff C', 'Team lunch meeting', 520, 'food', 'submitted', 'disbursed', v_custodian2),
  (v_fund1, v_company_id, 'PCD26050004', '2026-05-27', 'Staff D', 'Document delivery', 150, 'delivery', 'pending', 'disbursed', v_user3),
  (v_fund1, v_company_id, 'PCD26050005', '2026-05-28', 'Staff E', 'Printer repair', 300, 'maintenance', 'pending', 'disbursed', v_user2);

  -- Disbursements for Fund 2
  INSERT INTO petty_cash_disbursements (fund_id, company_id, doc_number, doc_date, recipient, description, amount, category, receipt_status, status, created_by) VALUES
  (v_fund2, v_company_id, 'PCD26050006', '2026-05-18', 'Site Worker A', 'Site transport', 800, 'transport', 'approved', 'approved', v_custodian2),
  (v_fund2, v_company_id, 'PCD26050007', '2026-05-21', 'Site Worker B', 'Construction material', 1200, 'material', 'approved', 'approved', v_user1),
  (v_fund2, v_company_id, 'PCD26050008', '2026-05-26', 'Site Worker C', 'Worker meals', 500, 'food', 'submitted', 'disbursed', v_user3);

  -- Disbursements for Fund 3
  INSERT INTO petty_cash_disbursements (fund_id, company_id, doc_number, doc_date, recipient, description, amount, category, receipt_status, status, created_by) VALUES
  (v_fund3, v_company_id, 'PCD26050009', '2026-05-15', 'Admin A', 'Stamp duty', 200, 'misc', 'approved', 'approved', v_custodian3),
  (v_fund3, v_company_id, 'PCD26050010', '2026-05-20', 'Admin B', 'Office snacks', 350, 'food', 'approved', 'approved', v_custodian1),
  (v_fund3, v_company_id, 'PCD26050011', '2026-05-25', 'Admin C', 'Courier service', 150, 'delivery', 'pending', 'disbursed', v_user2);

  -- Replenishments
  INSERT INTO petty_cash_replenishments (fund_id, company_id, doc_number, doc_date, amount, status, remarks, created_by) VALUES
  (v_fund1, v_company_id, 'PCR26050001', '2026-05-15', 2000, 'transferred', 'Monthly top-up', v_custodian3),
  (v_fund2, v_company_id, 'PCR26050002', '2026-05-10', 5000, 'transferred', 'Initial funding', v_custodian3),
  (v_fund3, v_company_id, 'PCR26050003', '2026-05-28', 2500, 'requested', 'Low balance - needs top-up', v_custodian3);

  -- Cash Counts
  INSERT INTO petty_cash_counts (fund_id, company_id, count_date, system_balance, actual_balance, difference, difference_type, status, remarks, counted_by) VALUES
  (v_fund1, v_company_id, '2026-05-28', 3200, 3200, 0, 'match', 'matched', 'Monthly count - OK', v_custodian1),
  (v_fund2, v_company_id, '2026-05-28', 7500, 7480, -20, 'shortage', 'adjusted', 'Minor shortage found', v_custodian2);

  RAISE NOTICE 'Petty Cash seed: 3 funds, 11 disbursements, 3 replenishments, 2 counts created';
END $$;
