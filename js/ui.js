/* ==========================================================================
   Loreto's Catering Tracker — UI Utilities & Component Helpers (js/ui.js)
   - Optimized for iPhone 5s (320px viewport) & iOS 12 Mobile Safari
   - True Modal Isolation (#sheet-foot completely outside #sheet-body)
   - Added category icons: coffee, package, grid (Others)
   - Clean, unified single-style label badges
   ========================================================================== */
window.App = window.App || {};

App.UI = (function () {
  var sheetEl = null, sheetTitleEl = null, sheetBodyEl = null, sheetFootEl = null, backdropEl = null;
  var currentSheetHandler = null;

  var ICONS = {
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
    utensils: '<path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10"/><path d="M15 12v8a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2v-8"/><path d="M6 2v20"/><path d="M4 2v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2"/>',
    chair: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M5 13v6"/><path d="M19 13v6"/><path d="M5 9h14v4H5z"/>',
    truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    package: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>',
    sort: '<path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="M3 17l3 3 3-3"/><path d="M6 18V4"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    history: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    sortArrow: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'
  };

  function icon(name, extraClass) {
    var svgContent = ICONS[name] || ICONS.plate;
    return '<svg class="icon' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      svgContent +
    '</svg>';
  }

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = '0' + m;
    var day = String(d.getDate());
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function fmtDate(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      if (isNaN(d.getTime())) return String(isoStr);
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    } catch (e) {
      return String(isoStr);
    }
  }

  /* Unified Single Presentation Label */
  function tag(label, color) {
    if (!label) return '';
    color = color || 'orange';
    return '<span class="tag tag-' + color + '">' + esc(label) + '</span>';
  }

  var SWATCH_COLORS = ['orange', 'red', 'yellow', 'green', 'blue', 'black', 'white'];

  function swatchPicker(selected) {
    selected = selected || 'orange';
    var circles = SWATCH_COLORS.map(function (c) {
      return '<button type="button" class="swatch-circle swatch-' + c + (selected === c ? ' selected' : '') + '" data-color="' + c + '" aria-label="Color ' + c + '"></button>';
    }).join('');
    return '<div class="swatch-picker" id="swatch-picker">' + circles + '</div>';
  }

  function empty(iconName, title, desc, actionHtml) {
    return '<div class="empty">' +
      '<div class="empty-icon">' + icon(iconName || 'plate') + '</div>' +
      '<h4 class="empty-title">' + esc(title) + '</h4>' +
      '<p class="empty-desc">' + esc(desc) + '</p>' +
      (actionHtml ? '<div class="mt12">' + actionHtml + '</div>' : '') +
    '</div>';
  }

  function toast(msg) {
    var container = document.getElementById('toast');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast';
      document.body.appendChild(container);
    }
    container.textContent = msg;
    container.className = 'show';
    setTimeout(function () {
      container.className = '';
    }, 2400);
  }

  function confirm(title, text, confirmLabel, onConfirm) {
    var html =
      '<div class="card mb12">' +
        '<p style="font-size:13px;color:var(--timber-ink)">' + esc(text) + '</p>' +
      '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-danger" id="modal-confirm-btn">' + esc(confirmLabel || 'Confirm') + '</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>' +
      '</div>';

    openSheet(title, html, function (act) {
      if (act === 'sheet-close') closeSheet();
    });

    var cBtn = document.getElementById('modal-confirm-btn');
    if (cBtn) {
      cBtn.addEventListener('click', function () {
        closeSheet();
        if (onConfirm) onConfirm();
      });
    }
  }

  function openSheet(title, contentHtml, handler) {
    boot();
    currentSheetHandler = handler || null;

    sheetTitleEl.textContent = title;
    sheetBodyEl.innerHTML = contentHtml;
    sheetBodyEl.scrollTop = 0;

    var inlineFooter = sheetBodyEl.querySelector('.sheet-sticky-footer');
    if (inlineFooter && sheetFootEl) {
      sheetFootEl.innerHTML = inlineFooter.innerHTML;
      sheetFootEl.style.display = 'block';
      inlineFooter.parentNode.removeChild(inlineFooter);
    } else if (sheetFootEl) {
      sheetFootEl.innerHTML = '';
      sheetFootEl.style.display = 'none';
    }

    sheetEl.className = 'sheet open';
    backdropEl.className = 'backdrop show';
    document.body.style.overflow = 'hidden';

    return sheetBodyEl;
  }

  function closeSheet() {
    if (!sheetEl) return;
    sheetEl.className = 'sheet';
    backdropEl.className = 'backdrop';
    document.body.style.overflow = '';
    currentSheetHandler = null;
    if (sheetFootEl) {
      sheetFootEl.innerHTML = '';
      sheetFootEl.style.display = 'none';
    }
  }

  function hydrateThumbs(rootEl) {
    var root = rootEl || document;
    var thumbNodes = root.querySelectorAll('[data-photo]');
    for (var i = 0; i < thumbNodes.length; i++) {
      (function (node) {
        var key = node.getAttribute('data-photo');
        if (key && App.DB) {
          App.DB.get(key).then(function (blobUrl) {
            if (blobUrl) {
              node.style.backgroundImage = 'url(' + blobUrl + ')';
              node.style.backgroundSize = 'cover';
              node.style.backgroundPosition = 'center';
            }
          });
        }
      })(thumbNodes[i]);
    }
  }

  function boot() {
    sheetEl = document.getElementById('sheet');
    sheetTitleEl = document.getElementById('sheet-title');
    sheetBodyEl = document.getElementById('sheet-body');
    sheetFootEl = document.getElementById('sheet-foot');
    backdropEl = document.getElementById('sheet-backdrop');

    if (!backdropEl) {
      backdropEl = document.createElement('div');
      backdropEl.id = 'sheet-backdrop';
      backdropEl.className = 'backdrop';
      document.body.appendChild(backdropEl);
    }

    if (!sheetEl) {
      sheetEl = document.createElement('div');
      sheetEl.id = 'sheet';
      sheetEl.className = 'sheet';
      sheetEl.innerHTML =
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-head">' +
          '<h3 id="sheet-title" class="sheet-title truncate"></h3>' +
          '<button type="button" class="sheet-close" data-act="sheet-close" aria-label="Close">' +
            icon('close') +
          '</button>' +
        '</div>' +
        '<div id="sheet-body" class="sheet-body"></div>' +
        '<div id="sheet-foot" class="sheet-foot"></div>';
      document.body.appendChild(sheetEl);

      sheetTitleEl = document.getElementById('sheet-title');
      sheetBodyEl = document.getElementById('sheet-body');
      sheetFootEl = document.getElementById('sheet-foot');
    } else {
      if (!sheetFootEl) {
        sheetFootEl = document.createElement('div');
        sheetFootEl.id = 'sheet-foot';
        sheetFootEl.className = 'sheet-foot';
        sheetEl.appendChild(sheetFootEl);
      }
    }

    if (backdropEl) {
      backdropEl.removeEventListener('click', closeSheet, false);
      backdropEl.addEventListener('click', closeSheet, false);
    }
  }

  return {
    boot: boot,
    icon: icon,
    esc: esc,
    today: today,
    fmtDate: fmtDate,
    tag: tag,
    swatchPicker: swatchPicker,
    empty: empty,
    toast: toast,
    confirm: confirm,
    openSheet: openSheet,
    closeSheet: closeSheet,
    sheetHandler: function () { return currentSheetHandler; },
    hydrateThumbs: hydrateThumbs
  };
})();