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
