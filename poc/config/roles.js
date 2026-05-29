/**
 * Company Operation — Role & Permission Configuration
 * Based on: AI Brief (Section 4) + SAP Blueprint (User Licenses)
 *
 * 7 Roles × 22 Modules = Full Permission Matrix
 */

const ROLES = {
  EXECUTIVE: {
    id: 'executive',
    name: { en: 'Executive', th: 'ผู้บริหาร' },
    icon: '👔',
    description: {
      en: 'C-level executives with full visibility and final approval authority',
      th: 'ผู้บริหารระดับสูง ดูได้ทุกอย่าง อนุมัติขั้นสุดท้าย'
    },
    level: 100,  // highest authority
    sapLicenseType: 'Professional',
    maxApprovalAmount: Infinity,
  },

  PM: {
    id: 'pm',
    name: { en: 'Project Manager', th: 'ผู้จัดการโปรเจกต์' },
    icon: '📋',
    description: {
      en: 'Manages projects, tasks, team, milestones and monitors budget',
      th: 'จัดการโปรเจกต์ มอบหมายงาน ดูแลงบประมาณ'
    },
    level: 70,
    sapLicenseType: 'Limited - Logistics',
    maxApprovalAmount: 100000,  // ฿100K
  },

  FINANCE: {
    id: 'finance',
    name: { en: 'Finance', th: 'การเงิน' },
    icon: '💵',
    description: {
      en: 'Manages payments, cash flow, and financial approvals',
      th: 'ดูแลการเงิน การจ่ายเงิน กระแสเงินสด'
    },
    level: 70,
    sapLicenseType: 'Limited - Financials',
    maxApprovalAmount: 100000,
  },

  ACCOUNTING: {
    id: 'accounting',
    name: { en: 'Accounting', th: 'บัญชี' },
    icon: '🧮',
    description: {
      en: 'Views SAP-synced data, manages GL postings and tax reports',
      th: 'ดูข้อมูล sync จาก SAP บันทึกบัญชี ออกรายงานภาษี'
    },
    level: 60,
    sapLicenseType: 'Limited - Financials',
    maxApprovalAmount: 0,  // view only, no approval
  },

  PROCUREMENT: {
    id: 'procurement',
    name: { en: 'Procurement', th: 'จัดซื้อ' },
    icon: '🛍',
    description: {
      en: 'Manages purchase requests, POs, and vendor relations',
      th: 'จัดการใบขอซื้อ ใบสั่งซื้อ ติดต่อ vendor'
    },
    level: 60,
    sapLicenseType: 'Limited - Logistics',
    maxApprovalAmount: 50000,
  },

  ADMIN: {
    id: 'admin',
    name: { en: 'Admin', th: 'ธุรการ' },
    icon: '🗂',
    description: {
      en: 'Manages vehicles, master data, receipts, and OT records',
      th: 'จัดการรถ ข้อมูลหลัก ใบเสร็จ บันทึก OT'
    },
    level: 50,
    sapLicenseType: 'Limited - Logistics',
    maxApprovalAmount: 0,
  },

  STAFF: {
    id: 'staff',
    name: { en: 'Staff', th: 'พนักงาน' },
    icon: '👷',
    description: {
      en: 'Submits requests (PR, Expense, Travel, OT) and manages own tasks',
      th: 'ส่งคำขอ (ขอซื้อ เบิกเงิน เดินทาง OT) จัดการงานตัวเอง'
    },
    level: 10,
    sapLicenseType: 'Indirect Access',
    maxApprovalAmount: 0,
  },
};

// ─────────────────────────────────────────────
// Permission Actions
// ─────────────────────────────────────────────
const ACTIONS = {
  VIEW:     'view',      // ดูข้อมูล
  CREATE:   'create',    // สร้างใหม่
  EDIT:     'edit',      // แก้ไข
  DELETE:   'delete',    // ลบ
  APPROVE:  'approve',   // อนุมัติ
  EXPORT:   'export',    // ส่งออก/พิมพ์
  PUSH_SAP: 'push_sap',  // ส่งข้อมูลเข้า SAP
  CONFIGURE:'configure', // ตั้งค่า
};

// ─────────────────────────────────────────────
// Modules (pmconsole tabs + SDA new tabs)
// ─────────────────────────────────────────────
const MODULES = {
  // ── From pmconsole (reuse) ──
  DASHBOARD:    { id: 'dashboard',    name: { en: 'Dashboard',    th: 'แดชบอร์ด' },       icon: '📊', group: 'core' },
  PROJECTS:     { id: 'projects',     name: { en: 'Projects',     th: 'โปรเจกต์' },       icon: '📁', group: 'core' },
  OVERVIEW:     { id: 'overview',     name: { en: 'Overview',     th: 'ภาพรวม' },         icon: '🏠', group: 'project' },
  PHASES:       { id: 'phases',       name: { en: 'Phases',       th: 'แผนงาน' },         icon: '📅', group: 'project' },
  TASKBOARD:    { id: 'taskboard',    name: { en: 'Taskboard',    th: 'บอร์ดงาน' },       icon: '📌', group: 'project' },
  RISKS:        { id: 'risks',        name: { en: 'Risks',        th: 'ความเสี่ยง' },     icon: '⚠️', group: 'project' },
  CR:           { id: 'cr',           name: { en: 'Change Request',th: 'เปลี่ยนแปลง' },   icon: '🔄', group: 'project' },
  NOTES:        { id: 'notes',        name: { en: 'Notes',        th: 'บันทึก' },         icon: '📝', group: 'project' },
  DISCUSSION:   { id: 'discussion',   name: { en: 'Discussion',   th: 'สนทนา' },         icon: '💬', group: 'project' },
  CALENDAR:     { id: 'calendar',     name: { en: 'Calendar',     th: 'ปฏิทิน' },         icon: '📆', group: 'project' },
  TEAM:         { id: 'team',         name: { en: 'Team',         th: 'ทีม' },             icon: '👥', group: 'project' },
  ATTACHMENTS:  { id: 'attachments',  name: { en: 'Attachments',  th: 'ไฟล์แนบ' },       icon: '📎', group: 'project' },
  ACTIVITY:     { id: 'activity',     name: { en: 'Activity',     th: 'ประวัติ' },         icon: '🕐', group: 'project' },
  REPORTS:      { id: 'reports',      name: { en: 'Reports',      th: 'รายงาน' },         icon: '📈', group: 'project' },
  TIMESHEET:    { id: 'timesheet',    name: { en: 'Timesheet',    th: 'บันทึกเวลา' },     icon: '⏱', group: 'project' },

  // ── SDA NEW modules ──
  BUDGET:       { id: 'budget',       name: { en: 'Budget',       th: 'งบประมาณ' },       icon: '💰', group: 'sda', isNew: true },
  PR_PO:        { id: 'pr_po',        name: { en: 'PR/PO',        th: 'ขอซื้อ/สั่งซื้อ' }, icon: '🛒', group: 'sda', isNew: true },
  EXPENSE:      { id: 'expense',      name: { en: 'Expense',      th: 'ค่าใช้จ่าย' },     icon: '🧾', group: 'sda', isNew: true },
  VEHICLE:      { id: 'vehicle',      name: { en: 'Vehicle',      th: 'ยานพาหนะ' },       icon: '🚗', group: 'sda', isNew: true },
  TRAVEL:       { id: 'travel',       name: { en: 'Travel',       th: 'เดินทาง' },         icon: '✈️', group: 'sda', isNew: true },
  OT:           { id: 'ot',           name: { en: 'Holiday/OT',   th: 'วันหยุด/OT' },     icon: '🌙', group: 'sda', isNew: true },
  NUMBER_RUN:   { id: 'number_run',   name: { en: 'Number Running',th: 'เลขที่เอกสาร' },   icon: '🔢', group: 'sda', isNew: true },

  // ── System ──
  USER_PERMS:   { id: 'user_perms',   name: { en: 'User Permissions', th: 'สิทธิ์ผู้ใช้' }, icon: '🔐', group: 'system' },
  SETUP:        { id: 'setup',        name: { en: 'Setup',        th: 'ตั้งค่า' },         icon: '⚙️', group: 'system' },
};

// ─────────────────────────────────────────────
// Permission Matrix: ROLE × MODULE × ACTIONS
// ─────────────────────────────────────────────
// true = allowed, false = denied, 'own' = only own records
const PERMISSION_MATRIX = {

  // ══════════════════════════════════════════
  // 👔 EXECUTIVE — เห็นทุกอย่าง อนุมัติทุกอย่าง
  // ══════════════════════════════════════════
  executive: {
    dashboard:    { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: true },
    projects:     { view: true, create: true,  edit: true,  delete: true,  approve: true,  export: true,  push_sap: false, configure: true },
    overview:     { view: true, create: false, edit: true,  delete: false, approve: false, export: true,  push_sap: false, configure: false },
    phases:       { view: true, create: true,  edit: true,  delete: true,  approve: true,  export: true,  push_sap: false, configure: false },
    taskboard:    { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    risks:        { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    cr:           { view: true, create: true,  edit: true,  delete: true,  approve: true,  export: true,  push_sap: false, configure: false },
    notes:        { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    discussion:   { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    calendar:     { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    team:         { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: true },
    attachments:  { view: true, create: true,  edit: false, delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    activity:     { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    reports:      { view: true, create: true,  edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: true },
    timesheet:    { view: true, create: true,  edit: true,  delete: true,  approve: true,  export: true,  push_sap: false, configure: false },
    // SDA Modules
    budget:       { view: true, create: true,  edit: true,  delete: false, approve: true,  export: true,  push_sap: false, configure: true },
    pr_po:        { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: true,  configure: false },
    expense:      { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    vehicle:      { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    travel:       { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    ot:           { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    number_run:   { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: true },
    // System
    user_perms:   { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: true },
    setup:        { view: true, create: true,  edit: true,  delete: true,  approve: false, export: false, push_sap: false, configure: true },
  },

  // ══════════════════════════════════════════
  // 📋 PM — จัดการโปรเจกต์ ดูแลงบ อนุมัติ <100K
  // ══════════════════════════════════════════
  pm: {
    dashboard:    { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    projects:     { view: true, create: true,  edit: 'own', delete: false, approve: false, export: true,  push_sap: false, configure: 'own' },
    overview:     { view: true, create: false, edit: 'own', delete: false, approve: false, export: true,  push_sap: false, configure: false },
    phases:       { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    taskboard:    { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    risks:        { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    cr:           { view: true, create: true,  edit: true,  delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    notes:        { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: true,  push_sap: false, configure: false },
    discussion:   { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    calendar:     { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    team:         { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: false },
    attachments:  { view: true, create: true,  edit: false, delete: 'own', approve: false, export: true,  push_sap: false, configure: false },
    activity:     { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    reports:      { view: true, create: true,  edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    timesheet:    { view: true, create: true,  edit: 'own', delete: 'own', approve: true,  export: true,  push_sap: false, configure: false },
    // SDA Modules
    budget:       { view: true, create: true,  edit: 'own', delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    pr_po:        { view: true, create: true,  edit: 'own', delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    expense:      { view: true, create: true,  edit: 'own', delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    vehicle:      { view: true, create: true,  edit: 'own', delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    travel:       { view: true, create: true,  edit: 'own', delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    ot:           { view: true, create: true,  edit: 'own', delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    number_run:   { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    user_perms:   { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    setup:        { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
  },

  // ══════════════════════════════════════════
  // 💵 FINANCE — การเงิน อนุมัติจ่ายเงิน
  // ══════════════════════════════════════════
  finance: {
    dashboard:    { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    projects:     { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    overview:     { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    phases:       { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    taskboard:    { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    risks:        { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    cr:           { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    notes:        { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    discussion:   { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    calendar:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    team:         { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    attachments:  { view: true, create: true,  edit: false, delete: 'own', approve: false, export: true,  push_sap: false, configure: false },
    activity:     { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    reports:      { view: true, create: true,  edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    timesheet:    { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    // SDA Modules
    budget:       { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    pr_po:        { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: true,  configure: false },
    expense:      { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: true,  configure: false },
    vehicle:      { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    travel:       { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    ot:           { view: true, create: false, edit: false, delete: false, approve: true,  export: true,  push_sap: false, configure: false },
    number_run:   { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    user_perms:   { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    setup:        { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
  },

  // ══════════════════════════════════════════
  // 🧮 ACCOUNTING — ดูข้อมูล SAP sync (view-heavy)
  // ══════════════════════════════════════════
  accounting: {
    dashboard:    { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    projects:     { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    overview:     { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    phases:       { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    taskboard:    { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    risks:        { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    cr:           { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    notes:        { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    discussion:   { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    calendar:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    team:         { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    attachments:  { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    activity:     { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    reports:      { view: true, create: true,  edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    timesheet:    { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    // SDA Modules
    budget:       { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    pr_po:        { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    expense:      { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    vehicle:      { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    travel:       { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    ot:           { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    number_run:   { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    user_perms:   { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    setup:        { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
  },

  // ══════════════════════════════════════════
  // 🛍 PROCUREMENT — จัดซื้อ + push SAP
  // ══════════════════════════════════════════
  procurement: {
    dashboard:    { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    projects:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    overview:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    phases:       { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    taskboard:    { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    risks:        { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    cr:           { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    notes:        { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    discussion:   { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    calendar:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    team:         { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    attachments:  { view: true, create: true,  edit: false, delete: 'own', approve: false, export: true,  push_sap: false, configure: false },
    activity:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    reports:      { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    timesheet:    { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    // SDA Modules
    budget:       { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    pr_po:        { view: true, create: true,  edit: true,  delete: false, approve: true,  export: true,  push_sap: true,  configure: false },
    expense:      { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    vehicle:      { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    travel:       { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    ot:           { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    number_run:   { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    user_perms:   { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    setup:        { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
  },

  // ══════════════════════════════════════════
  // 🗂 ADMIN — ธุรการ จัดการรถ + master data
  // ══════════════════════════════════════════
  admin: {
    dashboard:    { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    projects:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    overview:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    phases:       { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    taskboard:    { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    risks:        { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    cr:           { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    notes:        { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    discussion:   { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    calendar:     { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    team:         { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    attachments:  { view: true, create: true,  edit: false, delete: 'own', approve: false, export: true,  push_sap: false, configure: false },
    activity:     { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    reports:      { view: true, create: false, edit: false, delete: false, approve: false, export: true,  push_sap: false, configure: false },
    timesheet:    { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    // SDA Modules
    budget:       { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    pr_po:        { view: true, create: true,  edit: 'own', delete: false, approve: false, export: false, push_sap: false, configure: false },
    expense:      { view: true, create: true,  edit: 'own', delete: false, approve: false, export: true,  push_sap: false, configure: false },
    vehicle:      { view: true, create: true,  edit: true,  delete: true,  approve: false, export: true,  push_sap: false, configure: true },
    travel:       { view: true, create: true,  edit: 'own', delete: false, approve: false, export: true,  push_sap: false, configure: false },
    ot:           { view: true, create: true,  edit: true,  delete: false, approve: false, export: true,  push_sap: false, configure: true },
    number_run:   { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    user_perms:   { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    setup:        { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
  },

  // ══════════════════════════════════════════
  // 👷 STAFF — ดูงานตัวเอง ส่งคำขอ
  // ══════════════════════════════════════════
  staff: {
    dashboard:    { view: true, create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    projects:     { view: 'own',create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    overview:     { view: 'own',create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    phases:       { view: 'own',create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    taskboard:    { view: 'own',create: true,  edit: 'own', delete: false, approve: false, export: false, push_sap: false, configure: false },
    risks:        { view: 'own',create: true,  edit: 'own', delete: false, approve: false, export: false, push_sap: false, configure: false },
    cr:           { view: 'own',create: true,  edit: 'own', delete: false, approve: false, export: false, push_sap: false, configure: false },
    notes:        { view: 'own',create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    discussion:   { view: 'own',create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    calendar:     { view: 'own',create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    team:         { view: 'own',create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    attachments:  { view: 'own',create: true,  edit: false, delete: 'own', approve: false, export: 'own', push_sap: false, configure: false },
    activity:     { view: 'own',create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    reports:      { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    timesheet:    { view: 'own',create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    // SDA Modules
    budget:       { view: 'own',create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    pr_po:        { view: 'own',create: true,  edit: 'own', delete: false, approve: false, export: false, push_sap: false, configure: false },
    expense:      { view: 'own',create: true,  edit: 'own', delete: false, approve: false, export: false, push_sap: false, configure: false },
    vehicle:      { view: true, create: true,  edit: 'own', delete: 'own', approve: false, export: false, push_sap: false, configure: false },
    travel:       { view: 'own',create: true,  edit: 'own', delete: false, approve: false, export: false, push_sap: false, configure: false },
    ot:           { view: 'own',create: true,  edit: 'own', delete: false, approve: false, export: false, push_sap: false, configure: false },
    number_run:   { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    user_perms:   { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
    setup:        { view: false,create: false, edit: false, delete: false, approve: false, export: false, push_sap: false, configure: false },
  },
};

// Export
if (typeof module !== 'undefined') module.exports = { ROLES, ACTIONS, MODULES, PERMISSION_MATRIX };
