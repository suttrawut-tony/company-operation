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
  const cls = s === 'overdue' ? 'danger' : s.includes('pending') ? 'warning' : ['approved','completed','paid','checked_in'].includes(s) ? 'success' : s === 'draft' ? 'gray' : ['sent_to_sap','received','in_progress'].includes(s) ? 'primary' : s === 'rejected' ? 'danger' : 'gray';
  return `<span class="badge badge-${cls}" style="font-size:10px;">${s.replace(/_/g, ' ')}</span>`;
}
function avatarSm(name, bg) {
  return `<div class="avatar avatar-xs" style="background:${bg || 'var(--primary)'};">${(name || '?')[0]}</div>`;
}
function emptyMsg(msg) {
  return `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">${msg}</div>`;
}

/* ─── Toast Notification System ─── */
function showToast(message, type, duration) {
  type = type || 'success';
  duration = duration !== undefined ? duration : 3000;
  // Create container if not exists
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column-reverse;gap:8px;max-width:380px;';
    document.body.appendChild(container);
    // Inject keyframes once
    var style = document.createElement('style');
    style.textContent = '@keyframes toastSlideIn{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}@keyframes toastSlideOut{from{transform:translateX(0);opacity:1;}to{transform:translateX(100%);opacity:0;}}';
    document.head.appendChild(style);
  }
  var colors = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };
  var bgColors = { success:'#f0fdf4', error:'#fef2f2', warning:'#fffbeb', info:'#eff6ff' };
  var borderColor = colors[type] || colors.info;
  var bgColor = bgColors[type] || bgColors.info;

  var toast = document.createElement('div');
  toast.style.cssText = 'background:'+bgColor+';border:1px solid '+borderColor+'30;border-left:4px solid '+borderColor+';border-radius:8px;padding:12px 16px;font-size:13px;font-family:var(--font,sans-serif);color:#1f2937;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:toastSlideIn 0.25s ease-out;display:flex;align-items:center;gap:10px;min-width:260px;';

  var msgSpan = document.createElement('span');
  msgSpan.style.cssText = 'flex:1;';
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  if (type === 'error') {
    // Error: show close button, no auto-remove
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = 'border:none;background:none;font-size:14px;cursor:pointer;color:#6b7280;padding:0 2px;';
    closeBtn.onclick = function() { removeToast(toast); };
    toast.appendChild(closeBtn);
  } else {
    // Auto-remove after duration
    setTimeout(function() { removeToast(toast); }, duration);
  }

  container.appendChild(toast);

  function removeToast(el) {
    el.style.animation = 'toastSlideOut 0.2s ease-in forwards';
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
  }
}
