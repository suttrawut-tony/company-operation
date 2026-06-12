/**
 * Push GL Journal to SAP B1 as Journal Entry
 * Non-blocking: returns result or { skipped: true } if SAP not configured
 */
const sapClient = require('./sapClient');

async function pushJournalToSAP(journal, lines, projectCode) {
  if (!sapClient.isConfigured()) {
    return { skipped: true, reason: 'SAP not configured' };
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
    skipped: false,
    sapDocNum: result.JdtNum || result.Number || result.DocEntry,
    sapDocEntry: result.DocEntry || result.JdtNum,
    sapResponse: result
  };
}

module.exports = { pushJournalToSAP };
