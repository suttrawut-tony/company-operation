-- 031: Fix duplicate module icons in company_modules
-- Match icon keys to new ICONS added in nav.js

UPDATE company_modules SET icon = 'booking'   WHERE module_id = 'booking'   AND icon = 'vehicle';
UPDATE company_modules SET icon = 'itemMaster' WHERE module_id = 'items'    AND icon = 'prpo';
UPDATE company_modules SET icon = 'bpGroup'    WHERE module_id = 'bp'       AND icon = 'user';
UPDATE company_modules SET icon = 'changeLog'  WHERE module_id = 'changelog' AND icon = 'reports';
UPDATE company_modules SET icon = 'myTasks'    WHERE module_id = 'my-tasks'  AND icon = 'taskboard';
UPDATE company_modules SET icon = 'quotation'  WHERE module_id = 'quotation' AND icon = 'expense';
