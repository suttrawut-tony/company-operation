/**
 * Item Picker — shared helper for searchable item/vendor dropdowns
 * Used by: doc-detail.html, pr-create.html, quotation.html
 * Depends on: api.js, searchable-select.js
 */

// Global caches
window._masterItems = [];
window._masterItemsLoaded = false;
window._masterVendors = [];
window._masterVendorsLoaded = false;

async function loadMasterItems() {
  if (window._masterItemsLoaded) return window._masterItems;
  try {
    const items = await API.get('/master/items');
    window._masterItems = (Array.isArray(items) ? items : []).filter(i => i.is_active !== false);
    window._masterItemsLoaded = true;
  } catch(e) { console.error('Failed to load master items:', e); }
  return window._masterItems;
}

async function loadMasterVendors() {
  if (window._masterVendorsLoaded) return window._masterVendors;
  try {
    const bps = await API.get('/master/bp?type=vendor');
    window._masterVendors = (Array.isArray(bps) ? bps : []).filter(v => v.is_active !== false);
    window._masterVendorsLoaded = true;
  } catch(e) { console.error('Failed to load vendors:', e); }
  return window._masterVendors;
}

// Build <option> HTML for item select
function buildItemOptions(selectedCode) {
  return '<option value="">-- Select Item --</option>'
    + window._masterItems.map(i =>
      '<option value="' + (i.item_code||'') + '"'
      + ' data-name="' + (i.item_name||'').replace(/"/g,'&quot;') + '"'
      + ' data-uom="' + (i.uom||'EA') + '"'
      + ' data-price="' + (i.unit_price||0) + '"'
      + ' data-tax="' + (i.tax_code||'') + '"'
      + ' data-account="' + (i.gl_account||'') + '"'
      + (i.item_code === selectedCode ? ' selected' : '') + '>'
      + (i.item_code||'') + ' — ' + (i.item_name||'')
      + '</option>'
    ).join('');
}

// Build <option> HTML for vendor select
function buildVendorOptions(selectedCode) {
  return '<option value="">-- Select Vendor --</option>'
    + window._masterVendors.map(v =>
      '<option value="' + (v.bp_code||'') + '"'
      + ' data-name="' + (v.bp_name||'').replace(/"/g,'&quot;') + '"'
      + ' data-contact="' + (v.contact_person||'').replace(/"/g,'&quot;') + '"'
      + ' data-phone="' + (v.phone||'') + '"'
      + ' data-terms="' + (v.payment_terms||30) + '"'
      + ' data-taxid="' + (v.tax_id||'') + '"'
      + (v.bp_code === selectedCode ? ' selected' : '') + '>'
      + (v.bp_code||'') + ' — ' + (v.bp_name||'')
      + '</option>'
    ).join('');
}

// Auto-fill row fields when item is selected
function onItemSelect(selectEl) {
  var opt = selectEl.options[selectEl.selectedIndex];
  if (!opt || !opt.value) return;
  var row = selectEl.closest('tr');
  if (!row) return;
  var inputs = row.querySelectorAll('input, select');
  // Find fields by position or placeholder pattern
  inputs.forEach(function(inp) {
    var ph = (inp.placeholder || '').toLowerCase();
    var nm = (inp.name || inp.dataset.field || '').toLowerCase();
    // Description / item name
    if (ph.includes('desc') || ph.includes('item name') || nm.includes('desc') || nm.includes('name') || nm.includes('item_name')) {
      inp.value = opt.dataset.name || '';
    }
    // UOM
    if (nm.includes('uom') || nm.includes('unit')) {
      inp.value = opt.dataset.uom || 'EA';
    }
    // Unit price
    if (nm.includes('price') || ph.includes('price')) {
      inp.value = opt.dataset.price || 0;
      inp.dispatchEvent(new Event('input', {bubbles:true}));
    }
    // Tax code
    if (nm.includes('tax')) {
      inp.value = opt.dataset.tax || '';
    }
    // GL Account
    if (nm.includes('account') || nm.includes('gl')) {
      inp.value = opt.dataset.account || '';
    }
  });
  // Trigger recalculation (try common function names)
  if (typeof calcLines === 'function') calcLines();
  if (typeof recalcAll === 'function') recalcAll();
}

// Auto-fill vendor fields when vendor is selected
function onVendorSelect(selectEl) {
  var opt = selectEl.options[selectEl.selectedIndex];
  if (!opt || !opt.value) return;
  // Try to find vendor-related fields nearby
  var form = selectEl.closest('form') || selectEl.closest('.card-body') || document;
  var nameEl = form.querySelector('[data-field="vendor_name"], [name="vendor_name"], #vendor-name');
  var contactEl = form.querySelector('[data-field="contact"], [name="contact"], #vendor-contact');
  var phoneEl = form.querySelector('[data-field="phone"], [name="phone"], #vendor-phone');
  var termsEl = form.querySelector('[data-field="payment_terms"], [name="payment_terms"], #payment-terms');
  if (nameEl) nameEl.value = opt.dataset.name || '';
  if (contactEl) contactEl.value = opt.dataset.contact || '';
  if (phoneEl) phoneEl.value = opt.dataset.phone || '';
  if (termsEl) termsEl.value = opt.dataset.terms || 30;
}

// Init searchable on a newly added select element
function initItemPicker(selectEl) {
  if (typeof makeSearchable === 'function') {
    selectEl.dataset.searchable = '';
    makeSearchable(selectEl);
  }
}
