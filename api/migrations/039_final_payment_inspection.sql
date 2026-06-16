-- 039: Final Payment Inspection Logic
-- งวดสุดท้าย release ได้เมื่อตรวจรับ+แก้ไขเรียบร้อย (inspection completed + issues resolved)

ALTER TABLE phase_payments ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;
ALTER TABLE phase_payments ADD COLUMN IF NOT EXISTS inspection_status VARCHAR(20) DEFAULT 'pending';
-- inspection_status: 'pending' | 'in_progress' | 'completed'
ALTER TABLE phase_payments ADD COLUMN IF NOT EXISTS inspection_date DATE;
ALTER TABLE phase_payments ADD COLUMN IF NOT EXISTS inspection_notes TEXT;
