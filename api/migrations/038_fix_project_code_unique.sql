-- Fix: project code should be unique per company, not globally
-- This allows different companies to use the same project code
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_code_key;
ALTER TABLE projects ADD CONSTRAINT projects_company_code_unique UNIQUE (company_id, code);

-- Same fix for budgets
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_code_key;
ALTER TABLE budgets ADD CONSTRAINT budgets_company_code_unique UNIQUE (company_id, code);
