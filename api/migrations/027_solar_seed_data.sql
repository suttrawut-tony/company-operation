-- 027: Solar workflow seed data — realistic demo bookings, quotations, project

-- Get company_id and user_id for seeding
DO $$
DECLARE
  v_company UUID;
  v_user UUID;
  v_tech1 UUID;
  v_tech2 UUID;
  v_booking1 UUID;
  v_booking2 UUID;
  v_booking3 UUID;
  v_project UUID;
  v_sq1 UUID;
  v_sq2 UUID;
BEGIN
  SELECT id INTO v_company FROM companies LIMIT 1;
  SELECT id INTO v_user FROM users WHERE company_id = v_company LIMIT 1;
  SELECT id INTO v_tech1 FROM technicians WHERE company_id = v_company ORDER BY id LIMIT 1;
  SELECT id INTO v_tech2 FROM technicians WHERE company_id = v_company ORDER BY id OFFSET 1 LIMIT 1;

  IF v_company IS NULL OR v_user IS NULL THEN RETURN; END IF;
  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM bookings WHERE title LIKE '%Solar สำรวจ%' AND company_id = v_company) THEN RETURN; END IF;

  -- Booking 1: Survey completed with items
  INSERT INTO bookings (id, company_id, booking_type, title, start_date, end_date, all_day,
    status, phase, job_type, site_name, location, technician_id,
    customer_name, customer_phone, customer_address,
    roof_area, roof_type, orientation, recommended_kwp, survey_notes, electrical_info,
    color, booked_by, created_at)
  VALUES (
    gen_random_uuid(), v_company, 'solar',
    'Solar สำรวจ — คุณสมชาย บ้านลำพูน',
    CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days', true,
    'survey_completed', 'survey', 'survey', 'บ้านคุณสมชาย ลำพูน', 'ต.เวียงยอง อ.เมือง จ.ลำพูน',
    v_tech1,
    'สมชาย ใจดี', '081-234-5678', '123/4 ม.5 ต.เวียงยอง อ.เมือง จ.ลำพูน 51000',
    65, 'metal_sheet', 'south', 10, 'หลังคาเมทัลชีทสภาพดี ทิศใต้ ไม่มีเงาบัง', '3 เฟส 30A มิเตอร์ TOU กฟภ.',
    '#0f9d58', v_user, NOW() - INTERVAL '10 days'
  ) RETURNING id INTO v_booking1;

  -- Add items to booking 1
  INSERT INTO booking_items (booking_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
  SELECT v_booking1, v.code, v.name, v.qty, v.unit, v.price, v.qty * v.price, v.sort
  FROM (VALUES
    ('SOL-PNL-550', 'Solar Panel 550W Mono', 18, 'EA', 5500, 1),
    ('SOL-INV-10H', 'Inverter 10kW Hybrid', 1, 'EA', 55000, 2),
    ('SOL-BAT-10', 'Battery LiFePO4 10.24kWh', 1, 'EA', 120000, 3),
    ('SOL-MNT-RAIL', 'Mounting Rail Aluminum', 36, 'M', 350, 4),
    ('SOL-MNT-CLMP', 'Mounting Clamp Set', 36, 'SET', 120, 5),
    ('SOL-CBL-DC6', 'DC Cable 6mm²', 50, 'M', 45, 6),
    ('SOL-CBL-AC4', 'AC Cable 4mm²', 30, 'M', 35, 7),
    ('SOL-BRK-DC32', 'DC Breaker 32A', 2, 'EA', 1200, 8),
    ('SOL-BRK-AC32', 'AC Breaker 32A', 1, 'EA', 450, 9),
    ('SOL-SPD-DC', 'Surge Protector DC', 1, 'EA', 2500, 10),
    ('SOL-SPD-AC', 'Surge Protector AC', 1, 'EA', 1800, 11),
    ('SOL-MTR-SMART', 'Smart Meter', 1, 'EA', 3500, 12),
    ('SOL-LABOR', 'Installation Labor', 10, 'KWP', 8000, 13)
  ) AS v(code, name, qty, unit, price, sort);

  -- Booking 2: Confirmed with items (ready for SQ)
  INSERT INTO bookings (id, company_id, booking_type, title, start_date, end_date, all_day,
    status, phase, job_type, site_name, location, technician_id,
    customer_name, customer_phone, customer_address,
    roof_area, roof_type, orientation, recommended_kwp, survey_notes, electrical_info,
    color, booked_by, created_at)
  VALUES (
    gen_random_uuid(), v_company, 'solar',
    'Solar สำรวจ — คุณวิชัย โรงงานสมุทรปราการ',
    CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days', true,
    'confirmed', 'survey', 'survey', 'โรงงาน ABC สมุทรปราการ', 'นิคมบางปู อ.เมือง จ.สมุทรปราการ',
    v_tech2,
    'วิชัย แสงทอง', '089-876-5432', '99/1 นิคมอุตสาหกรรมบางปู ซ.8 อ.เมือง จ.สมุทรปราการ 10280',
    200, 'concrete', 'flat', 30, 'หลังคาคอนกรีตแบนราบ โรงงานขนาดกลาง', '3 เฟส 100A มิเตอร์ กฟน.',
    '#0f9d58', v_user, NOW() - INTERVAL '5 days'
  ) RETURNING id INTO v_booking2;

  INSERT INTO booking_items (booking_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
  SELECT v_booking2, v.code, v.name, v.qty, v.unit, v.price, v.qty * v.price, v.sort
  FROM (VALUES
    ('SOL-PNL-550', 'Solar Panel 550W Mono', 54, 'EA', 5500, 1),
    ('SOL-INV-15G', 'Inverter 15kW On-Grid', 2, 'EA', 42000, 2),
    ('SOL-MNT-RAIL', 'Mounting Rail Aluminum', 108, 'M', 350, 3),
    ('SOL-MNT-CLMP', 'Mounting Clamp Set', 108, 'SET', 120, 4),
    ('SOL-CBL-DC6', 'DC Cable 6mm²', 150, 'M', 45, 5),
    ('SOL-CBL-AC4', 'AC Cable 4mm²', 80, 'M', 35, 6),
    ('SOL-BRK-DC32', 'DC Breaker 32A', 4, 'EA', 1200, 7),
    ('SOL-BRK-AC32', 'AC Breaker 32A', 2, 'EA', 450, 8),
    ('SOL-SPD-DC', 'Surge Protector DC', 2, 'EA', 2500, 9),
    ('SOL-SPD-AC', 'Surge Protector AC', 2, 'EA', 1800, 10),
    ('SOL-MTR-SMART', 'Smart Meter', 1, 'EA', 3500, 11),
    ('SOL-LABOR', 'Installation Labor', 30, 'KWP', 8000, 12)
  ) AS v(code, name, qty, unit, price, sort);

  -- Booking 3: New survey pending
  INSERT INTO bookings (id, company_id, booking_type, title, start_date, end_date, all_day,
    status, phase, job_type, site_name, location, technician_id,
    customer_name, customer_phone, customer_address,
    color, booked_by, created_at)
  VALUES (
    gen_random_uuid(), v_company, 'solar',
    'Solar สำรวจ — คุณนภา คอนโดพระราม 9',
    CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', true,
    'approved', 'survey', 'survey', 'คอนโด The Line พระราม 9', 'แยกพระราม 9 เขตห้วยขวาง กทม.',
    v_tech1,
    'นภา รัตนะ', '092-111-2222', 'คอนโด The Line พระราม 9 ชั้น 25 ห้อง 2501',
    '#0f9d58', v_user, NOW()
  ) RETURNING id INTO v_booking3;

  -- Create project for booking 1
  INSERT INTO projects (id, company_id, code, name, status, start_date, end_date, created_by)
  VALUES (
    gen_random_uuid(), v_company,
    'PRJ-' || TO_CHAR(NOW(), 'YYYYMM') || '-001',
    'Solar 10kWp — คุณสมชาย บ้านลำพูน',
    'active', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '60 days', v_user
  ) RETURNING id INTO v_project;

  -- Project phases (use project_tasks if project_phases doesn't exist)
  BEGIN
    INSERT INTO project_phases (project_id, name, status, sort_order) VALUES
      (v_project, 'สำรวจหน้างาน (Survey)', 'completed', 1),
      (v_project, 'เสนอราคา (Quotation)', 'in_progress', 2),
      (v_project, 'สั่งซื้ออุปกรณ์ (Procurement)', 'pending', 3),
      (v_project, 'ติดตั้งระบบ (Installation)', 'pending', 4),
      (v_project, 'ทดสอบระบบ (Testing & Commissioning)', 'pending', 5),
      (v_project, 'ส่งมอบ + ขอ กฟภ./กฟน. (Handover & MEA/PEA)', 'pending', 6),
      (v_project, 'รับประกัน (Warranty)', 'pending', 7);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Quotation 1: Draft (from booking 1)
  INSERT INTO quotations (id, company_id, sq_number, booking_id, project_id,
    customer_name, customer_phone, customer_address, site_name, site_location,
    system_capacity, roof_type, roof_area,
    subtotal, vat_pct, vat_amt, grand_total, status, validity_days,
    terms, created_by)
  VALUES (
    gen_random_uuid(), v_company,
    'SQ-' || TO_CHAR(NOW(), 'YYYYMM') || '-001',
    v_booking1, v_project,
    'สมชาย ใจดี', '081-234-5678', '123/4 ม.5 ต.เวียงยอง อ.เมือง จ.ลำพูน 51000',
    'บ้านคุณสมชาย ลำพูน', 'ต.เวียงยอง อ.เมือง จ.ลำพูน',
    10, 'metal_sheet', 65,
    376600, 7, 26362, 402962, 'draft', 30,
    'ราคานี้รวมค่าอุปกรณ์และค่าแรงติดตั้งแล้ว / รับประกันแผงโซลาร์ 25 ปี อินเวอร์เตอร์ 10 ปี / ชำระ 50% ล่วงหน้า ที่เหลือเมื่อติดตั้งเสร็จ',
    v_user
  ) RETURNING id INTO v_sq1;

  -- Copy items to quotation 1
  INSERT INTO quotation_items (quotation_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
  SELECT v_sq1, item_code, item_name, qty, unit, unit_price, total, sort_order
  FROM booking_items WHERE booking_id = v_booking1;

  -- Update booking 1 with quotation link
  UPDATE bookings SET quotation_id = v_sq1, project_id = v_project, status = 'quotation_sent'
  WHERE id = v_booking1;

  -- Quotation 2: Sent (standalone)
  INSERT INTO quotations (id, company_id, sq_number,
    customer_name, customer_phone, customer_address, site_name, site_location,
    system_capacity, roof_type, roof_area,
    subtotal, discount_pct, discount_amt, vat_pct, vat_amt, grand_total,
    status, validity_days, terms, notes, created_by)
  VALUES (
    gen_random_uuid(), v_company,
    'SQ-' || TO_CHAR(NOW(), 'YYYYMM') || '-002',
    'บริษัท กรีนเอเนอร์ยี่ จำกัด', '02-999-8888', '55/1 ถ.สุขุมวิท แขวงคลองตัน เขตคลองเตย กทม. 10110',
    'อาคารสำนักงาน Green Tower', 'ถ.สุขุมวิท 21 กทม.',
    15, 'concrete', 120,
    520000, 5, 26000, 7, 34580, 528580,
    'sent', 30,
    'ราคานี้รวมค่าอุปกรณ์และค่าแรงติดตั้ง / รับประกันระบบ 2 ปี แผง 25 ปี / ชำระ 3 งวด',
    'ลูกค้าสนใจ รอ confirm สัปดาห์หน้า',
    v_user
  ) RETURNING id INTO v_sq2;

  INSERT INTO quotation_items (quotation_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
  VALUES
    (v_sq2, 'SOL-PNL-550', 'Solar Panel 550W Mono', 27, 'EA', 5500, 148500, 1),
    (v_sq2, 'SOL-INV-15G', 'Inverter 15kW On-Grid', 1, 'EA', 42000, 42000, 2),
    (v_sq2, 'SOL-MNT-RAIL', 'Mounting Rail Aluminum', 54, 'M', 350, 18900, 3),
    (v_sq2, 'SOL-MNT-CLMP', 'Mounting Clamp Set', 54, 'SET', 120, 6480, 4),
    (v_sq2, 'SOL-CBL-DC6', 'DC Cable 6mm²', 80, 'M', 45, 3600, 5),
    (v_sq2, 'SOL-CBL-AC4', 'AC Cable 4mm²', 50, 'M', 35, 1750, 6),
    (v_sq2, 'SOL-BRK-DC32', 'DC Breaker 32A', 3, 'EA', 1200, 3600, 7),
    (v_sq2, 'SOL-BRK-AC32', 'AC Breaker 32A', 1, 'EA', 450, 450, 8),
    (v_sq2, 'SOL-SPD-DC', 'Surge Protector DC', 1, 'EA', 2500, 2500, 9),
    (v_sq2, 'SOL-SPD-AC', 'Surge Protector AC', 1, 'EA', 1800, 1800, 10),
    (v_sq2, 'SOL-MTR-SMART', 'Smart Meter', 1, 'EA', 3500, 3500, 11),
    (v_sq2, 'SOL-LABOR', 'Installation Labor', 15, 'KWP', 8000, 120000, 12);

END $$;
