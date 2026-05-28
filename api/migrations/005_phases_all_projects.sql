-- ═══════════════════════════════════════════════════════════
-- Add Phases & Steps for all active projects
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID; p7 UUID; p8 UUID; p9 UUID; p10 UUID; p11 UUID; p12 UUID;
  jathuthep UUID; winit UUID; phuchong UUID; norawat UUID; sirikwan UUID; noppamas UUID; pimradaporn UUID; mayurachat UUID; teera UUID;
  ph UUID;
BEGIN
  SELECT id INTO jathuthep FROM users WHERE email='jathuthep@sda-group.com';
  SELECT id INTO winit FROM users WHERE email='winit@sda-group.com';
  SELECT id INTO phuchong FROM users WHERE email='phuchong@sda-group.com';
  SELECT id INTO norawat FROM users WHERE email='norawat@sda-group.com';
  SELECT id INTO sirikwan FROM users WHERE email='sirikwan@sda-group.com';
  SELECT id INTO noppamas FROM users WHERE email='noppamas@sda-group.com';
  SELECT id INTO pimradaporn FROM users WHERE email='pimradaporn@sda-group.com';
  SELECT id INTO mayurachat FROM users WHERE email='mayurachat@sda-group.com';
  SELECT id INTO teera FROM users WHERE email='teera@sda-group.com';

  SELECT id INTO p2 FROM projects WHERE code='SDA-2026-002';
  SELECT id INTO p3 FROM projects WHERE code='SDA-2026-003';
  SELECT id INTO p4 FROM projects WHERE code='SDA-2026-004';
  SELECT id INTO p5 FROM projects WHERE code='SDA-2026-005';
  SELECT id INTO p6 FROM projects WHERE code='SDA-2026-006';
  SELECT id INTO p7 FROM projects WHERE code='SDA-2026-007';
  SELECT id INTO p8 FROM projects WHERE code='SDA-2026-008';
  SELECT id INTO p9 FROM projects WHERE code='SDA-2026-009';
  SELECT id INTO p10 FROM projects WHERE code='SDA-2026-010';
  SELECT id INTO p11 FROM projects WHERE code='SDA-2026-011';
  SELECT id INTO p12 FROM projects WHERE code='SDA-2026-012';

  -- ═══ SDA-2026-002 Sonar Rayong (50%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p2,'Survey & Design',1,'completed','2026-02-01','2026-02-28',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'สำรวจพื้นที่ติดตั้ง Sonar ระยอง',1,'done',winit,'2026-02-01','2026-02-10'),
  (ph,'ออกแบบ layout + spec',2,'done',winit,'2026-02-11','2026-02-20'),
  (ph,'ลูกค้า approve design',3,'done',winit,'2026-02-28','2026-02-28');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p2,'Procurement',2,'completed','2026-03-01','2026-03-31',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'สร้าง PR สั่งซื้อ Sonar Module',1,'done',pimradaporn,'2026-03-01','2026-03-05'),
  (ph,'PO อนุมัติ + ส่ง SAP',2,'done',mayurachat,'2026-03-10','2026-03-10'),
  (ph,'รับของ + ตรวจสอบคุณภาพ',3,'done',winit,'2026-03-28','2026-03-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p2,'Installation',3,'active','2026-04-01','2026-06-30',40) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ติดตั้ง Sonar transducer ใต้น้ำ',1,'done',phuchong,'2026-04-01','2026-04-15'),
  (ph,'เดินสาย cable + display unit',2,'in_progress',sirikwan,'2026-04-16','2026-05-15'),
  (ph,'สอบเทียบค่า depth reading',3,'pending',winit,'2026-05-16','2026-05-31'),
  (ph,'ทดสอบระบบรวม',4,'pending',winit,'2026-06-01','2026-06-15');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p2,'Testing & Handover',4,'upcoming','2026-06-16','2026-07-31',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'UAT กับลูกค้า',1,'pending',winit,'2026-06-16','2026-06-30'),
  (ph,'จัดทำเอกสาร + คู่มือ',2,'pending',noppamas,'2026-07-01','2026-07-15'),
  (ph,'ส่งมอบ + เริ่มรับประกัน',3,'pending',winit,'2026-07-31','2026-07-31');

  -- ═══ SDA-2026-003 Radar Bangkok (20%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p3,'Assessment & Planning',1,'completed','2026-03-01','2026-03-31',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ตรวจสอบระบบ Radar เดิม',1,'done',phuchong,'2026-03-01','2026-03-10'),
  (ph,'วางแผน upgrade + เสนอราคา',2,'done',phuchong,'2026-03-11','2026-03-25'),
  (ph,'อนุมัติแผนงาน',3,'done',phuchong,'2026-03-31','2026-03-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p3,'Procurement & Removal',2,'active','2026-04-01','2026-06-30',15) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'สั่งซื้อ Wave Radar ใหม่',1,'done',pimradaporn,'2026-04-01','2026-04-15'),
  (ph,'ถอดระบบ Radar เก่า',2,'pending',sirikwan,'2026-05-01','2026-05-15'),
  (ph,'เตรียมโครงสร้างรองรับตัวใหม่',3,'pending',phuchong,'2026-05-16','2026-06-15');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p3,'Installation & Commissioning',3,'upcoming','2026-07-01','2026-08-31',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ติดตั้ง Wave Radar ใหม่',1,'pending',phuchong,'2026-07-01','2026-07-20'),
  (ph,'ทดสอบ + Commissioning',2,'pending',phuchong,'2026-07-21','2026-08-15'),
  (ph,'ส่งมอบ',3,'pending',phuchong,'2026-08-31','2026-08-31');

  -- ═══ SDA-2026-004 GPS Samut Prakan (95%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p4,'Design & Procurement',1,'completed','2026-01-01','2026-02-15',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ออกแบบระบบ GPS Fleet',1,'done',jathuthep,'2026-01-01','2026-01-15'),
  (ph,'จัดซื้อ GPS Module',2,'done',pimradaporn,'2026-01-16','2026-02-15');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p4,'Installation',2,'completed','2026-02-16','2026-04-15',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ติดตั้ง GPS บนรถ 15 คัน',1,'done',noppamas,'2026-02-16','2026-03-31'),
  (ph,'ตั้งค่า Server + Software',2,'done',teera,'2026-04-01','2026-04-15');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p4,'Testing & Go-live',3,'active','2026-04-16','2026-05-31',80) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ทดสอบ Tracking ครบ 15 คัน',1,'done',jathuthep,'2026-04-16','2026-04-30'),
  (ph,'อบรมผู้ใช้งาน',2,'done',noppamas,'2026-05-01','2026-05-10'),
  (ph,'Go-live + Monitor',3,'active',jathuthep,'2026-05-11','2026-05-31');

  -- ═══ SDA-2026-005 Satcom Chonburi (65%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p5,'Requirement & Design',1,'completed','2026-02-15','2026-03-31',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'Survey สถานที่ + ความต้องการ',1,'done',winit,'2026-02-15','2026-03-01'),
  (ph,'ออกแบบ Satcom system',2,'done',winit,'2026-03-02','2026-03-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p5,'Procurement',2,'completed','2026-04-01','2026-04-30',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'สั่งซื้อ Satcom Terminal',1,'done',mayurachat,'2026-04-01','2026-04-15'),
  (ph,'รับของ + ตรวจสอบ',2,'done',winit,'2026-04-20','2026-04-30');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p5,'Installation',3,'active','2026-05-01','2026-07-31',30) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ติดตั้งจานดาวเทียม + สายอากาศ',1,'in_progress',jathuthep,'2026-05-01','2026-05-31'),
  (ph,'เชื่อมต่อ indoor unit',2,'pending',sirikwan,'2026-06-01','2026-06-30'),
  (ph,'ทดสอบสัญญาณ',3,'pending',winit,'2026-07-01','2026-07-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p5,'Commissioning & Handover',4,'upcoming','2026-08-01','2026-09-30',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'Commissioning + ทดสอบจริง',1,'pending',winit,'2026-08-01','2026-08-31'),
  (ph,'อบรม + ส่งมอบ',2,'pending',winit,'2026-09-01','2026-09-30');

  -- ═══ SDA-2026-006 AIS Surat Thani (40%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p6,'Survey & Design',1,'completed','2026-03-01','2026-03-31',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'สำรวจจุดติดตั้ง 3 จุด',1,'done',phuchong,'2026-03-01','2026-03-15'),
  (ph,'ออกแบบ AIS network',2,'done',phuchong,'2026-03-16','2026-03-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p6,'Installation',2,'active','2026-04-01','2026-07-31',40) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ติดตั้ง AIS จุดที่ 1',1,'done',sirikwan,'2026-04-01','2026-04-15'),
  (ph,'ติดตั้ง AIS จุดที่ 2',2,'in_progress',sirikwan,'2026-04-20','2026-05-15'),
  (ph,'ติดตั้ง AIS จุดที่ 3',3,'pending',noppamas,'2026-05-20','2026-06-15'),
  (ph,'ทดสอบสัญญาณครบ 3 จุด',4,'pending',phuchong,'2026-06-20','2026-07-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p6,'Testing & Handover',3,'upcoming','2026-08-01','2026-08-30',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ทดสอบ AIS ระบบรวม',1,'pending',phuchong,'2026-08-01','2026-08-15'),
  (ph,'ส่งมอบ + รับประกัน',2,'pending',phuchong,'2026-08-16','2026-08-30');

  -- ═══ SDA-2026-007 Weather Station Chumphon (25%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p7,'Planning & Procurement',1,'active','2026-04-01','2026-06-30',50) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'สำรวจจุดติดตั้ง 5 สถานี',1,'done',winit,'2026-04-01','2026-04-20'),
  (ph,'สั่งซื้ออุปกรณ์ Weather Station',2,'in_progress',pimradaporn,'2026-04-25','2026-05-31'),
  (ph,'เตรียมเสา + โครงสร้าง',3,'pending',noppamas,'2026-06-01','2026-06-30');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p7,'Installation 5 Sites',2,'upcoming','2026-07-01','2026-09-30',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ติดตั้งสถานีที่ 1-2',1,'pending',winit,'2026-07-01','2026-07-31'),
  (ph,'ติดตั้งสถานีที่ 3-4',2,'pending',phuchong,'2026-08-01','2026-08-31'),
  (ph,'ติดตั้งสถานีที่ 5 + เชื่อม network',3,'pending',winit,'2026-09-01','2026-09-30');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p7,'Commissioning',3,'upcoming','2026-10-01','2026-10-31',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ทดสอบ 5 สถานี + data center',1,'pending',teera,'2026-10-01','2026-10-20'),
  (ph,'ส่งมอบ',2,'pending',winit,'2026-10-21','2026-10-31');

  -- ═══ SDA-2026-008 CCTV Laem Chabang (80%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p8,'Design & Procurement',1,'completed','2026-02-15','2026-03-15',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ออกแบบ layout กล้อง 24 จุด',1,'done',jathuthep,'2026-02-15','2026-02-28'),
  (ph,'สั่งซื้อกล้อง + NVR + อุปกรณ์',2,'done',mayurachat,'2026-03-01','2026-03-15');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p8,'Installation',2,'active','2026-03-16','2026-05-31',75) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ติดตั้ง Zone A (8 กล้อง)',1,'done',jathuthep,'2026-03-16','2026-04-05'),
  (ph,'ติดตั้ง Zone B (8 กล้อง)',2,'done',winit,'2026-04-06','2026-04-25'),
  (ph,'ติดตั้ง Zone C (8 กล้อง)',3,'done',sirikwan,'2026-04-26','2026-05-10'),
  (ph,'ตั้งค่า NVR + Software',4,'in_progress',teera,'2026-05-11','2026-05-25'),
  (ph,'ทดสอบ Live + Playback',5,'pending',teera,'2026-05-26','2026-05-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p8,'Training & Handover',3,'upcoming','2026-06-01','2026-07-31',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'อบรมเจ้าหน้าที่ท่าเรือ',1,'pending',jathuthep,'2026-06-01','2026-06-15'),
  (ph,'ส่งมอบ + รับประกัน 1 ปี',2,'pending',jathuthep,'2026-06-16','2026-07-31');

  -- ═══ SDA-2026-009 Radio Navy (Planning — 0%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p9,'Requirement Analysis',1,'upcoming','2026-06-01','2026-07-31',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ประชุม requirement กับกองทัพเรือ',1,'pending',norawat,'2026-06-01','2026-06-15'),
  (ph,'สำรวจระบบเดิม + ออกแบบใหม่',2,'pending',jathuthep,'2026-06-16','2026-07-15'),
  (ph,'นำเสนอ proposal',3,'pending',norawat,'2026-07-16','2026-07-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p9,'Procurement & Installation',2,'upcoming','2026-08-01','2026-11-30',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'จัดซื้ออุปกรณ์สื่อสาร',1,'pending',pimradaporn,'2026-08-01','2026-09-30'),
  (ph,'ติดตั้ง + commissioning',2,'pending',phuchong,'2026-10-01','2026-11-30');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p9,'Handover',3,'upcoming','2026-12-01','2026-12-31',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ทดสอบ + ส่งมอบ',1,'pending',norawat,'2026-12-01','2026-12-31');

  -- ═══ SDA-2026-011 VTS Map Ta Phut (20%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p11,'Site Survey & Design',1,'active','2026-03-15','2026-05-31',60) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'Survey สถานที่ติดตั้ง Radar 3 จุด',1,'done',phuchong,'2026-03-15','2026-04-15'),
  (ph,'ออกแบบ Network topology',2,'in_progress',teera,'2026-04-16','2026-05-15'),
  (ph,'นำเสนอ design ให้ลูกค้า',3,'pending',phuchong,'2026-05-16','2026-05-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p11,'Procurement',2,'active','2026-04-15','2026-07-31',20) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'สั่งซื้ออุปกรณ์ Radar + AIS',1,'in_progress',pimradaporn,'2026-04-15','2026-06-30'),
  (ph,'สั่งซื้อ Server + Software',2,'pending',mayurachat,'2026-05-01','2026-07-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p11,'Installation & Integration',3,'upcoming','2026-08-01','2026-10-31',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ติดตั้ง Radar 3 จุด',1,'pending',phuchong,'2026-08-01','2026-09-15'),
  (ph,'ติดตั้ง VTS Server',2,'pending',teera,'2026-09-16','2026-10-15'),
  (ph,'Integration + Testing',3,'pending',winit,'2026-10-16','2026-10-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p11,'Commissioning & Handover',4,'upcoming','2026-11-01','2026-11-30',0) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'Commissioning',1,'pending',phuchong,'2026-11-01','2026-11-15'),
  (ph,'อบรม + ส่งมอบ',2,'pending',phuchong,'2026-11-16','2026-11-30');

  -- ═══ SDA-2026-012 Gyro Ferry (Completed 100%) ═══
  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p12,'Assessment',1,'completed','2025-10-01','2025-10-31',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'ตรวจสอบ Gyro เก่า 3 ลำ',1,'done',jathuthep,'2025-10-01','2025-10-15'),
  (ph,'เสนอราคาเปลี่ยน Gyro',2,'done',jathuthep,'2025-10-16','2025-10-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p12,'Replacement',2,'completed','2025-11-01','2026-01-31',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'เปลี่ยน Gyro ลำที่ 1',1,'done',phuchong,'2025-11-01','2025-11-30'),
  (ph,'เปลี่ยน Gyro ลำที่ 2',2,'done',phuchong,'2025-12-01','2025-12-31'),
  (ph,'เปลี่ยน Gyro ลำที่ 3',3,'done',phuchong,'2026-01-01','2026-01-31');

  INSERT INTO phases (id,project_id,name,sort_order,status,start_date,end_date,progress) VALUES
  (gen_random_uuid(),p12,'Testing & Handover',3,'completed','2026-02-01','2026-02-28',100) RETURNING id INTO ph;
  INSERT INTO phase_steps (phase_id,name,sort_order,status,assigned_to,start_date,end_date) VALUES
  (ph,'Sea trial ทดสอบ 3 ลำ',1,'done',jathuthep,'2026-02-01','2026-02-15'),
  (ph,'ส่งมอบ + รับประกัน',2,'done',jathuthep,'2026-02-16','2026-02-28');

END $$;
