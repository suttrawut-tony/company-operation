/**
 * Company Operation — Shared Helpers
 * ใช้ร่วมกันทุกหน้าที่ดึง data จาก API
 */

function fmtMoney(n) {
  n = parseFloat(n) || 0;
  return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 0 });
}
function money(n) {
  n = parseFloat(n) || 0;
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function moneyBaht(n) { return '฿' + money(n); }
function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateShort(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function fmtNum(n) { return Number(n || 0).toLocaleString('th-TH'); }
function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}
function statusBadge(s) {
  const cls = s.includes('pending') ? 'warning' : ['approved','completed','paid','checked_in'].includes(s) ? 'success' : s === 'draft' ? 'gray' : ['sent_to_sap','received','in_progress'].includes(s) ? 'primary' : s === 'rejected' ? 'danger' : 'gray';
  return `<span class="badge badge-${cls}" style="font-size:10px;">${s.replace(/_/g, ' ')}</span>`;
}
function avatarSm(name, bg) {
  return `<div class="avatar avatar-xs" style="background:${bg || 'var(--primary)'};">${(name || '?')[0]}</div>`;
}
function emptyMsg(msg) {
  return `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">${msg}</div>`;
}
