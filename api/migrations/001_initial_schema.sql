-- ═══════════════════════════════════════════════════════════
-- SDA Operation — PostgreSQL Database Schema
-- Migration 001: Initial Schema
-- Based on: AI Brief + SAP Blueprint (S.D.A. Group)
-- ═══════════════════════════════════════════════════════════

-- ─── Extensions ───
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════
-- 1. COMPANIES (Multi-tenant)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  slug          VARCHAR(50) UNIQUE NOT NULL,           -- e.g. 'sda-group'
  tax_id        VARCHAR(20),                           -- 0105529041298
  address       TEXT,
  phone         VARCHAR(30),
  logo_url      VARCHAR(500),
  sap_config    JSONB DEFAULT '{}',                    -- SAP connection settings
  settings      JSONB DEFAULT '{}',                    -- general settings
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 2. USERS & AUTH
-- ═══════════════════════════════════════════════════════════
CREATE TYPE user_role AS ENUM (
  'executive', 'pm', 'finance', 'accounting', 'procurement', 'admin', 'staff'
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  email           VARCHAR(200) UNIQUE NOT NULL,
  password_hash   VARCHAR(200),                        -- null if Google auth only
  google_id       VARCHAR(100),
  first_name      VARCHAR(100) NOT NULL,
  first_name_th   VARCHAR(100),
  last_name       VARCHAR(100) NOT NULL,
  last_name_th    VARCHAR(100),
  role            user_role NOT NULL DEFAULT 'staff',
  position        VARCHAR(100),
  department      VARCHAR(50),                         -- MD, CEO, PRJ, ACC, FIN, PRC, SAL, IT, WHL
  sap_user_code   VARCHAR(50),                         -- maps to SAP user
  sap_license     VARCHAR(50),                         -- Professional, Limited-Logistics, etc.
  can_approve     BOOLEAN DEFAULT false,
  approval_limit  DECIMAL(15,2) DEFAULT 0,             -- max amount can approve (THB)
  avatar_url      VARCHAR(500),
  phone           VARCHAR(30),
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ═══════════════════════════════════════════════════════════
-- 3. PROJECTS
-- ═══════════════════════════════════════════════════════════
CREATE TYPE project_status AS ENUM (
  'planning', 'active', 'on_hold', 'completed', 'cancelled'
);

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  code            VARCHAR(30) UNIQUE NOT NULL,         -- SDA-2026-001
  name            VARCHAR(300) NOT NULL,
  description     TEXT,
  status          project_status DEFAULT 'planning',
  start_date      DATE,
  end_date        DATE,
  pm_user_id      UUID REFERENCES users(id),           -- Project Manager
  sap_project_code VARCHAR(30),                        -- OPRJ code in SAP
  tor_amount      DECIMAL(15,2) DEFAULT 0,
  budget_amount   DECIMAL(15,2) DEFAULT 0,
  actual_amount   DECIMAL(15,2) DEFAULT 0,             -- synced from SAP
  progress        INTEGER DEFAULT 0,                   -- 0-100
  settings        JSONB DEFAULT '{}',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_pm ON projects(pm_user_id);

-- Project Team Members
CREATE TABLE project_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  role        VARCHAR(50) DEFAULT 'member',            -- pm, engineer, staff, member
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ═══════════════════════════════════════════════════════════
-- 4. PHASES & STEPS (TOR-based)
-- ═══════════════════════════════════════════════════════════
CREATE TYPE phase_status AS ENUM ('upcoming', 'active', 'completed');

CREATE TABLE phases (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  status      phase_status DEFAULT 'upcoming',
  start_date  DATE,
  end_date    DATE,
  progress    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE phase_steps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id    UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  name        VARCHAR(300) NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  status      VARCHAR(20) DEFAULT 'pending',           -- pending, active, done
  assigned_to UUID REFERENCES users(id),
  start_date  DATE,
  end_date    DATE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 5. TASKS (Kanban Taskboard)
-- ═══════════════════════════════════════════════════════════
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id    UUID REFERENCES phases(id),
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  status      task_status DEFAULT 'todo',
  priority    task_priority DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  due_date    DATE,
  completed_at TIMESTAMPTZ,
  sort_order  INTEGER DEFAULT 0,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

-- ═══════════════════════════════════════════════════════════
-- 6. BUDGET MODULE
-- ═══════════════════════════════════════════════════════════
CREATE TYPE budget_status AS ENUM (
  'draft', 'pending_manager', 'pending_executive', 'approved', 'rejected'
);

CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  project_id    UUID NOT NULL REFERENCES projects(id),
  code          VARCHAR(30) UNIQUE NOT NULL,           -- BG-2026-001
  name          VARCHAR(200),
  status        budget_status DEFAULT 'draft',
  total_tor     DECIMAL(15,2) DEFAULT 0,
  total_budget  DECIMAL(15,2) DEFAULT 0,
  total_actual  DECIMAL(15,2) DEFAULT 0,
  fiscal_year   INTEGER,
  notes         TEXT,
  created_by    UUID REFERENCES users(id),
  approved_by   UUID REFERENCES users(id),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_lines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id     UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,                 -- e.g. "Material - Sounder"
  category      VARCHAR(100),                          -- material, labor, transport, misc
  tor_amount    DECIMAL(15,2) DEFAULT 0,
  budget_amount DECIMAL(15,2) DEFAULT 0,
  actual_amount DECIMAL(15,2) DEFAULT 0,               -- auto-updated from PR/PO/Expense
  sap_account   VARCHAR(10),                           -- GL Account Code (6-digit)
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budgets_project ON budgets(project_id);

-- ═══════════════════════════════════════════════════════════
-- 7. PR/PO MODULE
-- ═══════════════════════════════════════════════════════════
CREATE TYPE pr_status AS ENUM (
  'draft', 'pending_manager', 'pending_finance', 'pending_executive',
  'approved', 'sent_to_sap', 'received', 'rejected', 'cancelled'
);

CREATE TABLE purchase_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  doc_number      VARCHAR(20) UNIQUE NOT NULL,         -- PR26050001
  doc_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status          pr_status DEFAULT 'draft',
  vendor_code     VARCHAR(20),                         -- SAP BP code (VD0001)
  vendor_name     VARCHAR(200),
  total_amount    DECIMAL(15,2) DEFAULT 0,
  tax_code        VARCHAR(10),                         -- IG07, IS07
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  remarks         TEXT,
  sap_doc_entry   INTEGER,                             -- SAP DocEntry after push
  sap_doc_num     VARCHAR(30),                         -- SAP DocNum
  sap_object_type VARCHAR(10),                         -- OPRQ
  sap_synced_at   TIMESTAMPTZ,
  budget_deducted BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pr_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id           UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  line_num        INTEGER NOT NULL,
  item_code       VARCHAR(50),                         -- SAP Item Code
  item_name       VARCHAR(300) NOT NULL,
  quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
  uom             VARCHAR(20) DEFAULT 'EA',            -- Unit of Measure
  unit_price      DECIMAL(15,2) DEFAULT 0,
  total_price     DECIMAL(15,2) DEFAULT 0,
  sap_account     VARCHAR(10),                         -- GL Account (511102, etc.)
  tax_code        VARCHAR(10),
  budget_line_id  UUID REFERENCES budget_lines(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders (created from approved PR or standalone)
CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  pr_id           UUID REFERENCES purchase_requests(id),
  doc_number      VARCHAR(20) UNIQUE NOT NULL,         -- PO26050001
  doc_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status          pr_status DEFAULT 'draft',
  vendor_code     VARCHAR(20),
  vendor_name     VARCHAR(200),
  total_amount    DECIMAL(15,2) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  remarks         TEXT,
  sap_doc_entry   INTEGER,
  sap_doc_num     VARCHAR(30),
  sap_synced_at   TIMESTAMPTZ,
  budget_deducted BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE po_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_num        INTEGER NOT NULL,
  item_code       VARCHAR(50),
  item_name       VARCHAR(300) NOT NULL,
  quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
  uom             VARCHAR(20) DEFAULT 'EA',
  unit_price      DECIMAL(15,2) DEFAULT 0,
  total_price     DECIMAL(15,2) DEFAULT 0,
  sap_account     VARCHAR(10),
  tax_code        VARCHAR(10),
  received_qty    DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pr_company ON purchase_requests(company_id);
CREATE INDEX idx_pr_project ON purchase_requests(project_id);
CREATE INDEX idx_pr_status ON purchase_requests(status);
CREATE INDEX idx_po_company ON purchase_orders(company_id);

-- ═══════════════════════════════════════════════════════════
-- 8. EXPENSE MODULE
-- ═══════════════════════════════════════════════════════════
CREATE TYPE expense_type AS ENUM ('reimbursement', 'advance', 'advance_clear');
CREATE TYPE expense_status AS ENUM (
  'draft', 'pending_manager', 'pending_finance', 'pending_executive',
  'approved', 'paid', 'sent_to_sap', 'rejected', 'cancelled'
);

CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  doc_number      VARCHAR(20) UNIQUE NOT NULL,         -- EXP26050001 / ADV26050001
  doc_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_type    expense_type NOT NULL DEFAULT 'reimbursement',
  status          expense_status DEFAULT 'draft',
  description     VARCHAR(500),
  amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_code        VARCHAR(10),
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  sap_account     VARCHAR(10),                         -- GL Account
  receipt_url     VARCHAR(500),                        -- uploaded receipt image/pdf
  receipt_data    JSONB DEFAULT '{}',                  -- OCR extracted data (Phase 2)
  advance_ref_id  UUID REFERENCES expenses(id),        -- link advance_clear → original advance
  sap_doc_entry   INTEGER,
  sap_doc_num     VARCHAR(30),                         -- OPCH doc number
  sap_synced_at   TIMESTAMPTZ,
  budget_deducted BOOLEAN DEFAULT false,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_project ON expenses(project_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_type ON expenses(expense_type);

-- ═══════════════════════════════════════════════════════════
-- 9. VEHICLE MODULE
-- ═══════════════════════════════════════════════════════════
CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'retired');
CREATE TYPE booking_status AS ENUM (
  'pending', 'approved', 'checked_out', 'checked_in', 'rejected', 'cancelled'
);

CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  plate_number    VARCHAR(30) NOT NULL,                -- กก-1234 กทม
  name            VARCHAR(100) NOT NULL,               -- Toyota Hilux Revo
  vehicle_type    VARCHAR(50),                         -- Pickup, Van, Sedan
  seats           INTEGER DEFAULT 5,
  status          vehicle_status DEFAULT 'available',
  current_km      DECIMAL(10,1) DEFAULT 0,
  fuel_level      VARCHAR(20),
  image_url       VARCHAR(500),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicle_bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  project_id      UUID REFERENCES projects(id),
  travel_id       UUID,                                -- link to travel request (FK added later)
  status          booking_status DEFAULT 'pending',
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  purpose         TEXT,
  passengers      TEXT,                                -- comma-separated names
  km_start        DECIMAL(10,1),
  km_end          DECIMAL(10,1),
  fuel_start      VARCHAR(20),
  fuel_end         VARCHAR(20),
  condition_notes TEXT,
  checked_out_at  TIMESTAMPTZ,
  checked_in_at   TIMESTAMPTZ,
  booked_by       UUID REFERENCES users(id),
  approved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_vehicle ON vehicle_bookings(vehicle_id);
CREATE INDEX idx_bookings_dates ON vehicle_bookings(start_date, end_date);

-- ═══════════════════════════════════════════════════════════
-- 10. TRAVEL MODULE
-- ═══════════════════════════════════════════════════════════
CREATE TYPE travel_status AS ENUM (
  'draft', 'pending_team_confirm', 'pending_manager', 'pending_executive',
  'approved', 'in_progress', 'completed', 'rejected', 'cancelled'
);

CREATE TABLE travel_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  doc_number      VARCHAR(20) UNIQUE NOT NULL,         -- TRV26050001
  destination     VARCHAR(200) NOT NULL,
  purpose         TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          travel_status DEFAULT 'draft',
  estimated_cost  DECIMAL(15,2) DEFAULT 0,
  advance_amount  DECIMAL(15,2) DEFAULT 0,
  advance_expense_id UUID REFERENCES expenses(id),     -- link to advance expense
  vehicle_booking_id UUID REFERENCES vehicle_bookings(id),
  pre_depart_confirmed BOOLEAN DEFAULT false,
  lead_user_id    UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from vehicle_bookings.travel_id
ALTER TABLE vehicle_bookings
  ADD CONSTRAINT fk_booking_travel
  FOREIGN KEY (travel_id) REFERENCES travel_requests(id);

CREATE TABLE travel_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_id       UUID NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  is_lead         BOOLEAN DEFAULT false,
  confirmed       BOOLEAN DEFAULT false,
  confirmed_at    TIMESTAMPTZ,
  UNIQUE(travel_id, user_id)
);

CREATE INDEX idx_travel_company ON travel_requests(company_id);
CREATE INDEX idx_travel_status ON travel_requests(status);

-- ═══════════════════════════════════════════════════════════
-- 11. HOLIDAY / OT MODULE
-- ═══════════════════════════════════════════════════════════
CREATE TYPE ot_type AS ENUM ('normal', 'holiday', 'special');
CREATE TYPE ot_status AS ENUM (
  'draft', 'pending_manager', 'pending_executive', 'approved', 'paid', 'rejected'
);

CREATE TABLE ot_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  doc_number      VARCHAR(20) UNIQUE NOT NULL,         -- OT26050001
  user_id         UUID NOT NULL REFERENCES users(id),
  ot_date         DATE NOT NULL,
  ot_type         ot_type NOT NULL DEFAULT 'normal',
  hours           DECIMAL(4,1) NOT NULL,
  base_rate       DECIMAL(10,2) NOT NULL,              -- hourly rate (THB)
  multiplier      DECIMAL(3,1) NOT NULL,               -- 1.5, 2.0, 3.0
  compensation    DECIMAL(10,2) NOT NULL,              -- auto-calc: base_rate * multiplier * hours
  status          ot_status DEFAULT 'draft',
  reason          TEXT,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ot_company ON ot_requests(company_id);
CREATE INDEX idx_ot_user ON ot_requests(user_id);
CREATE INDEX idx_ot_status ON ot_requests(status);

-- ═══════════════════════════════════════════════════════════
-- 12. NUMBER RUNNING
-- ═══════════════════════════════════════════════════════════
CREATE TABLE number_series (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  doc_type        VARCHAR(30) NOT NULL,                -- PR, PO, EXP, ADV, TRV, OT, VHC, BG
  prefix          VARCHAR(10) NOT NULL,                -- PR, PO, EXP, etc.
  year_month      VARCHAR(4) NOT NULL,                 -- YYMM e.g. '2605'
  current_number  INTEGER NOT NULL DEFAULT 0,          -- last used number
  sap_series_name VARCHAR(30),                         -- SAP series name if synced
  sap_synced      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, doc_type, year_month)
);

-- ═══════════════════════════════════════════════════════════
-- 13. APPROVAL WORKFLOW ENGINE
-- ═══════════════════════════════════════════════════════════
CREATE TYPE approval_action AS ENUM ('approve', 'reject', 'return', 'confirm');

CREATE TABLE approvals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  doc_type        VARCHAR(30) NOT NULL,                -- budget, pr, po, expense, travel, vehicle, ot
  doc_id          UUID NOT NULL,                       -- FK to the document table
  step_order      INTEGER NOT NULL,                    -- 1, 2, 3...
  required_role   user_role NOT NULL,
  approver_id     UUID REFERENCES users(id),           -- specific approver (null = any with role)
  action          approval_action,
  comment         TEXT,
  acted_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approvals_doc ON approvals(doc_type, doc_id);
CREATE INDEX idx_approvals_approver ON approvals(approver_id);

-- Approval Matrix Config (per company)
CREATE TABLE approval_matrix (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  doc_type        VARCHAR(30) NOT NULL,
  min_amount      DECIMAL(15,2) DEFAULT 0,
  max_amount      DECIMAL(15,2) DEFAULT 999999999,
  step_order      INTEGER NOT NULL,
  required_role   user_role NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 14. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════
CREATE TYPE notif_channel AS ENUM ('in_app', 'email', 'discord');

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  user_id         UUID NOT NULL REFERENCES users(id),  -- recipient
  channel         notif_channel DEFAULT 'in_app',
  title           VARCHAR(300) NOT NULL,
  body            TEXT,
  link_url        VARCHAR(500),                        -- deep link to document
  doc_type        VARCHAR(30),
  doc_id          UUID,
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX idx_notif_company ON notifications(company_id);

-- ═══════════════════════════════════════════════════════════
-- 15. ATTACHMENTS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  doc_type        VARCHAR(30),                         -- project, pr, expense, travel, etc.
  doc_id          UUID,
  file_name       VARCHAR(300) NOT NULL,
  file_url        VARCHAR(500) NOT NULL,
  file_size       INTEGER,                             -- bytes
  mime_type       VARCHAR(100),
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_doc ON attachments(doc_type, doc_id);

-- ═══════════════════════════════════════════════════════════
-- 16. ACTIVITY LOG
-- ═══════════════════════════════════════════════════════════
CREATE TABLE activity_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  user_id         UUID REFERENCES users(id),
  action          VARCHAR(50) NOT NULL,                -- created, updated, approved, rejected, synced, etc.
  doc_type        VARCHAR(30),
  doc_id          UUID,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_project ON activity_log(project_id);
CREATE INDEX idx_activity_company ON activity_log(company_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- 17. DISCUSSION & NOTES (pmconsole reuse)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE discussions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  message     TEXT NOT NULL,
  parent_id   UUID REFERENCES discussions(id),         -- reply thread
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  content     TEXT,
  note_type   VARCHAR(30) DEFAULT 'general',           -- meeting, sow, general
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 18. CALENDAR EVENTS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE calendar_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  project_id  UUID REFERENCES projects(id),
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  all_day     BOOLEAN DEFAULT false,
  location    VARCHAR(200),
  event_type  VARCHAR(30) DEFAULT 'meeting',           -- meeting, deadline, travel, ot
  doc_type    VARCHAR(30),
  doc_id      UUID,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_company ON calendar_events(company_id, start_time);

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','users','projects','tasks','budgets',
    'purchase_requests','purchase_orders','expenses',
    'vehicles','vehicle_bookings','travel_requests',
    'ot_requests','number_series','discussions','notes'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END $$;
