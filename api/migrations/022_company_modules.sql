-- 022: Module registry — dynamic sidebar, enable/disable modules per company

CREATE TABLE IF NOT EXISTS company_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  module_id VARCHAR(30) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  module_group VARCHAR(30) NOT NULL DEFAULT 'system',
  icon VARCHAR(30),
  href VARCHAR(100),
  is_enabled BOOLEAN DEFAULT true,
  is_core BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  allowed_roles TEXT[],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_company_modules_cid ON company_modules(company_id);

-- Seed all existing modules for every company
INSERT INTO company_modules (company_id, module_id, module_name, module_group, icon, href, is_enabled, is_core, sort_order)
SELECT c.id,
  m.module_id, m.module_name, m.module_group, m.icon, m.href, true, m.is_core, m.sort_order
FROM companies c
CROSS JOIN (VALUES
  ('dashboard',    'Dashboard',          'main',     'dashboard',    'dashboard.html',       true,  1),
  ('projects',     'All Projects',       'project',  'allProjects',  'projects.html',        false, 1),
  ('overview',     'Project Detail',     'project',  'projectDetail','overview.html',        false, 2),
  ('phases',       'Plan Project',       'project',  'phases',       'phases.html',          false, 3),
  ('taskboard',    'Taskboard',          'project',  'taskboard',    'taskboard.html',       false, 4),
  ('budget',       'Budget',             'document', 'budget',       'budget.html',          false, 1),
  ('pr-po',        'PR / PO',            'document', 'prpo',         'pr-po.html',           false, 2),
  ('advance',      'Advance',            'document', 'advance',      'advance.html',         false, 3),
  ('petty-cash',   'Petty Cash',         'document', 'pettyCash',    'petty-cash.html',      false, 4),
  ('expense',      'Expense',            'document', 'expense',      'expense.html',         false, 5),
  ('travel',       'Travel',             'document', 'travel',       'travel.html',          false, 6),
  ('vehicle',      'Vehicle',            'resource', 'vehicle',      'vehicle.html',         false, 1),
  ('ot',           'Holiday / OT',       'resource', 'ot',           'ot.html',              false, 2),
  ('items',        'Item Master',        'system',   'prpo',         'item-master.html',     false, 1),
  ('bp',           'Business Partner',   'system',   'user',         'bp-master.html',       false, 2),
  ('number-running','Number Running',    'system',   'numberRun',    'number-running.html',  false, 3),
  ('reports',      'Reports',            'system',   'reports',      'reports.html',         false, 4),
  ('permissions',  'User & Permission',  'system',   'permissions',  'user-permissions.html',true,  5),
  ('setup',        'Setup',              'system',   'setup',        'setup.html',           true,  6),
  ('changelog',    'Change Log',         'system',   'reports',      'changelog.html',       true,  7),
  ('help',         'User Guide',         'system',   'help',         'help.html',            true,  8)
) AS m(module_id, module_name, module_group, icon, href, is_core, sort_order)
ON CONFLICT (company_id, module_id) DO NOTHING;
