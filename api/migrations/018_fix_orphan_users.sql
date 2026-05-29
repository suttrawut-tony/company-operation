-- 018: Fix all orphaned user references across all tables
-- Reassigns orphaned created_by, assigned_to, pm_user_id, etc. to actual existing users

DO $$
DECLARE
  v_company_id UUID;
  v_pm UUID;
  v_finance UUID;
  v_procurement UUID;
  v_accounting UUID;
  v_staff UUID;
  v_exec UUID;
  v_admin UUID;
  v_users UUID[];
  v_count INT;
BEGIN
  -- Get company
  SELECT company_id INTO v_company_id FROM users WHERE is_active = true LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'fix_orphans: no active users found, skipping';
    RETURN;
  END IF;

  -- Get one user per role
  SELECT id INTO v_pm FROM users WHERE company_id = v_company_id AND role = 'pm' AND is_active = true LIMIT 1;
  SELECT id INTO v_finance FROM users WHERE company_id = v_company_id AND role = 'finance' AND is_active = true LIMIT 1;
  SELECT id INTO v_procurement FROM users WHERE company_id = v_company_id AND role = 'procurement' AND is_active = true LIMIT 1;
  SELECT id INTO v_accounting FROM users WHERE company_id = v_company_id AND role = 'accounting' AND is_active = true LIMIT 1;
  SELECT id INTO v_staff FROM users WHERE company_id = v_company_id AND role = 'staff' AND is_active = true LIMIT 1;
  SELECT id INTO v_exec FROM users WHERE company_id = v_company_id AND role = 'executive' AND is_active = true LIMIT 1;
  SELECT id INTO v_admin FROM users WHERE company_id = v_company_id AND role = 'admin' AND is_active = true LIMIT 1;

  -- Fallback chain
  IF v_pm IS NULL THEN v_pm := COALESCE(v_admin, v_exec); END IF;
  IF v_finance IS NULL THEN v_finance := COALESCE(v_admin, v_exec); END IF;
  IF v_procurement IS NULL THEN v_procurement := COALESCE(v_admin, v_exec); END IF;
  IF v_accounting IS NULL THEN v_accounting := COALESCE(v_admin, v_exec); END IF;
  IF v_staff IS NULL THEN v_staff := COALESCE(v_admin, v_exec); END IF;
  IF v_exec IS NULL THEN v_exec := v_admin; END IF;

  -- Build user array for random assignment
  v_users := ARRAY[v_pm, v_finance, v_procurement, v_accounting, v_staff];

  -- ═══ Projects: PM ═══
  UPDATE projects SET pm_user_id = v_pm
  WHERE pm_user_id IS NULL OR pm_user_id NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: projects.pm_user_id — % rows fixed', v_count; END IF;

  -- ═══ Purchase Requests ═══
  UPDATE purchase_requests SET created_by = v_users[1 + (floor(random()*5))::int]
  WHERE created_by NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: purchase_requests.created_by — % rows fixed', v_count; END IF;

  -- ═══ Purchase Orders ═══
  UPDATE purchase_orders SET created_by = v_users[1 + (floor(random()*3))::int]
  WHERE created_by NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: purchase_orders.created_by — % rows fixed', v_count; END IF;

  -- ═══ Advance Requests ═══
  UPDATE advance_requests SET created_by = v_users[1 + (floor(random()*5))::int]
  WHERE created_by NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: advance_requests.created_by — % rows fixed', v_count; END IF;

  UPDATE advance_requests SET employee_id = created_by
  WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT id FROM users);

  -- ═══ Advance Payments ═══
  UPDATE advance_payments SET paid_by = v_finance
  WHERE paid_by IS NOT NULL AND paid_by NOT IN (SELECT id FROM users);

  -- ═══ Expenses ═══
  UPDATE expenses SET created_by = v_users[1 + (floor(random()*4))::int]
  WHERE created_by NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: expenses.created_by — % rows fixed', v_count; END IF;

  -- ═══ Tasks ═══
  UPDATE tasks SET assigned_to = v_users[1 + (floor(random()*5))::int]
  WHERE assigned_to IS NULL OR assigned_to NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: tasks.assigned_to — % rows fixed', v_count; END IF;

  -- ═══ Travel Requests ═══
  UPDATE travel_requests SET created_by = v_pm
  WHERE created_by NOT IN (SELECT id FROM users);

  -- ═══ OT Requests ═══
  UPDATE ot_requests SET user_id = v_users[1 + (floor(random()*5))::int]
  WHERE user_id NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: ot_requests.user_id — % rows fixed', v_count; END IF;

  UPDATE ot_requests SET created_by = user_id
  WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users);

  -- ═══ Vehicle Bookings ═══
  UPDATE vehicle_bookings SET booked_by = v_users[1 + (floor(random()*5))::int]
  WHERE booked_by NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: vehicle_bookings.booked_by — % rows fixed', v_count; END IF;

  -- ═══ Project Members: ensure all users are in all projects ═══
  INSERT INTO project_members (project_id, user_id, role)
  SELECT p.id, u.id, u.role::text
  FROM projects p
  CROSS JOIN users u
  WHERE u.company_id = v_company_id AND u.is_active = true
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'fix_orphans: project_members — % rows added', v_count; END IF;

  RAISE NOTICE 'fix_orphans: done';
END $$;
