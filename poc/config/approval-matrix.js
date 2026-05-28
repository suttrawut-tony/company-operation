/**
 * SDA Operation — Approval Matrix Configuration
 * Based on: AI Brief (Section 4) + SAP Blueprint (Budget/BP Tab)
 *
 * กำหนด chain of command: สร้าง → อนุมัติ → ใช้
 */

// ─────────────────────────────────────────────
// Approval Tiers by Amount (THB)
// ─────────────────────────────────────────────
const APPROVAL_TIERS = [
  {
    id: 'tier_1',
    name: { en: 'Low Value', th: 'มูลค่าต่ำ' },
    minAmount: 0,
    maxAmount: 10000,       // ≤ ฿10,000
    requiredApprovers: ['manager'],
    description: { en: 'Manager approval only', th: 'ผู้จัดการอนุมัติเท่านั้น' },
  },
  {
    id: 'tier_2',
    name: { en: 'Medium Value', th: 'มูลค่าปานกลาง' },
    minAmount: 10001,
    maxAmount: 100000,      // ฿10K - ฿100K
    requiredApprovers: ['manager', 'finance'],
    description: { en: 'Manager + Finance', th: 'ผู้จัดการ + การเงิน' },
  },
  {
    id: 'tier_3',
    name: { en: 'High Value', th: 'มูลค่าสูง' },
    minAmount: 100001,
    maxAmount: Infinity,    // > ฿100,000
    requiredApprovers: ['manager', 'finance', 'executive'],
    description: { en: 'Manager + Finance + Executive', th: 'ผู้จัดการ + การเงิน + ผู้บริหาร' },
  },
];

// ─────────────────────────────────────────────
// Approval Workflows per Module
// ─────────────────────────────────────────────
const APPROVAL_WORKFLOWS = {

  // 💰 Budget Approval
  budget: {
    name: { en: 'Budget Approval', th: 'อนุมัติงบประมาณ' },
    statuses: ['draft', 'pending_manager', 'pending_executive', 'approved', 'rejected'],
    steps: [
      { status: 'pending_manager',   role: 'pm',        action: 'approve', label: { en: 'Manager Review', th: 'ผู้จัดการตรวจสอบ' } },
      { status: 'pending_executive', role: 'executive',  action: 'approve', label: { en: 'Executive Approval', th: 'ผู้บริหารอนุมัติ' } },
    ],
    useTiers: false,  // Budget ต้อง exec approve เสมอ
    notifications: {
      onSubmit:   ['manager'],
      onApprove:  ['creator', 'next_approver'],
      onReject:   ['creator'],
      onComplete: ['creator', 'accounting'],
    },
  },

  // 🛒 PR Approval
  pr: {
    name: { en: 'Purchase Request Approval', th: 'อนุมัติใบขอซื้อ' },
    statuses: ['draft', 'pending_manager', 'pending_finance', 'pending_executive', 'approved', 'sent_to_sap', 'rejected'],
    steps: [
      { status: 'pending_manager',   role: 'pm',         action: 'approve', label: { en: 'Manager Review', th: 'ผู้จัดการตรวจสอบ' } },
      { status: 'pending_finance',   role: 'finance',    action: 'approve', label: { en: 'Finance Review', th: 'การเงินตรวจสอบ' }, conditionalOnTier: 'tier_2' },
      { status: 'pending_executive', role: 'executive',  action: 'approve', label: { en: 'Executive Approval', th: 'ผู้บริหารอนุมัติ' }, conditionalOnTier: 'tier_3' },
    ],
    useTiers: true,
    autoActions: {
      onApproved: 'deduct_budget',      // Auto-deduct project budget
      onSentToSAP: 'create_oprq',       // POST /PurchaseRequests → SAP
    },
    notifications: {
      onSubmit:     ['manager'],
      onApprove:    ['creator', 'next_approver', 'procurement'],
      onReject:     ['creator'],
      onComplete:   ['creator', 'procurement', 'accounting'],
      onSAPSuccess: ['creator', 'procurement'],
      onSAPError:   ['creator', 'procurement', 'finance'],
    },
  },

  // 🛒 PO Approval
  po: {
    name: { en: 'Purchase Order Approval', th: 'อนุมัติใบสั่งซื้อ' },
    statuses: ['draft', 'pending_procurement', 'pending_finance', 'pending_executive', 'approved', 'sent_to_sap', 'received', 'rejected'],
    steps: [
      { status: 'pending_procurement',role: 'procurement',action: 'approve', label: { en: 'Procurement Review', th: 'จัดซื้อตรวจสอบ' } },
      { status: 'pending_finance',    role: 'finance',    action: 'approve', label: { en: 'Finance Review', th: 'การเงินตรวจสอบ' }, conditionalOnTier: 'tier_2' },
      { status: 'pending_executive',  role: 'executive',  action: 'approve', label: { en: 'Executive Approval', th: 'ผู้บริหารอนุมัติ' }, conditionalOnTier: 'tier_3' },
    ],
    useTiers: true,
    autoActions: {
      onApproved: 'deduct_budget',
      onSentToSAP: 'create_opor',       // POST /PurchaseOrders → SAP
    },
    notifications: {
      onSubmit:     ['procurement'],
      onApprove:    ['creator', 'next_approver'],
      onReject:     ['creator', 'procurement'],
      onComplete:   ['creator', 'procurement', 'accounting'],
      onSAPSuccess: ['creator', 'procurement'],
      onSAPError:   ['creator', 'procurement', 'finance'],
    },
  },

  // 🧾 Expense / Reimbursement Approval
  expense: {
    name: { en: 'Expense Approval', th: 'อนุมัติค่าใช้จ่าย' },
    statuses: ['draft', 'pending_manager', 'pending_finance', 'pending_executive', 'approved', 'paid', 'sent_to_sap', 'rejected'],
    steps: [
      { status: 'pending_manager',   role: 'pm',        action: 'approve', label: { en: 'Manager Review', th: 'ผู้จัดการตรวจสอบ' } },
      { status: 'pending_finance',   role: 'finance',   action: 'approve', label: { en: 'Finance Approval', th: 'การเงินอนุมัติจ่าย' } },
      { status: 'pending_executive', role: 'executive',  action: 'approve', label: { en: 'Executive Approval', th: 'ผู้บริหารอนุมัติ' }, conditionalOnTier: 'tier_3' },
    ],
    useTiers: true,
    subTypes: {
      reimbursement: { name: { en: 'Reimbursement', th: 'เบิกคืน' } },
      advance:       { name: { en: 'Advance Request', th: 'เบิกล่วงหน้า' } },
    },
    autoActions: {
      onApproved: 'deduct_budget',
      onSentToSAP: 'create_opch',       // POST /PurchaseInvoices (Service) → SAP
    },
    notifications: {
      onSubmit:     ['manager'],
      onApprove:    ['creator', 'next_approver'],
      onReject:     ['creator'],
      onPaid:       ['creator', 'accounting'],
      onComplete:   ['creator', 'finance', 'accounting'],
    },
  },

  // 🚗 Vehicle Booking Approval
  vehicle: {
    name: { en: 'Vehicle Booking Approval', th: 'อนุมัติจองรถ' },
    statuses: ['draft', 'pending_manager', 'approved', 'checked_out', 'checked_in', 'rejected'],
    steps: [
      { status: 'pending_manager', role: 'pm', action: 'approve', label: { en: 'Manager Approval', th: 'ผู้จัดการอนุมัติ' } },
    ],
    useTiers: false,
    notifications: {
      onSubmit:    ['manager', 'admin'],
      onApprove:   ['creator', 'admin'],
      onReject:    ['creator'],
      onCheckOut:  ['admin'],
      onCheckIn:   ['admin'],
    },
  },

  // ✈️ Travel Approval
  travel: {
    name: { en: 'Travel Approval', th: 'อนุมัติเดินทาง' },
    statuses: ['draft', 'pending_team_confirm', 'pending_manager', 'pending_executive', 'approved', 'in_progress', 'completed', 'rejected'],
    steps: [
      { status: 'pending_team_confirm', role: 'staff',     action: 'confirm', label: { en: 'Team Confirm', th: 'ทีมยืนยัน' } },
      { status: 'pending_manager',      role: 'pm',        action: 'approve', label: { en: 'Manager Approval', th: 'ผู้จัดการอนุมัติ' } },
      { status: 'pending_executive',    role: 'executive',  action: 'approve', label: { en: 'Executive Approval', th: 'ผู้บริหารอนุมัติ' }, conditionalOnTier: 'tier_3' },
    ],
    useTiers: true,
    preDepartureConfirm: {
      enabled: true,
      daysBefore: 1,        // ก่อนเดินทาง 1 วัน ทีมต้อง confirm
    },
    linkedModules: ['vehicle', 'expense'],  // auto-link จอง vehicle + advance expense
    notifications: {
      onSubmit:           ['team_members', 'manager'],
      onTeamConfirm:      ['creator'],
      onApprove:          ['creator', 'team_members', 'admin'],
      onReject:           ['creator', 'team_members'],
      onPreDepartureAlert:['team_members'],
    },
  },

  // 🌙 Holiday/OT Approval
  ot: {
    name: { en: 'Holiday Work / OT Approval', th: 'อนุมัติทำงานวันหยุด/OT' },
    statuses: ['draft', 'pending_manager', 'pending_executive', 'approved', 'paid', 'rejected'],
    steps: [
      { status: 'pending_manager',   role: 'pm',       action: 'approve', label: { en: 'Manager Approval', th: 'ผู้จัดการอนุมัติ' } },
      { status: 'pending_executive', role: 'executive', action: 'approve', label: { en: 'Executive Approval', th: 'ผู้บริหารอนุมัติ' } },
    ],
    useTiers: false,  // OT ต้อง exec approve เสมอ
    compensation: {
      // ⚠️ ต้องขอข้อมูลเพิ่มจากลูกค้า
      normalOT:  { multiplier: 1.5, maxHoursPerDay: 4 },
      holidayOT: { multiplier: 2.0, maxHoursPerDay: 8 },
      specialOT: { multiplier: 3.0, maxHoursPerDay: 8 },
    },
    notifications: {
      onSubmit:   ['manager'],
      onApprove:  ['creator', 'next_approver'],
      onReject:   ['creator'],
      onPaid:     ['creator', 'finance'],
    },
  },
};

// ─────────────────────────────────────────────
// Helper: Get approval tier by amount
// ─────────────────────────────────────────────
function getApprovalTier(amount) {
  return APPROVAL_TIERS.find(t => amount >= t.minAmount && amount <= t.maxAmount);
}

// ─────────────────────────────────────────────
// Helper: Get required steps for a workflow + amount
// ─────────────────────────────────────────────
function getRequiredSteps(workflowId, amount) {
  const workflow = APPROVAL_WORKFLOWS[workflowId];
  if (!workflow) return [];

  if (!workflow.useTiers) return workflow.steps;

  const tier = getApprovalTier(amount);
  const tierIndex = APPROVAL_TIERS.indexOf(tier);

  return workflow.steps.filter(step => {
    if (!step.conditionalOnTier) return true;
    const requiredTierIndex = APPROVAL_TIERS.findIndex(t => t.id === step.conditionalOnTier);
    return tierIndex >= requiredTierIndex;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { APPROVAL_TIERS, APPROVAL_WORKFLOWS, getApprovalTier, getRequiredSteps };
}
