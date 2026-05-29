/**
 * Company Operation — Precise Document Highlight
 * วงเฉพาะแถว/item ที่มี doc number ตรงกับที่กดมา
 *
 * URL patterns:
 *   ?hl=doc&doc=PR26050012     → วงแถวที่มีเลข PR26050012
 *   ?hl=doc&doc=BG-2026-003    → วง budget card ที่มี code BG-2026-003
 *   ?hl=pending                → วงทุกแถวที่ status = pending
 *   ?hl=budget-used            → วง budget summary items
 *   ?hl=month-total            → วง expense stats
 */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const hl = params.get('hl');
  if (!hl) return;
  const doc = params.get('doc') || '';
  setTimeout(() => highlightRows(hl, doc), 500);
});

function findRowsByDocNumber(docNumber) {
  const rows = [];
  if (!docNumber) return rows;

  const search = docNumber.toLowerCase();

  // Search ONLY in row-level elements (NOT .card which is too broad)
  const selectors = [
    '.kanban-card',
    '.expense-item',
    '.ot-item',
    '.booking-item',
    '.approval-item',
    '.travel-card',
    '.project-row',
    '.summary-item',
    'table tbody tr'
  ];

  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      const text = el.textContent.toLowerCase();
      if (text.includes(search)) {
        rows.push(el);
      }
    });
  });

  // If still no match, try broader search in card headers only
  if (!rows.length) {
    document.querySelectorAll('.card-header').forEach(header => {
      if (header.textContent.toLowerCase().includes(search)) {
        rows.push(header.closest('.card'));
      }
    });
  }

  return rows;
}

function findRowsByStatus(status) {
  const rows = [];

  // Kanban cards
  document.querySelectorAll('.kanban-card').forEach(card => {
    const badges = card.querySelectorAll('.badge');
    badges.forEach(b => {
      const t = b.textContent.toLowerCase();
      if (t.includes('pending') || t.includes('manager') || t.includes('finance') || t.includes('executive')) {
        rows.push(card);
      }
    });
  });

  // Expense items
  document.querySelectorAll('.expense-item').forEach(item => {
    const badge = item.querySelector('.badge');
    if (badge && badge.textContent.toLowerCase().includes('pending')) rows.push(item);
  });

  // OT items
  document.querySelectorAll('.ot-item').forEach(item => {
    const badge = item.querySelector('.badge');
    if (badge && badge.textContent.toLowerCase().includes('pending')) rows.push(item);
  });

  // Travel cards
  document.querySelectorAll('.travel-card').forEach(card => {
    const badge = card.querySelector('.badge');
    if (badge && badge.textContent.toLowerCase().includes('pending')) rows.push(card);
  });

  // Booking items
  document.querySelectorAll('.booking-item').forEach(item => {
    const badge = item.querySelector('.badge');
    if (badge && badge.textContent.toLowerCase().includes('pending')) rows.push(item);
  });

  return rows;
}

function highlightRows(type, doc) {
  let rows = [];

  if (type === 'doc' && doc) {
    // ── Specific document ──
    rows = findRowsByDocNumber(doc);
  }
  else if (type === 'pending') {
    rows = findRowsByStatus('pending');
  }
  else if (type === 'budget-used') {
    document.querySelectorAll('.summary-item').forEach(item => rows.push(item));
  }
  else if (type === 'month-total' || type === 'expense') {
    document.querySelectorAll('.exp-stat').forEach(item => rows.push(item));
  }
  else if (type === 'projects' || type === 'active-projects') {
    document.querySelectorAll('.ov-card').forEach(item => rows.push(item));
  }

  if (!rows.length) return;

  // Apply highlight with stagger
  rows.forEach((row, i) => {
    setTimeout(() => row.classList.add('hl-row'), i * 80);
  });

  // Scroll to first
  rows[0].scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Remove after 3s
  setTimeout(() => {
    rows.forEach(row => row.classList.remove('hl-row'));
    const url = new URL(window.location);
    url.searchParams.delete('hl');
    url.searchParams.delete('doc');
    window.history.replaceState({}, '', url);
  }, 3500);
}
