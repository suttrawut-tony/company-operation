/**
 * Company Operation — Excel Export Utility
 * ใช้ SheetJS (xlsx) จาก CDN สำหรับ export ตารางเป็น .xlsx
 *
 * Usage:
 *   // From array of objects
 *   exportExcel(data, 'filename', { sheetName: 'Sheet1' });
 *
 *   // From HTML table element
 *   exportTableToExcel('#my-table', 'filename');
 *
 *   // Multiple sheets
 *   exportExcelMultiSheet([
 *     { name: 'Summary', data: summaryArr },
 *     { name: 'Details', data: detailArr },
 *   ], 'report');
 */

/* ─── Load SheetJS from CDN (lazy, once) ─── */
let _xlsxReady = null;
function _ensureXLSX() {
  if (_xlsxReady) return _xlsxReady;
  if (window.XLSX) { _xlsxReady = Promise.resolve(); return _xlsxReady; }
  _xlsxReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load SheetJS library'));
    document.head.appendChild(s);
  });
  return _xlsxReady;
}

/**
 * Export array of objects to .xlsx
 * @param {Array<Object>} data - array of row objects
 * @param {string} filename - filename without extension
 * @param {Object} [opts] - { sheetName, headers, colWidths }
 *   headers: { key: 'Display Header' } mapping to rename columns
 *   colWidths: [{ wch: 20 }, ...] column width array
 */
async function exportExcel(data, filename, opts) {
  if (!data || !data.length) {
    showToast('No data to export', 'warning');
    return;
  }
  await _ensureXLSX();
  opts = opts || {};
  const sheetName = opts.sheetName || 'Data';

  // If headers mapping provided, rename keys
  let exportData = data;
  if (opts.headers) {
    const keys = Object.keys(opts.headers);
    exportData = data.map(row => {
      const out = {};
      keys.forEach(k => { out[opts.headers[k]] = row[k]; });
      return out;
    });
  }

  const ws = XLSX.utils.json_to_sheet(exportData);

  // Auto-width: calculate from data
  if (opts.colWidths) {
    ws['!cols'] = opts.colWidths;
  } else {
    ws['!cols'] = _autoColWidths(exportData);
  }

  // Style header row bold (SheetJS community edition = no styling, but cols width works)
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fname = (filename || 'export') + '_' + _datestamp() + '.xlsx';
  XLSX.writeFile(wb, fname);
  showToast('Exported: ' + fname, 'success');
}

/**
 * Export multiple sheets
 * @param {Array<{name:string, data:Array}>} sheets
 * @param {string} filename
 */
async function exportExcelMultiSheet(sheets, filename) {
  if (!sheets || !sheets.length) {
    showToast('No data to export', 'warning');
    return;
  }
  await _ensureXLSX();
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    if (!s.data || !s.data.length) return;
    const ws = XLSX.utils.json_to_sheet(s.data);
    ws['!cols'] = _autoColWidths(s.data);
    XLSX.utils.book_append_sheet(wb, ws, (s.name || 'Sheet').substring(0, 31));
  });
  if (!wb.SheetNames.length) {
    showToast('No data to export', 'warning');
    return;
  }
  const fname = (filename || 'export') + '_' + _datestamp() + '.xlsx';
  XLSX.writeFile(wb, fname);
  showToast('Exported: ' + fname, 'success');
}

/**
 * Export an HTML <table> element to .xlsx
 * @param {string|HTMLElement} tableOrSelector - CSS selector or element
 * @param {string} filename
 * @param {string} [sheetName]
 */
async function exportTableToExcel(tableOrSelector, filename, sheetName) {
  await _ensureXLSX();
  const el = typeof tableOrSelector === 'string'
    ? document.querySelector(tableOrSelector)
    : tableOrSelector;
  if (!el) {
    showToast('Table not found', 'error');
    return;
  }
  const ws = XLSX.utils.table_to_sheet(el, { raw: false });
  // auto col widths from sheet
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const cols = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    let max = 10;
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v != null) max = Math.max(max, String(cell.v).length + 2);
    }
    cols.push({ wch: Math.min(max, 50) });
  }
  ws['!cols'] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Data');
  const fname = (filename || 'export') + '_' + _datestamp() + '.xlsx';
  XLSX.writeFile(wb, fname);
  showToast('Exported: ' + fname, 'success');
}

/* ─── Internal helpers ─── */
function _datestamp() {
  return new Date().toISOString().slice(0, 10);
}

function _autoColWidths(data) {
  if (!data.length) return [];
  const keys = Object.keys(data[0]);
  return keys.map(k => {
    let max = k.length;
    data.forEach(row => {
      const v = row[k];
      if (v != null) max = Math.max(max, String(v).length);
    });
    return { wch: Math.min(max + 3, 50) };
  });
}

/**
 * Compatibility wrapper — handles two calling conventions:
 *   exportToExcel(headers[], rows[][], filename, sheetName)   — 2D array with separate headers
 *   exportToExcel(dataObjects[], filename, sheetName)         — array of objects (keys = headers)
 */
async function exportToExcel(headersOrData, rowsOrFilename, filenameOrSheet, sheetNameOpt) {
  // Detect which pattern: if 2nd arg is an array → (headers, rows, filename, sheet)
  if (Array.isArray(rowsOrFilename)) {
    const headers = headersOrData;
    const rows = rowsOrFilename;
    const data = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
    return exportExcel(data, filenameOrSheet || 'export', { sheetName: sheetNameOpt });
  }
  // Otherwise: (dataObjects, filename, sheetName)
  return exportExcel(headersOrData, rowsOrFilename || 'export', { sheetName: filenameOrSheet });
}

/**
 * Quick helper: build export button HTML (consistent style across all pages)
 * @param {string} onclickFn - function name to call
 * @param {string} [label] - button text
 * @returns {string} HTML string
 */
function excelBtnHTML(onclickFn, label) {
  return `<button class="btn btn-secondary" onclick="${onclickFn}" style="display:flex;align-items:center;gap:6px;">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
    ${label || 'Export Excel'}
  </button>`;
}
