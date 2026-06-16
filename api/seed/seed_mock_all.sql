-- ═══════════════════════════════════════════════════════════
-- Company Operation — Comprehensive Mock/Seed Data
-- Fills EVERY page with realistic Thai business data
-- Run: psql $DATABASE_URL < api/seed/seed_mock_all.sql
-- ═══════════════════════════════════════════════════════════
-- Skip FK checks for easier seeding
SET session_replication_role = 'replica';

-- ─── Aliases ───
-- Company:   11111111-1111-1111-1111-111111111111
-- Somparat:  a9326f9b-1c8f-4776-80d4-18c5ff4de298 (executive)
-- Norawat:   75b4f523-f342-4c11-97b5-26757ccf1449 (pm)
-- Sukanya:   111d26db-f886-4f69-a1f6-cb94addefa7e (finance)
-- Pranee:    2ad7260e-a703-4a04-bc04-ccd0cc456894 (accounting)
-- Wachirapron: 66c7f9b3-1067-433c-a1a6-3061d2d78f18 (accounting)

-- ═══════════════════════════════════════════════════════════
-- 1. TECHNICIANS (4 technicians)
-- ═══════════════════════════════════════════════════════════
INSERT INTO technicians (id, company_id, first_name, last_name, nickname, phone, specialization, skill_level, daily_rate, status, notes, created_at)
VALUES
  ('aaaa0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111',
   'ชาย', 'วงษ์สวัสดิ์', 'ชาย', '089-111-2233', 'install', 'senior', 1800,
   'available', 'ช่างติดตั้งโซลาร์เซลล์ ประสบการณ์ 8 ปี', NOW()),
  ('aaaa0001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111',
   'อชัย', 'สุขประเสริฐ', 'ชัย', '089-222-3344', 'electrical', 'senior', 2000,
   'available', 'ช่างไฟฟ้า ใบอนุญาต วสท. ประสบการณ์ 10 ปี', NOW()),
  ('aaaa0001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111',
   'วรัญชิต', 'แก้วมณี', 'ชิต', '089-333-4455', 'survey', 'mid', 1500,
   'available', 'ช่างสำรวจหน้างาน วัดพื้นที่หลังคา + ไฟฟ้า', NOW()),
  ('aaaa0001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111',
   'หญิง', 'พลศิริ', 'หญิง', '089-444-5566', 'maintain', 'junior', 1200,
   'available', 'ช่างซ่อมบำรุงระบบโซลาร์เซลล์', NOW())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 2. JOB ORDERS (3 job orders)
-- ═══════════════════════════════════════════════════════════
INSERT INTO job_orders (id, company_id, job_order_number, project_id, title, description, job_type, site_name, location, priority, planned_start, planned_end, needs_vehicle, needs_technician, needs_flight, status, created_by, created_at)
VALUES
  ('bbbb0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111',
   'JO-2606-001',
   (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1),
   'ติดตั้ง Sounder ท่าเรือภูเก็ต', 'งานติดตั้ง Sounder Transducer พร้อม Calibration ที่ท่าเรือภูเก็ต',
   'install', 'ท่าเรืออ่าวฉลอง', 'อ.เมือง จ.ภูเก็ต', 'high',
   '2026-06-02', '2026-06-05', true, true, false, 'approved',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-05-28 09:00:00+07'),
  ('bbbb0001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111',
   'JO-2606-002',
   (SELECT id FROM projects WHERE code = 'SDA-2026-008' LIMIT 1),
   'ตรวจเช็คกล้อง CCTV Zone C', 'ตรวจสอบและปรับตั้งกล้อง CCTV Zone C จำนวน 8 ตัว หลังติดตั้ง',
   'inspect', 'ท่าเรือแหลมฉบัง', 'อ.ศรีราชา จ.ชลบุรี', 'normal',
   '2026-06-09', '2026-06-10', true, false, false, 'approved',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-01 10:00:00+07'),
  ('bbbb0001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111',
   'JO-2606-003',
   (SELECT id FROM projects WHERE code = 'SDA-2026-007' LIMIT 1),
   'สำรวจจุดติดตั้ง Weather Station จุดที่ 3-5', 'สำรวจพื้นที่ติดตั้งสถานีตรวจอากาศ จุดที่ 3-5 บริเวณชายฝั่งชุมพร',
   'survey', 'ชายฝั่งชุมพร', 'อ.เมือง จ.ชุมพร', 'high',
   '2026-06-15', '2026-06-18', true, true, false, 'approved',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-05 14:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 3. BOOKINGS (9 bookings: 3 vehicle, 4 solar, 2 flight)
-- ═══════════════════════════════════════════════════════════
INSERT INTO bookings (id, company_id, booking_type, project_id, vehicle_id, technician_id, job_order_id,
  start_date, end_date, all_day, title, purpose, location, color, status,
  passengers, km_start,
  -- Solar fields
  phase, customer_name, customer_phone, customer_address, roof_type, roof_area, recommended_kwp,
  job_type, site_name, survey_notes, electrical_info,
  -- Flight fields
  airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time,
  passenger_names, booking_reference, ticket_cost,
  booked_by, created_at)
VALUES
  -- Vehicle bookings (3)
  ('cccc0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111',
   'vehicle',
   (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1),
   (SELECT id FROM vehicles WHERE plate_number = 'กก-1234 กทม' LIMIT 1),
   NULL,
   'bbbb0001-0001-0001-0001-000000000001',
   '2026-06-02', '2026-06-05', true,
   'เดินทางติดตั้ง Sounder ภูเก็ต', 'ขนอุปกรณ์และทีมช่างไปติดตั้ง Sounder ที่ภูเก็ต',
   'ท่าเรืออ่าวฉลอง ภูเก็ต', '#4285f4', 'approved',
   'นรวัฒน์, ชาย, อชัย', 45230,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-05-28 09:30:00+07'),

  ('cccc0001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111',
   'vehicle',
   (SELECT id FROM projects WHERE code = 'SDA-2026-008' LIMIT 1),
   (SELECT id FROM vehicles WHERE plate_number = 'ขข-5678 กทม' LIMIT 1),
   NULL,
   'bbbb0001-0001-0001-0001-000000000002',
   '2026-06-09', '2026-06-10', true,
   'ตรวจเช็คกล้อง CCTV แหลมฉบัง', 'เดินทางตรวจสอบกล้อง CCTV Zone C ท่าเรือแหลมฉบัง',
   'ท่าเรือแหลมฉบัง ชลบุรี', '#4285f4', 'pending',
   'นรวัฒน์, ธีระ', NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-01 10:30:00+07'),

  ('cccc0001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111',
   'vehicle',
   (SELECT id FROM projects WHERE code = 'SDA-2026-007' LIMIT 1),
   (SELECT id FROM vehicles WHERE plate_number = 'กก-1234 กทม' LIMIT 1),
   NULL,
   'bbbb0001-0001-0001-0001-000000000003',
   '2026-06-15', '2026-06-18', true,
   'สำรวจ Weather Station ชุมพร', 'ขนอุปกรณ์สำรวจไปชุมพร',
   'อ.เมือง จ.ชุมพร', '#4285f4', 'approved',
   'นรวัฒน์, วรัญชิต, ชาย', NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-05 14:30:00+07'),

  -- Solar bookings (4)
  ('cccc0001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111',
   'solar', NULL, NULL,
   'aaaa0001-0001-0001-0001-000000000003', NULL,
   '2026-06-05', '2026-06-05', true,
   'Solar สำรวจ — คุณประวิทย์ บ้านนนทบุรี', 'สำรวจหลังคาบ้านเพื่อติดตั้งโซลาร์เซลล์',
   'อ.ปากเกร็ด จ.นนทบุรี', '#0f9d58', 'completed',
   NULL, NULL,
   'survey', 'ประวิทย์ ศรีสุข', '081-999-8877', '45/12 ม.3 ต.บางตลาด อ.ปากเกร็ด จ.นนทบุรี 11120',
   'concrete_tile', 80, 8,
   'survey', 'บ้านคุณประวิทย์ นนทบุรี', 'หลังคากระเบื้องคอนกรีต ทิศใต้ ไม่มีต้นไม้บัง พื้นที่เหมาะสม', '1 เฟส 15A มิเตอร์ กฟน. TOU',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-01 08:00:00+07'),

  ('cccc0001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111',
   'solar', NULL, NULL,
   'aaaa0001-0001-0001-0001-000000000001', NULL,
   '2026-06-10', '2026-06-12', true,
   'Solar ติดตั้ง — คุณมาลี บ้านรังสิต', 'ติดตั้งระบบโซลาร์เซลล์ 5kWp พร้อมแบตเตอรี่',
   'คลอง 4 รังสิต จ.ปทุมธานี', '#0f9d58', 'approved',
   NULL, NULL,
   'install', 'มาลี จันทร์เพ็ญ', '092-345-6789', '88/5 หมู่บ้านพฤกษา คลอง 4 อ.ธัญบุรี จ.ปทุมธานี 12110',
   'metal_sheet', 55, 5,
   'install', 'บ้านคุณมาลี รังสิต', NULL, '1 เฟส 15A มิเตอร์ กฟภ.',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-03 09:00:00+07'),

  ('cccc0001-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111',
   'solar', NULL, NULL,
   'aaaa0001-0001-0001-0001-000000000003', NULL,
   '2026-06-20', '2026-06-20', true,
   'Solar สำรวจ — โรงงาน ABC สมุทรสาคร', 'สำรวจหลังคาโรงงานเพื่อติดตั้ง On-Grid 50kWp',
   'นิคมอุตสาหกรรมสมุทรสาคร', '#0f9d58', 'pending',
   NULL, NULL,
   'survey', 'บริษัท ABC อุตสาหกรรม จำกัด', '02-888-7766', '99 นิคมอุตสาหกรรมสมุทรสาคร อ.เมือง จ.สมุทรสาคร 74000',
   'metal_sheet', 500, 50,
   'survey', 'โรงงาน ABC สมุทรสาคร', NULL, '3 เฟส 200A มิเตอร์ กฟภ.',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-10 10:00:00+07'),

  ('cccc0001-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111',
   'solar', NULL, NULL,
   'aaaa0001-0001-0001-0001-000000000002', NULL,
   '2026-06-25', '2026-06-27', true,
   'Solar ซ่อมบำรุง — คุณสมศักดิ์ เชียงใหม่', 'ตรวจสอบและซ่อมบำรุงระบบโซลาร์ประจำปี',
   'อ.สันทราย จ.เชียงใหม่', '#0f9d58', 'surveying',
   NULL, NULL,
   'maintain', 'สมศักดิ์ ทองดี', '053-111-2233', '77/3 ม.8 ต.หนองหาร อ.สันทราย จ.เชียงใหม่ 50290',
   'metal_sheet', 60, 10,
   'maintain', 'บ้านคุณสมศักดิ์ เชียงใหม่', 'ระบบ 10kWp ติดตั้งไป 2 ปี ต้องตรวจเช็คแผง+อินเวอร์เตอร์', '3 เฟส 30A กฟภ.',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-12 11:00:00+07'),

  -- Flight bookings (2)
  ('cccc0001-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111',
   'flight',
   (SELECT id FROM projects WHERE code = 'SDA-2026-006' LIMIT 1),
   NULL, NULL, NULL,
   '2026-06-08', '2026-06-10', false,
   'เดินทาง AIS Repeater สุราษฎร์ธานี', 'บินไปตรวจสอบระบบ AIS Repeater จุดที่ 3',
   'สุราษฎร์ธานี', '#db4437', 'approved',
   NULL, NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL,
   'Thai AirAsia', 'FD3145', 'DMK', 'URT',
   '2026-06-08 07:30:00+07', '2026-06-08 08:50:00+07',
   'นรวัฒน์ สรรพช่าง, ศิริขวัญ ประกอบกิจ', 'XYZABC', 4580,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-01 14:00:00+07'),

  ('cccc0001-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111',
   'flight',
   (SELECT id FROM projects WHERE code = 'SDA-2026-011' LIMIT 1),
   NULL, NULL, NULL,
   '2026-06-22', '2026-06-24', false,
   'สำรวจ VTS มาบตาพุด (บินอุบลฯ กลับ)', 'บินกลับจากอุบลราชธานีหลังประชุม',
   'อุบลราชธานี - กรุงเทพ', '#db4437', 'pending',
   NULL, NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL,
   'Nok Air', 'DD308', 'UBP', 'DMK',
   '2026-06-24 18:10:00+07', '2026-06-24 19:20:00+07',
   'นรวัฒน์ สรรพช่าง', 'QWERTY', 3290,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-10 16:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 4. PETTY CASH FUND + DISBURSEMENTS
-- ═══════════════════════════════════════════════════════════
INSERT INTO petty_cash_funds (id, company_id, fund_code, fund_name, fund_limit, current_balance, low_threshold, custodian_id, gl_account, status, created_by, created_at)
VALUES
  ('dddd0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111',
   'PCF-001', 'เงินสดย่อย สำนักงาน', 50000, 38250, 20,
   '111d26db-f886-4f69-a1f6-cb94addefa7e', '111101', 'active',
   '111d26db-f886-4f69-a1f6-cb94addefa7e', '2026-01-15 09:00:00+07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO petty_cash_disbursements (id, fund_id, company_id, doc_number, doc_date, recipient, description, amount, category, receipt_status, status, approved_by, approved_at, created_by, created_at)
VALUES
  ('dddd0002-0001-0001-0001-000000000001', 'dddd0001-0001-0001-0001-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'PC-2606-001', '2026-06-02',
   'คุณปราณี', 'ค่ากระดาษ A4 (5 รีม) + หมึกพิมพ์ HP', 2350, 'office',
   'received', 'disbursed',
   '111d26db-f886-4f69-a1f6-cb94addefa7e', '2026-06-02 10:00:00+07',
   '2ad7260e-a703-4a04-bc04-ccd0cc456894', '2026-06-02 09:30:00+07'),

  ('dddd0002-0001-0001-0001-000000000002', 'dddd0001-0001-0001-0001-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'PC-2606-002', '2026-06-04',
   'คุณวชิราภรณ์', 'ค่าแท็กซี่ไปส่งเอกสารที่กรมศุลกากร', 850, 'travel',
   'received', 'disbursed',
   '111d26db-f886-4f69-a1f6-cb94addefa7e', '2026-06-04 14:00:00+07',
   '66c7f9b3-1067-433c-a1a6-3061d2d78f18', '2026-06-04 13:30:00+07'),

  ('dddd0002-0001-0001-0001-000000000003', 'dddd0001-0001-0001-0001-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'PC-2606-003', '2026-06-06',
   'คุณสุกัญญา', 'ค่าน้ำดื่ม + กาแฟ สำนักงาน ประจำสัปดาห์', 1200, 'supplies',
   'received', 'disbursed',
   '111d26db-f886-4f69-a1f6-cb94addefa7e', '2026-06-06 11:00:00+07',
   '111d26db-f886-4f69-a1f6-cb94addefa7e', '2026-06-06 10:00:00+07'),

  ('dddd0002-0001-0001-0001-000000000004', 'dddd0001-0001-0001-0001-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'PC-2606-004', '2026-06-09',
   'คุณปราณี', 'ค่าจัดส่ง EMS เอกสารสัญญาไปลูกค้า 3 ชุด', 450, 'office',
   'pending', 'disbursed',
   NULL, NULL,
   '2ad7260e-a703-4a04-bc04-ccd0cc456894', '2026-06-09 15:00:00+07'),

  ('dddd0002-0001-0001-0001-000000000005', 'dddd0001-0001-0001-0001-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'PC-2606-005', '2026-06-11',
   'คุณนรวัฒน์', 'ค่าอาหารทีมงานประชุมโปรเจกต์ VTS 6 คน', 6900, 'supplies',
   'pending', 'disbursed',
   NULL, NULL,
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-11 12:30:00+07')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 5. QUOTATIONS + QUOTATION ITEMS
-- ═══════════════════════════════════════════════════════════
INSERT INTO quotations (id, company_id, sq_number, customer_name, customer_phone, customer_address,
  site_name, site_location, system_capacity, roof_type, roof_area,
  subtotal, discount_pct, discount_amt, vat_pct, vat_amt, grand_total,
  status, validity_days, terms, notes, created_by, created_at)
VALUES
  -- Q1: Draft
  ('eeee0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111',
   'SQ-202606-001',
   'ประวิทย์ ศรีสุข', '081-999-8877', '45/12 ม.3 ต.บางตลาด อ.ปากเกร็ด จ.นนทบุรี 11120',
   'บ้านคุณประวิทย์ นนทบุรี', 'อ.ปากเกร็ด จ.นนทบุรี',
   8, 'concrete_tile', 80,
   247700, 0, 0, 7, 17339, 265039,
   'draft', 30,
   'ราคารวมค่าอุปกรณ์และค่าแรงติดตั้ง / รับประกันแผง 25 ปี อินเวอร์เตอร์ 10 ปี / ชำระ 50% ล่วงหน้า',
   'ลูกค้าสนใจระบบ Hybrid พร้อมแบตเตอรี่',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-06 10:00:00+07'),

  -- Q2: Sent
  ('eeee0001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111',
   'SQ-202606-002',
   'บริษัท กรีนพาวเวอร์ จำกัด', '02-555-6677', '120/5 ถ.บางนา-ตราด แขวงบางนา เขตบางนา กทม. 10260',
   'อาคารสำนักงาน Green Power', 'ถ.บางนา-ตราด กทม.',
   15, 'concrete', 150,
   423450, 3, 12703.50, 7, 28752.26, 439498.76,
   'sent', 30,
   'ราคารวมค่าอุปกรณ์และค่าแรง / รับประกันระบบ 2 ปี / ชำระ 3 งวด: 40%-40%-20%',
   'ส่งใบเสนอราคาแล้ว รอลูกค้า confirm ภายใน 2 สัปดาห์',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-03 14:00:00+07'),

  -- Q3: Approved
  ('eeee0001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111',
   'SQ-202606-003',
   'มาลี จันทร์เพ็ญ', '092-345-6789', '88/5 หมู่บ้านพฤกษา คลอง 4 อ.ธัญบุรี จ.ปทุมธานี 12110',
   'บ้านคุณมาลี รังสิต', 'คลอง 4 อ.ธัญบุรี จ.ปทุมธานี',
   5, 'metal_sheet', 55,
   181950, 0, 0, 7, 12736.50, 194686.50,
   'approved', 30,
   'ราคารวมค่าอุปกรณ์+แรง / รับประกันแผง 25 ปี อินเวอร์เตอร์ 10 ปี แบตฯ 10 ปี',
   'ลูกค้า confirm แล้ว นัดติดตั้ง 10-12 มิ.ย.',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-05-28 10:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- Quotation items Q1 (8kWp residential)
INSERT INTO quotation_items (id, quotation_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
VALUES
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-PNL-550', 'Solar Panel 550W Mono', 15, 'EA', 5500, 82500, 1),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-INV-10H', 'Inverter 10kW Hybrid', 1, 'EA', 55000, 55000, 2),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-BAT-05', 'Battery LiFePO4 5.12kWh', 1, 'EA', 65000, 65000, 3),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-MNT-RAIL', 'Mounting Rail Aluminum', 30, 'M', 350, 10500, 4),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-MNT-CLMP', 'Mounting Clamp Set', 30, 'SET', 120, 3600, 5),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-CBL-DC6', 'DC Cable 6mm2', 40, 'M', 45, 1800, 6),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-SPD-DC', 'Surge Protector DC', 1, 'EA', 2500, 2500, 7),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-SPD-AC', 'Surge Protector AC', 1, 'EA', 1800, 1800, 8),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-MTR-SMART', 'Smart Meter', 1, 'EA', 3500, 3500, 9),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-BRK-DC32', 'DC Breaker 32A', 2, 'EA', 1200, 2400, 10),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-BRK-AC32', 'AC Breaker 32A', 1, 'EA', 450, 450, 11),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000001', 'SOL-LABOR', 'Installation Labor', 8, 'KWP', 8000, 64000, 12)
  -- Note: items not inserted ON CONFLICT because they use random UUIDs
;

-- Quotation items Q2 (15kWp commercial on-grid)
INSERT INTO quotation_items (id, quotation_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
VALUES
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-PNL-550', 'Solar Panel 550W Mono', 27, 'EA', 5500, 148500, 1),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-INV-15G', 'Inverter 15kW On-Grid', 1, 'EA', 42000, 42000, 2),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-MNT-RAIL', 'Mounting Rail Aluminum', 54, 'M', 350, 18900, 3),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-MNT-CLMP', 'Mounting Clamp Set', 54, 'SET', 120, 6480, 4),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-CBL-DC6', 'DC Cable 6mm2', 80, 'M', 45, 3600, 5),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-CBL-AC4', 'AC Cable 4mm2', 50, 'M', 35, 1750, 6),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-BRK-DC32', 'DC Breaker 32A', 3, 'EA', 1200, 3600, 7),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-SPD-DC', 'Surge Protector DC', 2, 'EA', 2500, 5000, 8),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-SPD-AC', 'Surge Protector AC', 2, 'EA', 1800, 3600, 9),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-MTR-SMART', 'Smart Meter', 1, 'EA', 3500, 3500, 10),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000002', 'SOL-LABOR', 'Installation Labor', 15, 'KWP', 8000, 120000, 11);

-- Quotation items Q3 (5kWp hybrid residential)
INSERT INTO quotation_items (id, quotation_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
VALUES
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-PNL-450', 'Solar Panel 450W Mono', 12, 'EA', 4200, 50400, 1),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-INV-05H', 'Inverter 5kW Hybrid', 1, 'EA', 35000, 35000, 2),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-BAT-05', 'Battery LiFePO4 5.12kWh', 1, 'EA', 65000, 65000, 3),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-MNT-RAIL', 'Mounting Rail Aluminum', 24, 'M', 350, 8400, 4),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-MNT-CLMP', 'Mounting Clamp Set', 24, 'SET', 120, 2880, 5),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-CBL-DC6', 'DC Cable 6mm2', 30, 'M', 45, 1350, 6),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-SPD-DC', 'Surge Protector DC', 1, 'EA', 2500, 2500, 7),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-SPD-AC', 'Surge Protector AC', 1, 'EA', 1800, 1800, 8),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-BRK-DC32', 'DC Breaker 32A', 2, 'EA', 1200, 2400, 9),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-BRK-AC32', 'AC Breaker 32A', 1, 'EA', 450, 450, 10),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-MTR-SMART', 'Smart Meter', 1, 'EA', 3500, 3500, 11),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-MC4', 'MC4 Connector Pair', 12, 'PAIR', 80, 960, 12),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-SEAL', 'Rooftop Sealant', 5, 'TUBE', 250, 1250, 13),
  (uuid_generate_v4(), 'eeee0001-0001-0001-0001-000000000003', 'SOL-LABOR', 'Installation Labor', 5, 'KWP', 8000, 40000, 14);

-- ═══════════════════════════════════════════════════════════
-- 6. PHASE PAYMENTS (5 milestones for SDA-2026-001)
-- ═══════════════════════════════════════════════════════════
INSERT INTO phase_payments (id, project_id, phase_id, payment_term, description, percentage, amount, retention_amount, net_amount,
  due_conditions, expected_date, invoice_number, invoice_date, received_date, received_amount, wht_amount, actual_net,
  status, sort_order, is_final, inspection_status, created_by, created_at)
VALUES
  -- งวดที่ 1: Advance payment (paid)
  ('ffff0001-0001-0001-0001-000000000001',
   (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1),
   (SELECT id FROM phases WHERE project_id = (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1) AND sort_order = 1 LIMIT 1),
   'งวดที่ 1', 'เงินล่วงหน้า — ลงนามสัญญา', 20, 300000, 15000, 285000,
   'เมื่อลงนามสัญญา', '2026-02-15',
   'INV-2602-001', '2026-02-10', '2026-02-20', 285000, 9000, 276000,
   'paid', 1, false, 'completed',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-02-01 09:00:00+07'),

  -- งวดที่ 2: Design complete (invoiced)
  ('ffff0001-0001-0001-0001-000000000002',
   (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1),
   (SELECT id FROM phases WHERE project_id = (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1) AND sort_order = 2 LIMIT 1),
   'งวดที่ 2', 'ส่งมอบแบบระบบและจัดซื้ออุปกรณ์', 25, 375000, 18750, 356250,
   'เมื่อส่งมอบแบบและอุปกรณ์ถึงหน้างาน', '2026-04-15',
   'INV-2604-002', '2026-04-10', NULL, 0, 0, 0,
   'invoiced', 2, false, 'completed',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-02-01 09:00:00+07'),

  -- งวดที่ 3: Installation 50% (pending)
  ('ffff0001-0001-0001-0001-000000000003',
   (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1),
   (SELECT id FROM phases WHERE project_id = (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1) AND sort_order = 3 LIMIT 1),
   'งวดที่ 3', 'ติดตั้งอุปกรณ์หลักเสร็จ 50%', 25, 375000, 18750, 356250,
   'เมื่อติดตั้ง Sounder + Sonar เสร็จ', '2026-05-31',
   NULL, NULL, NULL, 0, 0, 0,
   'pending', 3, false, 'pending',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-02-01 09:00:00+07'),

  -- งวดที่ 4: Testing & UAT (pending)
  ('ffff0001-0001-0001-0001-000000000004',
   (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1),
   (SELECT id FROM phases WHERE project_id = (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1) AND sort_order = 3 LIMIT 1),
   'งวดที่ 4', 'ทดสอบระบบและส่งมอบ', 20, 300000, 15000, 285000,
   'เมื่อ UAT ผ่านและส่งมอบงาน', '2026-06-30',
   NULL, NULL, NULL, 0, 0, 0,
   'pending', 4, false, 'pending',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-02-01 09:00:00+07'),

  -- งวดที่ 5: Retention release (final)
  ('ffff0001-0001-0001-0001-000000000005',
   (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1),
   (SELECT id FROM phases WHERE project_id = (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1) AND sort_order = 4 LIMIT 1),
   'งวดสุดท้าย', 'คืนเงินประกันผลงาน (Retention)', 10, 150000, 0, 150000,
   'เมื่อครบกำหนดรับประกัน 1 ปี', '2027-06-30',
   NULL, NULL, NULL, 0, 0, 0,
   'pending', 5, true, 'pending',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-02-01 09:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 7. WAREHOUSES (ON CONFLICT with existing seed from migration 043)
-- ═══════════════════════════════════════════════════════════
INSERT INTO warehouses (id, company_id, code, name, location, status, created_at)
VALUES
  ('77770001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111',
   'HQ01', 'คลังสินค้าหลัก', 'สำนักงานใหญ่ ซ.ศูนย์วิจัย 4', 'active', NOW()),
  ('77770001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111',
   'PJ00', 'คลังโครงการ', 'คลังสินค้าประจำโครงการ', 'active', NOW()),
  ('77770001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111',
   'PJ01', 'คลังสินค้าคงเหลือ', 'คลังเก็บสินค้าคงเหลือจากโครงการ', 'active', NOW())
ON CONFLICT DO NOTHING;  -- catches both PK and unique(company_id, code)

-- ═══════════════════════════════════════════════════════════
-- 8. WAREHOUSE STOCK (15 entries)
-- ═══════════════════════════════════════════════════════════
-- We need item IDs from the items table. Use subqueries.
DO $$
DECLARE
  wh_hq UUID;
  wh_pj UUID;
  wh_pj01 UUID;
BEGIN
  SELECT id INTO wh_hq FROM warehouses WHERE code = 'HQ01' AND company_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  SELECT id INTO wh_pj FROM warehouses WHERE code = 'PJ00' AND company_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  SELECT id INTO wh_pj01 FROM warehouses WHERE code = 'PJ01' AND company_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  IF wh_hq IS NULL OR wh_pj IS NULL OR wh_pj01 IS NULL THEN
    RAISE NOTICE 'Warehouses not found, skipping warehouse_stock seed';
    RETURN;
  END IF;

  -- HQ01 stocks (main inventory)
  INSERT INTO warehouse_stock (company_id, warehouse_id, item_id, quantity, min_quantity)
  SELECT '11111111-1111-1111-1111-111111111111', wh_hq, i.id, v.qty, v.min_qty
  FROM items i, (VALUES
    ('SOL-PNL-550', 45, 10),
    ('SOL-PNL-450', 30, 10),
    ('SOL-INV-05H', 5, 2),
    ('SOL-INV-10H', 3, 1),
    ('SOL-INV-15G', 2, 1),
    ('SOL-BAT-05', 8, 2),
    ('SOL-BAT-10', 3, 1),
    ('SOL-MNT-RAIL', 200, 50),
    ('SOL-MNT-CLMP', 300, 50),
    ('SOL-CBL-DC6', 500, 100),
    ('SOL-CBL-AC4', 400, 100),
    ('SOL-BRK-DC32', 20, 5),
    ('SOL-BRK-AC32', 15, 5)
  ) AS v(code, qty, min_qty)
  WHERE i.item_code = v.code AND i.company_id = '11111111-1111-1111-1111-111111111111'
  ON CONFLICT DO NOTHING;

  -- PJ00 stocks (project site)
  INSERT INTO warehouse_stock (company_id, warehouse_id, item_id, quantity, min_quantity)
  SELECT '11111111-1111-1111-1111-111111111111', wh_pj, i.id, v.qty, v.min_qty
  FROM items i, (VALUES
    ('SOL-PNL-550', 12, 0),
    ('SOL-INV-05H', 1, 0),
    ('SOL-BAT-05', 1, 0),
    ('SOL-MNT-RAIL', 24, 0),
    ('SOL-MNT-CLMP', 24, 0),
    ('SOL-CBL-DC6', 30, 0)
  ) AS v(code, qty, min_qty)
  WHERE i.item_code = v.code AND i.company_id = '11111111-1111-1111-1111-111111111111'
  ON CONFLICT DO NOTHING;

  -- PJ01 stocks (leftover from completed projects)
  INSERT INTO warehouse_stock (company_id, warehouse_id, item_id, quantity, min_quantity)
  SELECT '11111111-1111-1111-1111-111111111111', wh_pj01, i.id, v.qty, v.min_qty
  FROM items i, (VALUES
    ('SOL-PNL-550', 3, 0),
    ('SOL-MNT-RAIL', 8, 0),
    ('SOL-MNT-CLMP', 6, 0),
    ('SOL-MC4', 15, 0),
    ('SOL-SPD-DC', 1, 0),
    ('SOL-SEAL', 3, 0)
  ) AS v(code, qty, min_qty)
  WHERE i.item_code = v.code AND i.company_id = '11111111-1111-1111-1111-111111111111'
  ON CONFLICT DO NOTHING;

END $$;

-- ═══════════════════════════════════════════════════════════
-- 9. VEHICLE INSURANCE (2 records)
-- ═══════════════════════════════════════════════════════════
INSERT INTO vehicle_insurance (id, vehicle_id, insurance_type, policy_number, insurance_company,
  coverage_start, coverage_end, premium, coverage_amount, deductible, broker, broker_phone, remarks, status, created_at)
VALUES
  ('88880001-0001-0001-0001-000000000001',
   (SELECT id FROM vehicles WHERE plate_number = 'กก-1234 กทม' LIMIT 1),
   'comprehensive', 'MOT-2026-55123',
   'บริษัท ทิพยประกันภัย จำกัด (มหาชน)',
   '2026-01-01', '2026-12-31', 18500, 800000, 5000,
   'นายสมชาย โบรกเกอร์', '081-999-0000',
   'ประกันชั้น 1 Toyota Hilux Revo ปี 2023', 'active', NOW()),
  ('88880001-0001-0001-0001-000000000002',
   (SELECT id FROM vehicles WHERE plate_number = 'ขข-5678 กทม' LIMIT 1),
   'compulsory', 'CMI-2026-77890',
   'บริษัท กรุงเทพประกันภัย จำกัด (มหาชน)',
   '2026-03-15', '2027-03-14', 3200, 500000, 0,
   NULL, NULL,
   'พ.ร.บ. Toyota Commuter ปี 2022', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 10. VEHICLE MAINTENANCE (3 records)
-- ═══════════════════════════════════════════════════════════
INSERT INTO vehicle_maintenance (id, vehicle_id, maintenance_type, description, km_at_service, service_date, completed_date,
  service_center, cost, invoice_number, next_service_km, next_service_date, status, remarks, created_by, created_at)
VALUES
  ('99990001-0001-0001-0001-000000000001',
   (SELECT id FROM vehicles WHERE plate_number = 'กก-1234 กทม' LIMIT 1),
   'scheduled', 'เปลี่ยนถ่ายน้ำมันเครื่อง + ไส้กรอง + เช็คระบบเบรค', 45000, '2026-05-20', '2026-05-20',
   'Toyota Sure สาขาพระราม 9', 4500, 'TYT-260520-001',
   55000, '2026-08-20', 'completed',
   'เปลี่ยนน้ำมัน 10W-30 สังเคราะห์ เบรคปกติ',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-05-18 10:00:00+07'),

  ('99990001-0001-0001-0001-000000000002',
   (SELECT id FROM vehicles WHERE plate_number = 'ขข-5678 กทม' LIMIT 1),
   'scheduled', 'เช็คระยะ 70,000 กม. เปลี่ยนน้ำมันเครื่อง+เกียร์+กรองอากาศ', 68000, '2026-06-01', '2026-06-01',
   'Toyota Sure สาขาพระราม 9', 8900, 'TYT-260601-003',
   78000, '2026-09-01', 'completed',
   'เปลี่ยนน้ำมันเกียร์ + กรองอากาศ + หัวเทียน',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-05-28 09:00:00+07'),

  ('99990001-0001-0001-0001-000000000003',
   (SELECT id FROM vehicles WHERE plate_number = 'คค-9012 กทม' LIMIT 1),
   'repair', 'เปลี่ยนยาง 4 เส้น + ตั้งศูนย์ถ่วงล้อ', 32000, '2026-06-10', NULL,
   'ร้านยาง B-Quik สาขารัชดา', 12800, NULL,
   42000, '2027-06-10', 'scheduled',
   'ยาง Bridgestone Ecopia 185/60R15 นัดเปลี่ยน 10 มิ.ย.',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-05 11:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 11. VEHICLE ALERTS (2 alerts)
-- ═══════════════════════════════════════════════════════════
INSERT INTO vehicle_alerts (id, vehicle_id, alert_type, alert_date, message, is_read, created_at)
VALUES
  ('aaa10001-0001-0001-0001-000000000001',
   (SELECT id FROM vehicles WHERE plate_number = 'ขข-5678 กทม' LIMIT 1),
   'insurance_expiry', '2026-06-15',
   'ประกันภัย พ.ร.บ. รถตู้ ขข-5678 จะหมดอายุ 14 มี.ค. 2027 — ควรเตรียมต่ออายุล่วงหน้า',
   false, NOW()),
  ('aaa10001-0001-0001-0001-000000000002',
   (SELECT id FROM vehicles WHERE plate_number = 'คค-9012 กทม' LIMIT 1),
   'maintenance_due', '2026-06-08',
   'รถ Honda City คค-9012 ครบกำหนดเปลี่ยนยาง 4 เส้น วันที่ 10 มิ.ย. 2026 ที่ B-Quik สาขารัชดา',
   false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 12. EXPENSES (4 expense claims — June 2026)
-- ═══════════════════════════════════════════════════════════
INSERT INTO expenses (id, company_id, project_id, doc_number, doc_date, expense_type, status, description, amount, sap_account, created_by, created_at)
VALUES
  ('bbb10001-0001-0001-0001-000000000001',
   '11111111-1111-1111-1111-111111111111',
   (SELECT id FROM projects WHERE code = 'SDA-2026-001' LIMIT 1),
   'EXP26060001', '2026-06-03', 'reimbursement', 'approved',
   'ค่าที่พักภูเก็ต 2 คืน (ทีมติดตั้ง Sounder)', 8500, '522602',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-04 09:00:00+07'),

  ('bbb10001-0001-0001-0001-000000000002',
   '11111111-1111-1111-1111-111111111111',
   (SELECT id FROM projects WHERE code = 'SDA-2026-007' LIMIT 1),
   'EXP26060002', '2026-06-06', 'reimbursement', 'pending_manager',
   'ค่าน้ำมันรถ เดินทางไปชุมพร (ไป-กลับ)', 4200, '522701',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-07 10:00:00+07'),

  ('bbb10001-0001-0001-0001-000000000003',
   '11111111-1111-1111-1111-111111111111',
   NULL,
   'EXP26060003', '2026-06-10', 'reimbursement', 'draft',
   'ค่าซ่อมเครื่องปริ้นเตอร์สำนักงาน HP LaserJet', 3500, '522709',
   '2ad7260e-a703-4a04-bc04-ccd0cc456894', '2026-06-10 14:00:00+07'),

  ('bbb10001-0001-0001-0001-000000000004',
   '11111111-1111-1111-1111-111111111111',
   (SELECT id FROM projects WHERE code = 'SDA-2026-011' LIMIT 1),
   'ADV26060001', '2026-06-12', 'advance', 'pending_finance',
   'เบิกล่วงหน้าค่าเดินทาง+ที่พัก สำรวจ VTS มาบตาพุด 3 วัน', 25000, '113103',
   '75b4f523-f342-4c11-97b5-26757ccf1449', '2026-06-12 11:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 13. STEP SUBTASKS (5 subtasks for existing phase_steps)
-- ═══════════════════════════════════════════════════════════
-- Insert subtasks for phase_steps of project SDA-2026-001
DO $$
DECLARE
  step_sounder UUID;
  step_sonar UUID;
  step_gps UUID;
  step_doc UUID;
  step_uat UUID;
BEGIN
  -- Get step IDs from project SDA-2026-001
  SELECT ps.id INTO step_sounder FROM phase_steps ps
    JOIN phases ph ON ps.phase_id = ph.id
    JOIN projects p ON ph.project_id = p.id
    WHERE p.code = 'SDA-2026-001' AND ps.name LIKE '%Sounder%' LIMIT 1;

  SELECT ps.id INTO step_sonar FROM phase_steps ps
    JOIN phases ph ON ps.phase_id = ph.id
    JOIN projects p ON ph.project_id = p.id
    WHERE p.code = 'SDA-2026-001' AND ps.name LIKE '%Sonar%' LIMIT 1;

  SELECT ps.id INTO step_gps FROM phase_steps ps
    JOIN phases ph ON ps.phase_id = ph.id
    JOIN projects p ON ph.project_id = p.id
    WHERE p.code = 'SDA-2026-001' AND ps.name LIKE '%GPS%' LIMIT 1;

  SELECT ps.id INTO step_doc FROM phase_steps ps
    JOIN phases ph ON ps.phase_id = ph.id
    JOIN projects p ON ph.project_id = p.id
    WHERE p.code = 'SDA-2026-001' AND ps.name LIKE '%Documentation%' LIMIT 1;

  SELECT ps.id INTO step_uat FROM phase_steps ps
    JOIN phases ph ON ps.phase_id = ph.id
    JOIN projects p ON ph.project_id = p.id
    WHERE p.code = 'SDA-2026-001' AND ps.name LIKE '%UAT%' LIMIT 1;

  -- Subtasks for Sounder installation
  IF step_sounder IS NOT NULL THEN
    INSERT INTO step_subtasks (step_id, name, sort_order, status, due_date)
    VALUES
      (step_sounder, 'เตรียมอุปกรณ์ Transducer + สายเคเบิล', 1, 'done', '2026-04-02'),
      (step_sounder, 'ติดตั้ง Transducer ที่ท้องเรือ', 2, 'done', '2026-04-10')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Subtask for GPS calibration
  IF step_gps IS NOT NULL THEN
    INSERT INTO step_subtasks (step_id, name, sort_order, status, due_date)
    VALUES
      (step_gps, 'ตั้งค่า GPS Module + ทดสอบสัญญาณ', 1, 'active', '2026-05-10'),
      (step_gps, 'Calibrate ค่า position accuracy', 2, 'pending', '2026-05-14')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Subtask for documentation
  IF step_doc IS NOT NULL THEN
    INSERT INTO step_subtasks (step_id, name, sort_order, status, due_date)
    VALUES
      (step_doc, 'เขียนคู่มือการใช้งานระบบ (ภาษาไทย)', 1, 'pending', '2026-06-05')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- ═══════════════════════════════════════════════════════════
-- Restore FK checks
-- ═══════════════════════════════════════════════════════════
SET session_replication_role = 'DEFAULT';

-- Done! Verify counts:
-- SELECT 'technicians' AS tbl, count(*) FROM technicians
-- UNION ALL SELECT 'bookings', count(*) FROM bookings
-- UNION ALL SELECT 'petty_cash_funds', count(*) FROM petty_cash_funds
-- UNION ALL SELECT 'petty_cash_disbursements', count(*) FROM petty_cash_disbursements
-- UNION ALL SELECT 'quotations', count(*) FROM quotations
-- UNION ALL SELECT 'quotation_items', count(*) FROM quotation_items
-- UNION ALL SELECT 'phase_payments', count(*) FROM phase_payments
-- UNION ALL SELECT 'job_orders', count(*) FROM job_orders
-- UNION ALL SELECT 'warehouse_stock', count(*) FROM warehouse_stock
-- UNION ALL SELECT 'vehicle_insurance', count(*) FROM vehicle_insurance
-- UNION ALL SELECT 'vehicle_maintenance', count(*) FROM vehicle_maintenance
-- UNION ALL SELECT 'vehicle_alerts', count(*) FROM vehicle_alerts
-- UNION ALL SELECT 'expenses', count(*) FROM expenses
-- UNION ALL SELECT 'step_subtasks', count(*) FROM step_subtasks;
