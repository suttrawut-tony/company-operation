/**
 * Searchable Select — converts <select> to searchable dropdown
 * Usage: call makeSearchable(selectElement) or auto-init with class="searchable"
 */
(function() {
  function makeSearchable(sel) {
    if (sel.dataset.searchable === 'done') return;
    sel.dataset.searchable = 'done';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;width:' + (sel.offsetWidth || 200) + 'px;';
    wrapper.className = 'ss-wrapper';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = sel.className;
    input.placeholder = sel.options[0]?.text || 'Search...';
    input.style.cssText = sel.style.cssText + 'width:100%;cursor:pointer;';

    const dropdown = document.createElement('div');
    dropdown.className = 'ss-dropdown';
    dropdown.style.cssText = 'display:none;position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:#fff;border:1px solid var(--border);border-radius:0 0 8px 8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:999;';

    sel.style.display = 'none';
    sel.parentNode.insertBefore(wrapper, sel);
    wrapper.appendChild(input);
    wrapper.appendChild(dropdown);
    wrapper.appendChild(sel);

    function renderOptions(filter) {
      const f = (filter || '').toLowerCase();
      let html = '';
      for (const opt of sel.options) {
        const text = opt.text;
        const val = opt.value;
        if (f && !text.toLowerCase().includes(f)) continue;
        const isSelected = sel.value === val;
        html += `<div class="ss-option${isSelected?' ss-selected':''}" data-value="${val}" style="padding:8px 12px;font-size:12px;cursor:pointer;${isSelected?'background:var(--primary-light);color:var(--primary);font-weight:600;':''}">${text}</div>`;
      }
      dropdown.innerHTML = html || '<div style="padding:8px 12px;font-size:12px;color:var(--text-muted);">No results</div>';

      dropdown.querySelectorAll('.ss-option').forEach(opt => {
        opt.onmousedown = function(e) {
          e.preventDefault();
          sel.value = this.dataset.value;
          sel.dispatchEvent(new Event('change'));
          input.value = this.textContent;
          dropdown.style.display = 'none';
        };
        opt.onmouseenter = function() { this.style.background = 'var(--bg-hover)'; };
        opt.onmouseleave = function() { this.style.background = this.classList.contains('ss-selected') ? 'var(--primary-light)' : ''; };
      });
    }

    // Set initial display value
    function syncDisplay() {
      const opt = sel.options[sel.selectedIndex];
      input.value = opt && opt.value ? opt.text : '';
    }

    input.onfocus = function() {
      this.select();
      renderOptions('');
      dropdown.style.display = 'block';
    };

    input.oninput = function() {
      renderOptions(this.value);
      dropdown.style.display = 'block';
    };

    input.onblur = function() {
      setTimeout(() => { dropdown.style.display = 'none'; }, 150);
    };

    input.onkeydown = function(e) {
      if (e.key === 'Escape') { dropdown.style.display = 'none'; this.blur(); }
    };

    // Watch for programmatic changes to select
    const observer = new MutationObserver(() => { syncDisplay(); });
    observer.observe(sel, { childList: true, attributes: true });

    // Also watch value changes
    const origSetValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    Object.defineProperty(sel, 'value', {
      set(v) { origSetValue.call(this, v); syncDisplay(); },
      get() { return origSetValue ? sel.options[sel.selectedIndex]?.value || '' : ''; }
    });

    syncDisplay();
  }

  // Auto-init: convert all select.searchable on page load
  function initAll() {
    document.querySelectorAll('select.searchable, select.form-select, select.form-input').forEach(sel => {
      // Only convert selects with more than 5 options
      if (sel.options.length > 5) makeSearchable(sel);
    });
  }

  // Run on load and re-run periodically for dynamic content
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initAll, 500));
  } else {
    setTimeout(initAll, 500);
  }

  // Re-init every 3 seconds for dynamically added selects
  setInterval(() => {
    document.querySelectorAll('select.form-select:not([data-searchable="done"]), select.form-input:not([data-searchable="done"])').forEach(sel => {
      if (sel.options.length > 5) makeSearchable(sel);
    });
  }, 3000);

  window.makeSearchable = makeSearchable;
})();
