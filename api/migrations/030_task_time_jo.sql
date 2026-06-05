-- 030: Tasks — time range, hours, JO/booking link, location, type
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(6,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS job_order_id UUID REFERENCES job_orders(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(30) DEFAULT 'general';
CREATE INDEX IF NOT EXISTS idx_tasks_jo ON tasks(job_order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_booking ON tasks(booking_id);
