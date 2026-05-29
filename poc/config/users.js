/**
 * Company Operation — User Master Data
 * Source: SAP Blueprint Table 53 (19 users) → mapped to Web App roles
 *
 * SAP License mapping:
 *   Professional     → Executive (full access)
 *   Limited-Logistics → PM / Procurement / Admin
 *   Limited-Financials → Finance / Accounting
 *   Indirect Access   → Staff (web-only, no SAP license needed)
 */

const USERS = [
  // ══════════════════════════════════════════
  // 👔 EXECUTIVE (MD / CEO)
  // ══════════════════════════════════════════
  {
    id: 'USR-001',
    sapUserCode: 'Somparat D',
    firstName:   { th: 'ศมพรัตร์', en: 'Somparat' },
    lastName:    { th: 'เดชะรินทร์', en: 'Decharintr' },
    position:    'Assistant MD',
    department:  'MD',
    role:        'executive',
    sapLicense:  'Professional',
    email:       '',  // ต้องเพิ่ม
    isActive:    true,
    canApprove:  true,
    approvalLimit: Infinity,
  },
  {
    id: 'USR-002',
    sapUserCode: 'Warit D',
    firstName:   { th: 'วริศ', en: 'Warit' },
    lastName:    { th: 'เดชะรินทร์', en: 'Decharintr' },
    position:    'CEO',
    department:  'CEO',
    role:        'executive',
    sapLicense:  'Professional',
    email:       '',
    isActive:    true,
    canApprove:  true,
    approvalLimit: Infinity,
  },

  // ══════════════════════════════════════════
  // 📋 PM / PROJECT (PRJ Department)
  // ══════════════════════════════════════════
  {
    id: 'USR-008',
    sapUserCode: 'Jathuthep K',
    firstName:   { th: 'จตุเทพ', en: 'Jathuthep' },
    lastName:    { th: 'เกื้อดำ', en: 'Kueadam' },
    position:    'Manager',
    department:  'PRJ',
    role:        'pm',
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  true,
    approvalLimit: 100000,
  },
  {
    id: 'USR-009',
    sapUserCode: 'Winit N',
    firstName:   { th: 'วินิจ', en: 'Winit' },
    lastName:    { th: 'นาวี', en: 'Navee' },
    position:    'Head',
    department:  'PRJ',
    role:        'pm',
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  true,
    approvalLimit: 100000,
  },
  {
    id: 'USR-010',
    sapUserCode: 'Phuchong M',
    firstName:   { th: 'ภุชงค์', en: 'Phuchong' },
    lastName:    { th: 'มงคล', en: 'Mongkol' },
    position:    'Head',
    department:  'PRJ',
    role:        'pm',
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  true,
    approvalLimit: 100000,
  },
  {
    id: 'USR-011',
    sapUserCode: 'Sirikwan P',
    firstName:   { th: 'ศิริขวัญ', en: 'Sirikwan' },
    lastName:    { th: 'ประกอบกิจ', en: 'Prakobkit' },
    position:    'Senior',
    department:  'PRJ',
    role:        'staff',
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },
  {
    id: 'USR-012',
    sapUserCode: 'Noppamas B',
    firstName:   { th: 'นพมาศ', en: 'Noppamas' },
    lastName:    { th: 'บูรณะ', en: 'Burana' },
    position:    'Staff',
    department:  'PRJ',
    role:        'staff',
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },

  // ══════════════════════════════════════════
  // 💵 FINANCE
  // ══════════════════════════════════════════
  {
    id: 'USR-017',
    sapUserCode: 'Sukanya D',
    firstName:   { th: 'สุกัญญา', en: 'Sukanya' },
    lastName:    { th: 'ดวงศีลธรรม', en: 'Duangsintham' },
    position:    'Senior',
    department:  'FIN',
    role:        'finance',
    sapLicense:  'Limited - Financials',
    email:       '',
    isActive:    true,
    canApprove:  true,
    approvalLimit: 100000,
  },

  // ══════════════════════════════════════════
  // 🧮 ACCOUNTING
  // ══════════════════════════════════════════
  {
    id: 'USR-013',
    sapUserCode: 'Pranee S',
    firstName:   { th: 'ปราณี', en: 'Pranee' },
    lastName:    { th: 'สัมฤทธิ์มีผล', en: 'Samritmeephon' },
    position:    'Manager',
    department:  'ACC',
    role:        'accounting',
    sapLicense:  'Limited - Financials',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },
  {
    id: 'USR-014',
    sapUserCode: 'Wachirapron S',
    firstName:   { th: 'วชิราภรณ์', en: 'Wachirapron' },
    lastName:    { th: 'สุนทร', en: 'Sunthorn' },
    position:    'Senior',
    department:  'ACC',
    role:        'accounting',
    sapLicense:  'Limited - Financials',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },
  {
    id: 'USR-015',
    sapUserCode: 'Nuanwan W',
    firstName:   { th: 'นวลวรรณ', en: 'Nuanwan' },
    lastName:    { th: 'ว่องพานิช', en: 'Wongpanich' },
    position:    'Staff',
    department:  'ACC',
    role:        'accounting',
    sapLicense:  'Limited - Financials',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },
  {
    id: 'USR-016',
    sapUserCode: 'Kanganavadee K',
    firstName:   { th: 'กาญจนาวดี', en: 'Kanganavadee' },
    lastName:    { th: 'ก้อนเพชร', en: 'Konpetch' },
    position:    'Staff',
    department:  'ACC',
    role:        'accounting',
    sapLicense:  'Limited - Financials',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },

  // ══════════════════════════════════════════
  // 🛍 PROCUREMENT
  // ══════════════════════════════════════════
  {
    id: 'USR-006',
    sapUserCode: 'Pimradaporn S',
    firstName:   { th: 'พิมรดาภรณ์', en: 'Pimradaporn' },
    lastName:    { th: 'สูน่าหู', en: 'Sunahu' },
    position:    'Senior',
    department:  'PRC-Domestic',
    role:        'procurement',
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  true,
    approvalLimit: 50000,
  },
  {
    id: 'USR-007',
    sapUserCode: 'Mayurachat C',
    firstName:   { th: 'มยุรฉัตร', en: 'Mayurachat' },
    lastName:    { th: 'ฉันทวงศ์วุฒิ', en: 'Chantawongwut' },
    position:    'Senior',
    department:  'PRC-International',
    role:        'procurement',
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  true,
    approvalLimit: 50000,
  },

  // ══════════════════════════════════════════
  // 🗂 ADMIN / SALES / WAREHOUSE / IT
  // ══════════════════════════════════════════
  {
    id: 'USR-003',
    sapUserCode: 'Phetcharat S',
    firstName:   { th: 'เพชรรัตน์', en: 'Phetcharat' },
    lastName:    { th: 'แสนแก้ว', en: 'Saenkaew' },
    position:    'Staff',
    department:  'WHL',
    role:        'admin',
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },
  {
    id: 'USR-004',
    sapUserCode: 'Ampai T',
    firstName:   { th: 'อำไพ', en: 'Ampai' },
    lastName:    { th: 'สันทัดรัตนวงศ์', en: 'Santadratanawong' },
    position:    'Head',
    department:  'SAL',
    role:        'staff',       // Sales ใช้ SAP เดิม → web app = staff role
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },
  {
    id: 'USR-005',
    sapUserCode: 'Donnapa I',
    firstName:   { th: 'ดลนภา', en: 'Donnapa' },
    lastName:    { th: 'อินภู่พิมล', en: 'Inphupimon' },
    position:    'Senior',
    department:  'SAL',
    role:        'staff',       // Sales ใช้ SAP เดิม → web app = staff role
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },
  {
    id: 'USR-018',
    sapUserCode: 'Teera S',
    firstName:   { th: 'ธีระ', en: 'Teera' },
    lastName:    { th: 'ศุภโกมลกิจ', en: 'Suppakomolkit' },
    position:    'Senior',
    department:  'IT',
    role:        'admin',       // IT → admin role (จัดการ system)
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  false,
    approvalLimit: 0,
  },
  {
    id: 'USR-019',
    sapUserCode: 'Norawat S',
    firstName:   { th: 'นรวัฒน์', en: 'Norawat' },
    lastName:    { th: 'สรรพช่าง', en: 'Sappachang' },
    position:    'Manager',
    department:  'Ass.MD',
    role:        'pm',          // Asst MD → PM-level role
    sapLicense:  'Limited - Logistics',
    email:       '',
    isActive:    true,
    canApprove:  true,
    approvalLimit: 100000,
  },
];

// ─────────────────────────────────────────────
// Summary by Role
// ─────────────────────────────────────────────
const USER_SUMMARY = {
  executive:   USERS.filter(u => u.role === 'executive'),    // 2 คน
  pm:          USERS.filter(u => u.role === 'pm'),           // 4 คน
  finance:     USERS.filter(u => u.role === 'finance'),      // 1 คน
  accounting:  USERS.filter(u => u.role === 'accounting'),   // 4 คน
  procurement: USERS.filter(u => u.role === 'procurement'),  // 2 คน
  admin:       USERS.filter(u => u.role === 'admin'),        // 2 คน
  staff:       USERS.filter(u => u.role === 'staff'),        // 4 คน
};                                                           // Total: 19

if (typeof module !== 'undefined') module.exports = { USERS, USER_SUMMARY };
