-- 029: GPS coordinates + required tools on job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS required_tools TEXT;
