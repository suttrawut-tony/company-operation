-- 028: Add start_date to tasks for calendar view
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
