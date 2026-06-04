-- 025: Job Orders — ใบสั่งงาน (must create before booking)
-- Flow: Create Job Order → then create Booking linked to it

CREATE TABLE IF NOT EXISTS job_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  job_order_number VARCHAR(30) UNIQUE,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  job_type VARCHAR(30),
  site_name VARCHAR(200),
  location VARCHAR(200),
  priority VARCHAR(20) DEFAULT 'normal',
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  needs_vehicle BOOLEAN DEFAULT false,
  needs_technician BOOLEAN DEFAULT false,
  needs_flight BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'approved',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jo_company ON job_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_jo_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_jo_dates ON job_orders(planned_start, planned_end);

-- Link bookings to job orders
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_order_id UUID REFERENCES job_orders(id);
CREATE INDEX IF NOT EXISTS idx_bookings_jo ON bookings(job_order_id);
