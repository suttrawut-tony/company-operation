/**
 * Company Operation — Sidebar Navigation (Premium Layout)
 * Fixed sidebar ซ้ายมือ + Top bar + Content area
 * Style: Linear / Notion / Vercel-inspired
 */

// Auto-load i18n.js if not already present
if (typeof I18N === 'undefined') {
  const s = document.createElement('script');
  s.src = 'assets/js/i18n.js';
  s.onload = () => { if (typeof I18N !== 'undefined') I18N.applyTranslations(); };
  document.head.appendChild(s);
}

// Load searchable select
(function(){const s=document.createElement('script');s.src='assets/js/searchable-select.js';document.head.appendChild(s);})();

// Lucide SVG icon helper
function icon(path, size = 18) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

const ICONS = {
  dashboard:    icon('<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>'),
  overview:     icon('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
  allProjects:  icon('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="m9 13 3-3 3 3"/>'),
  projectDetail:icon('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13h4"/><path d="M10 17h4"/><path d="M10 9h1"/>'),
  phases:       icon('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>'),
  taskboard:    icon('<rect width="6" height="14" x="2" y="6" rx="2"/><rect width="6" height="10" x="9" y="2" rx="2"/><rect width="6" height="14" x="16" y="8" rx="2"/>'),
  budget:       icon('<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
  prpo:         icon('<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'),
  expense:      icon('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 10h8"/><path d="M8 14h4"/>'),
  advance:      icon('<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>'),
  pettyCash:    icon('<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>'),
  vehicle:      icon('<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'),
  travel:       icon('<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'),
  ot:           icon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  numberRun:    icon('<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>'),
  reports:      icon('<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'),
  permissions:  icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>'),
  setup:        icon('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  search:       icon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  bell:         icon('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  logout:       icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'),
  user:         icon('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  chevronLeft:  icon('<path d="m15 18-6-6 6-6"/>'),
  chevronRight: icon('<path d="m9 18 6-6-6-6"/>'),
  menu:         icon('<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>'),
  help:         icon('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
  // Pre-Sales icons
  tenders:      icon('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
  bidPrep:      icon('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 10h8"/><path d="M8 14h4"/><path d="M16 14h.01"/>'),
  contracts:    icon('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/>'),
  guarantees:   icon('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  disputes:     icon('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  // extra icons to avoid duplicates
  myTasks:      icon('<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>'),
  quotation:    icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/>'),
  booking:      icon('<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><circle cx="16" cy="16" r="6"/><path d="M16 14v2l1 1"/>'),
  itemMaster:   icon('<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
  changeLog:    icon('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-4"/><path d="m8 18 4-4 4 4"/>'),
  bpGroup:      icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  warehouse:    icon('<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>'),
};

// Navigation groups — hardcode fallback if API fails
const NAV_GROUPS_FALLBACK = [
  { label: 'Main', iconColor: 'icon-blue', items: [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, href: 'dashboard.html' },
    { id: 'my-tasks', label: 'My Tasks', icon: ICONS.myTasks, href: 'my-tasks.html' },
  ] },
  { label: 'Project', collapsible: true, iconColor: 'icon-purple', items: [
    { id: 'projects', label: 'All Projects', icon: ICONS.allProjects, href: 'projects.html' },
    { id: 'overview', label: 'Project Detail', icon: ICONS.projectDetail, href: 'overview.html' },
    { id: 'phases', label: 'Plan Project', icon: ICONS.phases, href: 'phases.html' },
    { id: 'taskboard', label: 'Taskboard', icon: ICONS.taskboard, href: 'taskboard.html' },
  ]},
  { label: 'Sales', collapsible: true, iconColor: 'icon-purple', items: [
    { id: 'tenders', label: 'Tenders', icon: icon('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'), href: 'tenders.html' },
    { id: 'bid-preparation', label: 'Bid Preparation', icon: icon('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 10h8"/><path d="M8 14h4"/><path d="M16 14h.01"/>'), href: 'bid-preparation.html' },
    { id: 'contracts', label: 'Contracts', icon: icon('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/>'), href: 'contracts.html' },
    { id: 'guarantees', label: 'Guarantees', icon: icon('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'), href: 'guarantees.html' },
    { id: 'disputes', label: 'Disputes', icon: icon('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'), href: 'disputes.html' },
  ]},
  { label: 'Document', collapsible: true, iconColor: 'icon-green', items: [
    { id: 'budget', label: 'Budget', icon: ICONS.budget, href: 'budget.html' },
    { id: 'pr-po', label: 'PR / PO', icon: ICONS.prpo, href: 'pr-po.html' },
    { id: 'quotation', label: 'Quotation', icon: ICONS.quotation, href: 'quotation.html' },
    { id: 'advance', label: 'Advance', icon: ICONS.advance, href: 'advance.html' },
    { id: 'petty-cash', label: 'Petty Cash', icon: ICONS.pettyCash, href: 'petty-cash.html' },
    { id: 'expense', label: 'Expense', icon: ICONS.expense, href: 'expense.html' },
    { id: 'travel', label: 'Travel', icon: ICONS.travel, href: 'travel.html' },
  ]},
  { label: 'Resource', collapsible: true, iconColor: 'icon-amber', items: [
    { id: 'booking', label: 'Booking', icon: ICONS.booking, href: 'booking.html' },
    { id: 'vehicle', label: 'Vehicles', icon: ICONS.vehicle, href: 'vehicle.html' },
    { id: 'warehouse', label: 'Warehouse', icon: ICONS.warehouse, href: 'warehouse.html' },
    { id: 'ot', label: 'Holiday / OT', icon: ICONS.ot, href: 'ot.html' },
  ]},
  { label: 'System', collapsible: true, iconColor: 'icon-rose', items: [
    { id: 'items', label: 'Item Master', icon: ICONS.itemMaster, href: 'item-master.html' },
    { id: 'bp', label: 'Business Partner', icon: ICONS.bpGroup, href: 'bp-master.html' },
    { id: 'number-running', label: 'Number Running', icon: ICONS.numberRun, href: 'number-running.html' },
    { id: 'reports', label: 'Reports', icon: ICONS.reports, href: 'reports.html' },
    { id: 'permissions', label: 'User & Permission', icon: ICONS.permissions, href: 'user-permissions.html' },
    { id: 'setup', label: 'Setup', icon: ICONS.setup, href: 'setup.html' },
    { id: 'changelog', label: 'Change Log', icon: ICONS.changeLog, href: 'changelog.html' },
    { id: 'help', label: 'User Guide', icon: ICONS.help, href: 'help.html' },
  ]},
];

let NAV_GROUPS = NAV_GROUPS_FALLBACK;
let _enabledHrefs = null; // set after API load

// Build NAV_GROUPS from API modules
function buildNavFromModules(modules) {
  const groupLabels = { main: 'Main', project: 'Project', presales: 'Sales', document: 'Document', resource: 'Resource', system: 'System' };
  const groupIconColors = { main: 'icon-blue', project: 'icon-purple', presales: 'icon-purple', document: 'icon-green', resource: 'icon-amber', system: 'icon-rose' };
  // Fix legacy icon keys from DB that cause duplicates
  const iconKeyFix = { booking:'booking', 'my-tasks':'myTasks' };
  const iconOverrides = {
    booking: 'booking', items: 'itemMaster', bp: 'bpGroup',
    changelog: 'changeLog', 'my-tasks': 'myTasks', quotation: 'quotation'
  };
  const groups = {};
  for (const m of modules) {
    if (!m.is_enabled) continue;
    const g = m.module_group || 'system';
    if (!groups[g]) groups[g] = { label: groupLabels[g] || g, collapsible: g !== 'main', iconColor: groupIconColors[g] || 'icon-blue', items: [] };
    const fixedIcon = iconOverrides[m.module_id] || m.icon;
    groups[g].items.push({ id: m.module_id, label: m.module_name, icon: ICONS[fixedIcon] || ICONS[m.icon] || ICONS.reports, href: m.href });
  }
  const order = ['main','project','presales','document','resource','system'];
  const result = order.filter(g => groups[g]).map(g => groups[g]);
  // Add any extra groups
  Object.keys(groups).filter(g => !order.includes(g)).forEach(g => result.push(groups[g]));
  return result;
}

async function loadModulesFromAPI() {
  try {
    const cached = sessionStorage.getItem('sda_modules');
    if (cached) {
      const data = JSON.parse(cached);
      NAV_GROUPS = buildNavFromModules(data.modules || []);
      _enabledHrefs = new Set((data.modules || []).filter(m => m.is_enabled).map(m => m.href));
    }
    // Fetch fresh in background
    const token = localStorage.getItem('sda_token');
    if (!token) return;
    const resp = await fetch('/api/modules', { headers: { 'Authorization': 'Bearer ' + token } });
    if (resp.ok) {
      const data = await resp.json();
      sessionStorage.setItem('sda_modules', JSON.stringify(data));
      NAV_GROUPS = buildNavFromModules(data.modules || []);
      _enabledHrefs = new Set((data.modules || []).filter(m => m.is_enabled).map(m => m.href));
      renderSidebar(); // re-render with fresh data
    }
  } catch(e) {
    // Fallback — use hardcoded
    NAV_GROUPS = NAV_GROUPS_FALLBACK;
  }
}

// Check if current page module is disabled → redirect to dashboard
function checkModuleAccess() {
  // No module data yet, or an empty set (e.g. modules not seeded for this
  // company) → don't lock anyone out. An empty set must never gate access,
  // otherwise every page redirects to dashboard.html in an infinite loop.
  if (!_enabledHrefs || _enabledHrefs.size === 0) return;
  const page = location.pathname.split('/').pop();
  // Whitelist: auth pages + sub-pages that open from main menu pages.
  // dashboard.html is the redirect TARGET below, so it must be whitelisted —
  // redirecting it to itself would loop forever.
  const whitelist = [
    '', 'login.html', 'register.html', 'dashboard.html',
    'reset-password.html', 'change-password.html',
    'doc-detail.html', 'pr-create.html', 'pr-detail.html',
    'journal-entries.html', 'vehicle-project.html',
    'pricing.html', 'sow-template.html', 'sow-generator.html',
    'sow-v2.html', 'sow-v2-generator.html', 'sq-detail.html',
    'item-detail.html', 'warehouse.html', 'po-create.html',
    'tender-detail.html'
  ];
  if (!page || whitelist.includes(page)) return;
  if (!_enabledHrefs.has(page)) {
    if (typeof showToast === 'function') showToast('ไม่สามารถเข้าถึงหน้านี้ได้ Module ถูกปิดอยู่', 'warning');
    location.href = 'dashboard.html';
  }
}

// Current user
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('sda_user');
    if (raw) {
      const u = JSON.parse(raw);
      return { name: `${u.firstName} ${u.lastName}`, nameTh: `${u.firstNameTh || ''} ${u.lastNameTh || ''}`.trim(), initials: (u.firstName || 'U').charAt(0), role: u.role, position: u.position || '' };
    }
  } catch (e) {}
  return { name: 'Guest', nameTh: '', initials: '?', role: '', position: '' };
}
const CURRENT_USER = getCurrentUser();

function getCurrentPage() {
  return window.location.pathname.split('/').pop();
}

// ═══ Render Sidebar ═══
function renderSidebar() {
  const el = document.getElementById('sidebar');
  if (!el) return;

  const currentFile = getCurrentPage();
  const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';

  el.className = 'sidebar' + (collapsed ? ' collapsed' : '');
  // Map sidebar group labels to i18n keys
  const groupI18nKeys = { Main: 'nav_main', Project: 'nav_project', 'Sales': 'nav_presales', Document: 'nav_document', Resource: 'nav_resource', System: 'nav_system' };
  // Map sidebar item IDs to i18n keys
  const itemI18nKeys = {
    dashboard: 'dashboard', 'my-tasks': 'my_tasks', projects: 'projects',
    overview: 'project_detail', phases: 'plan_project', taskboard: 'taskboard',
    budget: 'budget', 'pr-po': 'pr_po', quotation: 'quotation',
    advance: 'advance', 'petty-cash': 'petty_cash', expense: 'expense',
    travel: 'travel', booking: 'booking', vehicle: 'vehicle',
    warehouse: 'warehouse', ot: 'holiday_ot', items: 'item_master',
    bp: 'bp_master', 'number-running': 'number_running', reports: 'reports',
    permissions: 'user_permission', setup: 'setup', changelog: 'changelog',
    help: 'user_guide',
    tenders: 'tenders', 'bid-preparation': 'bid_preparation',
    contracts: 'contracts', guarantees: 'guarantees', disputes: 'disputes'
  };

  el.innerHTML = `
    <div class="sidebar-header">
      <a href="dashboard.html" class="sidebar-logo">
        ${icon('<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>', 24)}
        <span class="sidebar-logo-text">Company Operation</span>
      </a>
      <button class="sidebar-toggle" onclick="toggleSidebar()" title="Toggle sidebar">
        ${collapsed ? ICONS.chevronRight : ICONS.chevronLeft}
      </button>
    </div>

    <div class="sidebar-search">
      <span class="sidebar-search-icon">${ICONS.search}</span>
      <input type="text" placeholder="Search..." class="sidebar-search-input">
    </div>

    <nav class="sidebar-nav">
      ${NAV_GROUPS.map(group => {
        const hasActiveChild = group.items.some(i => currentFile === i.href || (currentFile === 'user-permissions.html' && i.id === 'permissions'));
        const storageKey = 'nav_collapsed_' + group.label;
        const isCollapsed = group.collapsible && !hasActiveChild && localStorage.getItem(storageKey) !== 'open';
        const groupKey = groupI18nKeys[group.label] || '';
        return `
        <div class="sidebar-group">
          <div class="sidebar-group-label${group.collapsible ? ' collapsible' : ''}" ${group.collapsible ? `onclick="toggleNavGroup('${group.label}')"` : ''}>
            <span${groupKey ? ` data-i18n="${groupKey}"` : ''}>${group.label}</span>
            ${group.collapsible ? '<span class="nav-arrow" style="font-size:10px;transition:transform 0.2s;transform:rotate('+(isCollapsed?'0':'180')+'deg);">&#9650;</span>' : ''}
          </div>
          <div class="sidebar-group-items" id="nav-group-${group.label}" style="${isCollapsed ? 'display:none;' : ''}">
          ${group.items.map(item => {
            const isActive = currentFile === item.href ||
              (currentFile === 'user-permissions.html' && item.id === 'permissions');
            const iconCls = group.iconColor || 'icon-blue';
            const itemKey = itemI18nKeys[item.id] || '';
            return `<a class="sidebar-item${isActive ? ' active' : ''}" href="${item.href}" title="${item.label}">
              <span class="sidebar-item-icon ${iconCls}">${item.icon}</span>
              <span class="sidebar-item-label"${itemKey ? ` data-i18n="${itemKey}"` : ''}>${item.label}</span>
            </a>`;
          }).join('')}
          </div>
        </div>`;
      }).join('')}
    </nav>

    <div class="sidebar-footer">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px 8px;">
        <button id="lang-toggle-btn" onclick="I18N.toggleLang()" title="Toggle language"
          style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;border:1.5px solid var(--border);background:var(--bg-hover);color:var(--text-secondary);cursor:pointer;transition:all 0.15s;line-height:1.4;"
          onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'"
        >${typeof I18N !== 'undefined' ? (I18N.currentLang === 'en' ? 'TH' : 'EN') : 'EN'}</button>
      </div>
      <div class="sidebar-user" onclick="handleLogout()" title="Click to logout">
        <div class="sidebar-user-avatar">${CURRENT_USER.initials}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${CURRENT_USER.name}</div>
          <div class="sidebar-user-role">${CURRENT_USER.position || CURRENT_USER.role}</div>
        </div>
        ${ICONS.logout}
      </div>
    </div>
  `;

  // Scroll active item into view — only on first render (page load)
  if (!window._sidebarScrolled) {
    window._sidebarScrolled = true;
    requestAnimationFrame(() => {
      const activeItem = el.querySelector('.sidebar-item.active');
      if (activeItem) activeItem.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  }
}

// ═══ Render Top Bar (slimmer, no tabs) ═══
function renderTopNav() {
  const el = document.getElementById('topnav');
  if (!el) return;
  el.className = 'topbar';
  el.innerHTML = `
    <div class="topbar-left">
      <button class="topbar-menu-btn" onclick="toggleSidebar()" title="Toggle menu">${ICONS.menu}</button>
      <div class="topbar-breadcrumb" id="breadcrumb"></div>
    </div>
    <div class="topbar-right">
      <div class="topbar-search">
        ${ICONS.search}
        <input type="text" placeholder="Search...">
      </div>
      <button class="topbar-btn" title="Help" onclick="openContextHelp()" style="font-size:14px;font-weight:700;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);">?</button>
      <div style="position:relative;">
        <button class="topbar-btn" title="Notifications" onclick="toggleNotifPanel()">${ICONS.bell}<span class="topbar-notif-dot" id="notif-dot" style="display:none;"></span><span id="notif-badge" style="display:none;position:absolute;top:-2px;right:-2px;background:var(--danger);color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:none;align-items:center;justify-content:center;"></span></button>
        <div id="notif-panel" style="display:none;position:absolute;right:0;top:100%;margin-top:8px;width:360px;max-height:400px;overflow-y:auto;background:var(--bg-white);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);z-index:999;">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:13px;">Notifications</strong>
            <a href="#" onclick="markAllRead();return false;" style="font-size:11px;color:var(--primary);">Mark all read</a>
          </div>
          <div id="notif-list" style="font-size:12px;"></div>
        </div>
      </div>
    </div>
  `;

  // Set breadcrumb
  const page = getCurrentPage();
  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const current = allItems.find(i => i.href === page || (page === 'user-permissions.html' && i.id === 'permissions'));
  const bc = document.getElementById('breadcrumb');
  if (bc && current) {
    const group = NAV_GROUPS.find(g => g.items.includes(current));
    bc.innerHTML = `<span class="bc-group">${group ? group.label : ''}</span><span class="bc-sep">/</span><span class="bc-current">${current.label}</span>`;
  }
}

// Hide old tabbar
// Subscription warning banners
async function checkSubscriptionBanner() {
  try {
    const token = localStorage.getItem('sda_token');
    if (!token) return;
    const resp = await fetch('/api/subscription', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!resp.ok) return;
    const data = await resp.json();
    const sub = data.subscription;
    if (!sub) return;
    let banner = document.getElementById('sub-banner');
    if (!banner) { banner = document.createElement('div'); banner.id = 'sub-banner'; document.body.prepend(banner); }

    if (sub.status === 'trial' && sub.trial_ends_at) {
      const days = Math.max(0, Math.ceil((new Date(sub.trial_ends_at) - new Date()) / 86400000));
      banner.style.cssText = 'background:var(--primary);color:white;text-align:center;padding:8px;font-size:12px;font-weight:600;';
      banner.innerHTML = `ทดลองใช้ฟรี — เหลืออีก ${days} วัน <a href="setup.html#subscription" style="color:white;text-decoration:underline;margin-left:8px;">เลือกแพลน</a>`;
    } else if (sub.status === 'past_due') {
      banner.style.cssText = 'background:var(--danger);color:white;text-align:center;padding:8px;font-size:12px;font-weight:600;';
      banner.innerHTML = `มียอดค้างชำระ กรุณาชำระเงิน <a href="setup.html#subscription" style="color:white;text-decoration:underline;margin-left:8px;">ชำระเงิน</a>`;
    } else if (sub.status === 'expired') {
      banner.style.cssText = 'background:var(--danger);color:white;text-align:center;padding:8px;font-size:12px;font-weight:600;';
      banner.innerHTML = `Subscription หมดอายุ <a href="setup.html#subscription" style="color:white;text-decoration:underline;margin-left:8px;">ต่ออายุ</a>`;
    } else { banner.style.display = 'none'; }
  } catch(e) {}
}

function renderTabBar() {
  const el = document.getElementById('tabbar');
  if (el) el.style.display = 'none';
}

window.toggleNavGroup = function(label) {
  const el = document.getElementById('nav-group-' + label);
  if (!el) return;
  const key = 'nav_collapsed_' + label;
  const arrow = el.previousElementSibling?.querySelector('.nav-arrow');
  if (el.style.display === 'none') {
    el.style.display = '';
    localStorage.setItem(key, 'open');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    el.style.display = 'none';
    localStorage.removeItem(key);
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
};

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const collapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebar_collapsed', collapsed);
  // Update toggle icon
  const btn = sidebar.querySelector('.sidebar-toggle');
  if (btn) btn.innerHTML = collapsed ? ICONS.chevronRight : ICONS.chevronLeft;
}

function handleLogout() {
  if (confirm('Logout from Company Operation?')) {
    localStorage.removeItem('sda_token');
    localStorage.removeItem('sda_user');
    sessionStorage.removeItem('sda_modules');
    window.location = 'login.html';
  }
}

function checkAuth() {
  const page = getCurrentPage();
  if (page === 'login.html') return;
  const token = localStorage.getItem('sda_token');
  if (!token) window.location.href = 'login.html';
}

// ═══ Notifications ═══
async function loadNotifications() {
  try {
    const token = localStorage.getItem('sda_token');
    if (!token) return;
    const res = await fetch('/api/notifications', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    const badge = document.getElementById('notif-badge');
    const dot = document.getElementById('notif-dot');
    const list = document.getElementById('notif-list');
    if (!badge || !list) return;
    const unread = data.unread || 0;
    if (unread > 0) {
      badge.style.display = 'flex';
      badge.textContent = unread;
      if (dot) { dot.style.display = 'block'; }
    } else {
      badge.style.display = 'none';
      if (dot) { dot.style.display = 'none'; }
    }
    const items = data.items || [];
    if (!items.length) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No notifications</div>';
      return;
    }
    list.innerHTML = items.map(n => {
      const isBlock = (n.title || '').includes('Block');
      const isWarn = (n.title || '').includes('เตือน');
      const bg = !n.is_read ? 'var(--bg-light)' : 'transparent';
      const icon = isBlock ? '<span style="color:var(--danger);font-size:16px;">&#9888;</span>' : isWarn ? '<span style="color:var(--warning);font-size:16px;">&#9888;</span>' : '<span style="color:var(--primary);font-size:16px;">&#128276;</span>';
      const time = n.created_at ? new Date(n.created_at).toLocaleDateString('th-TH', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
      return `<div style="padding:10px 16px;border-bottom:1px solid var(--border-light);background:${bg};cursor:pointer;" onclick="readNotif('${n.id}','${n.link_url||''}')">
        <div style="display:flex;gap:8px;align-items:flex-start;">
          ${icon}
          <div style="flex:1;">
            <div style="font-weight:${n.is_read?'400':'600'};margin-bottom:2px;">${n.title||''}</div>
            <div style="color:var(--text-muted);font-size:11px;line-height:1.4;">${n.body||''}</div>
            <div style="color:var(--text-muted);font-size:10px;margin-top:4px;">${time}</div>
          </div>
          ${!n.is_read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:4px;"></div>' : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e) {}
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') loadNotifications();
}

async function readNotif(id, url) {
  try {
    const token = localStorage.getItem('sda_token');
    await fetch('/api/notifications/' + id + '/read', { method:'POST', headers:{'Authorization':'Bearer '+token} });
  } catch(e) {}
  if (url) window.location = url;
  else { loadNotifications(); }
}

async function markAllRead() {
  try {
    const token = localStorage.getItem('sda_token');
    await fetch('/api/notifications/read-all', { method:'POST', headers:{'Authorization':'Bearer '+token} });
    loadNotifications();
  } catch(e) {}
}

// Close notif panel on outside click
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  if (panel && panel.style.display === 'block' && !e.target.closest('#notif-panel') && !e.target.closest('.topbar-btn')) {
    panel.style.display = 'none';
  }
});

// Make ICONS globally accessible
window.ICONS = ICONS;
window.icon = icon;

// ═══ ERP status check — hide ERP buttons if not configured ═══
window._erpConfigured = null;
async function checkSapStatus() {
  try {
    const token = localStorage.getItem('sda_token');
    if (!token) return;
    const resp = await fetch('/api/sap/status', { headers: { 'Authorization': 'Bearer ' + token } });
    if (resp.ok) {
      const data = await resp.json();
      window._erpConfigured = !!data.connected;
    }
  } catch(e) { window._erpConfigured = false; }
  // Hide all ERP-related buttons/elements if not configured
  if (!window._erpConfigured) {
    document.querySelectorAll('[data-sap], .sap-only').forEach(el => {
      el.style.display = 'none';
    });
  }
}
window.checkSapStatus = checkSapStatus;

// Contextual Help — map page to help section
function openContextHelp() {
  const page = location.pathname.split('/').pop().replace('.html','');
  const map = { vehicle:'vehicle', booking:'vehicle', advance:'advance', phases:'phases', budget:'budget', 'pr-po':'prpo', 'pr-create':'prpo', 'pr-detail':'prpo', projects:'projects', 'petty-cash':'petty-cash', travel:'travel', ot:'ot', dashboard:'dashboard', 'item-master':'item-master', 'item-detail':'item-master', 'bp-master':'bp-master', 'user-permissions':'user-permission', overview:'projects' };
  const section = map[page] || '';
  window.open('help.html' + (section ? '#' + section : ''), '_blank');
}

// Changelog "new" badge — check localStorage
const CHANGELOG_VERSION = 'v2.0';
function checkChangelogBadge() {
  const seen = localStorage.getItem('changelog_seen_version');
  if (seen !== CHANGELOG_VERSION) {
    // Add red dot to Change Log menu item
    const menuItems = document.querySelectorAll('#sidebar a, .sidebar a');
    menuItems.forEach(a => {
      if (a.textContent.includes('Change Log') || a.href?.includes('changelog')) {
        if (!a.querySelector('.cl-badge')) {
          const dot = document.createElement('span');
          dot.className = 'cl-badge';
          dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--danger);margin-left:6px;';
          a.appendChild(dot);
        }
      }
    });
  }
}

// Mark changelog as seen (call from changelog.html)
window.markChangelogSeen = function() {
  localStorage.setItem('changelog_seen_version', CHANGELOG_VERSION);
  document.querySelectorAll('.cl-badge').forEach(b => b.remove());
};

// Re-render sidebar on language change
document.addEventListener('langchange', () => {
  renderSidebar();
  renderTopNav();
});

// Auto-render
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();
  await loadModulesFromAPI();
  renderSidebar();
  renderTopNav();
  renderTabBar();
  loadNotifications();
  setTimeout(checkChangelogBadge, 500);
  setTimeout(checkModuleAccess, 300);
  setTimeout(checkSubscriptionBanner, 600);
  setTimeout(checkSapStatus, 400);
  // Apply i18n after sidebar and topnav render
  if (typeof I18N !== 'undefined') I18N.applyTranslations();
});
