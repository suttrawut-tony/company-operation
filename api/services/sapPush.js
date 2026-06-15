/**
 * Push GL Journal to ERP as Journal Entry
 *
 * Non-blocking. Return shapes (all expose `skipped` for back-compat with callers):
 *   not configured → { ok:false, skipped:true,  reason:'SAP_NOT_CONFIGURED' }
 *   pushed         → { ok:true,  skipped:false, sapDocNum, sapDocEntry, sapResponse }
 *
 * Uses unified env vars: SAP_BASE_URL, SAP_COMPANY_DB, SAP_USERNAME, SAP_PASSWORD.
 */
const sapClient = require('./sapClient');

async function pushJournalToSAP(journal, lines, projectCode) {
  if (!sapClient.isConfigured()) {
    // Do NOT silently "succeed". Make it loud that the doc was NOT sent to SAP,
    // so a misconfiguration can't quietly drop postings. Caller can branch on
    // `ok:false` / reason, while `skipped:true` keeps existing callers working.
    console.warn(
      '[SAP] push SKIPPED — Service Layer not configured (set SAP_BASE_URL, ' +
      'SAP_COMPANY_DB, SAP_USERNAME, SAP_PASSWORD). Journal was NOT posted to SAP. ' +
      'journal=' + (journal ? (journal.doc_number || journal.id || '?') : '?')
    );
    return { ok: false, skipped: true, reason: 'SAP_NOT_CONFIGURED' };
  }

  const sapBody = {
    ReferenceDate: journal.created_at
      ? new Date(journal.created_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    Memo: (journal.remarks || journal.doc_number || '').substring(0, 254),
    Reference: (journal.doc_number || '').substring(0, 99),
    Reference2: (journal.doc_type || '').substring(0, 99),
    JournalEntryLines: lines.map(function(l) {
      var line = {
        AccountCode: l.gl_account,
        Debit: parseFloat(l.debit) || 0,
        Credit: parseFloat(l.credit) || 0,
        LineMemo: (l.account_name || l.description || '').substring(0, 99)
      };
      if (projectCode) line.ProjectCode = projectCode;
      return line;
    })
  };

  var result = await sapClient.createJournalEntry(sapBody);
  return {
    ok: true,
    skipped: false,
    sapDocNum: result.JdtNum || result.Number || result.DocEntry,
    sapDocEntry: result.DocEntry || result.JdtNum,
    sapResponse: result
  };
}

module.exports = { pushJournalToSAP };
