25451# Statement of Work (SOW)

# Company Operation v2.0 — SaaS Operation Management Platform

---

## 1. หน้าปก (Cover Page)

| | |
|---|---|
| **เอกสาร** | Statement of Work (SOW) |
| **เลขที่** | {{เลขที่ SOW เช่น CO-SOW-2026-001}} |
| **โครงการ** | Company Operation v2.0 — SaaS Multi-tenant Operation Management Platform |
| **ประเภทโครงการ** | พัฒนาระบบ SaaS Web Application (ไม่ใช่ ERP Implementation) |
| **ผู้ให้บริการ** | {{ชื่อบริษัทผู้พัฒนา}} |
| **ลูกค้า** | {{ชื่อบริษัทลูกค้า}} |
| **จัดทำโดย** | {{ชื่อผู้จัดทำ}} |
| **วันที่** | {{วันที่ออกเอกสาร}} |
| **เวอร์ชัน** | v2.0 |
| **สถานะ** | {{Draft / Under Review / Approved}} |

---

## 2. Document Control

### 2.1 Revision History

| เวอร์ชัน | วันที่ | ผู้แก้ไข | รายละเอียดการเปลี่ยนแปลง |
|---|---|---|---|
| v1.0 | {{วันที่}} | {{ชื่อ}} | ฉบับแรก |
| v2.0 | {{วันที่}} | {{ชื่อ}} | อัปเดต 37 modules ครบ, เพิ่ม Booking/Job Order/Technician/Subscription, เพิ่ม SLA section, เพิ่ม Appendix D |

### 2.2 Distribution List

| ชื่อ | บทบาท | องค์กร |
|---|---|---|
| {{ชื่อ}} | {{ตำแหน่ง}} | {{ผู้ให้บริการ}} |
| {{ชื่อ}} | {{ตำแหน่ง}} | {{ลูกค้า}} |
| {{ชื่อ}} | {{ตำแหน่ง}} | {{ลูกค้า}} |

---

## 3. บทสรุปผู้บริหาร (Executive Summary)

Company Operation v2.0 เป็น SaaS Multi-tenant Operation Management Platform ที่พัฒนาขึ้นเองบน Modern Web Stack (Express.js + PostgreSQL + Static Frontend) เพื่อรวมศูนย์การบริหารงานปฏิบัติการขององค์กรไว้ในแพลตฟอร์มเดียว ครอบคลุมตั้งแต่การบริหารโครงการ (Project & Task Management), กระบวนการจัดซื้อ (Procurement), การเงินและบัญชี (Financial), ทรัพยากรบุคคล (HR & Admin), ไปจนถึงการจองทรัพยากร (Resource Booking) และเชื่อมต่อระบบ SAP Business One ผ่าน Service Layer API

ระบบรองรับ Multi-company ด้วยการแยกข้อมูลระดับ company_id พร้อมระบบ Subscription 3 ระดับ (Starter / Professional / Enterprise) และ Trial 14 วัน ทำให้สามารถให้บริการลูกค้าหลายองค์กรบนโครงสร้างเดียวกันได้อย่างปลอดภัย ระบบมี Role-Based Access Control (RBAC) 4 ระดับ, Approval Workflow แบบ Configurable หลายขั้นตอน, Real-time Notification ผ่าน WebSocket รวมถึงมาตรการ Security ตามมาตรฐาน (Helmet.js, Rate Limiting, CSP, JWT Authentication)

SOW ฉบับนี้กำหนดขอบเขต สิ่งส่งมอบ แผนดำเนินงาน และเงื่อนไขสำหรับการพัฒนา ทดสอบ และ Deploy ระบบทั้ง 37 modules จัดเป็น 10 กลุ่มการทำงาน โดยเป็นโครงการพัฒนาซอฟต์แวร์ (Custom SaaS Development) ไม่ใช่การ Implement ระบบ ERP สำเร็จรูป

---

## 4. วัตถุประสงค์โครงการ (Project Objectives)

| # | วัตถุประสงค์ | ตัวชี้วัด (KPI) |
|---|---|---|
| 1 | พัฒนา SaaS Multi-tenant Platform ที่รองรับหลายบริษัทบนโครงสร้างเดียว โดยแยกข้อมูลอย่างปลอดภัยด้วย company_id isolation | รองรับ {{จำนวน}} tenant พร้อมกัน, ไม่มี data leak ระหว่าง tenant |
| 2 | ส่งมอบ 37 Functional Modules ครบทั้ง 10 กลุ่มการทำงาน ตั้งแต่ Dashboard จนถึง SAP Integration | ผ่าน UAT ครบทุก module, defect rate < {{จำนวน}}% |
| 3 | สร้าง Configurable Approval Workflow ที่รองรับ 7 กระบวนการอนุมัติหลัก (PR, Expense, Budget, OT, Travel, Booking, Job Order) | Workflow ทำงานถูกต้องตาม state diagram ทุกเส้นทาง |
| 4 | สร้างระบบ Subscription Management พร้อม Trial 14 วัน และ Module Management ที่เปิด-ปิดตาม Plan ได้ | Self-registration จนถึง active subscription < {{จำนวน}} นาที |
| 5 | สร้างระบบ Booking แบบ Google Calendar style รองรับ 3 ประเภท (Vehicle/Technician/Flight) พร้อม Availability Check และ Drag-to-Copy | จองทรัพยากรสำเร็จภายใน {{จำนวน}} clicks, ไม่มี double booking |
| 6 | เชื่อมต่อ SAP Business One ผ่าน Service Layer API สำหรับ push PR/PO/Expense และ sync Master Data | sync สำเร็จ > {{จำนวน}}% ของ transactions, latency < {{จำนวน}} วินาที |
| 7 | ผ่านมาตรฐาน Security (Helmet.js, Rate Limiting, CSP, JWT, CORS) และ Performance ตาม SLA ที่กำหนด | Zero critical vulnerability ใน Security Audit, Uptime > {{จำนวน}}% |

---

## 5. ขอบเขตงาน (Scope of Work)

### 5.1 ขอบเขตที่รวมในโครงการ (In-Scope) -- 37 Modules, 10 กลุ่ม

#### กลุ่ม 1 -- Dashboard & Overview (2 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 1 | Dashboard | KPI cards, สถิติ, กราฟ, Pending Convert Alert (Booking to Sales Quotation) |
| 2 | Overview | ภาพรวมโครงการรายตัว, progress tracking |

#### กลุ่ม 2 -- Project & Task Management (5 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 3 | Project Management | CRUD, manual project code, status (planning / active / on_hold / completed / cancelled), กำหนด PM |
| 4 | Phases | Phase management (upcoming / active / completed), Sub-steps |
| 5 | Task Board | Kanban (todo / in_progress / review / done), priority (low / medium / high / urgent), assign, เวลา/สถานที่/ชั่วโมง |
| 6 | My Tasks | งานของตัวเอง, Gantt-like view, filter sprint/สัปดาห์ |
| 7 | Job Orders | Auto JO number (JO-YYYYMM-XXX), site, GPS location, job_type, needs_vehicle/technician/flight, JO to Task auto-creation, เชื่อม Booking |

#### กลุ่ม 3 -- Procurement & Supply Chain (4 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 8 | PR (Purchase Request) | ใบขอซื้อ, Line Items, อนุมัติหลายระดับ (draft / pending_manager / pending_finance / pending_executive / approved / sent_to_sap / received / rejected / cancelled) |
| 9 | PO (Purchase Order) | ออก PO จาก PR, Line Items |
| 10 | GRPO (Goods Receipt PO) | รับสินค้าตาม PO, Document Chain (PR to PO to GRPO to AP Invoice), line-level receiving |
| 11 | Quotation | ใบเสนอราคา, รายการสินค้า/บริการ |

#### กลุ่ม 4 -- Financial & Accounting (5 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 12 | Budget Management | Budget vs Actual, advanced tracking (draft / pending_manager / pending_executive / approved / rejected) |
| 13 | Expense | Reimbursement, Advance, Advance Clearing (draft / pending_manager / pending_finance / pending_executive / approved / paid / sent_to_sap / rejected / cancelled) |
| 14 | Petty Cash | เปิด-ปิดกองทุน, บันทึกรายจ่าย, เติมเงิน |
| 15 | Advance | เบิก / ใช้ / หักล้าง / คืน (full loop) |
| 16 | Journal Entries | บันทึกบัญชี, Bank Transaction, GL Posting |

#### กลุ่ม 5 -- HR & Admin (3 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 17 | OT Management | normal / holiday / special, คำนวณค่า OT (draft / pending_manager / pending_executive / approved / paid / rejected) |
| 18 | Travel | ขออนุมัติเดินทาง, ค่าใช้จ่ายเดินทาง (draft / pending_manager / pending_executive / approved / rejected) |
| 19 | Technicians | ทะเบียนช่าง, specialization (install / repair / maintenance), skill_level (junior / mid / senior / lead), certification, daily_rate, soft delete |

#### กลุ่ม 6 -- Resource & Booking (3 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 20 | Vehicle Management | ทะเบียนรถ, สถานะรถ |
| 21 | Vehicle-Project (Booking Board) | Kanban 4 สถานะ, สถิติการจอง |
| 22 | Booking (Google Calendar style) | 3 ประเภท: Vehicle / Technician / Flight, Calendar view (day / week / month), Sidebar filter, Availability check, เชื่อม Job Order & Project, Drag-to-Copy, Booking to Sales Quotation (pending / approved / checked_out / checked_in / rejected / cancelled) |

#### กลุ่ม 7 -- Master Data (3 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 23 | BP Master | คู่ค้า Vendor / Customer, เงื่อนไขการค้า |
| 24 | Item Master | สินค้า/บริการ, หมวดหมู่, หน่วยนับ |
| 25 | Pricing | Price List |

#### กลุ่ม 8 -- System & Administration (7 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 26 | User & Permission | RBAC (executive / admin / manager / user), Login, Self-Register, Change/Reset Password |
| 27 | Approval Workflow | Configurable ตาม module (manager / finance / executive) |
| 28 | Number Series | Running number, prefix/format ตาม document type |
| 29 | Module Management | เปิด/ปิด module ตาม plan, core module ปิดไม่ได้ |
| 30 | Notification | In-app, email, Discord webhook |
| 31 | Settings/Setup | Company Profile, ค่า default |
| 32 | Subscription & Plans | Starter / Professional / Enterprise, Trial 14 วัน |

#### กลุ่ม 9 -- Reports & Support (4 modules)

| # | Module | รายละเอียด |
|---|---|---|
| 33 | Reports | รายงานมาตรฐาน up to {{จำนวน}} รายงาน ตามรายชื่อที่กำหนดใน Requirement Document (P1), Export Excel |
| 34 | SOW Template/Generator | สร้าง SOW อัตโนมัติ (step wizard) |
| 35 | Changelog | Version history |
| 36 | Help | คู่มือ, FAQ |

#### กลุ่ม 10 -- Integration (1 module)

| # | Module | รายละเอียด |
|---|---|---|
| 37 | SAP B1 Integration | Push PR/PO/Expense to SAP, sync Master Data ผ่าน Service Layer API |

### 5.2 ขอบเขตที่ไม่รวมในโครงการ (Out of Scope)

1. Mobile Native Application (iOS / Android) -- ระบบเป็น Responsive Web เท่านั้น
2. การ Implement หรือ Configure ระบบ ERP อื่น (NetSuite, Dynamics, Odoo)
3. On-premise Deployment -- ระบบ Deploy บน Railway (Cloud) เท่านั้น
4. การพัฒนา Custom Report นอกเหนือจากรายงานมาตรฐาน {{จำนวน}} รายงานที่ระบุ
5. การ Migrate ข้อมูลจากระบบเดิมของลูกค้า (Data Migration)
6. Hardware, Server, SSL Certificate -- รวมอยู่ใน Railway hosting
7. การฝึกอบรมแบบ Onsite (Classroom Training) -- ให้บริการ Online เท่านั้น
8. การพัฒนา API สำหรับ Third-party Integration นอกจาก SAP B1 Service Layer ที่ระบุ
9. Load Testing เกินกว่า {{จำนวน}} concurrent users
10. การดูแลและบำรุงรักษาระบบหลังสิ้นสุด SLA period

---

## 6. สถาปัตยกรรมระบบ (Technical Architecture)

### 6.1 Tech Stack

| Layer | เทคโนโลยี | รายละเอียด |
|---|---|---|
| Backend | Express.js (Node.js) | REST API, JWT Authentication, WebSocket |
| Frontend | Static HTML / CSS / JavaScript | Vanilla JS, ไม่ใช้ Framework (lightweight) |
| Database | PostgreSQL | Multi-tenant isolation by company_id |
| Deployment | Railway (Nixpacks) | Auto-deploy, SSL, Environment Variables |
| Authentication | JWT (jsonwebtoken) | Access Token + Refresh, Remember Me, bcrypt password hashing |
| Real-time | WebSocket (ws) | Broadcast notifications, live updates |
| Task Scheduler | node-cron | Advance overdue check, Vehicle alerts, Subscription check |

### 6.2 Deployment & Operations

| รายการ | รายละเอียด |
|---|---|
| Deployment Strategy | Auto-deploy จาก main branch (Production), develop branch (Staging) |
| Rollback | Railway instant rollback ไปยัง deployment ก่อนหน้า ภายใน 5 นาที |
| Zero-downtime | Health check + graceful shutdown ผ่าน Railway |
| Staging-to-Production | ทดสอบบน Staging ผ่าน UAT ก่อน merge เข้า main เพื่อ deploy Production |
| Backup | PostgreSQL daily automated backup ผ่าน Railway, retention {{จำนวน}} วัน |
| Monitoring | Railway dashboard (CPU, Memory, Request count) + Application-level health check endpoint |

### 6.3 Security Features (6 รายการ)

| # | Feature | รายละเอียด |
|---|---|---|
| 1 | Helmet.js | HTTP security headers (X-Frame-Options, X-Content-Type-Options, HSTS) |
| 2 | Rate Limiting | 1,000 requests/minute per IP (express-rate-limit) |
| 3 | Content Security Policy (CSP) | Whitelist script/style/font/img sources |
| 4 | CORS Whitelist | Configurable allowed origins, credentials support |
| 5 | JWT Authentication | Token-based auth, configurable expiry (1d / 7d / 30d), boot-time secret validation |
| 6 | Gzip Compression | ลดขนาด response ~75% (compression middleware) |

### 6.4 UX Features (8 รายการ)

| # | Feature | รายละเอียด |
|---|---|---|
| 1 | GPS Picker | เลือกตำแหน่งบนแผนที่ (OpenStreetMap) สำหรับ Job Order / Task |
| 2 | Drag-to-Copy | ลาก Booking ไปวันอื่นเพื่อ copy (Google Calendar style) |
| 3 | Searchable Select | Dropdown ที่พิมพ์ค้นหาได้ สำหรับ list ยาว (BP, Item, Project) |
| 4 | Toast Notifications | แจ้งเตือนแบบ pop-up มุมขวาบน พร้อม auto-dismiss |
| 5 | Auth Guards | ตรวจสอบ login + permission ทุกหน้า, redirect to login ถ้าหมดอายุ |
| 6 | Excel Export | Export ข้อมูลจากทุก module เป็น Excel (.xlsx) ผ่าน SheetJS |
| 7 | Auto-login / Demo Mode | สำหรับ demo และ development environment |
| 8 | Real-time Broadcast | อัปเดตข้อมูลแบบ real-time ผ่าน WebSocket (approval status, notifications) |

### 6.5 Browser Support

| Browser | เวอร์ชันขั้นต่ำ |
|---|---|
| Google Chrome | 90+ |
| Mozilla Firefox | 88+ |
| Microsoft Edge | 90+ |
| Safari | 14+ |

---

## 7. สิ่งส่งมอบ (Deliverables)

| # | สิ่งส่งมอบ | รายละเอียด | รูปแบบ | เกณฑ์รับงาน |
|---|---|---|---|---|
| 1 | Source Code | Repository พร้อม README, .env.example, migration scripts | Git Repository | Code review ผ่าน, ไม่มี critical vulnerability |
| 2 | Deployed System | ระบบที่ deploy บน Railway พร้อมใช้งาน (Production + Staging) | URL + Credentials | เข้าใช้งานได้, Health check ผ่าน |
| 3 | API Documentation | REST API endpoints ทุก route พร้อม request/response examples | Markdown / Postman Collection | ครอบคลุมทุก endpoint, ตัวอย่างถูกต้อง |
| 4 | User Manual | คู่มือการใช้งานสำหรับ End User ทุก module | PDF / HTML (Help page) | ครอบคลุมทุก module, ภาษาไทย |
| 5 | Admin Guide | คู่มือ System Administration (Setup, User Management, Subscription) | PDF / Markdown | ครอบคลุม admin functions ทั้งหมด |
| 6 | Database Schema | ER Diagram + Table/Column descriptions | Diagram + Markdown | ตรงกับ production schema |
| 7 | UAT Test Cases | Test cases สำหรับทุก module พร้อม expected results | Spreadsheet | ครอบคลุม happy path + edge cases |
| 8 | UAT Sign-off Report | บันทึกผลการทดสอบโดยลูกค้า | PDF (signed) | ลูกค้าลงนามรับรอง |
| 9 | Security Audit Report | ผล Security scan + Penetration test summary | PDF | Zero critical / high findings |
| 10 | Training Session | ฝึกอบรม Online {{จำนวน}} sessions พร้อม Recording | Video Recording + Slides | ผู้เข้าอบรมใช้งานได้ |

---

## 8. แผนการดำเนินงาน (Project Timeline)

| Phase | กิจกรรมหลัก | Modules ที่เกี่ยวข้อง | ระยะเวลา | สิ่งส่งมอบ |
|---|---|---|---|---|
| **P1: Requirement, Planning & UI Wireframe** | รวบรวม requirements, ออกแบบ database schema, วาง project plan, กำหนด tech stack, ออกแบบ UI wireframe และ navigation flow | ทุก module (requirement + wireframe level) | {{สัปดาห์ที่ X-X}} | Requirement Document, DB Schema Draft, Project Plan, UI Wireframes, Style Guide |
| **P2: Core Development (3 Sprints)** | พัฒนา modules หลัก: Auth, Project, Task, Phases, PR/PO/GRPO, Quotation, Budget, Expense, Advance, Petty Cash, Journal, Master Data, Number Series, Setup, Approval Workflow -- Sprint Demo ทุก 2-3 สัปดาห์ | #3-16, #23-25, #26-28, #31 (24 modules) | {{สัปดาห์ที่ X-X}} | Working modules on Staging, Sprint Demo 3 ครั้ง |
| **P3: Advanced Development (2 Sprints)** | พัฒนา modules ขั้นสูง: Dashboard, Overview, Job Order, OT, Travel, Technician, Vehicle, Booking, Notification, Subscription, Module Mgmt, Reports, SOW Generator, Help, Changelog -- Sprint Demo ทุก 2-3 สัปดาห์ | #1-2, #7, #17-22, #29-30, #32-36 (13 modules) | {{สัปดาห์ที่ X-X}} | All 37 modules on Staging, Sprint Demo 2 ครั้ง |
| **P4: SAP B1 Integration Testing** | เชื่อมต่อ SAP B1 Service Layer, ทดสอบ Push PR/PO/Expense, Sync Master Data, Error handling และ retry logic -- ทำ parallel กับ P3 ได้บางส่วน | #37 (SAP B1 Integration) | {{สัปดาห์ที่ X-X}} | SAP Integration Test Report, Error Log |
| **P5: Internal QA & Bug Fix** | ทดสอบ 37 modules + 7 workflows ภายในทีม, Security Audit (Helmet/CSP/Rate Limit), Performance Testing, Bug fixing -- เริ่ม overlap กับ P3 tail ได้ | ทุก module | {{สัปดาห์ที่ X-X}} | QA Report, Security Audit Report, Bug Fix Log |
| **P6: UAT & User Training** | ลูกค้าทดสอบระบบ (User Acceptance Testing), แก้ไข UAT bugs, จัดฝึกอบรม Key Users {{จำนวน}} sessions พร้อม recording | ทุก module | {{สัปดาห์ที่ X-X}} | UAT Sign-off, Training Materials, Video Recordings |
| **P7: Data Setup, Go-Live & Cutover** | เตรียม Production data (company config, subscription plans, master data, admin users), Deploy Production บน Railway, Cutover, Go-Live | ทุก module | {{สัปดาห์ที่ X-X}} | Production URL, Go-Live Checklist, Data Migration Report |
| **P8: Hypercare** | ดูแลระบบหลัง Go-Live, แก้ไข critical bugs เร่งด่วน, fine-tune performance, support ลูกค้า | ทุก module | {{สัปดาห์ที่ X-X}} | Hypercare Log, Handover Document |

> **ระยะเวลารวมโดยประมาณ:** {{จำนวน สัปดาห์/เดือน}} -- Realistic ~28 สัปดาห์ (7 เดือน) สำหรับทีม 2 คน, Best case 22 สัปดาห์, Worst case 36 สัปดาห์
>
> **Critical Path:** P1 -> P2 (Core Dev) -> P4 (SAP Integration) -> P5 (QA) -> P6 (UAT) -> P7 (Go-Live) -> P8 (Hypercare)
>
> **Parallel ได้:** P3 (Advanced Dev) ทำ parallel กับ P4 (SAP) ได้ | P5 (QA) เริ่ม overlap กับ P3 tail ได้

---

## 9. ทีมงานโครงการ (Project Team)

### 9.1 ฝั่งผู้ให้บริการ (Provider)

| บทบาท | ชื่อ | ความรับผิดชอบ |
|---|---|---|
| Project Manager | {{ชื่อ}} | บริหารโครงการ, วางแผน, ประสานงาน, รายงานสถานะ |
| Lead Developer (Full-stack) | {{ชื่อ}} | สถาปัตยกรรมระบบ, พัฒนา Backend API + Frontend, Database design |
| Frontend Developer | {{ชื่อ}} | พัฒนา UI/UX, Responsive layout, JavaScript interactions |
| Backend Developer | {{ชื่อ}} | พัฒนา API routes, Middleware, Integration, Migration scripts |
| QA / Tester | {{ชื่อ}} | ทดสอบระบบ, เขียน test cases, Security testing |
| DevOps Engineer | {{ชื่อ}} | Railway deployment, CI/CD, Monitoring, Environment management |

### 9.2 ฝั่งลูกค้า (Client)

| บทบาท | ชื่อ | ความรับผิดชอบ |
|---|---|---|
| Project Sponsor | {{ชื่อ}} | อนุมัติงบประมาณ, ตัดสินใจระดับนโยบาย |
| Product Owner | {{ชื่อ}} | กำหนด requirements, priority, ตัดสินใจด้าน feature |
| UAT Coordinator | {{ชื่อ}} | ประสานงาน UAT, รวบรวม feedback, sign-off |
| Key Users | {{ชื่อ (แต่ละแผนก)}} | ทดสอบ, ให้ feedback, เข้าร่วม Training |
| IT Coordinator | {{ชื่อ}} | ประสานงานด้าน technical (SAP connection, network, credentials) |

---

## 10. สมมติฐานโครงการ (Project Assumptions)

1. **ประเภทโครงการ:** โครงการนี้เป็นการพัฒนา SaaS Web Application ไม่ใช่การ Implement ระบบ ERP สำเร็จรูป ดังนั้นกระบวนการ Blueprint จะเป็นรูปแบบ Software Requirement Specification ไม่ใช่ ERP Business Blueprint
2. **Hosting:** ระบบ deploy บน Railway (Cloud PaaS) เท่านั้น ลูกค้าไม่จำเป็นต้องจัดเตรียม server หรือ infrastructure
3. **Browser-based:** ระบบทำงานผ่าน Web Browser ตาม Browser Support ที่ระบุใน Section 6.4 ไม่รองรับ Mobile Native App
4. **Multi-tenancy:** ข้อมูลแยกด้วย company_id ในระดับ row-level ไม่ใช่ database-level isolation หากลูกค้าต้องการ dedicated database ต้องตกลงแยกต่างหาก
5. **SAP B1 Connection:** การเชื่อมต่อ SAP B1 ผ่าน Service Layer ต้องการ SAP credentials และ network access ที่ลูกค้าจัดเตรียมให้ ผู้ให้บริการไม่รับผิดชอบ SAP License หรือ SAP server uptime
6. **Data Ownership:** ข้อมูลที่ลูกค้ากรอกในระบบเป็นทรัพย์สินของลูกค้า ผู้ให้บริการจะไม่เข้าถึงข้อมูลลูกค้าโดยไม่ได้รับอนุญาต ยกเว้นเพื่อการ debug/support ซึ่งต้องได้รับอนุมัติจาก Product Owner หรือ IT Coordinator ของลูกค้าเป็นรายครั้ง และบันทึก audit log ทุกครั้งที่เข้าถึง
7. **Feedback Timeline:** ลูกค้าให้ feedback ต่อ deliverable ภายใน {{จำนวน}} วันทำงาน ความล่าช้าจากฝั่งลูกค้าอาจส่งผลต่อ timeline
8. **Scope Freeze:** หลังจาก P1 (Requirement & Planning) เสร็จสิ้นและได้รับอนุมัติ requirement จะถือเป็น scope ที่ตกลง การเปลี่ยนแปลงหลังจากนี้ต้องผ่าน Change Request
9. **Concurrent Users:** ระบบออกแบบรองรับ {{จำนวน}} concurrent users ต่อ tenant หากต้องการเพิ่มต้องประเมิน infrastructure cost เพิ่มเติม
10. **Payment:** ลูกค้าตกลงชำระค่าบริการตามงวดที่ระบุใน Section 13 ก่อนเริ่มงานในแต่ละ Phase
11. **Acceptance Criteria:** เกณฑ์การรับงานระดับ module จะถูกกำหนดรายละเอียดใน Requirement Document (deliverable ของ P1) และถือเป็นส่วนหนึ่งของ SOW หลังจากทั้งสองฝ่ายลงนามอนุมัติ
12. **Force Majeure:** ทั้งสองฝ่ายไม่ต้องรับผิดชอบต่อความล่าช้าหรือความเสียหายที่เกิดจากเหตุสุดวิสัย (ภัยธรรมชาติ, โรคระบาด, ผู้ให้บริการ Cloud หยุดให้บริการ, คำสั่งของรัฐ) โดยฝ่ายที่ได้รับผลกระทบต้องแจ้งอีกฝ่ายภายใน {{จำนวน}} วันทำงาน
13. **Tenant Lifecycle:** การ Onboarding tenant ใหม่ดำเนินการผ่าน Self-registration อัตโนมัติ การ Offboarding เมื่อยกเลิก subscription ข้อมูลจะถูก soft-delete และลบถาวรหลัง {{จำนวน}} วัน ลูกค้าสามารถขอ data export ก่อนลบ

---

## 11. การบริหารการเปลี่ยนแปลง (Change Management)

| ขั้นตอน | กิจกรรม | รายละเอียด | ผู้รับผิดชอบ |
|---|---|---|---|
| 1 | Submit Change Request | ลูกค้ากรอกแบบฟอร์ม Change Request (ดู Appendix C) ระบุ module, รายละเอียด, เหตุผล, priority | ลูกค้า |
| 2 | Impact Assessment | ผู้ให้บริการประเมินผลกระทบด้าน effort (man-days), timeline, cost และ technical risk ภายใน {{จำนวน}} วันทำงาน | ผู้ให้บริการ |
| 3 | Approval | ทั้งสองฝ่ายตกลง scope, effort, cost ของ Change Request และลงนามอนุมัติ | ทั้งสองฝ่าย |
| 4 | Execute | ผู้ให้บริการดำเนินงานตาม Change Request ที่อนุมัติ บันทึกใน revision history | ผู้ให้บริการ |

> Change Request ที่ส่งผลกระทบต่อ core architecture, database schema หรือ security จะต้องผ่านการ review โดย Lead Developer ก่อนอนุมัติ

---

## 12. SLA & Support Level

### 12.1 Service Level Agreement

| รายการ | เป้าหมาย |
|---|---|
| System Uptime | {{จำนวน}}% (ไม่รวม planned maintenance) |
| Planned Maintenance Window | {{วัน/เวลา เช่น วันอาทิตย์ 02:00-06:00 ICT}} |
| Data Backup | Daily automated backup, retention {{จำนวน}} วัน |
| Disaster Recovery | RTO {{จำนวน}} ชั่วโมง, RPO {{จำนวน}} ชั่วโมง |

### 12.2 Support Severity Levels

| Severity | คำอธิบาย | Response Time | Resolution Time |
|---|---|---|---|
| **Critical (P1)** | ระบบใช้งานไม่ได้ทั้งหมด หรือ data loss | {{จำนวน}} ชั่วโมง | {{จำนวน}} ชั่วโมง |
| **High (P2)** | Feature หลักใช้งานไม่ได้ แต่มี workaround | {{จำนวน}} ชั่วโมง | {{จำนวน}} วันทำงาน |
| **Medium (P3)** | Feature รองมีปัญหา ไม่กระทบ workflow หลัก | {{จำนวน}} วันทำงาน | {{จำนวน}} วันทำงาน |
| **Low (P4)** | Cosmetic issue, enhancement request | {{จำนวน}} วันทำงาน | Planned release |

### 12.3 Support Channels

| ช่องทาง | รายละเอียด |
|---|---|
| Email | {{อีเมล support}} |
| Discord | {{ชื่อ channel / webhook}} |
| In-app Notification | ระบบ Notification ภายใน platform |
| Business Hours | {{วัน/เวลา เช่น จันทร์-ศุกร์ 09:00-18:00 ICT}} |

---

## 13. เงื่อนไขค่าบริการ (Commercial Terms)

### 13.1 Subscription Plans

| Feature | Starter | Professional | Enterprise |
|---|---|---|---|
| จำนวน Users | {{จำนวน}} | {{จำนวน}} | Unlimited |
| Core Modules (Dashboard, Project, Task, Auth, Setup) | รวม | รวม | รวม |
| Procurement (PR/PO/GRPO/Quotation) | -- | รวม | รวม |
| Financial (Budget/Expense/Advance/Petty Cash/Journal) | -- | รวม | รวม |
| HR & Admin (OT/Travel/Technicians) | -- | -- | รวม |
| Booking & Vehicle | -- | -- | รวม |
| Job Orders | -- | -- | รวม |
| SAP B1 Integration | -- | -- | รวม |
| Reports & Excel Export | Basic | Full | Full + Custom |
| Approval Workflow | 1 level | Multi-level | Multi-level + Custom |
| Notification (Discord/Email) | -- | รวม | รวม |
| Trial | 14 วัน | 14 วัน | ติดต่อ |
| ราคา/เดือน | {{จำนวนเงิน}} | {{จำนวนเงิน}} | {{จำนวนเงิน / ติดต่อ}} |

### 13.2 Development Fee (One-time)

| รายการ | จำนวน |
|---|---|
| ค่าพัฒนาระบบ (Development Fee) | {{จำนวนเงิน}} บาท |
| ภาษีมูลค่าเพิ่ม (VAT 7%) | {{จำนวนเงิน}} บาท |
| **รวมทั้งสิ้น** | **{{จำนวนเงิน}} บาท** |

### 13.3 งวดการชำระเงิน

| งวดที่ | เงื่อนไข | สัดส่วน |
|---|---|---|
| 1 | ลงนาม SOW + เริ่ม P1 (Requirement & Planning) | {{จำนวน}}% |
| 2 | ส่งมอบ P2 (UI/UX Design) ที่อนุมัติแล้ว | {{จำนวน}}% |
| 3 | ส่งมอบ P3 + P4 (Development) บน Staging | {{จำนวน}}% |
| 4 | UAT Sign-off (P5) | {{จำนวน}}% |
| 5 | Go-Live (P6) + เสร็จสิ้น Hypercare | {{จำนวน}}% |

---

## 14. ทรัพย์สินทางปัญญา (Intellectual Property)

1. **Source Code ที่พัฒนาเฉพาะโครงการนี้ (Custom Code):** เป็นทรัพย์สินของ {{ลูกค้า / ผู้พัฒนา -- เลือก}} หลังจากชำระค่าบริการครบถ้วนตาม Section 13.3 ผู้ให้บริการจะส่งมอบ source code ทั้งหมดผ่าน Git Repository ตาม Deliverable #1
2. **Pre-existing IP:** Framework, libraries, utilities และ components ที่ผู้ให้บริการมีอยู่ก่อนเริ่มโครงการ ยังคงเป็นทรัพย์สินของผู้ให้บริการ โดยลูกค้าได้รับ non-exclusive, perpetual license ในการใช้งาน Pre-existing IP เฉพาะภายในระบบ Company Operation
3. **Third-party Libraries:** Open source libraries ที่ใช้ในโครงการอยู่ภายใต้ license ของ library นั้นๆ (เช่น MIT, Apache 2.0) ผู้ให้บริการจะจัดทำรายการ Third-party Dependencies พร้อม license type เป็นส่วนหนึ่งของ deliverables
4. **ข้อห้าม:** ทั้งสองฝ่ายจะไม่ใช้ทรัพย์สินทางปัญญาของอีกฝ่ายเพื่อวัตถุประสงค์อื่นนอกเหนือจากที่ระบุใน SOW ฉบับนี้ โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร

---

## 15. การรักษาความลับ (Confidentiality)

1. ทั้งสองฝ่ายตกลงรักษาความลับของข้อมูลที่ได้รับจากอีกฝ่ายระหว่างโครงการ ("ข้อมูลลับ") รวมถึงแต่ไม่จำกัดเพียง: source code, business data, database credentials, architecture documents, ข้อมูลลูกค้า/พนักงาน, ข้อมูลทางการเงิน และข้อมูลเชิงกลยุทธ์
2. ห้ามเปิดเผยข้อมูลลับต่อบุคคลที่สามโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร ยกเว้นการเปิดเผยต่อพนักงานหรือผู้รับจ้างช่วงที่จำเป็นต้องทราบเพื่อปฏิบัติงานตาม SOW นี้ โดยต้องผูกพันบุคคลดังกล่าวด้วยข้อตกลงรักษาความลับที่เทียบเท่า
3. ข้อผูกพันนี้มีผลตลอดระยะเวลาโครงการและอีก {{จำนวน}} ปีหลังสิ้นสุด SOW
4. **ข้อยกเว้น:** ข้อมูลที่ (ก) เป็นสาธารณะโดยไม่ได้เกิดจากการละเมิดข้อตกลงนี้ (ข) ฝ่ายที่ได้รับมีอยู่แล้วก่อนได้รับจากอีกฝ่าย (ค) ต้องเปิดเผยตามคำสั่งศาลหรือหน่วยงานรัฐ โดยต้องแจ้งอีกฝ่ายล่วงหน้าตามสมควร

---

## 16. การคุ้มครองข้อมูลส่วนบุคคล (PDPA Compliance)

เพื่อให้เป็นไปตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ทั้งสองฝ่ายตกลงดังนี้:

| รายการ | รายละเอียด |
|---|---|
| **Data Controller** | ลูกค้า -- เป็นผู้ควบคุมข้อมูลส่วนบุคคลของพนักงาน คู่ค้า และผู้ใช้งานระบบของตน |
| **Data Processor** | ผู้ให้บริการ -- ประมวลผลข้อมูลตามคำสั่งของ Controller ภายในขอบเขต SOW เท่านั้น |
| **ประเภทข้อมูลที่ประมวลผล** | ชื่อ-นามสกุล, อีเมล, เบอร์โทร, GPS location (Job Order/Task), ข้อมูล HR (OT, Travel, Daily Rate, Certification), ข้อมูลทางการเงิน (Expense, Advance, Petty Cash), ทะเบียนรถ (Vehicle) |
| **วัตถุประสงค์** | เพื่อให้บริการ platform ตามขอบเขต SOW ฉบับนี้เท่านั้น |
| **Data Retention** | ข้อมูลจะถูกเก็บรักษาตลอดระยะเวลาสัญญา และลบภายใน {{จำนวน}} วันหลังสิ้นสุดสัญญา เว้นแต่มีข้อกำหนดทางกฎหมายให้เก็บต่อ (เช่น เอกสารทางบัญชี 5 ปี) |
| **Data Breach Notification** | ผู้ให้บริการ (Processor) จะแจ้ง Controller ภายใน {{จำนวน}} ชั่วโมงหลังทราบเหตุ data breach พร้อมรายละเอียด: ข้อมูลที่ได้รับผลกระทบ, สาเหตุ, มาตรการแก้ไข |
| **สิทธิของเจ้าของข้อมูล** | ผู้ให้บริการจะอำนวยความสะดวกให้ Controller ปฏิบัติตามคำขอใช้สิทธิของเจ้าของข้อมูล (สิทธิเข้าถึง, แก้ไข, ลบ, โอนย้าย, คัดค้าน) ภายใน {{จำนวน}} วันทำงาน |
| **Sub-processor** | Railway (hosting), {{SMTP Provider}} (email notification) -- ผู้ให้บริการรับผิดชอบให้ Sub-processor ปฏิบัติตาม PDPA เทียบเท่าข้อตกลงนี้ |
| **มาตรการรักษาความปลอดภัย** | ตาม Section 6.3 (Helmet.js, Rate Limiting, CSP, CORS, JWT, Gzip) + การเข้ารหัส data-in-transit (HTTPS/TLS), bcrypt password hashing, environment variable สำหรับ secrets |
| **การตรวจสอบ (Audit)** | Controller มีสิทธิ์ตรวจสอบการปฏิบัติตาม PDPA ของ Processor โดยแจ้งล่วงหน้า {{จำนวน}} วันทำงาน |

---

## 17. การยกเลิกสัญญา (Termination)

### 17.1 การยกเลิกโดยแจ้งล่วงหน้า

ฝ่ายใดฝ่ายหนึ่งมีสิทธิ์ยกเลิก SOW ฉบับนี้โดยแจ้งอีกฝ่ายเป็นลายลักษณ์อักษรล่วงหน้าไม่น้อยกว่า {{จำนวน}} วัน

### 17.2 การยกเลิกเนื่องจากผิดสัญญา

หากฝ่ายใดฝ่ายหนึ่งผิดสัญญาในสาระสำคัญ (material breach) และไม่แก้ไขภายใน {{จำนวน}} วันทำงานหลังได้รับแจ้งเป็นลายลักษณ์อักษร อีกฝ่ายมีสิทธิ์ยกเลิก SOW ทันที

### 17.3 ผลของการยกเลิก

| รายการ | รายละเอียด |
|---|---|
| การชำระเงิน | ลูกค้าชำระค่าบริการตาม deliverables ที่ส่งมอบและรับแล้ว + work-in-progress ตามสัดส่วน man-days ที่ใช้จริง |
| การคืนเงิน | หากลูกค้าชำระล่วงหน้าเกินกว่างานที่ส่งมอบ ผู้ให้บริการคืนส่วนต่างภายใน {{จำนวน}} วันทำงาน |
| การส่งมอบ Source Code | ผู้ให้บริการส่งมอบ source code, documentation, database ทั้งหมดที่ทำไปแล้วผ่าน Git Repository ภายใน {{จำนวน}} วันทำงาน |
| Data Return | ผู้ให้บริการ export ข้อมูลลูกค้าทั้งหมดเป็น {{รูปแบบ เช่น SQL dump + CSV}} และลบข้อมูลจากระบบภายใน {{จำนวน}} วัน |
| ความลับ | ข้อผูกพันใน Section 15 (Confidentiality) ยังคงมีผลหลังยกเลิก |

---

## 18. การส่งมอบล่าช้าและค่าปรับ (Delay & Penalty)

### 18.1 ความล่าช้าฝั่งผู้ให้บริการ

หากผู้ให้บริการส่งมอบ deliverable ล่าช้าเกิน {{จำนวน}} วันทำงานจากกำหนดใน Phase timeline โดยไม่มีเหตุสุดวิสัย (Force Majeure) และไม่ได้เกิดจากความล่าช้าของลูกค้า:

- ลูกค้ามีสิทธิ์เรียกค่าปรับ {{จำนวน}}% ของมูลค่างวดที่เกี่ยวข้อง ต่อสัปดาห์ที่ล่าช้า
- ค่าปรับสูงสุดรวมไม่เกิน {{จำนวน}}% ของมูลค่าโครงการทั้งหมด
- หากล่าช้าเกิน {{จำนวน}} สัปดาห์ ลูกค้ามีสิทธิ์ยกเลิก SOW ตาม Section 17

### 18.2 ความล่าช้าฝั่งลูกค้า

หากลูกค้าให้ feedback, อนุมัติ deliverable, หรือจัดเตรียมข้อมูล/ทรัพยากรที่จำเป็นล่าช้าเกิน {{จำนวน}} วันทำงานจากกำหนด:

- ผู้ให้บริการมีสิทธิ์ขยาย timeline เท่ากับจำนวนวันที่ล่าช้า โดยไม่ถือเป็น delay ของผู้ให้บริการ
- หากล่าช้าเกิน {{จำนวน}} วันทำงานต่อเนื่อง ผู้ให้บริการมีสิทธิ์ reallocate ทรัพยากร และแจ้ง revised timeline

### 18.3 SLA Breach Credit

หาก System Uptime ต่ำกว่าเป้าหมายใน Section 12.1 ติดต่อกัน 2 เดือน ลูกค้ามีสิทธิ์ได้รับ service credit ตามตารางต่อไปนี้:

| Uptime จริง | Service Credit |
|---|---|
| ต่ำกว่าเป้า 0.1-0.5% | {{จำนวน}}% ของค่าบริการเดือนนั้น |
| ต่ำกว่าเป้า 0.5-1.0% | {{จำนวน}}% ของค่าบริการเดือนนั้น |
| ต่ำกว่าเป้า > 1.0% | {{จำนวน}}% ของค่าบริการเดือนนั้น |

---

## 19. การลงนามอนุมัติ (Sign-off)

ทั้งสองฝ่ายตกลงและยอมรับขอบเขตการทำงานตามที่ระบุไว้ในเอกสาร SOW ฉบับนี้

| | ลูกค้า: {{ชื่อบริษัทลูกค้า}} | ผู้ให้บริการ: {{ชื่อบริษัทผู้พัฒนา}} |
|---|---|---|
| ลงนาม | _____________________ | _____________________ |
| ชื่อ | {{ชื่อผู้มีอำนาจลงนาม}} | {{ชื่อผู้มีอำนาจลงนาม}} |
| ตำแหน่ง | {{ตำแหน่ง}} | {{ตำแหน่ง}} |
| วันที่ | _____ / _____ / _____ | _____ / _____ / _____ |

---

## Appendix A: Approval Workflow Diagrams

### A.1 PR (Purchase Request)

```
draft --> pending_manager --> pending_finance --> pending_executive --> approved --> sent_to_sap --> received
                |                   |                    |
                +--> rejected       +--> rejected        +--> rejected
                +--> cancelled      +--> cancelled       +--> cancelled
```

### A.2 Expense

```
draft --> pending_manager --> pending_finance --> pending_executive --> approved --> paid --> sent_to_sap
                |                   |                    |
                +--> rejected       +--> rejected        +--> rejected
                +--> cancelled      +--> cancelled       +--> cancelled
```

### A.3 Budget

```
draft --> pending_manager --> pending_executive --> approved
                |                    |
                +--> rejected        +--> rejected
```

### A.4 OT Management

```
draft --> pending_manager --> pending_executive --> approved --> paid
                |                    |
                +--> rejected        +--> rejected
```

### A.5 Travel

```
draft --> pending_manager --> pending_executive --> approved
                |                    |
                +--> rejected        +--> rejected
```

### A.6 Booking / Vehicle

```
pending --> approved --> checked_out --> checked_in
   |
   +--> rejected
   +--> cancelled
```

### A.7 Job Order

```
draft --> approved --> in_progress --> completed
   |
   +--> cancelled
```

---

## Appendix B: Glossary

| คำศัพท์ | ความหมาย |
|---|---|
| SaaS | Software as a Service -- ซอฟต์แวร์ที่ให้บริการผ่าน Cloud ไม่ต้องติดตั้ง |
| Multi-tenant | สถาปัตยกรรมที่ระบบเดียวรองรับหลายองค์กร แยกข้อมูลด้วย company_id |
| RBAC | Role-Based Access Control -- ระบบควบคุมสิทธิ์ตามบทบาท |
| JWT | JSON Web Token -- มาตรฐาน token สำหรับ authentication |
| REST API | Representational State Transfer -- รูปแบบ API ที่ใช้ HTTP methods (GET/POST/PUT/DELETE) |
| WebSocket | โปรโตคอลสื่อสารแบบ real-time สองทาง ระหว่าง client และ server |
| CORS | Cross-Origin Resource Sharing -- กลไกควบคุม request ข้าม domain |
| CSP | Content Security Policy -- HTTP header ที่ควบคุม resources ที่ browser โหลดได้ |
| Helmet.js | Express middleware ที่ตั้งค่า HTTP security headers อัตโนมัติ |
| Rate Limiting | การจำกัดจำนวน request ต่อ IP ต่อช่วงเวลา ป้องกัน abuse |
| Kanban | วิธีจัดการงานแบบ visual board แบ่งเป็น columns ตามสถานะ |
| PR | Purchase Request -- ใบขอซื้อ |
| PO | Purchase Order -- ใบสั่งซื้อ |
| GRPO | Goods Receipt PO -- ใบรับสินค้าตามใบสั่งซื้อ |
| UAT | User Acceptance Testing -- การทดสอบระบบโดยผู้ใช้จริง |
| Hypercare | ช่วงดูแลระบบหลัง Go-Live เพื่อแก้ไขปัญหาเร่งด่วน |
| Railway | Cloud PaaS platform สำหรับ deploy web applications |
| Nixpacks | Build system ของ Railway ที่ detect tech stack อัตโนมัติ |
| Service Layer | SAP B1 REST API สำหรับเชื่อมต่อระบบภายนอก |
| PDPA | พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 -- กฎหมายคุ้มครองข้อมูลส่วนบุคคลของไทย |
| Data Controller | ผู้ควบคุมข้อมูลส่วนบุคคล -- ผู้กำหนดวัตถุประสงค์และวิธีการประมวลผล |
| Data Processor | ผู้ประมวลผลข้อมูลส่วนบุคคล -- ผู้ประมวลผลตามคำสั่งของ Controller |
| Data Breach | เหตุการณ์ที่ข้อมูลส่วนบุคคลถูกเข้าถึง เปิดเผย หรือสูญหายโดยไม่ได้รับอนุญาต |
| IP (Intellectual Property) | ทรัพย์สินทางปัญญา -- สิทธิ์ใน source code, design, documentation |
| Force Majeure | เหตุสุดวิสัย -- เหตุการณ์ที่อยู่นอกเหนือการควบคุมของทั้งสองฝ่าย |

---

## Appendix C: Change Request Form Template

| Field | รายละเอียด |
|---|---|
| **CR Number** | CR-{{ปี}}-{{ลำดับ}} |
| **วันที่ยื่น** | _____ / _____ / _____ |
| **ผู้ยื่น** | ชื่อ: _______________ ตำแหน่ง: _______________ |
| **Module ที่เกี่ยวข้อง** | [ ] Dashboard [ ] Project [ ] Task [ ] PR [ ] PO [ ] GRPO [ ] Budget [ ] Expense [ ] Advance [ ] Petty Cash [ ] Booking [ ] Job Order [ ] Vehicle [ ] OT [ ] Travel [ ] Technician [ ] Report [ ] SAP Integration [ ] อื่นๆ: ___ |
| **Priority** | [ ] Critical [ ] High [ ] Medium [ ] Low |
| **ประเภท** | [ ] New Feature [ ] Change Existing [ ] Bug Fix [ ] Enhancement |
| **รายละเอียดการเปลี่ยนแปลง** | (อธิบายสิ่งที่ต้องการ) |
| **เหตุผล / Business Justification** | (ทำไมจึงต้องการ) |
| **ผลกระทบหากไม่ทำ** | (สิ่งที่จะเกิดขึ้นถ้าไม่ดำเนินการ) |

**Impact Assessment (ผู้ให้บริการกรอก):**

| รายการ | ประเมิน |
|---|---|
| Effort (Man-days) | _______________ |
| Timeline Impact | [ ] ไม่กระทบ [ ] เลื่อน ___ วัน [ ] เลื่อน ___ สัปดาห์ |
| Cost Impact | _______________ บาท |
| Technical Risk | [ ] Low [ ] Medium [ ] High |
| Modules Affected | _______________ |

**การอนุมัติ:**

| | ลูกค้า | ผู้ให้บริการ |
|---|---|---|
| ลงนาม | _____________________ | _____________________ |
| วันที่ | _____ / _____ / _____ | _____ / _____ / _____ |

---

## Appendix D: Module List by Subscription Plan

| # | Module | กลุ่ม | Starter | Professional | Enterprise | Core |
|---|---|---|---|---|---|---|
| 1 | Dashboard | Dashboard & Overview | รวม | รวม | รวม | Yes |
| 2 | Overview | Dashboard & Overview | รวม | รวม | รวม | Yes |
| 3 | Project Management | Project & Task | รวม | รวม | รวม | Yes |
| 4 | Phases | Project & Task | รวม | รวม | รวม | Yes |
| 5 | Task Board | Project & Task | รวม | รวม | รวม | Yes |
| 6 | My Tasks | Project & Task | รวม | รวม | รวม | Yes |
| 7 | Job Orders | Project & Task | -- | -- | รวม | No |
| 8 | PR (Purchase Request) | Procurement | -- | รวม | รวม | No |
| 9 | PO (Purchase Order) | Procurement | -- | รวม | รวม | No |
| 10 | GRPO | Procurement | -- | รวม | รวม | No |
| 11 | Quotation | Procurement | -- | รวม | รวม | No |
| 12 | Budget Management | Financial | -- | รวม | รวม | No |
| 13 | Expense | Financial | -- | รวม | รวม | No |
| 14 | Petty Cash | Financial | -- | รวม | รวม | No |
| 15 | Advance | Financial | -- | รวม | รวม | No |
| 16 | Journal Entries | Financial | -- | รวม | รวม | No |
| 17 | OT Management | HR & Admin | -- | -- | รวม | No |
| 18 | Travel | HR & Admin | -- | -- | รวม | No |
| 19 | Technicians | HR & Admin | -- | -- | รวม | No |
| 20 | Vehicle Management | Resource & Booking | -- | -- | รวม | No |
| 21 | Vehicle-Project | Resource & Booking | -- | -- | รวม | No |
| 22 | Booking | Resource & Booking | -- | -- | รวม | No |
| 23 | BP Master | Master Data | รวม | รวม | รวม | Yes |
| 24 | Item Master | Master Data | รวม | รวม | รวม | Yes |
| 25 | Pricing | Master Data | -- | รวม | รวม | No |
| 26 | User & Permission | System & Admin | รวม | รวม | รวม | Yes |
| 27 | Approval Workflow | System & Admin | 1 level | Multi-level | Multi-level | Yes |
| 28 | Number Series | System & Admin | รวม | รวม | รวม | Yes |
| 29 | Module Management | System & Admin | รวม | รวม | รวม | Yes |
| 30 | Notification | System & Admin | -- | รวม | รวม | No |
| 31 | Settings/Setup | System & Admin | รวม | รวม | รวม | Yes |
| 32 | Subscription & Plans | System & Admin | รวม | รวม | รวม | Yes |
| 33 | Reports | Reports & Support | Basic | Full | Full + Custom | Yes |
| 34 | SOW Template/Generator | Reports & Support | -- | รวม | รวม | No |
| 35 | Changelog | Reports & Support | รวม | รวม | รวม | Yes |
| 36 | Help | Reports & Support | รวม | รวม | รวม | Yes |
| 37 | SAP B1 Integration | Integration | -- | -- | รวม | No |

> **Core modules** (ปิดไม่ได้) = modules ที่จำเป็นต่อการทำงานพื้นฐานของระบบ

---

*เอกสารฉบับนี้จัดทำโดย {{ชื่อบริษัทผู้พัฒนา}}*
*เวอร์ชัน: v2.1 | วันที่: {{วันที่ออกเอกสาร}}*
