-- ═══════════════════════════════════════════════════════════
-- Migration 047: Register Leads + Payments + Sales modules in company_modules
-- So they appear in sidebar navigation for all companies
-- ═══════════════════════════════════════════════════════════

INSERT INTO company_modules (company_id, module_id, module_name, module_group, icon, href, is_enabled, is_core, sort_order)
SELECT c.id,
  m.module_id, m.module_name, m.module_group, m.icon, m.href, true, false, m.sort_order
FROM companies c
CROSS JOIN (VALUES
  -- Sales group (between project and document)
  ('leads',           'Leads',              'sales',    'leads',        'leads.html',            1),
  ('tenders',         'Tenders',            'sales',    'tenders',      'tenders.html',          2),
  ('bid-preparation', 'Bid Preparation',    'sales',    'bidPrep',      'bid-preparation.html',  3),
  ('contracts',       'Contracts',          'sales',    'contracts',    'contracts.html',        4),
  ('guarantees',      'Guarantees',         'sales',    'guarantees',   'guarantees.html',       5),
  ('disputes',        'Disputes',           'sales',    'disputes',     'disputes.html',         6),
  -- Document group (add payments)
  ('payments',        'Payments',           'document', 'payments',     'payments.html',         7)
) AS m(module_id, module_name, module_group, icon, href, sort_order)
ON CONFLICT (company_id, module_id) DO NOTHING;
