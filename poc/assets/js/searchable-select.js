/**
 * Searchable Select — converts <select> to searchable dropdown
 * Usage: call makeSearchable(selectElement) or auto-init with class="searchable"
 *
 * Fixes: BUG1 setInterval query, BUG2 value getter, BUG5 wrapper width
 * Added: Arrow key navigation, Enter to select, match highlight
 */
(function() {
  function makeSearchable(sel) {
    if (sel.dataset.searchable === 'done') return;
    sel.dataset.searchable = 'done';

    // FIX BUG5: fallback min-width when offsetWidth is 0 (newly created via innerHTML)
    var w = Math.max(sel.offsetWidth, 120);
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;width:' + w + 'px;min-width:120px;';
    wrapper.className = 'ss-wrapper';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = sel.className.replace('searchable', '').trim();
    input.placeholder = sel.options[0]?.text || 'Search...';
    input.style.cssText = (sel.style.cssText || '') + 'width:100%;cursor:pointer;';

    var dropdown = document.createElement('div');
    dropdown.className = 'ss-dropdown';
    dropdown.style.cssText = 'display:none;position:absolute;top:100%;left:0;right:0;max-height:220px;overflow-y:auto;background:#fff;border:1px solid var(--border,#e5e7eb);border-radius:0 0 8px 8px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:9999;';

    sel.style.display = 'none';
    sel.parentNode.insertBefore(wrapper, sel);
    wrapper.appendChild(input);
    wrapper.appendChild(dropdown);
    wrapper.appendChild(sel);

    var highlightIdx = -1;

    function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function highlightMatch(text, filter) {
      if (!filter) return escHtml(text);
      var lower = text.toLowerCase();
      var idx = lower.indexOf(filter.toLowerCase());
      if (idx < 0) return escHtml(text);
      return escHtml(text.substring(0, idx))
        + '<b style="color:var(--primary,#3b82f6);text-decoration:underline;">' + escHtml(text.substring(idx, idx + filter.length)) + '</b>'
        + escHtml(text.substring(idx + filter.length));
    }

    function renderOptions(filter) {
      var f = (filter || '').toLowerCase();
      var html = '';
      var count = 0;
      for (var i = 0; i < sel.options.length; i++) {
        var opt = sel.options[i];
        var text = opt.text;
        var val = opt.value;
        if (!val && i === 0) continue; // skip placeholder
        if (f && !text.toLowerCase().includes(f) && !val.toLowerCase().includes(f)) continue;
        var isSelected = sel.value === val;
        html += '<div class="ss-option' + (isSelected ? ' ss-selected' : '') + '" data-value="' + val + '" data-idx="' + count + '" style="padding:8px 12px;font-size:12px;cursor:pointer;' + (isSelected ? 'background:var(--primary-light,#eef2ff);color:var(--primary,#3b82f6);font-weight:600;' : '') + '">' + highlightMatch(text, filter || '') + '</div>';
        count++;
      }
      if (!count) html = '<div style="padding:8px 12px;font-size:12px;color:var(--text-muted,#9ca3af);">No results</div>';
      dropdown.innerHTML = html;
      highlightIdx = -1;

      dropdown.querySelectorAll('.ss-option').forEach(function(optEl) {
        optEl.onmousedown = function(e) {
          e.preventDefault();
          selectOption(this.dataset.value, this.textContent);
        };
        optEl.onmouseenter = function() {
          clearHighlight();
          this.style.background = 'var(--bg-hover,#f1f3f7)';
          highlightIdx = parseInt(this.dataset.idx) || 0;
        };
        optEl.onmouseleave = function() {
          this.style.background = this.classList.contains('ss-selected') ? 'var(--primary-light,#eef2ff)' : '';
        };
      });
    }

    function selectOption(value, text) {
      // Use original setter to avoid recursion
      origDesc.set.call(sel, value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      syncDisplay();
      dropdown.style.display = 'none';
    }

    function clearHighlight() {
      dropdown.querySelectorAll('.ss-option').forEach(function(o) {
        o.style.background = o.classList.contains('ss-selected') ? 'var(--primary-light,#eef2ff)' : '';
      });
    }

    function moveHighlight(dir) {
      var options = dropdown.querySelectorAll('.ss-option');
      if (!options.length) return;
      highlightIdx += dir;
      if (highlightIdx < 0) highlightIdx = options.length - 1;
      if (highlightIdx >= options.length) highlightIdx = 0;
      clearHighlight();
      var el = options[highlightIdx];
      if (el) {
        el.style.background = 'var(--bg-hover,#f1f3f7)';
        el.scrollIntoView({ block: 'nearest' });
      }
    }

    function confirmHighlight() {
      var options = dropdown.querySelectorAll('.ss-option');
      if (highlightIdx >= 0 && highlightIdx < options.length) {
        var el = options[highlightIdx];
        selectOption(el.dataset.value, el.textContent);
      }
    }

    // Set initial display value
    function syncDisplay() {
      var opt = sel.options[sel.selectedIndex];
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
      setTimeout(function() { dropdown.style.display = 'none'; }, 150);
    };

    // Keyboard: Escape close, ArrowDown/Up navigate, Enter select
    input.onkeydown = function(e) {
      if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        this.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (dropdown.style.display === 'none') { renderOptions(''); dropdown.style.display = 'block'; }
        moveHighlight(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveHighlight(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (dropdown.style.display !== 'none' && highlightIdx >= 0) {
          confirmHighlight();
        }
      }
    };

    // Watch for programmatic changes to select (options added dynamically)
    var observer = new MutationObserver(function() { syncDisplay(); });
    observer.observe(sel, { childList: true, attributes: true });

    // FIX BUG2: use proper getter+setter from prototype
    var origDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(sel, 'value', {
      set: function(v) { origDesc.set.call(this, v); syncDisplay(); },
      get: function() { return origDesc.get.call(this); }
    });

    syncDisplay();
  }

  // Auto-init: convert all selects with enough options
  function initAll() {
    document.querySelectorAll('select.searchable, select.form-select, select.form-input').forEach(function(sel) {
      if (sel.options.length > 5) makeSearchable(sel);
    });
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initAll, 500); });
  } else {
    setTimeout(initAll, 500);
  }

  // FIX BUG1: Re-init every 2s — include select.searchable in query
  setInterval(function() {
    document.querySelectorAll(
      'select.searchable:not([data-searchable="done"]),'
      + 'select.form-select:not([data-searchable="done"]),'
      + 'select.form-input:not([data-searchable="done"])'
    ).forEach(function(sel) {
      if (sel.options.length > 2) makeSearchable(sel);
    });
  }, 2000);

  window.makeSearchable = makeSearchable;
})();
