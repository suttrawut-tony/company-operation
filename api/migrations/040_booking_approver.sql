-- 040: Add approver_id to bookings table for approval workflow
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES users(id);
