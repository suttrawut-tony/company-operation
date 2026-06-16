/**
 * Company Operation — i18n (Internationalization)
 * Pure vanilla JS key-value translation system with Thai/English toggle.
 * Usage: Add data-i18n="key" attribute to any element to auto-translate its textContent.
 */

const I18N = {
  currentLang: localStorage.getItem('app_lang') || 'th',

  translations: {
    // ═══════════════════════════════════════════
    // ENGLISH
    // ═══════════════════════════════════════════
    en: {
      // ── Navigation / Sidebar ──
      dashboard:        'Dashboard',
      my_tasks:         'My Tasks',
      projects:         'All Projects',
      project_detail:   'Project Detail',
      plan_project:     'Plan Project',
      taskboard:        'Taskboard',
      budget:           'Budget',
      pr_po:            'PR / PO',
      quotation:        'Quotation',
      advance:          'Advance',
      petty_cash:       'Petty Cash',
      expense:          'Expense',
      travel:           'Travel',
      booking:          'Booking',
      vehicle:          'Vehicles',
      holiday_ot:       'Holiday / OT',
      item_master:      'Item Master',
      bp_master:        'Business Partner',
      number_running:   'Number Running',
      reports:          'Reports',
      user_permission:  'User & Permission',
      setup:            'Setup',
      changelog:        'Change Log',
      user_guide:       'User Guide',
      warehouse:        'Warehouse',

      // ── Sidebar groups ──
      nav_main:         'Main',
      nav_project:      'Project',
      nav_document:     'Document',
      nav_resource:     'Resource',
      nav_system:       'System',

      // ── Common UI ──
      save:             'Save',
      cancel:           'Cancel',
      create:           'Create',
      update:           'Update',
      delete:           'Delete',
      edit:             'Edit',
      close:            'Close',
      search:           'Search',
      export_excel:     'Export Excel',
      print:            'Print',
      submit:           'Submit',
      approve:          'Approve',
      reject:           'Reject',
      confirm:          'Confirm',
      back:             'Back',
      loading:          'Loading...',
      no_data:          'No data',
      error:            'Error',
      success:          'Success',
      actions:          'Actions',
      status:           'Status',
      date:             'Date',
      amount:           'Amount',
      total:            'Total',
      remarks:          'Remarks',
      description:      'Description',
      name:             'Name',
      code:             'Code',
      type:             'Type',
      all:              'All',
      active:           'Active',
      pending:          'Pending',
      completed:        'Completed',
      draft:            'Draft',
      approved:         'Approved',
      rejected:         'Rejected',
      cancelled:        'Cancelled',
      view_all:         'View All',
      export:           'Export',
      customize:        'Customize',
      done:             'Done',
      reset_to_default: 'Reset to Default',

      // ── Form labels ──
      project:          'Project',
      employee:         'Employee',
      start_date:       'Start Date',
      end_date:         'End Date',
      priority:         'Priority',
      document_date:    'Document Date',
      required_date:    'Required Date',
      payment_terms:    'Payment Terms',
      quantity:         'Quantity',
      unit_price:       'Unit Price',
      tax_code:         'Tax Code',
      gl_account:       'G/L Account',
      vendor:           'Vendor',
      customer:         'Customer',

      // ── Dashboard-specific ──
      active_projects:      'Active Projects',
      budget_used:          'Budget Used',
      pending_approvals:    'Pending Approvals',
      expense_this_month:   'Expense This Month',
      ai_alerts:            'AI Alerts',
      project_status:       'Project Status',
      budget_summary:       'Budget Summary',
      total_budget:         'Total Budget',
      used:                 'Used',
      remaining:            'Remaining',
      view_all_pending:     'View all pending',
      no_pending_approvals: 'No pending approvals',
      customize_dashboard:  'Customize Dashboard',
      customize_desc:       'Toggle widgets on/off and drag to reorder. Settings are saved automatically.',
      layout:               'Layout',
      widgets:              'Widgets',
      on_track:             'On Track',
      at_risk:              'At Risk',
      delayed:              'Delayed',
      items_waiting:        'items waiting',
      from_last_month:      'from last month',
      no_notifications:     'No notifications',
      notifications:        'Notifications',
      mark_all_read:        'Mark all read',
      pending_convert_sq:   'Pending SQ Creation',
      no_pending_convert:   'No items pending convert',

      // ── Page-specific (top pages) ──
      new_project:            'New Project',
      new_advance:            'New Advance',
      new_booking:            'New Booking',
      new_item:               'New Item',
      company_profile:        'Company Profile',
      ot_rate_policy:         'OT Rate Policy',
      notification_settings:  'Notification Settings',

      // ── Page Titles ──
      page_projects:        'Projects',
      page_advance:         'Advance',
      page_settings:        'Settings',

      // ── Buttons ──
      btn_new_project:      '+ New Project',
      btn_new_advance:      '+ New Advance',
      btn_export_excel:     'Export Excel',
      btn_cancel:           'Cancel',
      btn_create:           'Create',
      btn_save:             'Save',
      btn_submit:           'Submit',
      btn_confirm:          'Confirm',
      btn_record_payment:   'Record Payment',
      btn_save_changes:     'Save Changes',
      btn_save_all:         'Save All',
      btn_create_booking:   'Create',

      // ── Labels ──
      label_project_code:       'Project Code',
      label_project_name:       'Project Name',
      label_description:        'Description',
      label_start_date:         'Start Date',
      label_end_date:           'End Date',
      label_tor_amount:         'TOR Amount',
      label_pm_user:            'PM (User ID)',
      label_project:            'Project',
      label_retention_rate:     'Retention Rate (%)',
      label_status:             'Status',
      label_retention_due_date: 'Return Due Date',
      label_employee:           'Employee',
      label_description_purpose:'Description / Purpose',
      label_amount:             'Amount',
      label_purpose:            'Purpose',
      label_receipt_lines:      'Receipt Lines',
      label_expense_items:      'Expense Items',
      label_remarks:            'Remarks',
      label_method:             'Method',
      label_company_bank:       'Company Bank Account',
      label_payment_date:       'Payment Date',
      label_reference:          'Reference',
      label_attachment:         'Attachment (Slip / Receipt)',
      label_gl_journal_auto:    'GL Journal Entry (auto)',
      label_bank_account:       'Bank Account',
      label_advance:            'Advance',
      label_reimburse:          'Reimburse',

      // ── Filters ──
      filter_all:            'All',
      filter_active:         'Active',
      filter_planning:       'Planning',
      filter_completed:      'Completed',
      filter_on_hold:        'On Hold',
      filter_all_projects:   'All Projects',
      filter_all_types:      'All Types',
      filter_all_status:     'All Status',
      filter_all_employees:  'All Employees',

      // ── Modals ──
      modal_new_project:     'New Project',
      modal_retention:       'Retention Guarantee',
      modal_new_advance:     'New Advance Request',
      modal_clear:           'Clear',
      modal_record_payment:  'Record Payment',
      modal_receive_return:  'Receive Return',

      // ── Flow Steps ──
      flow_request:           '1. Request',
      flow_approve:           '2. Approve',
      flow_payment:           '3. Payment',
      flow_clear:             '4. Clear',
      flow_closed:            '5. Closed',
      flow_employee_received: '6. Employee Received',

      // ── Sidebar (Booking) ──
      sidebar_technicians:   'Technicians / Staff',
      sidebar_vehicles:      'Vehicles',
      sidebar_flights:       'Flights',

      // ── Placeholders ──
      placeholder_search_project: 'Search project name, code, PM name...',
      placeholder_project_desc:   'Project description',
      placeholder_purpose:        'Purpose of advance',
      placeholder_clear_remarks:  'Clear remarks',
      placeholder_reference:      'Transfer ref / Cheque no.',
      placeholder_select_bank:    'Select bank account',
      placeholder_reference_slip: 'Transfer ref / Slip no.',

      // ── Setup Page ──
      setup_subscription:    'Subscription & Billing',
      setup_modules:         'Module Management',
      setup_company:         'Company Profile',
      setup_company_desc:    'General information about your organization',
      setup_approval:        'Approval Matrix',
      setup_numbering:       'Document Numbering',
      setup_coa:             'Chart of Accounts',
      setup_sap:             'ERP / Accounting Connection',
      setup_tax:             'Tax Codes',
      setup_warehouse:       'Warehouses',
      setup_payment:         'Payment Terms',
      'setup_ot-rate':       'OT Rate Policy',
      setup_notifications:   'Notifications',
      setup_vehicles:        'Vehicle Master',
      setup_manpower:        'Manpower / Technician',

      // ── Language toggle ──
      lang_toggle_label:  'EN',
    },

    // ═══════════════════════════════════════════
    // THAI
    // ═══════════════════════════════════════════
    th: {
      // ── Navigation / Sidebar ──
      dashboard:        'แดชบอร์ด',
      my_tasks:         'งานของฉัน',
      projects:         'โครงการทั้งหมด',
      project_detail:   'รายละเอียดโครงการ',
      plan_project:     'วางแผนโครงการ',
      taskboard:        'บอร์ดงาน',
      budget:           'งบประมาณ',
      pr_po:            'PR / PO',
      quotation:        'ใบเสนอราคา',
      advance:          'เบิกล่วงหน้า',
      petty_cash:       'เงินสดย่อย',
      expense:          'ค่าใช้จ่าย',
      travel:           'เดินทาง',
      booking:          'จองงาน',
      vehicle:          'ยานพาหนะ',
      holiday_ot:       'วันหยุด / OT',
      item_master:      'รายการสินค้า',
      bp_master:        'คู่ค้า',
      number_running:   'เลขที่เอกสาร',
      reports:          'รายงาน',
      user_permission:  'ผู้ใช้และสิทธิ์',
      setup:            'ตั้งค่า',
      changelog:        'บันทึกการเปลี่ยนแปลง',
      user_guide:       'คู่มือการใช้งาน',
      warehouse:        'คลังสินค้า',

      // ── Sidebar groups ──
      nav_main:         'หลัก',
      nav_project:      'โครงการ',
      nav_document:     'เอกสาร',
      nav_resource:     'ทรัพยากร',
      nav_system:       'ระบบ',

      // ── Common UI ──
      save:             'บันทึก',
      cancel:           'ยกเลิก',
      create:           'สร้าง',
      update:           'อัปเดต',
      delete:           'ลบ',
      edit:             'แก้ไข',
      close:            'ปิด',
      search:           'ค้นหา',
      export_excel:     'ส่งออก Excel',
      print:            'พิมพ์',
      submit:           'ส่ง',
      approve:          'อนุมัติ',
      reject:           'ไม่อนุมัติ',
      confirm:          'ยืนยัน',
      back:             'กลับ',
      loading:          'กำลังโหลด...',
      no_data:          'ไม่มีข้อมูล',
      error:            'ข้อผิดพลาด',
      success:          'สำเร็จ',
      actions:          'การดำเนินการ',
      status:           'สถานะ',
      date:             'วันที่',
      amount:           'จำนวนเงิน',
      total:            'รวม',
      remarks:          'หมายเหตุ',
      description:      'รายละเอียด',
      name:             'ชื่อ',
      code:             'รหัส',
      type:             'ประเภท',
      all:              'ทั้งหมด',
      active:           'ใช้งาน',
      pending:          'รออนุมัติ',
      completed:        'เสร็จสิ้น',
      draft:            'แบบร่าง',
      approved:         'อนุมัติแล้ว',
      rejected:         'ไม่อนุมัติ',
      cancelled:        'ยกเลิกแล้ว',
      view_all:         'ดูทั้งหมด',
      export:           'ส่งออก',
      customize:        'ปรับแต่ง',
      done:             'เสร็จ',
      reset_to_default: 'คืนค่าเริ่มต้น',

      // ── Form labels ──
      project:          'โครงการ',
      employee:         'พนักงาน',
      start_date:       'วันที่เริ่ม',
      end_date:         'วันที่สิ้นสุด',
      priority:         'ความสำคัญ',
      document_date:    'วันที่เอกสาร',
      required_date:    'วันที่ต้องการ',
      payment_terms:    'เงื่อนไขชำระเงิน',
      quantity:         'จำนวน',
      unit_price:       'ราคาต่อหน่วย',
      tax_code:         'รหัสภาษี',
      gl_account:       'บัญชี G/L',
      vendor:           'ผู้ขาย',
      customer:         'ลูกค้า',

      // ── Dashboard-specific ──
      active_projects:      'โครงการที่ใช้งาน',
      budget_used:          'งบที่ใช้ไป',
      pending_approvals:    'รออนุมัติ',
      expense_this_month:   'ค่าใช้จ่ายเดือนนี้',
      ai_alerts:            'การแจ้งเตือน AI',
      project_status:       'สถานะโครงการ',
      budget_summary:       'สรุปงบประมาณ',
      total_budget:         'งบประมาณทั้งหมด',
      used:                 'ใช้ไป',
      remaining:            'คงเหลือ',
      view_all_pending:     'ดูรายการรออนุมัติทั้งหมด',
      no_pending_approvals: 'ไม่มีรายการรออนุมัติ',
      customize_dashboard:  'ปรับแต่งแดชบอร์ด',
      customize_desc:       'เปิด/ปิด widget และลากเรียงลำดับตามต้องการ การตั้งค่าจะถูกบันทึกอัตโนมัติ',
      layout:               'เลย์เอาต์',
      widgets:              'วิดเจ็ต',
      on_track:             'ตามแผน',
      at_risk:              'เสี่ยง',
      delayed:              'ล่าช้า',
      items_waiting:        'รายการรอดำเนินการ',
      from_last_month:      'จากเดือนที่แล้ว',
      no_notifications:     'ไม่มีการแจ้งเตือน',
      notifications:        'การแจ้งเตือน',
      mark_all_read:        'อ่านทั้งหมด',
      pending_convert_sq:   'รอสร้างใบเสนอราคา',
      no_pending_convert:   'ไม่มีรายการรอ Convert',

      // ── Page-specific (top pages) ──
      new_project:            'สร้างโครงการใหม่',
      new_advance:            'สร้างเบิกล่วงหน้า',
      new_booking:            'สร้างการจอง',
      new_item:               'สร้างรายการใหม่',
      company_profile:        'ข้อมูลบริษัท',
      ot_rate_policy:         'นโยบายอัตรา OT',
      notification_settings:  'ตั้งค่าการแจ้งเตือน',

      // ── Page Titles ──
      page_projects:        'โครงการ',
      page_advance:         'เงินทดรองจ่าย',
      page_settings:        'ตั้งค่า',

      // ── Buttons ──
      btn_new_project:      '+ สร้างโครงการ',
      btn_new_advance:      '+ สร้างเบิกล่วงหน้า',
      btn_export_excel:     'ส่งออก Excel',
      btn_cancel:           'ยกเลิก',
      btn_create:           'สร้าง',
      btn_save:             'บันทึก',
      btn_submit:           'ส่ง',
      btn_confirm:          'ยืนยัน',
      btn_record_payment:   'บันทึกการชำระเงิน',
      btn_save_changes:     'บันทึกการเปลี่ยนแปลง',
      btn_save_all:         'บันทึกทั้งหมด',
      btn_create_booking:   'สร้าง',

      // ── Labels ──
      label_project_code:       'รหัสโครงการ',
      label_project_name:       'ชื่อโครงการ',
      label_description:        'รายละเอียด',
      label_start_date:         'วันที่เริ่ม',
      label_end_date:           'วันที่สิ้นสุด',
      label_tor_amount:         'วงเงิน TOR',
      label_pm_user:            'ผู้จัดการโครงการ',
      label_project:            'โครงการ',
      label_retention_rate:     'อัตราหัก (%)',
      label_status:             'สถานะ',
      label_retention_due_date: 'วันครบกำหนดคืน',
      label_employee:           'พนักงาน',
      label_description_purpose:'รายละเอียด / วัตถุประสงค์',
      label_amount:             'จำนวนเงิน',
      label_purpose:            'วัตถุประสงค์',
      label_receipt_lines:      'รายการใบเสร็จ',
      label_expense_items:      'รายการค่าใช้จ่าย',
      label_remarks:            'หมายเหตุ',
      label_method:             'วิธีการชำระ',
      label_company_bank:       'บัญชีธนาคารบริษัท',
      label_payment_date:       'วันที่ชำระเงิน',
      label_reference:          'เลขอ้างอิง',
      label_attachment:         'แนบไฟล์ (สลิป / ใบเสร็จ)',
      label_gl_journal_auto:    'รายการบัญชี GL (อัตโนมัติ)',
      label_bank_account:       'บัญชีธนาคาร',
      label_advance:            'เงินทดรองจ่าย',
      label_reimburse:          'เบิกคืน',

      // ── Filters ──
      filter_all:            'ทั้งหมด',
      filter_active:         'ใช้งาน',
      filter_planning:       'วางแผน',
      filter_completed:      'เสร็จสิ้น',
      filter_on_hold:        'ระงับ',
      filter_all_projects:   'โครงการทั้งหมด',
      filter_all_types:      'ประเภททั้งหมด',
      filter_all_status:     'สถานะทั้งหมด',
      filter_all_employees:  'พนักงานทั้งหมด',

      // ── Modals ──
      modal_new_project:     'สร้างโครงการใหม่',
      modal_retention:       'ประกันผลงาน',
      modal_new_advance:     'สร้างเบิกล่วงหน้าใหม่',
      modal_clear:           'เคลียร์',
      modal_record_payment:  'บันทึกการชำระเงิน',
      modal_receive_return:  'รับเงินคืน',

      // ── Flow Steps ──
      flow_request:           '1. ขอเบิก',
      flow_approve:           '2. อนุมัติ',
      flow_payment:           '3. จ่ายเงิน',
      flow_clear:             '4. เคลียร์',
      flow_closed:            '5. ปิดรายการ',
      flow_employee_received: '6. พนักงานรับเงิน',

      // ── Sidebar (Booking) ──
      sidebar_technicians:   'ช่าง / พนักงาน',
      sidebar_vehicles:      'รถยนต์',
      sidebar_flights:       'เครื่องบิน',

      // ── Placeholders ──
      placeholder_search_project: 'ค้นหาชื่อโครงการ, รหัส, ชื่อ PM...',
      placeholder_project_desc:   'รายละเอียดโครงการ',
      placeholder_purpose:        'วัตถุประสงค์การเบิก',
      placeholder_clear_remarks:  'หมายเหตุการเคลียร์',
      placeholder_reference:      'เลขอ้างอิงโอน / เช็ค',
      placeholder_select_bank:    'เลือกบัญชีธนาคาร',
      placeholder_reference_slip: 'เลขอ้างอิงโอน / สลิป',

      // ── Setup Page ──
      setup_subscription:    'แพ็กเกจและการชำระเงิน',
      setup_modules:         'จัดการโมดูล',
      setup_company:         'ข้อมูลบริษัท',
      setup_company_desc:    'ข้อมูลทั่วไปเกี่ยวกับองค์กรของคุณ',
      setup_approval:        'เมทริกซ์อนุมัติ',
      setup_numbering:       'เลขที่เอกสาร',
      setup_coa:             'ผังบัญชี',
      setup_sap:             'การเชื่อมต่อ ERP / โปรแกรมบัญชี',
      setup_tax:             'รหัสภาษี',
      setup_warehouse:       'คลังสินค้า',
      setup_payment:         'เงื่อนไขชำระเงิน',
      'setup_ot-rate':       'นโยบายอัตรา OT',
      setup_notifications:   'การแจ้งเตือน',
      setup_vehicles:        'ข้อมูลรถยนต์',
      setup_manpower:        'ช่าง / พนักงาน',

      // ── Language toggle ──
      lang_toggle_label:  'TH',
    }
  },

  /**
   * Get translation for a key in the current language.
   * Falls back to the key itself if not found.
   */
  t(key) {
    const dict = this.translations[this.currentLang];
    if (dict && dict[key] !== undefined) return dict[key];
    // Try fallback to English
    const enDict = this.translations['en'];
    if (enDict && enDict[key] !== undefined) return enDict[key];
    return key;
  },

  /**
   * Set active language, persist to localStorage, and apply translations.
   */
  setLang(lang) {
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('app_lang', lang);
    this.applyTranslations();
  },

  /**
   * Toggle between 'en' and 'th'.
   */
  toggleLang() {
    this.setLang(this.currentLang === 'en' ? 'th' : 'en');
  },

  /**
   * Apply translations to all elements with data-i18n attribute.
   * Also supports:
   *   data-i18n-placeholder="key"  -> sets placeholder
   *   data-i18n-title="key"        -> sets title attribute
   * Fires a 'langchange' CustomEvent on document so pages can react.
   */
  applyTranslations() {
    // textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = this.t(key);
    });

    // placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = this.t(key);
    });

    // title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.title = this.t(key);
    });

    // Update lang toggle button text
    const toggleBtn = document.getElementById('lang-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = this.currentLang === 'en' ? 'TH' : 'EN';
    }

    // Fire custom event
    document.dispatchEvent(new CustomEvent('langchange', {
      detail: { lang: this.currentLang }
    }));
  }
};

// Make globally accessible
window.I18N = I18N;
