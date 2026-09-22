/* ui.js — the small shared vocabulary every view speaks. */
window.App = window.App || {};
App.UI = (function () {
  var sheet = null, scrim = null, sheetTitle = null, sheetBody = null, toastEl = null, toastT = null;
  var sheetCb = null;

  function boot() {
    sheet = document.getElementById('sheet');
    scrim = document.getElementById('scrim');
    sheetTitle = document.getElementById('sheet-title');
    sheetBody = document.getElementById('sheet-body');
    toastEl = document.getElementById('toast');
    scrim.addEventListener('click', closeSheet);
  }

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.className = 'on';
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.className = ''; }, 2400);
  }

  function openSheet(title, html, onAct) {
    sheetTitle.textContent = title;
    sheetBody.innerHTML = html;
    sheetCb = onAct || null;
    sheet.hidden = false; scrim.hidden = false;
    sheet.scrollTop = 0;
    // next frame so the transform transition actually runs
    setTimeout(function () { sheet.className = 'on'; scrim.className = 'on'; }, 16);
    return sheetBody;
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.className = ''; scrim.className = '';
    sheetCb = null;
    setTimeout(function () { sheet.hidden = true; scrim.hidden = true; sheetBody.innerHTML = ''; }, 300);
  }
  function sheetOpen() { return !sheet.hidden; }
  function sheetHandler() { return sheetCb; }
  function sheetEl() { return sheetBody; }

  function confirm(title, message, danger, onYes) {
    openSheet(title,
      '<p class="muted mb8">' + esc(message) + '</p>' +
      '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-act="yes">' + esc(danger || 'Yes, continue') + '</button>' +
      '<button class="btn btn-ghost" data-act="sheet-close">Cancel</button>',
      function (act) { if (act === 'yes') { closeSheet(); onYes(); } });
  }

  function tag(label, color, style) {
    if (!label) return '';
    return '<span class="tag tag-' + esc(color || 'orange') + (style === 'stamp' ? ' tag-stamp' : '') + '">' + esc(label) + '</span>';
  }

  function stepper(act, id, value, extra) {
    return '<div class="stepper">' +
      '<button class="step-btn" data-act="' + act + '-minus" data-id="' + esc(id) + '" aria-label="Less">&minus;</button>' +
      '<span class="step-val" data-val="' + esc(id) + '">' + value + '</span>' +
      '<button class="step-btn" data-act="' + act + '-plus" data-id="' + esc(id) + '" aria-label="More">+</button>' +
      (extra || '') + '</div>';
  }

  /* thumbnails load after paint so long lists never block scrolling */
  function hydrateThumbs(root) {
    var nodes = (root || document).querySelectorAll('[data-photo]');
    if (!nodes.length) return;
    var i = 0;
    function next() {
      if (i >= nodes.length) return;
      var n = nodes[i++], key = n.getAttribute('data-photo');
      App.DB.get(key).then(function (v) {
        if (v && n.parentNode) { n.style.backgroundImage = 'url(' + v + ')'; n.textContent = ''; }
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
  function today() { return new Date().toISOString().slice(0, 10); }

  function empty(mark, title, line, action) {
    return '<div class="empty"><div class="empty-mark">' + mark + '</div>' +
      '<h3>' + esc(title) + '</h3><p class="muted">' + esc(line) + '</p>' +
      (action ? '<div class="mt12">' + action + '</div>' : '') + '</div>';
  }

  var COLORS = [
    { v: 'red', n: 'Red tape' }, { v: 'blue', n: 'Blue paint' }, { v: 'green', n: 'Green dot' },
    { v: 'yellow', n: 'Yellow tape' }, { v: 'orange', n: 'Terracotta' },
    { v: 'white', n: 'White / bare' }, { v: 'black', n: 'Black marker' }
  ];

  return {
    boot: boot, esc: esc, toast: toast, openSheet: openSheet, closeSheet: closeSheet,
    sheetOpen: sheetOpen, sheetHandler: sheetHandler, sheetEl: sheetEl,
    confirm: confirm, tag: tag, stepper: stepper, hydrateThumbs: hydrateThumbs,
    fmtDate: fmtDate, today: today, empty: empty, COLORS: COLORS
  };
})();
