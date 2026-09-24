/* ==========================================================================
   Loreto's Catering Tracker — Views: Inventory (js/views/inventory.js)
   - Direct 2-way routing to Catering: "Return to Catering Load-out" action
   - Lightbox modal integration: tap gear photo to enlarge with zoom badge
   - Reusable Icon View Switcher (Cards / Compact Accordion / 3-Col Grid)
   - Reusable Pagination Bar with Page Size selector (5, 10, 15, 25 items)
   - Category scroll lock: exact scrollLeft position preserved without moving
   - In-place custom dropdowns (Stock & Sort) with spring animation
   - 3D Spring sort direction toggle (Ascending / Descending)
   - Dynamic "Reset filters" button
   - Full Item Stats modal with gig usage trend chart & stock audit controls
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.inventory = (function () {
  var U = App.UI, S = App.Store;
  var q = '', cat = '', sortField = 'alpha', sortDir = 'asc', stockFilter = 'all';
  var viewMode = 'cards';
  var openAccordions = {};
  var page = 1;
  var pageSize = 10;
  var totalPages = 1;
  var chipsScrollLeft = 0;
  var docListenerAttached = false;
  var openedFromCatering = false;

  var pendingPhoto = null, editingId = null;
  var selectedTagColor = 'orange', selectedCategoryId = '';
  var selectedIsConsumable = false;
  var selectedNewCatIcon = 'plate';

  var AVAILABLE_CAT_ICONS = ['plate', 'flame', 'utensils', 'coffee', 'truck', 'chair', 'sparkles', 'package', 'grid'];

  var STOCK_OPTIONS = [
    { id: 'all',     label: 'All stock' },
    { id: 'low',     label: 'Low stock' },
    { id: 'empty',   label: 'Out of stock' },
    { id: 'instock', label: 'In stock' }
  ];

  var SORT_OPTIONS = [
    { id: 'alpha', label: 'Name' },
    { id: 'mod',   label: 'Last modified' },
    { id: 'date',  label: 'Date added' },
    { id: 'qty',   label: 'Stock count' }
  ];

  function ensureOthersCategory() {
    var cats = S.categories();
    var hasOthers = cats.some(function (c) { return c.name.toLowerCase() === 'others'; });
    if (!hasOthers && cats.length > 0) {
      S.saveCategory({ name: 'Others', icon: 'grid' });
    }
  }

  function topbarRight() {
    return '<button type="button" class="topbar-btn" data-act="add-item" aria-label="Add new gear">' +
      U.icon('plus') + '<span>Add</span>' +
    '</button>';
  }

  function toggleDropdown(targetType, triggerEl) {
    var allMenus = document.querySelectorAll('.c-dropdown-menu');
    var allBtns = document.querySelectorAll('.c-dropdown-btn');
    var allChevrons = document.querySelectorAll('.c-dropdown-chevron');
    var allDropdowns = document.querySelectorAll('.c-dropdown');

    var menu = document.getElementById('menu-' + targetType);
    var btn = triggerEl ? triggerEl.closest('.c-dropdown-btn') : null;
    var chevron = btn ? btn.querySelector('.c-dropdown-chevron') : null;
    var parentDd = btn ? btn.closest('.c-dropdown') : null;

    var isCurrentlyOpen = menu && menu.classList.contains('show');

    for (var i = 0; i < allMenus.length; i++) allMenus[i].classList.remove('show');
    for (var j = 0; j < allBtns.length; j++) {
      allBtns[j].classList.remove('active');
      allBtns[j].setAttribute('aria-expanded', 'false');
    }
    for (var k = 0; k < allChevrons.length; k++) allChevrons[k].classList.remove('open');
    for (var m = 0; m < allDropdowns.length; m++) allDropdowns[m].style.zIndex = '';

    if (!isCurrentlyOpen && menu && btn) {
      if (parentDd) parentDd.style.zIndex = '70';
      menu.classList.add('show');
      btn.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
      if (chevron) chevron.classList.add('open');
    }
  }

  function closeAllDropdowns() {
    var allMenus = document.querySelectorAll('.c-dropdown-menu');
    var allBtns = document.querySelectorAll('.c-dropdown-btn');
    var allChevrons = document.querySelectorAll('.c-dropdown-chevron');
    var allDropdowns = document.querySelectorAll('.c-dropdown');
    for (var i = 0; i < allMenus.length; i++) allMenus[i].classList.remove('show');
    for (var j = 0; j < allBtns.length; j++) {
      allBtns[j].classList.remove('active');
      allBtns[j].setAttribute('aria-expanded', 'false');
    }
    for (var k = 0; k < allChevrons.length; k++) allChevrons[k].classList.remove('open');
    for (var m = 0; m < allDropdowns.length; m++) allDropdowns[m].style.zIndex = '';
  }

  function renderCustomDropdown(type, label, options, selectedVal) {
    return '<div class="c-dropdown" id="dd-' + type + '">' +
      '<button type="button" class="c-dropdown-btn" data-act="toggle-dd" data-dd="' + type + '" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="c-dropdown-label truncate">' + U.esc(label) + '</span>' +
        U.icon('chevronDown', 'c-dropdown-chevron') +
      '</button>' +
      '<div class="c-dropdown-menu" id="menu-' + type + '" role="listbox">' +
        options.map(function (opt) {
          var isSel = (opt.id === selectedVal);
          return '<button type="button" class="c-dropdown-item' + (isSel ? ' on' : '') + '" data-act="pick-dd-option" data-dd="' + type + '" data-val="' + opt.id + '">' +
            '<span>' + U.esc(opt.label) + '</span>' +
            (isSel ? U.icon('check', 'check-icon') : '') +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ==========================================================================
     View Mode Renderers (Cards / Compact / Grid)
     ========================================================================== */
  function cardRow(i) {
    var c = S.category(i.categoryId);
    var asOf = i.updatedAt ? U.fmtDate(i.updatedAt) : '';
    var catIcon = c ? (c.icon || 'plate') : 'plate';
    var brandLabel = i.brand ? i.brand : (i.tagLabel || 'Loreto');
    var isConsumable = !!i.isConsumable;
    var threshold = i.lowStockThreshold || 2;
    var curQty = i.qty || 0;

    var stockBadge = '';
    if (curQty === 0) {
      stockBadge = '<span class="tag tag-red" style="font-size:9.5px;margin-left:4px">Out of stock</span>';
    } else if (curQty <= threshold) {
      stockBadge = '<span class="tag tag-orange" style="font-size:9.5px;margin-left:4px">Low (' + curQty + ')</span>';
    }

    return '<button type="button" class="item" data-act="open-stats" data-id="' + i.id + '">' +
      '<span class="thumb"' + (i.photoId ? ' data-photo="' + i.photoId + '-t"' : '') + '>' +
        (i.photoId ? '' : U.icon(catIcon)) + '</span>' +
      '<span class="grow truncate">' +
        '<span class="item-name truncate">' + U.esc(i.name) + '</span>' +
        '<span class="item-sub truncate">' +
          U.esc(c ? c.name : 'Uncategorised') + ' &middot; ' + U.esc(i.unit) +
        '</span>' +
        '<span class="row mt4" style="flex-wrap:wrap;gap:4px">' +
          U.tag(brandLabel, i.tagColor) +
          (isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
          stockBadge +
          (asOf ? '<span class="muted ml4" style="font-size:10.5px">As of ' + asOf + '</span>' : '') +
        '</span>' +
      '</span>' +
      '<span class="item-qty" style="color:' + (curQty === 0 ? 'var(--alert)' : (curQty <= threshold ? 'var(--inasal-orange)' : 'var(--timber-ink)')) + '">' +
        curQty +
      '</span>' +
      '</button>';
  }

  function renderCompactView(items) {
    var cats = S.categories();
    var groups = {};
    var uncat = [];

    items.forEach(function (it) {
      var cId = it.categoryId;
      if (cId) {
        if (!groups[cId]) groups[cId] = [];
        groups[cId].push(it);
      } else {
        uncat.push(it);
      }
    });

    var html = '';

    cats.forEach(function (c) {
      var cItems = groups[c.id];
      if (!cItems || !cItems.length) return;

      var isOpen = openAccordions[c.id] !== false;

      var rowsHtml = cItems.map(function (it) {
        var brandLabel = it.brand ? it.brand : (it.tagLabel || 'Loreto');
        var threshold = it.lowStockThreshold || 2;
        var curQty = it.qty || 0;
        var qtyColor = curQty === 0 ? 'var(--alert)' : (curQty <= threshold ? 'var(--inasal-orange)' : 'var(--timber-ink)');

        return '<div class="compact-item-row" data-act="open-stats" data-id="' + it.id + '">' +
          '<div class="compact-item-info">' +
            '<div class="compact-item-name truncate">' + U.esc(it.name) + '</div>' +
            '<div class="compact-item-meta">' +
              U.tag(brandLabel, it.tagColor) +
              (it.isConsumable ? '<span class="tag tag-yellow ml4" style="font-size:9.5px">Supply</span>' : '') +
            '</div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0">' +
            '<span style="font-size:15px;font-weight:700;color:' + qtyColor + '">' + curQty + '</span>' +
            '<span class="muted ml4" style="font-size:11px">' + U.esc(it.unit) + '</span>' +
          '</div>' +
        '</div>';
      }).join('');

      html += '<div class="cat-accordion ' + (isOpen ? 'open' : '') + '" id="inv-cat-acc-' + c.id + '">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-inv-cat-acc" data-id="' + c.id + '">' +
          '<span class="cat-accordion-title">' +
            U.icon(c.icon || 'plate') +
            '<span>' + U.esc(c.name) + '</span>' +
            '<span class="cat-accordion-badge">' + cItems.length + '</span>' +
          '</span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + rowsHtml + '</div>' +
      '</div>';
    });

    if (uncat.length) {
      var isOpenUncat = openAccordions['uncat'] !== false;
      var uncatRows = uncat.map(function (it) {
        var curQty = it.qty || 0;
        return '<div class="compact-item-row" data-act="open-stats" data-id="' + it.id + '">' +
          '<div class="compact-item-info">' +
            '<div class="compact-item-name truncate">' + U.esc(it.name) + '</div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0">' +
            '<span style="font-size:15px;font-weight:700">' + curQty + '</span>' +
            '<span class="muted ml4" style="font-size:11px">' + U.esc(it.unit) + '</span>' +
          '</div>' +
        '</div>';
      }).join('');

      html += '<div class="cat-accordion ' + (isOpenUncat ? 'open' : '') + '" id="inv-cat-acc-uncat">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-inv-cat-acc" data-id="uncat">' +
          '<span class="cat-accordion-title"><span>Uncategorised</span><span class="cat-accordion-badge">' + uncat.length + '</span></span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + uncatRows + '</div>' +
      '</div>';
    }

    return html;
  }

  function renderGridView(items) {
    var tiles = items.map(function (it) {
      var photoKey = it.photoId ? (it.photoId + '-t') : '';
      var cat = S.category(it.categoryId);
      var brandLabel = it.brand ? it.brand : (it.tagLabel || '');
      var threshold = it.lowStockThreshold || 2;
      var curQty = it.qty || 0;

      var pillHtml = '';
      if (curQty === 0) {
        pillHtml = '<div class="grid-staged-pill short truncate">Out of stock</div>';
      } else if (curQty <= threshold) {
        pillHtml = '<div class="grid-staged-pill supply truncate">Low (' + curQty + ')</div>';
      } else {
        pillHtml = '<div class="grid-staged-pill done truncate">' + curQty + ' in stock</div>';
      }

      return '<div class="grid-item-card" data-act="open-stats" data-id="' + it.id + '">' +
        '<div class="grid-thumb-box" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '<span class="grid-qty-badge">' + curQty + ' ' + U.esc(it.unit) + '</span>' +
        '</div>' +
        '<div class="grid-title">' + U.esc(it.name) + '</div>' +
        (brandLabel ? '<div class="grid-brand truncate">' + U.esc(brandLabel) + '</div>' : '') +
        pillHtml +
      '</div>';
    }).join('');

    return '<div class="ecommerce-grid">' + tiles + '</div>';
  }

  function render() {
    ensureOthersCategory();
    var cats = S.categories();

    var dirLocked = (sortField === 'mod');
    var sortBy = dirLocked ? 'mod-desc' : (sortField + '-' + sortDir);
    var list = S.searchItems(q, cat, sortBy, stockFilter);

    // Pagination calculations
    totalPages = Math.ceil(list.length / pageSize) || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    var startIdx = (page - 1) * pageSize;
    var endIdx = Math.min(startIdx + pageSize, list.length);
    var paginatedItems = list.slice(startIdx, endIdx);

    var catChips = '<button type="button" class="chip' + (cat ? '' : ' on') + '" data-act="cat" data-id="">All</button>' +
      cats.map(function (c) {
        return '<button type="button" class="chip' + (cat === c.id ? ' on' : '') + '" data-act="cat" data-id="' + c.id + '">' +
          U.icon(c.icon || 'plate') + ' ' + U.esc(c.name) + '</button>';
      }).join('') +
      '<button type="button" class="chip" data-act="manage-cats">' + U.icon('settings') + ' Categories</button>';

    var curStockObj = STOCK_OPTIONS.filter(function (o) { return o.id === stockFilter; })[0] || STOCK_OPTIONS[0];
    var curSortObj = SORT_OPTIONS.filter(function (o) { return o.id === sortField; })[0] || SORT_OPTIONS[0];

    var isFiltered = !!(q || cat || stockFilter !== 'all' || sortField !== 'alpha' || sortDir !== 'asc');

    var resetBtnHtml = isFiltered ? (
      '<button type="button" class="btn-reset-filters" data-act="reset-filters" aria-label="Reset all filters">' +
        U.icon('refresh') + '<span>Reset</span>' +
      '</button>'
    ) : '';

    var contentHtml = '';
    if (!paginatedItems.length) {
      contentHtml = U.empty('search', isFiltered ? 'No items match filter' : 'Inventory is empty',
        isFiltered ? 'Try resetting filters or tap "All".' : 'Add your first trays, burners, or tables.',
        isFiltered
          ? '<button type="button" class="btn btn-primary btn-sm" data-act="reset-filters">' + U.icon('refresh', 'mr4') + ' Reset filters</button>'
          : '<button type="button" class="btn btn-primary" data-act="add-item">' + U.icon('plus', 'mr4') + ' Add first item</button>');
    } else if (viewMode === 'compact') {
      contentHtml = renderCompactView(paginatedItems);
    } else if (viewMode === 'grid') {
      contentHtml = renderGridView(paginatedItems);
    } else {
      contentHtml = '<div class="list list-stagger">' + paginatedItems.map(cardRow).join('') + '</div>';
    }

    var paginationHtml = (list.length > 0) ? U.paginationBar({
      page: page,
      totalPages: totalPages,
      pageSize: pageSize,
      prevAct: 'inv-prev-page',
      nextAct: 'inv-next-page',
      sizeAct: 'change-page-size'
    }) : '';

    return '<div class="search">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="inv-q" type="search" placeholder="Search gear, brand, or tag" value="' + U.esc(q) + '">' +
      '</div>' +

      '<div class="chips filter-bar">' + catChips + '</div>' +

      '<div class="filter-row mb8">' +
        renderCustomDropdown('stock', curStockObj.label, STOCK_OPTIONS, stockFilter) +
        renderCustomDropdown('sort', curSortObj.label, SORT_OPTIONS, sortField) +
        '<button type="button" class="btn btn-ghost sort-dir-btn' + (dirLocked ? ' disabled' : '') + '" data-act="toggle-sort-dir"' + (dirLocked ? ' disabled' : '') +
          ' aria-label="' + (sortDir === 'desc' ? 'Sorted high to low \u2014 tap to reverse' : 'Sorted low to high \u2014 tap to reverse') + '">' +
          U.icon('sortArrow', 'sort-dir-icon' + (sortDir === 'desc' && !dirLocked ? ' flipped' : '')) +
        '</button>' +
      '</div>' +

      '<div class="row row-between mb8" style="padding:0 2px">' +
        '<div class="row">' +
          '<span class="muted mr6" style="font-size:11px">' +
            (list.length ? 'Showing ' + (startIdx + 1) + '&ndash;' + endIdx + ' of ' + list.length : '0 items') +
          '</span>' +
          resetBtnHtml +
        '</div>' +
        U.viewModeToggle(viewMode, 'set-inv-view-mode') +
      '</div>' +

      contentHtml +
      paginationHtml;
  }

  function mounted(root) {
    U.hydrateThumbs(root);

    var chipsEl = root.querySelector('.chips.filter-bar');
    if (chipsEl) {
      if (chipsScrollLeft > 0) {
        chipsEl.scrollLeft = chipsScrollLeft;
        requestAnimationFrame(function () {
          if (chipsEl) chipsEl.scrollLeft = chipsScrollLeft;
        });
      }
      chipsEl.addEventListener('scroll', function () {
        chipsScrollLeft = chipsEl.scrollLeft;
      }, { passive: true });
    }

    if (!docListenerAttached) {
      docListenerAttached = true;
      document.addEventListener('click', function (e) {
        if (!e.target.closest('.c-dropdown')) {
          closeAllDropdowns();
        }
      }, false);
    }

    var input = document.getElementById('inv-q');
    if (input) {
      input.addEventListener('input', function () {
        q = input.value;
        page = 1;
        var pos = input.selectionStart;
        App.rerenderQuiet();
        var again = document.getElementById('inv-q');
        if (again) {
          again.focus();
          try { again.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }
  }

  /* Full Item Stats, Usage Trend & Audit Modal (with Lightbox Enlarge & Catering Return) */
  function openStats(id, fromCatering) {
    openedFromCatering = !!fromCatering;
    var stats = S.itemStats(id);
    if (!stats) return;
    var it = stats.item;
    var c = S.category(it.categoryId);
    var catIcon = c ? (c.icon || 'plate') : 'plate';
    var brandLabel = it.brand ? it.brand : (it.tagLabel || 'Loreto');
    var currentDateVal = it.updatedAt ? it.updatedAt.slice(0, 10) : U.today();
    var isConsumable = !!it.isConsumable;

    var trendData = S.itemUsageTrend(it.id);
    var maxVal = 1;
    trendData.forEach(function (pt) {
      if (pt.staged > maxVal) maxVal = pt.staged;
    });

    var trendBarsHtml = trendData.length ? (
      '<div class="chart-card mb12">' +
        '<div class="row row-between mb4">' +
          '<strong style="font-size:12px;color:var(--timber-ink)">' + U.icon('history', 'mr4') + ' Recent Gig Deployment Trend</strong>' +
          '<span class="muted" style="font-size:11px">Last ' + trendData.length + ' events</span>' +
        '</div>' +
        '<div class="chart-bars">' +
          trendData.map(function (pt) {
            var barHeight = Math.max(8, Math.round((pt.staged / maxVal) * 52));
            var color = isConsumable ? 'var(--gold, #D49B42)' : 'var(--foliage, #245A3E)';
            return '<div class="chart-bar-wrap">' +
              '<span style="font-size:9.5px;font-weight:700;color:var(--timber-ink);margin-bottom:2px">' + pt.staged + '</span>' +
              '<div class="chart-bar" style="height:' + barHeight + 'px;background:' + color + '"></div>' +
              '<span class="chart-label truncate" style="max-width:44px">' + U.esc(pt.date || pt.name) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="row row-between mt4" style="font-size:11px;color:var(--timber-soft)">' +
          '<span>' + (isConsumable ? 'Used: ' + stats.totalConsumedEver + ' ' + U.esc(it.unit) : 'Deployed: ' + stats.totalLoadedEver + ' total') + '</span>' +
          '<span>' + stats.eventsUsed + ' gigs total</span>' +
        '</div>' +
      '</div>'
    ) : '';

    var returnToCateringBtn = openedFromCatering ? (
      '<button type="button" class="btn btn-primary mb8" data-act="return-to-catering">' +
        U.icon('truck', 'mr4') + ' Return to Catering Load-out' +
      '</button>'
    ) : '';

    var html =
      returnToCateringBtn +

      '<div class="card mb12">' +
        '<div class="row row-start">' +
          '<div class="thumb" id="dash-photo-box" data-act="' + (it.photoId ? 'view-inv-photo' : 'dash-pick-photo') + '" data-id="' + it.id + '" style="width:62px;height:62px;flex:0 0 62px;margin-right:12px;cursor:pointer;position:relative"' +
            (it.photoId ? ' data-photo="' + it.photoId + '"' : '') + '>' +
            (it.photoId ? '' : U.icon(catIcon)) +
            '<div data-act="dash-pick-photo" title="Change photo" style="position:absolute;bottom:-4px;right:-4px;background:rgba(33,29,26,0.85);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3)">' +
              U.icon(it.photoId ? 'camera' : 'plus') +
            '</div>' +
          '</div>' +
          '<div class="grow" style="min-width:0">' +
            '<h3 style="font-size:16px;font-weight:700;color:var(--timber-ink);word-break:break-word">' + U.esc(it.name) + '</h3>' +
            '<p class="muted mt2" style="font-size:12px">' +
              U.esc(c ? c.name : 'Uncategorised') + ' &middot; in ' + U.esc(it.unit) + 's' +
            '</p>' +
            '<div class="row mt4" style="gap:4px;flex-wrap:wrap">' +
              U.tag(brandLabel, it.tagColor) +
              (isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
              (it.tagLabel && it.brand ? '<span class="muted ml4" style="font-size:11px">' + U.esc(it.tagLabel) + '</span>' : '') +
            '</div>' +
            (it.photoId ? (
              '<div class="row mt6" style="gap:6px">' +
                '<button type="button" class="btn btn-ghost btn-sm" data-act="view-inv-photo" data-id="' + it.id + '" style="width:auto;min-height:28px;padding:2px 8px;font-size:11px">' +
                  U.icon('zoom', 'mr4') + 'Enlarge' +
                '</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-act="dash-pick-photo" style="width:auto;min-height:28px;padding:2px 8px;font-size:11px">' +
                  U.icon('camera', 'mr4') + 'Change' +
                '</button>' +
              '</div>'
            ) : '') +
          '</div>' +
        '</div>' +
        '<input class="hidden-file" type="file" id="dash-file" accept="image/*">' +
      '</div>' +

      '<div class="card mb12">' +
        '<div class="row row-between">' +
          '<div>' +
            '<span style="font-size:12px;font-weight:700;color:var(--timber-ink);text-transform:uppercase">Inventory Count</span>' +
            '<p class="muted" style="font-size:11.5px">Threshold: ' + stats.lowStockThreshold + ' ' + U.esc(it.unit) + '</p>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="stat-delta" data-id="' + it.id + '" data-delta="-1">' + U.icon('minus') + '</button>' +
            '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" id="stat-stock-input" value="' + it.qty + '">' +
            '<button type="button" class="step-btn" data-act="stat-delta" data-id="' + it.id + '" data-delta="1">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +

        '<div class="row row-between mt8" style="padding-top:6px;border-top:1px solid var(--line)">' +
          '<button type="button" class="btn btn-ghost btn-sm" style="width:23%" data-act="stat-delta" data-id="' + it.id + '" data-delta="-5">&minus;5</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" style="width:23%" data-act="stat-delta" data-id="' + it.id + '" data-delta="-1">&minus;1</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" style="width:23%" data-act="stat-delta" data-id="' + it.id + '" data-delta="1">+1</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" style="width:23%" data-act="stat-delta" data-id="' + it.id + '" data-delta="5">+5</button>' +
        '</div>' +

        '<div class="row row-between mt12" style="padding-top:10px;border-top:1px solid var(--line)">' +
          '<div class="grow mr8">' +
            '<label for="stat-asof" style="font-size:11.5px;font-weight:600;color:var(--timber-soft);display:block;margin-bottom:3px">' +
              U.icon('calendar', 'chip-icon') + ' Audit Date (As of):' +
            '</label>' +
            '<input type="date" class="input" id="stat-asof" value="' + currentDateVal + '" style="min-height:38px;padding:6px 8px;font-size:13px">' +
          '</div>' +
          '<div style="padding-top:16px">' +
            '<button type="button" class="btn btn-primary btn-sm" data-act="save-stock-audit" data-id="' + it.id + '" style="min-height:38px;padding:6px 14px">' +
              'Save count' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="kpi-grid mb12">' +
        '<div class="kpi"><div class="kpi-in">' +
          '<div class="kpi-n">' + stats.inInventory + '</div>' +
          '<div class="kpi-l">In inventory</div></div></div>' +
        '<div class="kpi"><div class="kpi-in' + (stats.currentlyOut > 0 ? ' kpi-hot' : '') + '">' +
          '<div class="kpi-n">' + stats.currentlyOut + '</div>' +
          '<div class="kpi-l">Loaded in van</div></div></div>' +
        '<div class="kpi"><div class="kpi-in">' +
          '<div class="kpi-n">' + stats.eventsUsed + '</div>' +
          '<div class="kpi-l">Gigs used on</div></div></div>' +
        '<div class="kpi"><div class="kpi-in' + (!isConsumable && stats.totalMissingEver > 0 ? ' kpi-hot' : '') + '">' +
          '<div class="kpi-n">' + (isConsumable ? stats.totalConsumedEver : stats.totalMissingEver) + '</div>' +
          '<div class="kpi-l">' + (isConsumable ? 'Total consumed' : 'Lost ever') + '</div></div></div>' +
      '</div>' +

      trendBarsHtml +

      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<span class="muted" style="font-size:12px">Last audited (As of):</span>' +
          '<strong style="font-size:12px">' + U.fmtDate(stats.updatedAt) + '</strong>' +
        '</div>' +
        '<div class="row row-between mb4">' +
          '<span class="muted" style="font-size:12px">Added to inventory:</span>' +
          '<span style="font-size:12px">' + U.fmtDate(stats.createdAt) + '</span>' +
        '</div>' +
        (stats.lastUsedDate ? '<div class="row row-between mb4"><span class="muted" style="font-size:12px">Last gig out:</span><span style="font-size:12px">' + U.fmtDate(stats.lastUsedDate) + '</span></div>' : '') +
        '<div class="row row-between">' +
          '<span class="muted" style="font-size:12px">Saved in presets:</span>' +
          '<span style="font-size:12px">' + stats.presetsCount + ' kits</span>' +
        '</div>' +
        (it.note ? '<div class="divider"></div><p style="font-size:12px;color:var(--timber-ink)"><strong style="color:var(--timber-ink)">Notes:</strong> ' + U.esc(it.note) + '</p>' : '') +
      '</div>' +

      '<button type="button" class="btn btn-primary" data-act="edit-item" data-id="' + it.id + '">' + U.icon('edit', 'mr4') + ' Edit item details</button>' +
      '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Done</button>';

    var body = U.openSheet(it.name, html, onAct);
    U.hydrateThumbs(body);

    var dFile = document.getElementById('dash-file');
    if (dFile) {
      dFile.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        U.toast('Uploading gear photo\u2026');
        App.Image.compress(f).then(function (r) {
          var pid = it.photoId || S.uid('ph-');
          it.photoId = pid;
          App.DB.set(pid, r.full);
          App.DB.set(pid + '-t', r.thumb);
          S.saveItem(it);
          U.toast('Photo updated.');
          App.rerenderQuiet();
          openStats(it.id, openedFromCatering);
        });
      });
    }
  }

  function openEditor(id) {
    ensureOthersCategory();
    var it = id ? S.item(id) : null;
    editingId = id || null;
    pendingPhoto = null;
    selectedTagColor = it ? (it.tagColor || 'orange') : 'orange';
    selectedCategoryId = it ? (it.categoryId || '') : '';
    selectedIsConsumable = it ? !!it.isConsumable : false;
    var cats = S.categories();

    var typeSelectorHtml =
      '<div class="row mb8" style="gap:8px" id="type-selector">' +
        '<button type="button" class="btn grow btn-sm ' + (!selectedIsConsumable ? 'btn-primary' : 'btn-ghost') + '" id="btn-type-durable" data-act="pick-item-type" data-type="durable" style="min-height:38px;font-size:12px">' +
          U.icon('truck', 'mr4') + ' Reusable Gear' +
        '</button>' +
        '<button type="button" class="btn grow btn-sm ' + (selectedIsConsumable ? 'btn-primary' : 'btn-ghost') + '" id="btn-type-consumable" data-act="pick-item-type" data-type="consumable" style="min-height:38px;font-size:12px">' +
          U.icon('sparkles', 'mr4') + ' Consumable' +
        '</button>' +
      '</div>' +
      '<p class="muted mb12" id="type-hint" style="font-size:11.5px">' +
        (selectedIsConsumable ? 'Supplies used up on location (fuel cans, skewers, napkins). Not flagged as lost.' : 'Durable gear (chafing dishes, pots, plates). Must return 100%.') +
      '</p>';

    var catGridHtml = '<div class="cat-grid" id="cat-selector">' +
      cats.map(function (c) {
        var isSel = (selectedCategoryId === c.id);
        return '<div class="cat-card">' +
          '<button type="button" class="cat-btn' + (isSel ? ' selected' : '') + '" data-act="pick-cat-card" data-cat="' + c.id + '">' +
            U.icon(c.icon || 'plate') +
            '<span>' + U.esc(c.name) + '</span>' +
          '</button>' +
        '</div>';
      }).join('') +
      '</div>';

    var qtySectionHtml = it ? (
      '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line)">' +
        '<div class="row row-between">' +
          '<div>' +
            '<span style="font-size:11.5px;font-weight:700;color:var(--timber-soft);text-transform:uppercase">Current Inventory Stock</span>' +
            '<div style="font-size:16px;font-weight:700;color:var(--timber-ink)">' + it.qty + ' ' + U.esc(it.unit) + '</div>' +
          '</div>' +
          '<span class="muted" style="font-size:11.5px;text-align:right">Stock adjustments are made via audits in Item Details</span>' +
        '</div>' +
      '</div>'
    ) : (
      '<div class="field">' +
        '<label for="f-qty">Initial Inventory Stock *</label>' +
        '<input class="input" id="f-qty" type="number" inputmode="numeric" min="0" value="1">' +
      '</div>'
    );

    var html =
      '<div class="field">' +
        '<label>Item Nature</label>' +
        typeSelectorHtml +
      '</div>' +

      '<div class="field">' +
        '<label for="f-name">Item Name *</label>' +
        '<input class="input" id="f-name" value="' + U.esc(it ? it.name : '') + '" placeholder="e.g. Chafing dish + lid">' +
      '</div>' +

      '<div class="row">' +
        '<div class="grow mr8">' +
          '<div class="field">' +
            '<label for="f-brand">Brand / Model (Shows on mark tape) *</label>' +
            '<input class="input" id="f-brand" value="' + U.esc(it ? (it.brand || '') : '') + '" placeholder="e.g. Tramontina / Coleman">' +
          '</div>' +
        '</div>' +
        '<div style="width:96px">' +
          '<div class="field">' +
            '<label for="f-unit">Unit</label>' +
            '<input class="input" id="f-unit" value="' + U.esc(it ? it.unit : 'pc') + '" placeholder="pc / set">' +
          '</div>' +
        '</div>' +
      '</div>' +

      qtySectionHtml +

      '<div class="field">' +
        '<label for="f-threshold">Low Stock Alert Threshold</label>' +
        '<input class="input" id="f-threshold" type="number" inputmode="numeric" min="0" value="' + (it ? (it.lowStockThreshold !== undefined ? it.lowStockThreshold : 2) : 2) + '" placeholder="Alert when stock falls to this count">' +
        '<span class="muted" style="font-size:11px;display:block;margin-top:2px">Triggers low-stock warnings when inventory drops to or below this quantity.</span>' +
      '</div>' +

      '<div class="field">' +
        '<label>Category</label>' +
        catGridHtml +
        '<input type="hidden" id="f-cat" value="' + selectedCategoryId + '">' +
      '</div>' +

      '<div class="divider"></div>' +

      '<div class="field">' +
        '<label for="f-tag">Secondary Marking Note (Optional)</label>' +
        '<input class="input" id="f-tag" value="' + U.esc(it ? it.tagLabel : '') + '" placeholder="e.g. Red tape on handle / L on base">' +
      '</div>' +

      '<div class="field">' +
        '<label>Mark Tape Color</label>' +
        U.swatchPicker(selectedTagColor) +
      '</div>' +

      '<div class="divider"></div>' +

      '<div class="field">' +
        '<label>Gear Photo</label>' +
        '<div class="photo-box" id="f-photo" data-act="pick-photo">' +
          '<div class="photo-box-content" id="f-photo-hint">' +
            U.icon('camera') +
            '<span>Tap to snap or upload gear photo</span>' +
          '</div>' +
        '</div>' +
        '<input class="hidden-file" type="file" id="f-file" accept="image/*">' +
        '<button type="button" class="btn btn-ghost btn-sm mt8" data-act="clear-photo">' + U.icon('trash', 'mr4') + ' Remove photo</button>' +
      '</div>' +

      '<div class="field">' +
        '<label for="f-note">Condition Notes</label>' +
        '<textarea class="input" id="f-note" placeholder="e.g. Minor dent on lid, handle tightened">' + U.esc(it ? it.note : '') + '</textarea>' +
      '</div>' +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary mb8" data-act="save-item">' +
          (it ? 'Save changes' : 'Add to inventory shelf') +
        '</button>' +
        '<div class="row" style="gap:6px">' +
          (it ? '<button type="button" class="btn btn-danger grow btn-sm" data-act="del-item">' + U.icon('trash', 'mr4') + 'Delete</button>' : '') +
          '<button type="button" class="btn btn-ghost grow btn-sm" data-act="sheet-close">Cancel</button>' +
        '</div>' +
      '</div>';

    var body = U.openSheet(it ? ('Edit: ' + it.name) : 'Add New Gear', html, onAct);

    var picker = document.getElementById('swatch-picker');
    if (picker) {
      picker.addEventListener('click', function (e) {
        var circle = e.target.closest('[data-color]');
        if (!circle) return;
        selectedTagColor = circle.getAttribute('data-color');
        var all = picker.querySelectorAll('.swatch-circle');
        for (var i = 0; i < all.length; i++) {
          all[i].className = all[i].className.replace(/\bselected\b/g, '').trim();
        }
        circle.className += ' selected';
      });
    }

    if (it && it.photoId) {
      App.DB.get(it.photoId).then(function (v) {
        if (v) setPhotoPreview(v);
      });
    }

    var file = document.getElementById('f-file');
    if (file) file.addEventListener('change', onFile);
    return body;
  }

  function setPhotoPreview(dataUrl) {
    var box = document.getElementById('f-photo'), hint = document.getElementById('f-photo-hint');
    if (!box) return;
    box.style.backgroundImage = dataUrl ? 'url(' + dataUrl + ')' : '';
    if (hint) hint.style.display = dataUrl ? 'none' : 'flex';
  }

  function onFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    U.toast('Compressing photo for offline storage\u2026');
    App.Image.compress(f).then(function (r) {
      pendingPhoto = r;
      setPhotoPreview(r.full);
      U.toast('Photo ready (' + r.kb + ' KB)');
    }).catch(function () {
      U.toast('Could not read photo. Try again.');
    });
    e.target.value = '';
  }

  function val(id) {
    var e = document.getElementById(id);
    return e ? e.value : '';
  }

  function saveItem() {
    var name = val('f-name').trim();
    if (!name) {
      U.toast('Please name the piece of gear.');
      return;
    }
    var it = editingId ? S.item(editingId) : null;
    var thresholdVal = parseInt(val('f-threshold'), 10);
    if (isNaN(thresholdVal)) thresholdVal = selectedIsConsumable ? 6 : 2;

    var qtyVal = it ? it.qty : Math.max(0, parseInt(val('f-qty'), 10) || 0);

    var data = {
      id: editingId || undefined,
      name: name,
      brand: val('f-brand').trim(),
      qty: qtyVal,
      unit: val('f-unit').trim() || 'pc',
      isConsumable: selectedIsConsumable,
      lowStockThreshold: thresholdVal,
      categoryId: val('f-cat') || selectedCategoryId,
      tagLabel: val('f-tag').trim(),
      tagColor: selectedTagColor || 'orange',
      tagStyle: 'tape',
      note: val('f-note').trim(),
      photoId: it ? it.photoId : '',
      updatedAt: S.now()
    };

    if (pendingPhoto === 'clear') {
      if (data.photoId) {
        App.DB.del(data.photoId);
        App.DB.del(data.photoId + '-t');
      }
      data.photoId = '';
    } else if (pendingPhoto) {
      var pid = data.photoId || S.uid('ph-');
      data.photoId = pid;
      App.DB.set(pid, pendingPhoto.full);
      App.DB.set(pid + '-t', pendingPhoto.thumb);
    }

    if (!editingId) page = 1;
    S.saveItem(data);
    pendingPhoto = null;
    U.closeSheet();
    U.toast(editingId ? 'Item updated.' : 'Added to inventory.');
    App.rerenderQuiet();
  }

  function openCats() {
    ensureOthersCategory();
    var cats = S.categories();
    selectedNewCatIcon = 'plate';

    var html = cats.map(function (c) {
      var n = S.items().filter(function (i) { return i.categoryId === c.id; }).length;
      return '<div class="item">' +
        '<span class="thumb">' + U.icon(c.icon || 'plate') + '</span>' +
        '<span class="grow">' +
          '<span class="item-name">' + U.esc(c.name) + '</span>' +
          '<span class="item-sub">' + n + ' item' + (n === 1 ? '' : 's') + ' assigned</span>' +
        '</span>' +
        '<button type="button" class="step-btn" data-act="del-cat" data-id="' + c.id + '" aria-label="Delete category">' +
          U.icon('close') +
        '</button>' +
        '</div>';
    }).join('');

    var iconPickerHtml = '<div class="cat-icon-grid" id="new-cat-icon-grid">' +
      AVAILABLE_CAT_ICONS.map(function (ic) {
        var isSel = (ic === selectedNewCatIcon);
        return '<button type="button" class="cat-icon-opt' + (isSel ? ' selected' : '') + '" data-act="pick-cat-icon" data-icon="' + ic + '" aria-label="Icon ' + ic + '">' +
          U.icon(ic) +
        '</button>';
      }).join('') +
      '</div>';

    U.openSheet('Category Management',
      '<div class="list mb12">' +
        (html || '<div class="empty"><p class="muted">No categories created yet.</p></div>') +
      '</div>' +

      '<div class="card mb12">' +
        '<label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:8px">Create New Category</label>' +
        '<div class="field mb8">' +
          '<label for="c-name" style="font-size:11.5px;font-weight:600;color:var(--timber-soft);display:block;margin-bottom:4px">Category Name</label>' +
          '<input class="input" id="c-name" placeholder="e.g. Beverages, Cutlery, Grills">' +
        '</div>' +
        '<div class="field mb8">' +
          '<label style="font-size:11.5px;font-weight:600;color:var(--timber-soft);display:block;margin-bottom:5px">Select Icon</label>' +
          iconPickerHtml +
          '<input type="hidden" id="c-icon" value="' + selectedNewCatIcon + '">' +
        '</div>' +
        '<button type="button" class="btn btn-primary mt4" data-act="add-cat">' + U.icon('plus', 'mr4') + ' Add category</button>' +
      '</div>' +

      '<button type="button" class="btn btn-ghost btn-sm mb8" data-act="reset-cats">' +
        U.icon('refresh', 'mr4') + ' Reset to default categories' +
      '</button>' +
      '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>',
      onAct
    );
  }

  function onAct(act, el) {
    if (act === 'cat') {
      var chipsBar = document.querySelector('.chips.filter-bar');
      if (chipsBar) {
        chipsScrollLeft = chipsBar.scrollLeft;
      }
      var targetCat = el.getAttribute('data-id');
      if (!targetCat) chipsScrollLeft = 0;
      cat = targetCat;
      page = 1;
      closeAllDropdowns();
      App.rerenderQuiet();
    }
    else if (act === 'set-inv-view-mode') {
      viewMode = el.getAttribute('data-mode') || 'cards';
      closeAllDropdowns();
      App.rerenderQuiet();
    }
    else if (act === 'toggle-inv-cat-acc') {
      var accId = el.getAttribute('data-id');
      var accEl = document.getElementById('inv-cat-acc-' + accId);
      if (accEl) {
        var willOpen = !accEl.classList.contains('open');
        openAccordions[accId] = willOpen;
        accEl.classList.toggle('open', willOpen);
      }
    }
    else if (act === 'toggle-dd') {
      var targetDd = el.getAttribute('data-dd');
      toggleDropdown(targetDd, el);
    }
    else if (act === 'pick-dd-option') {
      var ddType = el.getAttribute('data-dd');
      var ddVal = el.getAttribute('data-val');
      if (ddType === 'stock') {
        stockFilter = ddVal;
      } else if (ddType === 'sort') {
        sortField = ddVal;
      }
      closeAllDropdowns();
      page = 1;
      App.rerenderQuiet();
    }
    else if (act === 'reset-filters') {
      q = '';
      cat = '';
      stockFilter = 'all';
      sortField = 'alpha';
      sortDir = 'asc';
      page = 1;
      chipsScrollLeft = 0;
      closeAllDropdowns();
      App.rerenderQuiet();
      U.toast('Filters reset.');
    }
    else if (act === 'toggle-sort-dir') {
      if (sortField === 'mod') return;
      sortDir = (sortDir === 'asc') ? 'desc' : 'asc';
      page = 1;
      closeAllDropdowns();

      var icon = el.querySelector('.sort-dir-icon') || el;
      if (icon) {
        icon.classList.toggle('flipped', sortDir === 'desc');
      }

      setTimeout(function () {
        App.rerenderQuiet();
      }, 120);
    }
    else if (act === 'change-page-size') {
      var sz = parseInt(el.getAttribute('data-size'), 10);
      if (sz && sz !== pageSize) {
        pageSize = sz;
        page = 1;
        closeAllDropdowns();
        App.rerenderQuiet();
        var vEl = document.getElementById('view');
        if (vEl) vEl.scrollTop = 0;
      }
    }
    else if (act === 'inv-prev-page') {
      if (page > 1) {
        page--;
        closeAllDropdowns();
        App.rerenderQuiet();
        var vPrev = document.getElementById('view');
        if (vPrev) vPrev.scrollTop = 0;
      }
    }
    else if (act === 'inv-next-page') {
      if (page < totalPages) {
        page++;
        closeAllDropdowns();
        App.rerenderQuiet();
        var vNext = document.getElementById('view');
        if (vNext) vNext.scrollTop = 0;
      }
    }
    else if (act === 'open-stats') {
      closeAllDropdowns();
      openStats(el.getAttribute('data-id'), false);
    }
    else if (act === 'return-to-catering') {
      U.closeSheet();
      App.go('catering');
    }
    else if (act === 'view-inv-photo') {
      var photoItemId = el.getAttribute('data-id');
      var itPhoto = S.item(photoItemId);
      if (itPhoto && itPhoto.photoId) {
        var catObj = S.category(itPhoto.categoryId);
        var metaHtml = U.tag(itPhoto.brand || itPhoto.tagLabel || 'Loreto', itPhoto.tagColor) +
          (itPhoto.isConsumable ? ' <span class="tag tag-yellow" style="font-size:9.5px;margin-left:4px">Supply</span>' : '') +
          (catObj ? ' <span class="tag tag-white" style="font-size:9.5px;margin-left:4px">' + U.esc(catObj.name) + '</span>' : '');
        U.openLightbox(itPhoto.photoId, itPhoto.name, metaHtml);
      } else {
        U.toast('No photo attached to this item.');
      }
    }
    else if (act === 'lightbox-close') {
      U.closeLightbox();
    }
    else if (act === 'dash-pick-photo') {
      var df = document.getElementById('dash-file');
      if (df) df.click();
    }
    else if (act === 'stat-delta') {
      var delta = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var inp = document.getElementById('stat-stock-input');
      if (inp) {
        var cur = parseInt(inp.value, 10) || 0;
        inp.value = Math.max(0, cur + delta);
      }
    }
    else if (act === 'save-stock-audit') {
      var saveId = el.getAttribute('data-id');
      var stockVal = parseInt((document.getElementById('stat-stock-input') || {}).value, 10);
      var asOfInput = (document.getElementById('stat-asof') || {}).value;
      var auditTs = asOfInput ? (new Date(asOfInput).toISOString()) : S.now();

      var it = S.item(saveId);
      if (it) {
        it.qty = Math.max(0, isNaN(stockVal) ? it.qty : stockVal);
        it.updatedAt = auditTs;
        S.save();
        U.toast('Stock count & audit date saved.');
        App.rerenderQuiet();
        openStats(saveId, openedFromCatering);
      }
    }
    else if (act === 'pick-item-type') {
      selectedIsConsumable = (el.getAttribute('data-type') === 'consumable');
      var btnDurable = document.getElementById('btn-type-durable');
      var btnConsumable = document.getElementById('btn-type-consumable');
      var hint = document.getElementById('type-hint');

      if (btnDurable && btnConsumable) {
        btnDurable.className = 'btn grow btn-sm ' + (!selectedIsConsumable ? 'btn-primary' : 'btn-ghost');
        btnConsumable.className = 'btn grow btn-sm ' + (selectedIsConsumable ? 'btn-primary' : 'btn-ghost');
      }
      if (hint) {
        hint.textContent = selectedIsConsumable
          ? 'Supplies used up on location (fuel cans, skewers, napkins). Not flagged as lost.'
          : 'Durable gear (chafing dishes, pots, plates). Must return 100%.';
      }
    }
    else if (act === 'pick-cat-card') {
      var chosenCat = el.getAttribute('data-cat');
      selectedCategoryId = chosenCat;
      var catHidden = document.getElementById('f-cat');
      if (catHidden) catHidden.value = chosenCat;

      var allCatBtns = document.querySelectorAll('#cat-selector .cat-btn');
      for (var i = 0; i < allCatBtns.length; i++) {
        allCatBtns[i].className = 'cat-btn' + (allCatBtns[i].getAttribute('data-cat') === chosenCat ? ' selected' : '');
      }
    }
    else if (act === 'pick-cat-icon') {
      var iconName = el.getAttribute('data-icon');
      selectedNewCatIcon = iconName;
      var iconInput = document.getElementById('c-icon');
      if (iconInput) iconInput.value = iconName;

      var allOpts = document.querySelectorAll('#new-cat-icon-grid .cat-icon-opt');
      for (var k = 0; k < allOpts.length; k++) {
        allOpts[k].className = 'cat-icon-opt' + (allOpts[k].getAttribute('data-icon') === iconName ? ' selected' : '');
      }
    }
    else if (act === 'add-item') {
      closeAllDropdowns();
      openEditor(null);
    }
    else if (act === 'edit-item') {
      closeAllDropdowns();
      openEditor(el.getAttribute('data-id'));
    }
    else if (act === 'save-item') {
      saveItem();
    }
    else if (act === 'pick-photo') {
      var f = document.getElementById('f-file');
      if (f) f.click();
    }
    else if (act === 'clear-photo') {
      pendingPhoto = 'clear';
      setPhotoPreview('');
      U.toast('Photo removed.');
    }
    else if (act === 'del-item') {
      var delId = editingId;
      U.confirm('Delete item', 'Remove this item from inventory and all presets? Past completed event ledgers are preserved.', 'Delete', function () {
        S.removeItem(delId);
        U.closeSheet();
        U.toast('Item deleted.');
        App.rerenderQuiet();
      });
    }
    else if (act === 'manage-cats') {
      closeAllDropdowns();
      openCats();
    }
    else if (act === 'add-cat') {
      var cname = val('c-name').trim();
      if (!cname) {
        U.toast('Name the category first.');
        return;
      }
      S.saveCategory({
        name: cname,
        icon: val('c-icon') || selectedNewCatIcon || 'plate'
      });
      openCats();
      App.rerenderQuiet();
      U.toast('Category added.');
    }
    else if (act === 'del-cat') {
      var cid = el.getAttribute('data-id');
      U.confirm('Delete category', 'Items in this category will become Uncategorised.', 'Delete', function () {
        S.removeCategory(cid);
        if (cat === cid) cat = '';
        openCats();
        App.rerenderQuiet();
        U.toast('Category removed.');
      });
    }
    else if (act === 'reset-cats') {
      U.confirm('Reset categories', 'This resets the category list back to defaults.', 'Reset', function () {
        S.resetCategoriesToDefault();
        ensureOthersCategory();
        cat = '';
        page = 1;
        openCats();
        App.rerenderQuiet();
        U.toast('Categories restored to default.');
      });
    }
  }

  return {
    title: 'Gear shelf',
    render: render,
    mounted: mounted,
    onAct: onAct,
    openEditor: openEditor,
    openStats: openStats,
    openCats: openCats,
    topbarRight: topbarRight
  };
})();