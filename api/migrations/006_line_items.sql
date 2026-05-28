-- ═══════════════════════════════════════════════════════════
-- Add Line Items for all PRs and POs
-- ═══════════════════════════════════════════════════════════

-- ── PR Line Items ──
DO $$
DECLARE pid UUID;
BEGIN

-- PR26050005 — Gyro Compass (฿120,000) → SDA-2026-001
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050005';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'GR-0001','Gyro Compass Marine Grade',1,'EA',112149.53,120000,'114101','IG07');

-- PR26050008 — Sonar Module (฿62,000) → SDA-2026-002
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050008';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'SN-0001','Sonar Module 50/200kHz',1,'Set',57943.93,62000,'114101','IG07');

-- PR26050009 — Calibration Tools (฿35,500) → SDA-2026-001
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050009';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'EX-0001','Calibration Tool Set',1,'Set',22000,22000,'511120','IG07'),
(pid,2,'OT-0001','Connector Kit Waterproof',5,'EA',2700,13500,'511120','IG07');

-- PR26050010 — Waterproof Case (฿7,800) → SDA-2026-004
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050010';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'OT-0003','Waterproof Case IP67',5,'EA',1560,7800,'511120','IG07');

-- PR26050012 — Sounder Transducer (฿85,000) → SDA-2026-001
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050012';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'SD-0015','Sounder Transducer 200kHz Marine Grade',1,'EA',79439.25,85000,'114101','IG07');

-- PR26050013 — Marine Antenna (฿45,000) → SDA-2026-002
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050013';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'OT-0010','Marine VHF Antenna',2,'EA',21028.04,45000,'114101','IG07');

-- PR26050014 — Wave Radar System (฿180,000) → SDA-2026-003
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050014';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'WR-0001','Wave Radar 4kW Open Array',1,'Set',140186.92,150000,'114101','IG07'),
(pid,2,'OT-0005','Network Cable Cat6 Shielded',100,'EA',280.37,30000,'511120','IG07');

-- PR26050015 — GPS Module (฿25,000) → SDA-2026-004
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050015';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'GP-0001','GPS Navigator Module',2,'EA',11682.24,25000,'114101','IG07');

-- PR26050016 — Network Cable (฿8,500) → SDA-2026-001
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050016';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'OT-0005','Network Cable Cat6 50m',50,'EA',158.88,8500,'511120','IG07');

-- PR26050017 — Office Supplies (฿3,200)
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050017';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'EX-0010','กระดาษ A4 80g',10,'EA',120,1200,'522709','IG00'),
(pid,2,'EX-0011','หมึกพิมพ์ HP 680',2,'EA',450,900,'522709','IG00'),
(pid,3,'EX-0012','เครื่องเขียนชุด',1,'Set',1100,1100,'522709','IG00');

-- PR26040018 — AIS Transponder (฿350,000) → SDA-2026-006
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26040018';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'OT-0020','AIS Transponder Class A',3,'EA',93457.94,300000,'114101','IG07'),
(pid,2,'OT-0021','AIS Antenna + Cable Kit',3,'Set',15420.56,50000,'114101','IG07');

-- PR26030010 — CCTV Camera (฿920,000) → SDA-2026-008
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26030010';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'CP-0010','CCTV IP Camera 4MP',24,'EA',28037.38,720000,'114101','IG07'),
(pid,2,'CP-0011','NVR 32ch Server',2,'Set',46728.97,100000,'114101','IG07'),
(pid,3,'CP-0012','Network Switch PoE 24port',4,'EA',23364.49,100000,'114101','IG07');

-- PR26040020 — NVR Software (฿380,000) → SDA-2026-008
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26040020';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'CP-0015','VMS Software License (64ch)',1,'Set',280373.83,300000,'114101','IG07'),
(pid,2,'CP-0016','Monitor 55" Display',4,'EA',18691.59,80000,'114101','IG07');

-- PR26050019 — Weather Station (฿450,000) → SDA-2026-007
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050019';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'OT-0030','Weather Station Unit',5,'Set',74766.36,400000,'114101','IG07'),
(pid,2,'OT-0031','Data Logger + Modem',5,'Set',9345.79,50000,'114101','IG07');

-- PR26050020 — VTS Radar (฿1,200,000) → SDA-2026-011
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050020';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'WR-0010','VTS Radar 25kW',3,'Set',280373.83,900000,'114101','IG07'),
(pid,2,'OT-0040','AIS Base Station',3,'Set',93457.94,300000,'114101','IG07');

-- PR26050021 — VTS Server (฿850,000) → SDA-2026-011
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050021';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'CP-0020','VTS Server Rack',2,'Set',280373.83,600000,'114101','IG07'),
(pid,2,'CP-0021','VTS Software License',1,'Set',233644.86,250000,'114101','IG07');

-- PR26050022 — AIS Cable (฿60,000) → SDA-2026-006
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050022';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'OT-0022','AIS Coaxial Cable 50m',10,'EA',5607.48,60000,'114101','IG07');

-- PR26050023 — Sonar parts (฿28,000) → SDA-2026-002
SELECT id INTO pid FROM purchase_requests WHERE doc_number='PR26050023';
INSERT INTO pr_lines (pr_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code) VALUES
(pid,1,'SN-0005','Sonar Transducer Replacement',1,'EA',22429.91,24000,'114101','IG07'),
(pid,2,'OT-0001','Connector Kit',2,'EA',1869.16,4000,'511120','IG07');

END $$;

-- ── PO Line Items ──
DO $$
DECLARE pid UUID;
BEGIN

-- PO26050001 — Gyro Compass (฿120,000)
SELECT id INTO pid FROM purchase_orders WHERE doc_number='PO26050001';
INSERT INTO po_lines (po_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code,received_qty) VALUES
(pid,1,'GR-0001','Gyro Compass Marine Grade',1,'EA',112149.53,120000,'114101','IG07',1);

-- PO26030005 — CCTV (฿920,000)
SELECT id INTO pid FROM purchase_orders WHERE doc_number='PO26030005';
INSERT INTO po_lines (po_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code,received_qty) VALUES
(pid,1,'CP-0010','CCTV IP Camera 4MP',24,'EA',28037.38,720000,'114101','IG07',24),
(pid,2,'CP-0011','NVR 32ch Server',2,'Set',46728.97,100000,'114101','IG07',2),
(pid,3,'CP-0012','Network Switch PoE 24port',4,'EA',23364.49,100000,'114101','IG07',4);

-- PO26040012 — NVR Software (฿380,000)
SELECT id INTO pid FROM purchase_orders WHERE doc_number='PO26040012';
INSERT INTO po_lines (po_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code,received_qty) VALUES
(pid,1,'CP-0015','VMS Software License (64ch)',1,'Set',280373.83,300000,'114101','IG07',1),
(pid,2,'CP-0016','Monitor 55" Display',4,'EA',18691.59,80000,'114101','IG07',4);

-- PO26040015 — AIS (฿350,000)
SELECT id INTO pid FROM purchase_orders WHERE doc_number='PO26040015';
INSERT INTO po_lines (po_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code,received_qty) VALUES
(pid,1,'OT-0020','AIS Transponder Class A',3,'EA',93457.94,300000,'114101','IG07',2),
(pid,2,'OT-0021','AIS Antenna + Cable Kit',3,'Set',15420.56,50000,'114101','IG07',2);

-- PO26050003 — Sonar (฿62,000)
SELECT id INTO pid FROM purchase_orders WHERE doc_number='PO26050003';
INSERT INTO po_lines (po_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code,received_qty) VALUES
(pid,1,'SN-0001','Sonar Module 50/200kHz',1,'Set',57943.93,62000,'114101','IG07',0);

-- PO26050004 — Calibration Tools (฿35,500)
SELECT id INTO pid FROM purchase_orders WHERE doc_number='PO26050004';
INSERT INTO po_lines (po_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code,received_qty) VALUES
(pid,1,'EX-0001','Calibration Tool Set',1,'Set',22000,22000,'511120','IG07',0),
(pid,2,'OT-0001','Connector Kit Waterproof',5,'EA',2700,13500,'511120','IG07',0);

-- PO26050005 — Weather Station (฿450,000)
SELECT id INTO pid FROM purchase_orders WHERE doc_number='PO26050005';
INSERT INTO po_lines (po_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code,received_qty) VALUES
(pid,1,'OT-0030','Weather Station Unit',5,'Set',74766.36,400000,'114101','IG07',0),
(pid,2,'OT-0031','Data Logger + Modem',5,'Set',9345.79,50000,'114101','IG07',0);

-- PO26050006 — VTS Radar (฿1,200,000)
SELECT id INTO pid FROM purchase_orders WHERE doc_number='PO26050006';
INSERT INTO po_lines (po_id,line_num,item_code,item_name,quantity,uom,unit_price,total_price,sap_account,tax_code,received_qty) VALUES
(pid,1,'WR-0010','VTS Radar 25kW',3,'Set',280373.83,900000,'114101','IG07',0),
(pid,2,'OT-0040','AIS Base Station',3,'Set',93457.94,300000,'114101','IG07',0);

END $$;
