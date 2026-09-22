/* ==========================================================================
   Loreto's Catering Tracker — UI Component & Shared Helpers (js/ui.js)
   - Self-healing sheet initialization (never throws null pointer errors)
   - Real catering SVG icons
   - Authentic artisanal masking tape & rubber stamp badges (Original Look)
   - Dedicated #sheet-foot dock preventing all modal bleed-through
   ========================================================================== */
window.App = window.App || {};
App.UI = (function () {
  var sheet = null, scrim = null, sheetTitle = null, sheetBody = null, sheetFoot = null, toastEl = null, toastT = null;
  var sheetCb = null;
  var scrollYPos = 0;
  var closeTimer = null;

  var ICONS = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M4 9v10a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V9"/><path d="M9 13h6"/></svg>',
    truck: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h14v13H1z"/><path d="M15 8h4.5l3.5 4.5V16h-8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/></svg>',
    history: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    minus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    chevronRight: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    sort: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="16" y2="6"/><line x1="4" y1="12" x2="12" y2="12"/><line x1="4" y1="18" x2="8" y2="18"/></svg>',
    layers: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    refresh: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',

    flame: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    plate: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17h20"/><path d="M4 17a8 8 0 0 1 16 0"/><circle cx="12" cy="7" r="1.5"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
    utensils: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v19"/><path d="M5 2c0 3 1.5 5 3.5 5.5V21"/><path d="M8.5 2v5.5"/></svg>',
    chair: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M5 14v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4h8v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-5"/><path d="M4 10h16v4H4z"/></svg>',
    sparkles: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
    box: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
  };

  function icon(name, cls) {
    var svg = ICONS[name] || ICONS.plate || ICONS.box;
    if (!cls) return svg;
    return svg.replace('<svg ', '<svg class="' + cls + '" ');
  }

  var COLORS = [
    { v: 'orange', n: 'Terracotta', hex: '#C85A17' },
    { v: 'red',    n: 'Red tape',   hex: '#B3261E' },
    { v: 'blue',   n: 'Blue paint', hex: '#205987' },
    { v: 'green',  n: 'Green dot',  hex: '#266B46' },
    { v: 'yellow', n: 'Yellow tape',hex: '#CFA022' },
    { v: 'purple', n: 'Purple mark',hex: '#73278C' },
    { v: 'black',  n: 'Black marker',hex: '#252525' },
    { v: 'white',  n: 'White / bare',hex: '#F4EFE6' }
  ];

  function colorHex(col) {
    for (var i = 0; i < COLORS.length; i++) {
      if (COLORS[i].v === col) return COLORS[i].hex;
    }
    return '#C85A17';
  }

  /* Self-Healing Boot: Automatically builds sheet DOM if missing from index.html */
  function boot() {
    sheet = document.getElementById('sheet');
    scrim = document.getElementById('scrim');
    sheetTitle = document.getElementById('sheet-title');
    sheetBody = document.getElementById('sheet-body');
    sheetFoot = document.getElementById('sheet-foot');
    toastEl = document.getElementById('toast');

    if (!scrim) {
      scrim = document.createElement('div');
      scrim.id = 'scrim';
      scrim.hidden = true;
      document.body.appendChild(scrim);
    }
    scrim.removeEventListener('click', closeSheet);
    scrim.addEventListener('click', closeSheet);

    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'sheet';
      sheet.hidden = true;
      sheet.innerHTML =
        '<div class="sheet-grab"></div>' +
        '<div class="sheet-head">' +
          '<h2 id="sheet-title"></h2>' +
          '<button class="sheet-x" data-act="sheet-close" aria-label="Close">' +
            ICONS.close +
          '</button>' +
        '</div>' +
        '<div id="sheet-body"></div>' +
        '<div id="sheet-foot"></div>';
      document.body.appendChild(sheet);

      sheetTitle = document.getElementById('sheet-title');
      sheetBody = document.getElementById('sheet-body');
      sheetFoot = document.getElementById('sheet-foot');
    } else {
      if (!sheetTitle) {
        sheetTitle = sheet.querySelector('#sheet-title, h2, h3') || document.createElement('h2');
        if (!sheetTitle.id) sheetTitle.id = 'sheet-title';
      }
      if (!sheetBody) {
        sheetBody = sheet.querySelector('#sheet-body') || document.createElement('div');
        if (!sheetBody.id) {
          sheetBody.id = 'sheet-body';
          sheet.appendChild(sheetBody);
        }
      }
      if (!sheetFoot) {
        sheetFoot = sheet.querySelector('#sheet-foot');
        if (!sheetFoot) {
          sheetFoot = document.createElement('div');
          sheetFoot.id = 'sheet-foot';
          sheet.appendChild(sheetFoot);
        }
      }
    }
  }

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg) {
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = 'on';
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.className = ''; }, 2400);
  }

  function lockScroll() {
    scrollYPos = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.body.style.top = '-' + scrollYPos + 'px';
    document.body.className = (document.body.className + ' scroll-locked').trim();
  }

  function unlockScroll() {
    document.body.className = document.body.className.replace(/\bscroll-locked\b/g, '').trim();
    document.body.style.top = '';
    window.scrollTo(0, scrollYPos);
  }

  /* Sheet Lifecycle: Guarantees Fixed Dock & Safe Open */
  function openSheet(title, html, onAct) {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    boot(); // Verify nodes

    if (sheetTitle) sheetTitle.textContent = title || '';
    if (sheetBody) sheetBody.innerHTML = html || '';
    sheetCb = onAct || null;

    // Isolate sticky footer into the non-scrolling #sheet-foot dock
    if (sheetBody && sheetFoot) {
      var inlineFooter = sheetBody.querySelector('.sheet-sticky-footer');
      if (inlineFooter) {
        sheetFoot.innerHTML = inlineFooter.innerHTML;
        sheetFoot.style.display = 'block';
        inlineFooter.parentNode.removeChild(inlineFooter);
      } else {
        sheetFoot.innerHTML = '';
        sheetFoot.style.display = 'none';
      }
      sheetBody.scrollTop = 0;
    }

    if (sheet) sheet.hidden = false;
    if (scrim) scrim.hidden = false;
    lockScroll();

    setTimeout(function () {
      if (sheet) sheet.className = 'on';
      if (scrim) scrim.className = 'on';
    }, 16);

    return sheetBody;
  }

  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.className = '';
    if (scrim) scrim.className = '';
    unlockScroll();
    sheetCb = null;
    if (sheetFoot) {
      sheetFoot.innerHTML = '';
      sheetFoot.style.display = 'none';
    }
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (sheet) {
        sheet.hidden = true;
        if (sheetBody) sheetBody.innerHTML = '';
      }
      if (scrim) scrim.hidden = true;
      closeTimer = null;
    }, 340);
  }

  function sheetOpen() { return sheet && !sheet.hidden; }
  function sheetHandler() { return sheetCb; }
  function sheetEl() { return sheetBody; }

  function confirm(title, message, danger, onYes) {
    openSheet(title,
      '<p class="muted mb12">' + esc(message) + '</p>' +
      '<div class="sheet-sticky-footer">' +
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-act="confirm-yes">' + esc(danger || 'Yes, continue') + '</button>' +
        '<button class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>' +
      '</div>',
      function (act) {
        if (act === 'confirm-yes') {
          closeSheet();
          onYes();
        }
      });
  }

  function tag(label, color, style) {
    if (!label) return '';
    var col = color || 'orange';
    var isStamp = style === 'stamp';
    return '<span class="tag tag-' + esc(col) + (isStamp ? ' tag-stamp' : '') + '">' + esc(label) + '</span>';
  }

  function swatchPicker(selectedVal) {
    return '<div class="swatch-picker" id="swatch-picker">' +
      COLORS.map(function (c) {
        var isSel = (selectedVal || 'orange') === c.v;
        return '<button type="button" class="swatch-circle swatch-' + c.v + (isSel ? ' selected' : '') + '" ' +
          'data-color="' + c.v + '" title="' + esc(c.n) + '" aria-label="' + esc(c.n) + '"></button>';
      }).join('') +
      '</div>';
  }

  function stepper(act, id, value, extra) {
    return '<div class="stepper">' +
      '<button type="button" class="step-btn" data-act="' + act + '-minus" data-id="' + esc(id) + '" aria-label="Decrease">' +
        icon('minus') + '</button>' +
      '<input type="number" inputmode="numeric" pattern="[0-9]*" min="0" class="step-num" ' +
        'data-act="' + act + '-input" data-id="' + esc(id) + '" value="' + (value || 0) + '">' +
      '<button type="button" class="step-btn" data-act="' + act + '-plus" data-id="' + esc(id) + '" aria-label="Increase">' +
        icon('plus') + '</button>' +
      (extra || '') + '</div>';
  }

  function hydrateThumbs(root) {
    var nodes = (root || document).querySelectorAll('[data-photo]');
    if (!nodes.length) return;
    var i = 0;
    function next() {
      if (i >= nodes.length) return;
      var n = nodes[i++];
      var key = n.getAttribute('data-photo');
      App.DB.get(key).then(function (v) {
        if (v && n.parentNode) {
          n.style.backgroundImage = 'url(' + v + ')';
          n.innerHTML = '';
        }
        next();
      });
    }
    next();
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function empty(iconName, title, line, actionHtml) {
    return '<div class="empty">' +
      '<div class="empty-icon">' + icon(iconName || 'plate') + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p class="muted">' + esc(line) + '</p>' +
      (actionHtml ? '<div class="mt12">' + actionHtml + '</div>' : '') +
      '</div>';
  }

  return {
    boot: boot, esc: esc, toast: toast, icon: icon, ICONS: ICONS, COLORS: COLORS, colorHex: colorHex,
    swatchPicker: swatchPicker, openSheet: openSheet, closeSheet: closeSheet,
    lockScroll: lockScroll, unlockScroll: unlockScroll, sheetOpen: sheetOpen,
    sheetHandler: sheetHandler, sheetEl: sheetEl, confirm: confirm, tag: tag,
    stepper: stepper, hydrateThumbs: hydrateThumbs, fmtDate: fmtDate, today: today, empty: empty
  };
})();