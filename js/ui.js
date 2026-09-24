/* ==========================================================================
   Loreto's Catering Tracker — UI Utilities & Component Helpers (js/ui.js)
   - Zero emojis: Clean, aesthetic Feather/Lucide vector SVG icons
   - Added: alertTriangle, filter, warehouse, info, and box icons
   - Optimized for iPhone 5s (320px viewport) & iOS 12 Mobile Safari
   - Reusable Component Helpers: viewModeToggle, gridDensityBar, topPaginationBar,
     catAccordionPagination, paginationBar, and icon-capable tags
   - Modal bottom sheet with directional page transitions & gesture dismiss
   ========================================================================== */
window.App = window.App || {};

App.UI = (function () {
  var sheetEl = null, sheetTitleEl = null, sheetBodyEl = null, sheetFootEl = null, backdropEl = null;
  var currentSheetHandler = null;

  /* Lightbox Elements */
  var lightboxEl = null, lightboxImgEl = null, lightboxTitleEl = null, lightboxMetaEl = null;

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
    viewCards: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/>',
    viewList: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
    viewGrid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    warehouse: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
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
    chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    sortArrow: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    zoom: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>'
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

  function tag(label, color, iconName) {
    if (!label) return '';
    color = color || 'orange';
    var iconHtml = iconName ? icon(iconName, 'tag-svg-icon') : '';
    return '<span class="tag tag-' + color + '">' + iconHtml + esc(label) + '</span>';
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

  /* ==========================================================================
     Reusable UI Component: View Mode Toggle (Animated Magic Pill Glider)
     ========================================================================== */
  function viewModeToggle(currentMode, actName) {
    var act = actName || 'set-view-mode';
    var mode = currentMode || 'cards';
    var gliderX = (mode === 'grid') ? 66 : (mode === 'compact' ? 34 : 2);

    return '<div class="view-mode-pills view-mode-animated" data-mode="' + esc(mode) + '">' +
      '<div class="view-mode-glider" style="transform:translate3d(' + gliderX + 'px, 0, 0);width:32px"></div>' +
      '<button type="button" class="view-mode-btn' + (mode === 'cards' ? ' on' : '') + '" data-act="' + act + '" data-mode="cards" aria-label="Standard card view" title="Standard Cards">' +
        icon('viewCards') +
      '</button>' +
      '<button type="button" class="view-mode-btn' + (mode === 'compact' ? ' on' : '') + '" data-act="' + act + '" data-mode="compact" aria-label="Compact accordion list view" title="Compact List">' +
        icon('viewList') +
      '</button>' +
      '<button type="button" class="view-mode-btn' + (mode === 'grid' ? ' on' : '') + '" data-act="' + act + '" data-mode="grid" aria-label="Grid view" title="Grid View">' +
        icon('viewGrid') +
      '</button>' +
    '</div>';
  }

  /* ==========================================================================
     Reusable UI Component: Dedicated Grid Density Bar
     ========================================================================== */
  function gridDensityBar(gridCols, colActName) {
    var cols = parseInt(gridCols, 10) || 2;
    var cAct = colActName || 'set-grid-cols';

    return '<div class="grid-density-bar">' +
      '<span class="grid-density-label">Grid density:</span>' +
      '<div class="grid-col-pills">' +
        '<button type="button" class="grid-col-btn' + (cols === 2 ? ' on' : '') + '" data-act="' + cAct + '" data-cols="2">2 wide</button>' +
        '<button type="button" class="grid-col-btn' + (cols === 3 ? ' on' : '') + '" data-act="' + cAct + '" data-cols="3">3 col</button>' +
        '<button type="button" class="grid-col-btn' + (cols === 4 ? ' on' : '') + '" data-act="' + cAct + '" data-cols="4">4 dense</button>' +
      '</div>' +
    '</div>';
  }

  /* ==========================================================================
     Reusable UI Component: Top Compact Pagination Bar
     ========================================================================== */
  function topPaginationBar(opts) {
    opts = opts || {};
    var page = opts.page || 1;
    var totalPages = opts.totalPages || 1;
    var count = opts.count !== undefined ? opts.count : 0;
    var prevAct = opts.prevAct || 'top-prev-page';
    var nextAct = opts.nextAct || 'top-next-page';

    if (totalPages <= 1) return '';

    return '<div class="top-pagination-box">' +
      '<button type="button" class="top-page-btn" data-act="' + prevAct + '"' + (page <= 1 ? ' disabled' : '') + '>' +
        '&larr; Prev' +
      '</button>' +
      '<span class="top-page-info">Page <strong>' + page + '</strong> of ' + totalPages + ' <span class="muted">(' + count + ' items)</span></span>' +
      '<button type="button" class="top-page-btn" data-act="' + nextAct + '"' + (page >= totalPages ? ' disabled' : '') + '>' +
        'Next &rarr;' +
      '</button>' +
    '</div>';
  }

  /* ==========================================================================
     Reusable UI Component: Per-Category Accordion Pagination Bar
     ========================================================================== */
  function catAccordionPagination(opts) {
    opts = opts || {};
    var page = opts.page || 1;
    var totalPages = opts.totalPages || 1;
    var totalItems = opts.totalItems || 0;
    var catId = opts.catId || '';
    var prevAct = opts.prevAct || 'cat-acc-prev-page';
    var nextAct = opts.nextAct || 'cat-acc-next-page';

    if (totalPages <= 1) return '';

    return '<div class="cat-acc-pagination">' +
      '<button type="button" class="cat-page-btn" data-act="' + prevAct + '" data-cat="' + esc(catId) + '"' + (page <= 1 ? ' disabled' : '') + '>' +
        '&larr; Prev' +
      '</button>' +
      '<span class="cat-page-info">' + page + ' / ' + totalPages + ' <span class="muted">(' + totalItems + ' items)</span></span>' +
      '<button type="button" class="cat-page-btn" data-act="' + nextAct + '" data-cat="' + esc(catId) + '"' + (page >= totalPages ? ' disabled' : '') + '>' +
        'Next &rarr;' +
      '</button>' +
    '</div>';
  }

  /* ==========================================================================
     Reusable UI Component: Bottom Pagination & Page-Size Bar
     ========================================================================== */
  function paginationBar(opts) {
    opts = opts || {};
    var page = opts.page || 1;
    var totalPages = opts.totalPages || 1;
    var pageSize = opts.pageSize || 10;
    var prevAct = opts.prevAct || 'prev-page';
    var nextAct = opts.nextAct || 'next-page';
    var sizeAct = opts.sizeAct || 'change-page-size';
    var sizes = opts.sizes || [5, 10, 15, 25];

    var sizePills = sizes.map(function (sz) {
      return '<button type="button" class="size-pill' + (pageSize === sz ? ' on' : '') + '" data-act="' + sizeAct + '" data-size="' + sz + '">' + sz + '</button>';
    }).join('');

    return '<div class="pagination-bar">' +
      '<div class="pagination-nav">' +
        '<button type="button" class="pagination-btn" data-act="' + prevAct + '"' + (page <= 1 ? ' disabled' : '') + '>' +
          '&larr; Prev' +
        '</button>' +
        '<span class="pagination-info">Page ' + page + ' of ' + totalPages + '</span>' +
        '<button type="button" class="pagination-btn" data-act="' + nextAct + '"' + (page >= totalPages ? ' disabled' : '') + '>' +
          'Next &rarr;' +
        '</button>' +
      '</div>' +
      '<div class="pagination-size-wrap">' +
        '<span class="pagination-size-label">Show per page:</span>' +
        '<div class="pagination-size-pills">' + sizePills + '</div>' +
      '</div>' +
    '</div>';
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

  function isSheetOpen() {
    return !!(sheetEl && sheetEl.classList.contains('open'));
  }

  /* Open Bottom Sheet with Directional Inter-Modal Page Slide Transitions */
  function openSheet(title, contentHtml, handler, transitionDir) {
    boot();
    var isAlreadyOpen = isSheetOpen();
    currentSheetHandler = handler || null;

    sheetTitleEl.textContent = title;
    sheetBodyEl.innerHTML = contentHtml;
    sheetBodyEl.scrollTop = 0;

    sheetEl.style.transform = '';
    sheetEl.style.transition = '';
    if (backdropEl) backdropEl.style.opacity = '';

    var inlineFooter = sheetBodyEl.querySelector('.sheet-sticky-footer');
    if (inlineFooter && sheetFootEl) {
      sheetFootEl.innerHTML = inlineFooter.innerHTML;
      sheetFootEl.style.display = 'block';
      inlineFooter.parentNode.removeChild(inlineFooter);
    } else if (sheetFootEl) {
      sheetFootEl.innerHTML = '';
      sheetFootEl.style.display = 'none';
    }

    if (isAlreadyOpen && transitionDir !== 'none') {
      var dirClass = (transitionDir === 'back') ? 'sheet-page-slide-back' : 'sheet-page-slide-forward';
      sheetBodyEl.classList.remove('sheet-page-slide-forward', 'sheet-page-slide-back');
      sheetTitleEl.classList.remove('sheet-title-fade');
      void sheetBodyEl.offsetWidth;
      sheetBodyEl.classList.add(dirClass);
      sheetTitleEl.classList.add('sheet-title-fade');
      if (sheetFootEl && sheetFootEl.style.display !== 'none') {
        sheetFootEl.classList.remove('sheet-page-slide-forward', 'sheet-page-slide-back');
        void sheetFootEl.offsetWidth;
        sheetFootEl.classList.add(dirClass);
      }
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

    sheetEl.style.transform = '';
    sheetEl.style.transition = '';
    if (backdropEl) backdropEl.style.opacity = '';

    if (sheetFootEl) {
      sheetFootEl.innerHTML = '';
      sheetFootEl.style.display = 'none';
    }

    if (window.App && App.Views && App.Views.Catering && App.Views.Catering.Nav) {
      App.Views.Catering.Nav.clear();
    }
  }

  /* High-Resolution Item Lightbox Engine */
  function openLightbox(photoKeyOrUrl, title, metaHtml) {
    boot();
    if (!lightboxEl) return;

    var fullKey = photoKeyOrUrl || '';
    if (fullKey.indexOf('-t') === fullKey.length - 2) {
      fullKey = fullKey.slice(0, -2);
    }

    lightboxTitleEl.textContent = title || 'Gear Photo';
    lightboxMetaEl.innerHTML = metaHtml || '';
    lightboxImgEl.src = '';
    lightboxImgEl.style.display = 'none';

    var spinner = lightboxEl.querySelector('.lightbox-spinner');
    if (spinner) spinner.style.display = 'block';

    lightboxEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    function setImgSrc(src) {
      if (!src) {
        if (spinner) spinner.style.display = 'none';
        return;
      }
      lightboxImgEl.onload = function () {
        if (spinner) spinner.style.display = 'none';
        lightboxImgEl.style.display = 'block';
      };
      lightboxImgEl.onerror = function () {
        if (spinner) spinner.style.display = 'none';
      };
      lightboxImgEl.src = src;
    }

    if (fullKey.indexOf('data:') === 0 || fullKey.indexOf('blob:') === 0 || fullKey.indexOf('http') === 0) {
      setImgSrc(fullKey);
    } else if (fullKey && App.DB) {
      App.DB.get(fullKey).then(function (res) {
        if (res) {
          setImgSrc(res);
        } else {
          App.DB.get(fullKey + '-t').then(function (tRes) {
            setImgSrc(tRes || '');
          });
        }
      }).catch(function () {
        if (spinner) spinner.style.display = 'none';
      });
    } else {
      if (spinner) spinner.style.display = 'none';
    }
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove('open');
    if (lightboxImgEl) {
      lightboxImgEl.src = '';
      lightboxImgEl.style.display = 'none';
    }
    if (!sheetEl || !sheetEl.classList.contains('open')) {
      document.body.style.overflow = '';
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

  /* Interactive Swipe-Down-To-Dismiss Engine */
  function attachDragListeners() {
    var startY = 0;
    var currentDeltaY = 0;
    var isDragging = false;
    var dragTarget = null;

    function getTouchY(e) {
      return (e.touches && e.touches[0]) ? e.touches[0].clientY : 0;
    }

    sheetEl.addEventListener('touchstart', function (e) {
      if (!sheetEl.classList.contains('open')) return;
      var y = getTouchY(e);
      startY = y;
      currentDeltaY = 0;
      isDragging = false;

      var target = e.target;
      var cur = target;
      var isHandleOrHead = false;
      var isBody = false;

      while (cur && cur !== sheetEl && cur !== document.body) {
        if (cur.classList) {
          if (cur.classList.contains('sheet-handle') || cur.classList.contains('sheet-head')) {
            isHandleOrHead = true;
            break;
          }
          if (cur.classList.contains('sheet-body')) {
            isBody = true;
          }
        }
        cur = cur.parentNode;
      }

      if (isHandleOrHead) {
        dragTarget = 'handle';
      } else if (isBody && sheetBodyEl && sheetBodyEl.scrollTop <= 0) {
        dragTarget = 'body';
      } else {
        dragTarget = null;
      }
    }, { passive: true });

    sheetEl.addEventListener('touchmove', function (e) {
      if (!dragTarget) return;
      var y = getTouchY(e);
      var deltaY = y - startY;

      if (deltaY > 0) {
        if (dragTarget === 'body') {
          if (sheetBodyEl.scrollTop > 0) return;
        }

        if (e.cancelable) e.preventDefault();

        isDragging = true;
        currentDeltaY = deltaY;

        sheetEl.style.transition = 'none';
        sheetEl.style.transform = 'translate3d(0, ' + deltaY + 'px, 0)';

        var sheetHeight = sheetEl.offsetHeight || 360;
        var ratio = Math.max(0, 1 - (deltaY / sheetHeight));
        if (backdropEl) {
          backdropEl.style.opacity = ratio;
        }
      } else if (deltaY < 0 && dragTarget === 'handle') {
        if (e.cancelable) e.preventDefault();
        sheetEl.style.transform = 'translate3d(0, 0, 0)';
      }
    }, { passive: false });

    sheetEl.addEventListener('touchend', function () {
      if (!isDragging) {
        dragTarget = null;
        return;
      }

      sheetEl.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
      if (backdropEl) backdropEl.style.transition = 'opacity 0.24s ease';

      if (currentDeltaY > 80) {
        sheetEl.style.transform = 'translate3d(0, 100%, 0)';
        if (backdropEl) backdropEl.style.opacity = '0';

        setTimeout(function () {
          closeSheet();
        }, 240);
      } else {
        sheetEl.style.transform = 'translate3d(0, 0, 0)';
        if (backdropEl) backdropEl.style.opacity = '1';

        setTimeout(function () {
          sheetEl.style.transform = '';
          sheetEl.style.transition = '';
          if (backdropEl) {
            backdropEl.style.opacity = '';
            backdropEl.style.transition = '';
          }
        }, 240);
      }

      isDragging = false;
      dragTarget = null;
    }, { passive: true });

    backdropEl.addEventListener('touchmove', function (e) {
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    if (sheetFootEl) {
      sheetFootEl.addEventListener('touchmove', function (e) {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
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
        '<div class="sheet-handle-zone">' +
          '<div class="sheet-handle"></div>' +
        '</div>' +
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

      attachDragListeners();
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

    lightboxEl = document.getElementById('lightbox');
    if (!lightboxEl) {
      lightboxEl = document.createElement('div');
      lightboxEl.id = 'lightbox';
      lightboxEl.className = 'lightbox';
      lightboxEl.innerHTML =
        '<div class="lightbox-backdrop" data-act="lightbox-close"></div>' +
        '<div class="lightbox-dialog">' +
          '<div class="lightbox-top">' +
            '<div class="grow mr8">' +
              '<h4 id="lightbox-title" class="lightbox-title truncate">Gear Photo</h4>' +
              '<div id="lightbox-meta" class="lightbox-meta"></div>' +
            '</div>' +
            '<button type="button" class="lightbox-close-btn" data-act="lightbox-close" aria-label="Close photo preview">' +
              icon('close') +
            '</button>' +
          '</div>' +
          '<div class="lightbox-body">' +
            '<div class="lightbox-spinner">' + icon('refresh') + '</div>' +
            '<img id="lightbox-img" class="lightbox-img" alt="Enlarged gear preview">' +
          '</div>' +
          '<div class="lightbox-foot">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="lightbox-close">Close preview</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(lightboxEl);

      lightboxImgEl = document.getElementById('lightbox-img');
      lightboxTitleEl = document.getElementById('lightbox-title');
      lightboxMetaEl = document.getElementById('lightbox-meta');

      lightboxEl.addEventListener('click', function (e) {
        var hit = e.target;
        while (hit && hit !== lightboxEl) {
          if (hit.getAttribute && hit.getAttribute('data-act') === 'lightbox-close') {
            e.preventDefault();
            closeLightbox();
            return;
          }
          hit = hit.parentNode;
        }
      }, false);

      lightboxEl.addEventListener('touchmove', function (e) {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
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
    isSheetOpen: isSheetOpen,
    sheetHandler: function () { return currentSheetHandler; },
    hydrateThumbs: hydrateThumbs,
    openLightbox: openLightbox,
    closeLightbox: closeLightbox,
    viewModeToggle: viewModeToggle,
    gridDensityBar: gridDensityBar,
    topPaginationBar: topPaginationBar,
    catAccordionPagination: catAccordionPagination,
    paginationBar: paginationBar
  };
})();