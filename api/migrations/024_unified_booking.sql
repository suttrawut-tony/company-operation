-- 024: Unified Booking System — Vehicle + Technician + Flight
-- Merges vehicle_bookings into a unified bookings table

-- ═══ Technicians (Solar Cell) ═══
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID REFERENCES users(id),
  code VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  nickname VARCHAR(50),
  phone VARCHAR(20),
  specialization VARCHAR(50) DEFAULT 'install',
  certification TEXT[],
  skill_level VARCHAR(20) DEFAULT 'junior',
  daily_rate DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'available',
  notes TEXT,
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_technicians_company ON technicians(company_id);

-- ═══ Unified Bookings ═══
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  booking_type VARCHAR(20) NOT NULL DEFAULT 'vehicle',
  project_id UUID REFERENCES projects(id),
  travel_id UUID,

  -- Resource refs
  vehicle_id UUID REFERENCES vehicles(id),
  technician_id UUID REFERENCES technicians(id),

  -- Time
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE NOT NULL,
  end_time TIME,
  all_day BOOLEAN DEFAULT true,

  -- General
  title VARCHAR(200),
  purpose TEXT,
  location VARCHAR(200),
  remarks TEXT,
  color VARCHAR(7),

  -- Vehicle specific
  passengers TEXT,
  km_start DECIMAL(10,1),
  km_end DECIMAL(10,1),
  fuel_start VARCHAR(20),
  fuel_end VARCHAR(20),
  condition_notes TEXT,

  -- Technician specific
  job_type VARCHAR(30),
  site_name VARCHAR(200),
  system_capacity VARCHAR(50),
  job_description TEXT,
  tools_required TEXT,
  safety_notes TEXT,
  job_status VARCHAR(20) DEFAULT 'scheduled',
  job_completed_at TIMESTAMPTZ,
  job_report TEXT,

  -- Flight specific
  airline VARCHAR(100),
  flight_number VARCHAR(20),
  departure_airport VARCHAR(10),
  arrival_airport VARCHAR(10),
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  return_flight_number VARCHAR(20),
  return_departure_time TIMESTAMPTZ,
  return_arrival_time TIMESTAMPTZ,
  passenger_names TEXT,
  booking_reference VARCHAR(50),
  ticket_cost DECIMAL(10,2),
  booking_channel VARCHAR(30),
  e_ticket_url VARCHAR(500),

  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  booked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_company ON bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tech ON bookings(technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_project ON bookings(project_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ═══ Booking Participants ═══
CREATE TABLE IF NOT EXISTS booking_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  name VARCHAR(100),
  role VARCHAR(30) DEFAULT 'passenger',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ Migrate vehicle_bookings → bookings ═══
INSERT INTO bookings (id, company_id, booking_type, project_id, travel_id, vehicle_id,
  start_date, end_date, all_day, title, purpose, passengers,
  km_start, km_end, fuel_start, fuel_end, condition_notes,
  status, approved_by, checked_out_at, checked_in_at, booked_by, created_at, updated_at, color)
SELECT vb.id,
  v.company_id, 'vehicle', vb.project_id, vb.travel_id, vb.vehicle_id,
  vb.start_date, vb.end_date, true,
  COALESCE(v.name,'') || ' — ' || COALESCE(vb.purpose,'Booking'),
  vb.purpose, vb.passengers,
  vb.km_start, vb.km_end, vb.fuel_start, vb.fuel_end, vb.condition_notes,
  vb.status::text, vb.approved_by, vb.checked_out_at, vb.checked_in_at, vb.booked_by,
  vb.created_at, vb.updated_at, '#4285f4'
FROM vehicle_bookings vb
JOIN vehicles v ON vb.vehicle_id = v.id
ON CONFLICT (id) DO NOTHING;

-- Add booking module to company_modules for all companies
INSERT INTO company_modules (company_id, module_id, module_name, module_group, icon, href, is_enabled, is_core, sort_order)
SELECT c.id, 'booking', 'Booking', 'resource', 'vehicle', 'booking.html', true, false, 0
FROM companies c
ON CONFLICT (company_id, module_id) DO NOTHING;
