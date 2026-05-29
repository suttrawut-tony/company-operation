-- 020: Vehicle management overhaul
-- Part 1: Vehicle details + lease info
-- Part 2: Insurance + Claims
-- Part 3: Maintenance + Issues
-- Part 5: Alerts

-- ═══ Part 1: Add detail columns to vehicles ═══
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brand VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color VARCHAR(30);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin_number VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(20) DEFAULT 'owned';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lease_company VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lease_start DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lease_end DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lease_monthly_cost DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lease_contract_number VARCHAR(50);

-- ═══ Part 2: Insurance + Claims ═══
CREATE TABLE IF NOT EXISTS vehicle_insurance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  insurance_type VARCHAR(30) NOT NULL DEFAULT 'compulsory',
  policy_number VARCHAR(50),
  insurance_company VARCHAR(100),
  coverage_start DATE,
  coverage_end DATE,
  premium DECIMAL(10,2) DEFAULT 0,
  coverage_amount DECIMAL(12,2) DEFAULT 0,
  deductible DECIMAL(10,2) DEFAULT 0,
  broker VARCHAR(100),
  broker_phone VARCHAR(20),
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vid ON vehicle_insurance(vehicle_id);

CREATE TABLE IF NOT EXISTS vehicle_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES vehicle_insurance(id),
  booking_id UUID REFERENCES vehicle_bookings(id),
  claim_number VARCHAR(50),
  claim_date DATE,
  claim_type VARCHAR(30) DEFAULT 'accident',
  description TEXT,
  damage_amount DECIMAL(10,2) DEFAULT 0,
  claim_amount DECIMAL(10,2) DEFAULT 0,
  received_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open',
  driver_name VARCHAR(100),
  police_report_number VARCHAR(50),
  repair_shop VARCHAR(100),
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_claims_vid ON vehicle_claims(vehicle_id);

-- ═══ Part 3: Maintenance + Issues ═══
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(30) DEFAULT 'scheduled',
  description TEXT,
  km_at_service DECIMAL(10,1),
  service_date DATE,
  completed_date DATE,
  service_center VARCHAR(100),
  cost DECIMAL(10,2) DEFAULT 0,
  invoice_number VARCHAR(50),
  next_service_km DECIMAL(10,1),
  next_service_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled',
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_maint_vid ON vehicle_maintenance(vehicle_id);

CREATE TABLE IF NOT EXISTS vehicle_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES vehicle_bookings(id),
  reported_by UUID REFERENCES users(id),
  report_date DATE DEFAULT CURRENT_DATE,
  issue_type VARCHAR(30) DEFAULT 'other',
  severity VARCHAR(10) DEFAULT 'medium',
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',
  resolved_date DATE,
  resolution TEXT,
  maintenance_id UUID REFERENCES vehicle_maintenance(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_issues_vid ON vehicle_issues(vehicle_id);

-- ═══ Part 5: Alerts ═══
CREATE TABLE IF NOT EXISTS vehicle_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  alert_type VARCHAR(30) NOT NULL,
  alert_date DATE DEFAULT CURRENT_DATE,
  reference_id UUID,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_vid ON vehicle_alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_date ON vehicle_alerts(alert_date);
