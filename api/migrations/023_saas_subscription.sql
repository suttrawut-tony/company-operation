-- 023: SaaS Subscription — Plans, Subscriptions, Invoices, Usage Tracking

-- ═══ Plans ═══
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  max_users INTEGER,
  max_projects INTEGER,
  max_storage_gb INTEGER DEFAULT 5,
  modules_included TEXT[],
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plans (name, display_name, description, price_monthly, price_yearly, max_users, max_projects, max_storage_gb, modules_included, features, sort_order) VALUES
  ('starter', 'Starter', 'สำหรับทีมเล็ก เริ่มต้นจัดการงาน', 1990, 19900, 5, 3, 5,
   '{dashboard,projects,overview,phases,taskboard,advance,petty-cash,vehicle,ot,help,changelog,setup,permissions}',
   '{"sap_integration":false,"api_access":false,"custom_reports":false}', 1),
  ('professional', 'Professional', 'สำหรับธุรกิจที่ต้องการระบบครบ', 4990, 49900, 20, 15, 25,
   '{dashboard,projects,overview,phases,taskboard,budget,pr-po,advance,petty-cash,expense,travel,vehicle,ot,items,bp,number-running,reports,help,changelog,setup,permissions}',
   '{"sap_integration":false,"api_access":true,"custom_reports":true}', 2),
  ('enterprise', 'Enterprise', 'สำหรับองค์กรขนาดใหญ่ ไม่จำกัด', 9990, 99900, NULL, NULL, 100,
   NULL,
   '{"sap_integration":true,"api_access":true,"custom_reports":true,"priority_support":true}', 3)
ON CONFLICT (name) DO NOTHING;

-- ═══ Subscriptions ═══
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(20) DEFAULT 'trial',
  billing_cycle VARCHAR(10) DEFAULT 'monthly',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_start DATE,
  current_period_end DATE,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  payment_method VARCHAR(30),
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  next_billing_date DATE,
  amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ Invoices ═══
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  subscription_id UUID REFERENCES subscriptions(id),
  invoice_number VARCHAR(30) UNIQUE,
  billing_period_start DATE,
  billing_period_end DATE,
  subtotal DECIMAL(10,2) DEFAULT 0,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(30),
  payment_reference VARCHAR(100),
  pdf_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ Usage Tracking ═══
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  metric VARCHAR(30) NOT NULL,
  current_value INTEGER DEFAULT 0,
  limit_value INTEGER,
  recorded_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, metric, recorded_at)
);

-- ═══ Superadmin role support ═══
-- Add superadmin to users (no company binding)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- ═══ Seed existing companies with Enterprise subscription (active) ═══
INSERT INTO subscriptions (company_id, plan_id, status, billing_cycle, current_period_start, current_period_end, next_billing_date, amount)
SELECT c.id, p.id, 'active', 'yearly', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', CURRENT_DATE + INTERVAL '1 year', p.price_yearly
FROM companies c, plans p WHERE p.name = 'enterprise'
ON CONFLICT (company_id) DO NOTHING;
