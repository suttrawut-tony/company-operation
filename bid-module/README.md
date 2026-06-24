# Bid Module — Standalone Design (Document Chain)

ออกแบบ **แยกจากระบบเดิม** ก่อน — ถ้า Boss โอเค ค่อยรวมเข้า `poc/` + `api/`
Prototype คลิกได้: เปิด `bid-module/index.html` ในเบราว์เซอร์ (ไม่ต้องรัน server)

---

## 1. แนวคิดหลัก — "เอกสารต่อเนื่อง" (เหมือน PR→PO)

ระบบเดิมทำ document chain แบบนี้:

```
PR ──(from-pr)──> PO ──> GRPO ──> AP Invoice
   เชื่อมด้วย FK (pr_id, po_id) + copy tracking (copied_qty, pr_line_id)
```

**Bid Module ใช้แพทเทิร์นเดียวกัน** — 1 งานประมูล (Deal) เดินผ่านห่วงโซ่เอกสาร 9 ใบ
แต่ละใบ "แปลงเป็น" (convert) ใบถัดไป โดยยกข้อมูล (carry-forward) ไปให้อัตโนมัติ:

```
GNG ─> BD ─> GB ─┐
                 ├─> SUB ─> RES ─┬─> CT ─> DLV ─> BIL ─> REL
                 │               │
   (Bid Bond แนบ)│               └─(แพ้)─> DISPUTE (อุทธรณ์)
```

---

## 2. ห่วงโซ่เอกสาร (Document Types)

| # | เฟส | เอกสาร | Prefix | แปลงจาก | แปลงเป็น | ข้อมูลที่ยกไป (carry-forward) |
|---|-----|--------|--------|---------|----------|------------------------------|
| 2 | Go/No-Go | ใบตัดสินใจเข้าประมูล | `GNG` | (Tender) | BD | tender, ราคากลาง, eligibility |
| 3 | Bid Prep | ใบเตรียมข้อเสนอ (BOQ) | `BD` | GNG | GB + SUB | BOQ, ราคาเสนอ, เอกสาร 3 ซอง |
| 4 | Bid Bond | หลักประกันซอง | `GB` | BD | (แนบ SUB) | วงเงิน 5%, ธนาคาร, ค่าธรรมเนียม |
| 5 | Submission | ใบยื่นข้อเสนอ | `SUB` | BD+GB | RES | เลข e-GP, ราคาเสนอ, checklist |
| 6 | Result | ใบผลการพิจารณา | `RES` | SUB | CT **หรือ** Dispute | ผลแพ้/ชนะ, ราคาคู่แข่ง |
| 7 | Contract | สัญญา | `CT` | RES | DLV + PerfBond | มูลค่าสัญญา, งวดงาน |
| 8 | Delivery | ใบส่งมอบ/ตรวจรับ | `DLV` | CT (งวด) | BIL | งวด, ตรวจรับ, ค่าปรับ |
| 9 | Billing | ใบวางบิล/เบิกจ่าย | `BIL` | DLV | (Payment) | มูลค่างวด, กำหนดจ่าย |
| 10 | Bond Release | คืนหลักประกัน | `REL` | CT | (ปิดงาน) | คืน bond, track record |

> หมายเหตุ: GB (เฟส 4) และ REL (เฟส 10) ใช้ตาราง `guarantees` เดิม — ไม่ต้องสร้างใหม่

---

## 3. กลไก convert (ตามแบบ `POST /po/from-pr`)

แต่ละการแปลงเป็น endpoint เดียวกันทั้ง pattern:

```
POST /api/bid/:fromType/:id/convert-to/:toType
  → validate ใบต้นทาง (สถานะ + ครบเงื่อนไข)
  → สร้างเลขเอกสารใหม่ (number_series)
  → INSERT ใบใหม่ + ยก field carry-forward
  → UPDATE ใบต้นทาง (link target_id + status)
  → return ใบใหม่
```

เหมือน PR→PO ทุกประการ: validate → gen number → insert → update source → link.

---

## 4. Schema sketch (เพิ่มต่อจาก migration 045)

โครงเดิมมี `tenders / bid_preparations / contracts / guarantees / disputes` แล้ว
ที่ต้องเพิ่มเพื่อรองรับ chain:

```sql
-- ตัวเชื่อม chain (FK ไปข้างหน้า) — เพิ่มทุกตารางในสาย
ALTER TABLE bid_preparations ADD COLUMN gng_id UUID REFERENCES bid_decisions(id);
ALTER TABLE contracts        ADD COLUMN result_id UUID REFERENCES bid_results(id);
-- ...ทุกใบมี <prev>_id ชี้ใบก่อนหน้า + status ขับ flow

-- ตาราง/engine ใหม่ที่ยังขาด (จาก mockup)
bid_decisions      (GNG)  -- Go/No-Go + eligibility_json + win_score + decision
bid_submissions    (SUB)  -- e-GP no, checklist_json, submitted_at
bid_results        (RES)  -- rank, our_price, winner_price, competitors_json
deliveries         (DLV)  -- milestone, inspect_date, penalty
contract_billings  (BIL)  -- milestone, billed_at, paid_at, due_date
contract_milestones      -- งวดงานจากสัญญา (แม่แบบ DLV/BIL)
bid_documents            -- compliance checklist ผูก TOR (3 ซอง)
track_records            -- คลังผลงาน (ปิดงาน → reuse เฟส 2)

-- number_series: เพิ่ม doc_type  GNG / SUB / RES / DLV / BIL
```

---

## 5. UI ที่ทำใน prototype (ตรงแพทเทิร์น `doc-detail.html`)

- **Deals list** — ตารางงานประมูล + mini-chain bar (เห็นทุกงานอยู่ขั้นไหน)
- **Pipeline (Kanban)** — งานเรียงตามขั้นของห่วงโซ่
- **Deal view** — **Document Flow Chain** เต็ม (คลิกใบไหนก็เปิดได้) ← หัวใจ
- **Document view** — รายละเอียดแต่ละใบ + **panel "เอกสารต่อเนื่อง"** (ปุ่ม convert) + chain aside
  เหมือน tab "Document Flow" + ปุ่ม "Copy To" ของ `doc-detail.html`

---

## 6. วิธีรวมเข้าระบบเดิม (เมื่ออนุมัติ)

1. เพิ่มกลุ่มเมนู **Bidding** ใน `nav.js` (มี Pre-Sales group อยู่แล้ว — ขยายต่อ)
2. migration ใหม่ (046_bid_chain.sql) ตาม §4
3. routes ใหม่: `bid-decisions.js / submissions.js / results.js / deliveries.js / billings.js` + endpoint `convert-to`
4. หน้า: `go-no-go.html / bid-submission.html / bid-result.html / delivery.html / billing.html`
   ต่อยอด: `bid-preparation.html / contracts.html / guarantees.html`
5. ใส่ chain ใน `doc-detail.html` ให้รู้จัก doc type ใหม่ (renderDocFlowChain)
6. number_series + approval templates (doc_type ใหม่)

---

## 7. ทำไมออกแบบแยกก่อน

- ทดสอบ flow ห่วงโซ่เอกสารให้ "ลื่น" ก่อน แตะ schema/route จริง
- prototype เป็น HTML เดียว portable — ไม่กระทบ production
- เห็นภาพ convert chain ครบ loop (รวมเส้นแพ้→อุทธรณ์) ก่อนลงทุน build เต็ม
