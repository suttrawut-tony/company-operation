-- 034: Track SAP push status on GL Journals + Advance Requests

ALTER TABLE gl_journals
  ADD COLUMN IF NOT EXISTS sap_doc_num INTEGER,
  ADD COLUMN IF NOT EXISTS sap_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sap_error TEXT;

ALTER TABLE advance_requests
  ADD COLUMN IF NOT EXISTS sap_doc_num INTEGER,
  ADD COLUMN IF NOT EXISTS sap_status VARCHAR(20) DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_gl_journals_sap_pending
  ON gl_journals(sap_status) WHERE sap_status != 'posted';
