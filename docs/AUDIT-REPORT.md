# Deep-Dive Audit Report — Company Operation (SDA Operation)

**วันที่ตรวจสอบ:** 2026-06-12  
**เวอร์ชัน:** 2.0.0 (auth-2026-05-28-v3)  
**ผู้ตรวจสอบ:** Senior Full-Stack Application Auditor  

---

## สารบัญ

1. [Security Audit](#1-security-audit)
2. [Authentication & Authorization Audit](#2-authentication--authorization-audit)
3. [Database & Data Integrity Audit](#3-database--data-integrity-audit)
4. [API Design & Quality Audit](#4-api-design--quality-audit)
5. [Frontend Audit](#5-frontend-audit)
6. [Business Logic Audit](#6-business-logic-audit)
7. [Infrastructure & DevOps Audit](#7-infrastructure--devops-audit)
8. [Code Quality & Maintainability Audit](#8-code-quality--maintainability-audit)
9. [Performance Audit](#9-performance-audit)
10. [สรุปและจัดลำดับความสำคัญ](#10-สรุปและจัดลำดับความสำคัญ)

---

## 1. Security Audit

### 1.1 WebSocket Authentication ไม่บังคับ — ทุกคนรับ broadcast ได้
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `api/server.js` บรรทัด 225-237
- **สถานะปัจจุบัน:** WS auth ทำเฉพาะ production แต่เมื่อ token ผิดหรือไม่มี ก็ยัง add client เข้า `wsClients` Set (catch block ว่างเปล่า แล้ว `wsClients.add(ws)` อยู่ข้างนอก try/catch)
- **ความเสี่ยง:** ผู้ไม่หวังดีเชื่อมต่อ WebSocket แล้วรับ broadcast ทุก event (pr_created, expense_updated) เห็นข้อมูลธุรกิจ real-time โดยไม่ต้อง login
- **แนวทางแก้ไข:** ย้าย `wsClients.add(ws)` เข้า try block หลัง verify สำเร็จ, reject connection เมื่อไม่มี token
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 1.2 Static Login Password เก็บเป็น Plaintext ใน Environment
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `api/lib/static-user.js` บรรทัด 25-29, `api/routes/auth.js` บรรทัด 135
- **สถานะปัจจุบัน:** `staticCredentialMatches()` เปรียบเทียบ password ตรงๆ กับ env var (plaintext) และ static user ได้ role `executive` + `approval_limit: 999999999`
- **ความเสี่ยง:** ถ้า env leak จะได้ executive access ทันที ไม่มี brute-force protection
- **แนวทางแก้ไข:** Hash static password ด้วย bcrypt เก็บ hash ใน env หรือเอา feature นี้ออกใน production
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 1.3 CORS ค่า Default เปิด Allow All
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/server.js` บรรทัด 70-77
- **สถานะปัจจุบัน:** ถ้า `CORS_ORIGIN` ไม่ได้ set หรือเป็น `*` จะตั้งเป็น `origin: true` + `credentials: true`
- **ความเสี่ยง:** CSRF ทำได้จากทุก domain
- **แนวทางแก้ไข:** ตั้ง `CORS_ORIGIN` เป็น domain จริงใน production
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 30 นาที

### 1.4 JWT ไม่มี Refresh Token — Token อายุยาว 7-30 วัน
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/routes/auth.js` บรรทัด 52-60
- **สถานะปัจจุบัน:** Token expiry = 7d (default) / 30d (remember me), ไม่มี refresh token, ไม่มี token revocation
- **ความเสี่ยง:** Token ที่ถูกขโมยใช้งานได้ 7-30 วันเต็ม ไม่สามารถ revoke ได้
- **แนวทางแก้ไข:** เพิ่ม access token (15 นาที) + refresh token pattern
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1-2 วัน

### 1.5 SAP Client ปิด TLS Certificate Verification
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/services/sapClient.js` บรรทัด 6
- **สถานะปัจจุบัน:** `rejectUnauthorized: false`
- **ความเสี่ยง:** Man-in-the-Middle ดักจับ SAP credentials ได้
- **แนวทางแก้ไข:** ติดตั้ง CA cert ที่ถูกต้อง หรือ pin certificate
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 4 ชั่วโมง

### 1.6 ไม่มี HTML/XSS Sanitization
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** ทั้ง codebase
- **สถานะปัจจุบัน:** ไม่มี DOMPurify หรือ sanitizer ใดๆ ทุก route รับ text fields ไม่ผ่าน filter
- **ความเสี่ยง:** Stored XSS ผ่าน description, remarks, vendor_name — CSP มี `unsafe-inline` ด้วย
- **แนวทางแก้ไข:** เพิ่ม sanitize middleware (xss/sanitize-html) + DOMPurify ที่ frontend
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1 วัน

### 1.7 SQL Injection — ใช้ Parameterized Query ทั้งหมด ✅
- **ระดับ:** 🟢 LOW (ข้อดี)
- **สถานะปัจจุบัน:** ทุก query ใช้ `$N` parameterized — ปลอดภัย

### 1.8 Multer File Upload — Validate Extension แต่ไม่ตรวจ MIME
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/advance.js` บรรทัด 14-29
- **สถานะปัจจุบัน:** จำกัด 5MB, เช็คเฉพาะ extension (.jpg,.png,.pdf,.webp) ไม่ตรวจ magic bytes
- **แนวทางแก้ไข:** เพิ่ม `file-type` package ตรวจ MIME type จริง
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 1.9 Rate Limiting — ครอบคลุมดีแต่อยู่ใน Memory
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/server.js` บรรทัด 84-88, `api/routes/auth.js` บรรทัด 104-123
- **สถานะปัจจุบัน:** Global 1000/min, Login 50 failed/15min, Forgot 5/hr, Register 20/hr — **แต่ state อยู่ใน memory** reset เมื่อ restart
- **แนวทางแก้ไข:** ใช้ Redis store สำหรับ multi-instance
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 4 ชั่วโมง

### 1.10 Helmet — ดีแต่อนุญาต unsafe-inline
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/server.js` บรรทัด 44-62
- **สถานะปัจจุบัน:** CSP มี `scriptSrc: ["'unsafe-inline'"]` — จำเป็นเพราะ POC ใช้ inline handlers
- **แนวทางแก้ไข:** Refactor UI ให้ใช้ addEventListener (ระยะยาว)
- **ความยาก:** ยาก
- **เวลาประมาณ:** 3-5 วัน

### 1.11 Health Endpoint เปิดเผยข้อมูล Internal
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/server.js` บรรทัด 138-177
- **สถานะปัจจุบัน:** `/api/health` ไม่ต้อง auth แสดง JWT secret length, DB config, migration list, static login status
- **แนวทางแก้ไข:** ลดเหลือ `{ status, time }` สำหรับ public, ย้าย detail ไว้ใต้ auth
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 1 ชั่วโมง

### 1.12 Uploaded Files Served Without Auth
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/server.js` บรรทัด 91
- **สถานะปัจจุบัน:** `express.static('/uploads')` ไม่ต้อง auth — เอกสารการเงินเข้าถึงได้ถ้ารู้ URL
- **แนวทางแก้ไข:** เพิ่ม authenticate middleware ก่อน static serve
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 4 ชั่วโมง

### 1.13 Password Hashing — bcrypt 10 rounds ✅
- **ระดับ:** 🟢 LOW
- **สถานะปัจจุบัน:** 10 rounds สม่ำเสมอ, มี password policy (8 ตัว, ตัวอักษร+ตัวเลข)

### 1.14 Environment/Secrets — .gitignore ครอบคลุมดี ✅
- **ระดับ:** 🟢 LOW
- **สถานะปัจจุบัน:** `.env` อยู่ใน .gitignore, ไม่มี hardcoded secrets

---

## 2. Authentication & Authorization Audit

### 2.1 requirePermission Middleware — Fail Open เมื่อ DB Error
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `api/middleware/auth.js` บรรทัด 57-71
- **สถานะปัจจุบัน:** catch block ทำ `next()` — DB error = **bypass authorization ทั้งหมด**
- **ความเสี่ยง:** DB connection issues = ทุกคนเข้าถึงทุก endpoint
- **แนวทางแก้ไข:** เปลี่ยนเป็น `res.status(500).json(...)` — fail closed
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 30 นาที

### 2.2 Permission Matrix ไม่ถูกใช้ใน Backend
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `poc/config/roles.js`, `poc/config/permission-middleware.js`
- **สถานะปัจจุบัน:** มี Permission Matrix ละเอียด (7 roles x 22 modules x 8 actions) แต่ **ไม่มี route file ใดนำเข้าใช้** — backend ตรวจเฉพาะ role name
- **ความเสี่ยง:** Backend ไม่บังคับ — accounting role สร้าง PR ได้ ทั้งที่ matrix ห้าม
- **แนวทางแก้ไข:** นำ permission-middleware.js มาใช้ใน backend routes
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 2-3 วัน

### 2.3 Approve ไม่ตรวจ Approval Limit + Self-Approve ได้
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/routes/pr.js` บรรทัด 151-189, `api/routes/expense.js` บรรทัด 66-83
- **สถานะปัจจุบัน:** ตรวจเฉพาะ role ไม่ตรวจ `approval_limit`, ไม่เช็ค self-approve
- **ความเสี่ยง:** PM สร้าง PR แล้วอนุมัติเองได้, PM ที่ limit 50K approve PR 99K ได้
- **แนวทางแก้ไข:** เพิ่มตรวจ `approval_limit` + block `req.user.id === doc.created_by`
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1 วัน

### 2.4 User List Endpoint ส่ง password_hash
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/routes/auth.js` บรรทัด 410-421
- **สถานะปัจจุบัน:** `GET /api/auth/users` ทำ `SELECT *` — ส่ง `password_hash` ไปยัง frontend
- **แนวทางแก้ไข:** Exclude `password_hash` จาก SELECT
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 30 นาที

### 2.5 Admin Endpoint — Public เปิดเผย Email
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/auth.js` บรรทัด 388-405
- **สถานะปัจจุบัน:** `GET /api/auth/admins?slug=xxx` ไม่ต้อง auth, return email ของ admin/executive
- **แนวทางแก้ไข:** Mask email (a***@domain.com)
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 30 นาที

### 2.6 Route Protection — ครบทุก Route ✅
- **ระดับ:** 🟢 LOW (ข้อดี)
- **สถานะปัจจุบัน:** 25 route files ทั้งหมดใช้ `router.use(authenticate)`

---

## 3. Database & Data Integrity Audit

### 3.1 PR/Expense Create+Lines — ไม่มี Transaction
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `api/routes/pr.js` บรรทัด 106-135, `api/routes/expense.js` บรรทัด 23-41
- **สถานะปัจจุบัน:** สร้าง PR = 3 queries แยกกัน (number_series + header + lines loop) ไม่มี transaction
- **ความเสี่ยง:** Insert line กลางทาง fail = PR + บาง lines = ข้อมูลไม่ครบ
- **แนวทางแก้ไข:** Wrap ใน transaction — `advance.js` มี `withTransaction()` helper อยู่แล้ว
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 3.2 Number Series — Race Condition
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/routes/pr.js` บรรทัด 110-115
- **สถานะปัจจุบัน:** `ON CONFLICT DO UPDATE` ดี แต่ไม่อยู่ใน transaction — 2 users พร้อมกันอาจได้เลขซ้ำ
- **แนวทางแก้ไข:** Wrap ใน transaction + `SELECT ... FOR UPDATE`
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 3 ชั่วโมง

### 3.3 List Endpoints ไม่มี Pagination
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** pr.js, expense.js, budget.js, auth.js (GET /users) ฯลฯ
- **สถานะปัจจุบัน:** SELECT ไม่มี LIMIT — ส่ง records ทั้งหมด
- **ความเสี่ยง:** PR หลายพัน records = slow response, memory spike, OOM
- **แนวทางแก้ไข:** เพิ่ม pagination (page/limit params + LIMIT/OFFSET) default 50
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1 วัน

### 3.4 ไม่มี Input Validation Library
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/package.json`
- **สถานะปัจจุบัน:** ไม่มี Joi/Zod/express-validator — validation ทำ manual `if (!field)` เฉพาะบาง route
- **แนวทางแก้ไข:** เพิ่ม Joi หรือ Zod สร้าง schemas สำหรับทุก POST/PUT
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 3-5 วัน

### 3.5 PR Approve — Budget Update ไม่อยู่ใน Transaction
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/routes/pr.js` บรรทัด 170-188
- **สถานะปัจจุบัน:** Approve PR = UPDATE status + SELECT budget + UPDATE budget_lines — 3 queries แยก
- **ความเสี่ยง:** Step 3 fail = PR approved แต่ budget ไม่ deduct
- **แนวทางแก้ไข:** Wrap ใน transaction
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 1 ชั่วโมง

### 3.6 Transaction Usage — มีบางส่วนแต่ไม่ครอบคลุม
- **ระดับ:** 🟠 HIGH (สรุป)
- **มี Transaction:** grpo.js, advance.js (withTransaction), budget.js (revision)
- **ไม่มี:** pr.js POST/, pr.js approve, expense.js POST/, subscription.js register, travel.js POST/, quotations.js PUT/

### 3.7 Audit Trail — เฉพาะ Auth Events
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/lib/audit.js`
- **สถานะปัจจุบัน:** Log เฉพาะ login/register/password reset — ไม่มี audit สำหรับ approve/reject/delete
- **แนวทางแก้ไข:** เพิ่ม activity logging ทุก approve/reject/delete (มี `activity_log` table อยู่แล้ว)
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 2 วัน

### 3.8 Soft Delete ไม่สม่ำเสมอ
- **ระดับ:** 🟡 MEDIUM
- **สถานะปัจจุบัน:** PR/PO/Expense ใช้ soft delete (`status='cancelled'`) แต่ tasks, phases, budget_lines, payments ใช้ hard DELETE
- **แนวทางแก้ไข:** เปลี่ยน critical records เป็น soft delete
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 2 วัน

### 3.9 Schema — FK Constraints + Indexes ครอบคลุมดี ✅
- **ระดับ:** 🟢 LOW (ข้อดี)

---

## 4. API Design & Quality Audit

### 4.1 RESTful Naming ปนกัน
- **ระดับ:** 🟡 MEDIUM
- **สถานะปัจจุบัน:** ปน kebab-case/camelCase, singular/plural (เช่น `/pr` vs `/quotations` vs `/vehicle`)
- **แนวทางแก้ไข:** Standardize เป็น kebab-case plural
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 4-6 ชั่วโมง

### 4.2 Error Handling — Stack Trace Leak ผ่าน err.message
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** ทุก route file
- **สถานะปัจจุบัน:** ทุก catch block ส่ง `{ error: err.message }` — อาจ expose DB schema, table names
- **แนวทางแก้ไข:** สร้าง error middleware กลาง: log full error server-side, ส่ง generic message ใน production
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2-3 ชั่วโมง

### 4.3 SAP Stubs — ทุก Endpoint เป็น Stub
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/sap.js` (49 lines, 7 endpoints)
- **สถานะปัจจุบัน:** push-pr, push-po, push-expense คืน placeholder message, vendors/accounts/projects คืน `{ data: [] }`
- **แนวทางแก้ไข:** Implement SAP Service Layer client จริง
- **ความยาก:** ยาก
- **เวลาประมาณ:** 3-5 วัน

### 4.4 PR Line Items — ขาด Update/Delete Line แยก
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/pr.js`
- **สถานะปัจจุบัน:** Create ได้ แต่ PUT /:id ไม่ update lines, ไม่มี delete line endpoint
- **แนวทางแก้ไข:** เพิ่ม lines management ใน PUT (delete+re-insert pattern)
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2-3 ชั่วโมง

### 4.5 Attachment Upload — มีเฉพาะ Advance + ไม่ Save Path
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/advance.js` บรรทัด 3, 12-29, 403, 611, 660
- **สถานะปัจจุบัน:** multer รับไฟล์ได้ แต่ **ไม่ save file path ลง DB** — หาไม่เจอในภายหลัง, PR/PO/Expense ไม่มี upload เลย
- **แนวทางแก้ไข:** บันทึก filename ลง DB + สร้าง generic attachment module
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1-2 วัน

### 4.6 API Versioning — ไม่มี
- **ระดับ:** 🟢 LOW
- **แนวทางแก้ไข:** Mount routes ใต้ `/api/v1/` เตรียมรองรับ

### 4.7 SELECT * — 120+ occurrences
- **ระดับ:** 🟠 HIGH
- **สถานะปัจจุบัน:** เกือบทุก query ใช้ `SELECT *` ส่ง column ทั้งหมดรวม internal fields
- **ความเสี่ยง:** Performance + security (expose internal columns)
- **แนวทางแก้ไข:** ระบุ columns ที่ต้องการ
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 2-3 วัน

---

## 5. Frontend Audit

### 5.1 Hardcoded Demo Auto-Login ใน Login Page
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `poc/login.html` บรรทัด 321-328
- **สถานะปัจจุบัน:** มี `autoLogin()` ที่ login ด้วย `admin@local` / `admin1234` อัตโนมัติ — **ทุกคนที่เข้า URL ได้จะเป็น admin ทันที**
- **แนวทางแก้ไข:** ลบ `autoLogin()` function ออก
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 15 นาที

### 5.2 XSS — innerHTML 433 ครั้ง
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** 32 files (top: booking.html 50, advance.html 39, budget.html 33)
- **สถานะปัจจุบัน:** ใช้ `innerHTML` render data จาก API ไม่มี escape
- **ความเสี่ยง:** Stored XSS — vendor_name = `<script>alert(1)</script>` จะ execute
- **แนวทางแก้ไข:** สร้าง `escapeHTML()` helper ใช้ทุกจุด
- **ความยาก:** ยาก (433 จุด)
- **เวลาประมาณ:** 3-5 วัน

### 5.3 JWT เก็บใน localStorage
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `poc/assets/js/api.js` บรรทัด 9-10
- **สถานะปัจจุบัน:** `localStorage.setItem('sda_token', token)` — XSS อ่านได้ทันที
- **แนวทางแก้ไข:** เปลี่ยนเป็น httpOnly cookie หรือแก้ XSS ก่อน (5.2)
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1 วัน

### 5.4 Native Dialogs — 47 จุด (prompt 4, confirm 33, alert 6)
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** 16+ files
- **แนวทางแก้ไข:** สร้าง modal component กลาง
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1-2 วัน

### 5.5 Form Validation — ไม่ครอบคลุม
- **ระดับ:** 🟡 MEDIUM
- **สถานะปัจจุบัน:** Login form มี basic validation, document forms ส่วนใหญ่ไม่มี client-side validation
- **แนวทางแก้ไข:** เพิ่ม HTML5 validation attributes + JS validation ก่อน submit
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1-2 วัน

### 5.6 ไม่มี Loading State / Spinner
- **ระดับ:** 🟡 MEDIUM
- **แนวทางแก้ไข:** เพิ่ม global loading indicator ใน nav.js
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 4 ชั่วโมง

### 5.7 Accessibility — ไม่มี ARIA เลย (0 occurrences)
- **ระดับ:** 🟡 MEDIUM
- **แนวทางแก้ไข:** เพิ่ม aria-label, role ให้ interactive elements
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 2-3 วัน

### 5.8 Hardcoded URLs — ไม่พบ ✅
- **ระดับ:** 🟢 LOW (ข้อดี)

### 5.9 Dead Pages — 6 หน้า orphaned
- **ระดับ:** 🟢 LOW
- **สถานะปัจจุบัน:** sow-generator, sow-v2-generator, sow-v2, sow-template, vehicle-project, pricing ไม่มีใน nav
- **แนวทางแก้ไข:** เพิ่ม links จากหน้าที่เกี่ยวข้อง
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 1 ชั่วโมง

### 5.10 CDN — Zero External Dependencies ✅
- **ระดับ:** 🟢 LOW (ข้อดี)

---

## 6. Business Logic Audit

### 6.1 Budget Double-Commit (PR + PO ทั้งคู่เพิ่ม committed)
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `api/routes/pr.js` บรรทัด 174-183, `api/routes/po.js` บรรทัด 183-193
- **สถานะปัจจุบัน:** PR approved → เพิ่ม `committed_amount`, PO approved → เพิ่มอีก — **นับซ้ำ 2 เท่า**
- **ความเสี่ยง:** Budget report แสดงยอดเกินจริง, block PO ที่ควรผ่าน
- **แนวทางแก้ไข:** Commit ที่จุดเดียว: PO approve (ลบ code ที่ pr.js) หรือ PR approve แล้ว PO ย้ายจาก committed → actual
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 4-6 ชั่วโมง

### 6.2 Budget Committed ลง Line แรกเสมอ
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/pr.js` บรรทัด 181, `api/routes/po.js` บรรทัด 190
- **สถานะปัจจุบัน:** `ORDER BY line_num LIMIT 1` — ไม่ map กับ budget line ที่เกี่ยวข้อง
- **แนวทางแก้ไข:** Map ผ่าน account/category
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 1 วัน

### 6.3 Petty Cash — Disbursement ไม่มี Pre-Approval
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/pettyCash.js` บรรทัด 114-115
- **สถานะปัจจุบัน:** สร้าง disbursement แล้วหัก balance ทันที ไม่มี approval step
- **แนวทางแก้ไข:** เพิ่ม approval สำหรับ disbursement เกิน threshold
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 4-6 ชั่วโมง

### 6.4 Approval Workflow — Hardcoded ไม่ใช้ approval_templates
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** pr.js:159-169, po.js:168-176, expense.js:74-78, advance.js:375-378
- **สถานะปัจจุบัน:** Threshold 10K/100K hardcoded, ไม่ใช้ DB config, ไม่ record approved_by (ยกเว้น advance), ไม่บันทึก approval log
- **แนวทางแก้ไข:** ใช้ approval_templates table + บันทึก approved_by/at + block self-approve
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 2-3 วัน

### 6.5 Quotation vs Quotes — 2 Module ที่ต่างกัน ✅
- **ระดับ:** 🟢 LOW
- **สถานะปัจจุบัน:** `quotations.js` = Sales Quotation (ขาย), `quotes.js` = Vendor Quotes (ซื้อ) — ไม่ซ้ำ

### 6.6 OT ไม่มี Max Hours + Vehicle Edit ไม่เช็ค Conflict
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/ot.js` บรรทัด 36-37, `api/routes/vehicle.js` บรรทัด 338-356
- **สถานะปัจจุบัน:** hours ไม่เช็ค max (กรอก 999 ได้), vehicle booking edit ไม่เช็ค conflict
- **แนวทางแก้ไข:** เพิ่ม `if (hours > 12) return 400`, เพิ่ม conflict check ใน PUT booking
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2-3 ชั่วโมง

### 6.7 SOW Generator — 4 Pages แยก Use Case ✅
- **ระดับ:** 🟢 LOW
- **สถานะปัจจุบัน:** v1 generator+template, v2 generator+viewer — ไม่ซ้ำซ้อน

### 6.8 Number Series — Race Condition ใน SQ + JO
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/routes/quotations.js` บรรทัด 46-49, `api/routes/job-orders.js` บรรทัด 58-69
- **สถานะปัจจุบัน:** ใช้ `SELECT last + 1` แทน number_series table — **ไม่ atomic**
- **แนวทางแก้ไข:** ย้ายไปใช้ number_series table เหมือน PR/PO
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

---

## 7. Infrastructure & DevOps Audit

### 7.1 ไม่มี Graceful Shutdown
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `api/server.js` บรรทัด 266-267
- **สถานะปัจจุบัน:** มีแค่ `unhandledRejection` + `uncaughtException` — ไม่มี SIGTERM handler
- **ความเสี่ยง:** Deploy ใหม่ = request กลางทางถูกตัด, transaction ไม่ commit, DB connections ค้าง
- **แนวทางแก้ไข:**
  ```javascript
  process.on('SIGTERM', async () => {
    server.close(() => {
      wss.close(() => {
        db.pool.end(() => process.exit(0));
      });
    });
    setTimeout(() => process.exit(1), 10000);
  });
  ```
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 7.2 Railway ไม่มี Health Check Config
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `railway.json`
- **สถานะปัจจุบัน:** ไม่มี `healthcheckPath` — Railway route traffic มาขณะ migration ยังไม่เสร็จ
- **แนวทางแก้ไข:** เพิ่ม `"healthcheckPath": "/api/health"` ใน railway.json
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 30 นาที

### 7.3 Cron Jobs ไม่มี Overlap Protection
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/server.js` บรรทัด 249-262
- **แนวทางแก้ไข:** เพิ่ม mutex flag (`let isRunning = false`)
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 1 ชั่วโมง

### 7.4 Logging — console.log ไม่มี Structured Logging
- **ระดับ:** 🟡 MEDIUM
- **สถานะปัจจุบัน:** morgan (combined/dev) + 111 console.log/error ไม่มี log levels/JSON format
- **แนวทางแก้ไข:** ติดตั้ง pino + pino-http
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 4-6 ชั่วโมง

### 7.5 WebSocket ไม่มี Heartbeat
- **ระดับ:** 🟡 MEDIUM
- **สถานะปัจจุบัน:** ไม่มี ping/pong — zombie connections ค้าง memory
- **แนวทางแก้ไข:** เพิ่ม ping interval ทุก 30 วินาที
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 7.6 Email Fallback ดี แต่ Log อาจมี PII
- **ระดับ:** 🟢 LOW
- **แนวทางแก้ไข:** เช็ค NODE_ENV แล้ว mask ใน production

### 7.7 ai-alert.js — Rule-Based ไม่มี External API ✅
- **ระดับ:** 🟢 LOW (ข้อดี)

### 7.8 Compression Middleware ถูกต้อง ✅
- **ระดับ:** 🟢 LOW (ข้อดี)

---

## 8. Code Quality & Maintainability Audit

### 8.1 ไม่มี Test Suite เลย
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `api/package.json`
- **สถานะปัจจุบัน:** ไม่มี jest/mocha, ไม่มี test directory, ไม่มี test script — **0% coverage**
- **แนวทางแก้ไข:** เพิ่ม jest + supertest เริ่มจาก approval logic + auth middleware
- **ความยาก:** ยาก
- **เวลาประมาณ:** 3-5 วัน (50%+ coverage)

### 8.2 Approval Logic Copy-Paste 5+ ไฟล์
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** pr.js, expense.js, advance.js, po.js, travel.js, ot.js
- **สถานะปัจจุบัน:** Same state machine + different thresholds copy-paste
- **แนวทางแก้ไข:** สร้าง `lib/approval-engine.js` shared utility
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 4-6 ชั่วโมง

### 8.3 Dynamic UPDATE Pattern ซ้ำ 10+ ที่
- **ระดับ:** 🟡 MEDIUM
- **แนวทางแก้ไข:** สร้าง utility `buildUpdateQuery()`
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 3 ชั่วโมง

### 8.4 Error Message Leak ใน Production
- **ระดับ:** 🟡 MEDIUM
- **สถานะปัจจุบัน:** ทุก route ส่ง `err.message` ตรงๆ — อาจ expose DB details
- **แนวทางแก้ไข:** Generic message ใน production, full log server-side
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 8.5 ไม่มี README / API Docs
- **ระดับ:** 🟡 MEDIUM
- **แนวทางแก้ไข:** สร้าง README + setup guide
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2-3 ชั่วโมง

### 8.6 File Naming ไม่สอดคล้อง
- **ระดับ:** 🟢 LOW
- **สถานะปัจจุบัน:** ปน camelCase (pettyCash.js) กับ kebab-case (job-orders.js)

### 8.7 Dependencies — Lean + Up-to-date ✅
- **ระดับ:** 🟢 LOW (ข้อดี)

---

## 9. Performance Audit

### 9.1 N+1 Query — GET /projects/:id/phases (26+ queries)
- **ระดับ:** 🔴 CRITICAL
- **ไฟล์:** `api/routes/projects.js` บรรทัด 227-244
- **สถานะปัจจุบัน:** Nested loop: phases → steps → subtasks = O(phases × steps × subtasks) queries
- **แนวทางแก้ไข:** 3 queries + group ใน JS (phases, steps ด้วย `ANY($1)`, subtasks ด้วย `ANY($1)`)
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 3-4 ชั่วโมง

### 9.2 N+1 Query — recalcPhaseProgress (ทุก step/subtask update)
- **ระดับ:** 🟠 HIGH
- **ไฟล์:** `api/routes/projects.js` บรรทัด 20-41
- **แนวทางแก้ไข:** Single query ด้วย GROUP BY + FILTER
- **ความยาก:** ปานกลาง
- **เวลาประมาณ:** 2 ชั่วโมง

### 9.3 N+1 Query — phase-costs, advance settlements
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** projects.js:631-641, advance.js:232-236
- **แนวทางแก้ไข:** Batch query ด้วย `WHERE id = ANY($1)`
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 9.4 ไม่มี Pagination (ซ้ำกับ 3.3)
- **ระดับ:** 🟠 HIGH

### 9.5 Missing Composite Indexes
- **ระดับ:** 🟡 MEDIUM
- **สถานะปัจจุบัน:** มี single-column indexes แต่ขาด composite `(company_id, status, created_at DESC)`
- **แนวทางแก้ไข:** สร้าง migration เพิ่ม composite indexes
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 2 ชั่วโมง

### 9.6 DB Pool ขาด Statement Timeout
- **ระดับ:** 🟡 MEDIUM
- **ไฟล์:** `api/db.js` บรรทัด 7-12
- **สถานะปัจจุบัน:** max: 20, idle: 30s, connect: 5s — แต่ไม่มี `statement_timeout`
- **แนวทางแก้ไข:** เพิ่ม `statement_timeout: 30000`
- **ความยาก:** ง่าย
- **เวลาประมาณ:** 30 นาที

### 9.7 Frontend ไม่มี Bundling/Minification
- **ระดับ:** 🟡 MEDIUM
- **แนวทางแก้ไข:** พิจารณา Vite (ระยะยาว)
- **ความยาก:** ยาก
- **เวลาประมาณ:** 2-3 วัน

---

## 10. สรุปและจัดลำดับความสำคัญ

### 10.1 Priority Matrix

| # | Finding | ระดับ | หมวด | ไฟล์ | ความยาก | เวลา |
|---|---------|-------|------|------|---------|------|
| 1 | Auto-login hardcoded credentials | 🔴 CRITICAL | 5.1 | login.html:321 | ง่าย | 15 นาที |
| 2 | requirePermission fail-open | 🔴 CRITICAL | 2.1 | auth.js:69 | ง่าย | 30 นาที |
| 3 | WebSocket auth bypass | 🔴 CRITICAL | 1.1 | server.js:225-237 | ง่าย | 2 ชม. |
| 4 | Static login plaintext | 🔴 CRITICAL | 1.2 | static-user.js:25 | ง่าย | 2 ชม. |
| 5 | Graceful shutdown missing | 🔴 CRITICAL | 7.1 | server.js | ง่าย | 2 ชม. |
| 6 | PR create ไม่มี transaction | 🔴 CRITICAL | 3.1 | pr.js:106-135 | ง่าย | 2 ชม. |
| 7 | Budget double-commit | 🔴 CRITICAL | 6.1 | pr.js:174 + po.js:183 | ปานกลาง | 4-6 ชม. |
| 8 | N+1 query phases | 🔴 CRITICAL | 9.1 | projects.js:227-244 | ปานกลาง | 3-4 ชม. |
| 9 | No test suite | 🔴 CRITICAL | 8.1 | package.json | ยาก | 3-5 วัน |
| 10 | User list leaks password_hash | 🟠 HIGH | 2.4 | auth.js:410-421 | ง่าย | 30 นาที |
| 11 | CORS wildcard | 🟠 HIGH | 1.3 | server.js:70-77 | ง่าย | 30 นาที |
| 12 | Railway no healthcheck | 🟠 HIGH | 7.2 | railway.json | ง่าย | 30 นาที |
| 13 | Error message leak | 🟠 HIGH | 4.2 | ทุก route | ง่าย | 2-3 ชม. |
| 14 | JWT no refresh token (7-30d) | 🟠 HIGH | 1.4 | auth.js:52-60 | ปานกลาง | 1-2 วัน |
| 15 | SAP TLS disabled | 🟠 HIGH | 1.5 | sapClient.js:6 | ปานกลาง | 4 ชม. |
| 16 | No XSS sanitization | 🟠 HIGH | 1.6 | ทั้ง codebase | ปานกลาง | 1 วัน |
| 17 | Permission matrix not used backend | 🟠 HIGH | 2.2 | poc/config/ | ปานกลาง | 2-3 วัน |
| 18 | Self-approve + no approval_limit | 🟠 HIGH | 2.3 | pr.js:151 | ปานกลาง | 1 วัน |
| 19 | No pagination | 🟠 HIGH | 3.3 | หลายไฟล์ | ปานกลาง | 1 วัน |
| 20 | No input validation library | 🟠 HIGH | 3.4 | package.json | ปานกลาง | 3-5 วัน |
| 21 | Missing transactions (6 routes) | 🟠 HIGH | 3.6 | pr, expense, travel... | ง่าย | 1 วัน |
| 22 | Hardcoded approval tiers | 🟠 HIGH | 6.4 | 5+ route files | ปานกลาง | 2-3 วัน |
| 23 | innerHTML XSS (433 จุด) | 🟠 HIGH | 5.2 | 32 HTML files | ยาก | 3-5 วัน |
| 24 | JWT in localStorage | 🟠 HIGH | 5.3 | api.js:9-10 | ปานกลาง | 1 วัน |
| 25 | SELECT * (120+ queries) | 🟠 HIGH | 4.7 | ทุก route | ปานกลาง | 2-3 วัน |
| 26 | Approval code duplication | 🟠 HIGH | 8.2 | 5+ files | ปานกลาง | 4-6 ชม. |
| 27 | N+1 recalcPhaseProgress | 🟠 HIGH | 9.2 | projects.js:20-41 | ปานกลาง | 2 ชม. |

### 10.2 Production Readiness Checklist

- [ ] ลบ auto-login ออกจาก login.html
- [ ] แก้ requirePermission เป็น fail-closed
- [ ] แก้ WebSocket auth ให้บังคับจริง
- [ ] ลบ/ปิด static login ใน production
- [ ] เพิ่ม graceful shutdown (SIGTERM handler)
- [ ] ลบ password_hash จาก GET /users response
- [ ] ตั้ง CORS_ORIGIN เป็น domain จริง
- [ ] เพิ่ม healthcheck ใน railway.json
- [ ] ซ่อน sensitive fields ใน /api/health
- [ ] แก้ error handler ไม่ให้ leak err.message ใน production
- [ ] Wrap PR/Expense create ใน transaction
- [ ] แก้ budget double-commit (เลือก 1 จุด)
- [ ] เพิ่ม authenticate ก่อน /uploads static serve
- [ ] Block self-approve (requester ≠ approver)
- [ ] เพิ่ม statement_timeout ใน DB pool
- [ ] แก้ N+1 query ใน phases endpoint
- [ ] ตั้ง NODE_ENV=production บน Railway

### 10.3 Quick Wins (ทำได้ภายใน 1-2 ชั่วโมง แต่ลด risk ได้มาก)

1. **ลบ auto-login** — `login.html` ลบ `autoLogin()` (15 นาที) → ปิดช่องโหว่ authentication bypass
2. **แก้ requirePermission** — `auth.js:69` เปลี่ยน `next()` เป็น `res.status(500)` (30 นาที) → ปิด fail-open
3. **ลบ password_hash จาก response** — `auth.js:410` เปลี่ยน `SELECT *` เป็น exclude hash (30 นาที)
4. **ตั้ง CORS** — Railway env var `CORS_ORIGIN=https://your-domain.com` (30 นาที)
5. **Railway healthcheck** — เพิ่ม 2 บรรทัดใน railway.json (30 นาที)
6. **Health endpoint** — ลบ sensitive fields, เหลือ `{ status, time, db }` (1 ชม.)
7. **Graceful shutdown** — เพิ่ม SIGTERM handler 15 บรรทัด (2 ชม.)
8. **WebSocket auth** — ย้าย `wsClients.add(ws)` เข้า try block (2 ชม.)
9. **Statement timeout** — เพิ่ม 1 บรรทัดใน db.js (30 นาที)
10. **OT max hours** — เพิ่ม `if (hours > 12) return 400` (30 นาที)

**รวม Quick Wins ทั้ง 10 ข้อ ≈ 8 ชั่วโมง → ลด CRITICAL findings จาก 9 เหลือ 3**

### 10.4 Roadmap แนะนำ

| สัปดาห์ | งาน | เวลา |
|---------|------|------|
| **1** | Quick Wins ทั้ง 10 ข้อ + transactions (pr, expense, approve) | 2 วัน |
| **2** | Budget double-commit fix, N+1 queries, composite indexes, pagination | 3 วัน |
| **3** | Approval engine refactor (ใช้ approval_templates), self-approve block, audit trail | 3 วัน |
| **4** | XSS: escapeHTML helper + sanitize top 10 files, error middleware | 2 วัน |
| **5** | Test suite (jest + supertest) — auth, approval, PR flow | 3 วัน |
| **6+** | Input validation (Joi), JWT refresh, SELECT * cleanup, structured logging | ongoing |

---

**รวมเวลาประมาณทั้งหมด:** 15-20 วันทำงาน สำหรับแก้ไขทุก finding  
**Minimum viable production:** 5 วัน (Quick Wins + transactions + budget fix + N+1)
