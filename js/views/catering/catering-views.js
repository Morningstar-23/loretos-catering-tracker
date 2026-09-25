/* ==========================================================================
   Loreto's Catering Tracker — File 3: Views (js/views/catering/catering-views.js)
   - Zero emojis: 100% clean Lucide/Feather vector SVG iconography
   - Mirrored with Inventory: Universal items-per-category pagination (2, 3, 5, 10, All)
   - Dynamic 3-Way Discrepancy Badges: Broken, Left at Venue, and Missing/Lost
   - Uncategorised category accordion support (matches inventory.js)
   - Accurate category item count badges on accordion headers
   - Vector warning badges for stock shortages in card, compact, and grid views
   - Adjustable 2, 3, or 4 Column E-Commerce Grid with dedicated density bar
   - Independent Per-Category Pagination inside Collapsible Accordions
   - Foreign & Borrowed Cards with Uncramped Typography, Lightbox & Quick Picture
   - Optimized for iPhone 5s (iOS 12 / 320px viewport)
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};
App.Views.Catering = App.Views.Catering || {};

App.Views.Catering.Views = (function () {
  var U = App.UI, S = App.Store;

  function getItemStockStatus(itemId, stagedQty, presetId) {
    var it = S.item(itemId);
    var owned = it ? (it.qty || 0) : 0;
    var p = presetId ? S.preset(presetId) : null;
    var presetTarget = null;

    if (p && p.lines) {
      for (var i = 0; i < p.lines.length; i++) {
        if (p.lines[i].itemId === itemId) {
          presetTarget = p.lines[i].qty;
          break;
        }
      }
    }

    var isExceeding = stagedQty > owned;
    return {
      owned: owned,
      staged: stagedQty,
      presetTarget: presetTarget,
      isExceeding: isExceeding,
      shortCount: isExceeding ? (stagedQty - owned) : 0,
      kitDiff: (presetTarget !== null) ? (stagedQty - presetTarget) : 0,
      unit: it ? it.unit : 'pc'
    };
  }

  function presetCard(p) {
    var avail = S.checkPresetAvailability(p.id);
    var isShort = avail && !avail.available;

    return '<button type="button" class="item" data-act="inspect-preset" data-id="' + p.id + '">' +
      '<span class="thumb">' + U.icon('layers') + '</span>' +
      '<span class="grow mr8" style="min-width:0">' +
        '<span class="item-name" style="word-break:break-word;line-height:1.24;display:block">' + U.esc(p.name) + '</span>' +
        '<span class="item-sub">' + p.lines.length + ' kinds &middot; ' + (avail ? avail.totalNeeded : 0) + ' pcs</span>' +
        '<span class="row mt4">' +
          (isShort ? '<span class="tag tag-red" style="font-size:9.5px;display:inline-flex;align-items:center;gap:3px">' + U.icon('alertTriangle', 'tag-svg-icon') + avail.shortCount + ' short</span>'
                   : '<span class="tag tag-green" style="font-size:9.5px">Ready in stock</span>') +
        '</span>' +
      '</span>' +
      '<span class="item-qty">' + U.icon('chevronRight') + '</span>' +
    '</button>';
  }

  function startScreen() {
    var presets = S.presets();
    var last = S.history()[0];

    return '<div class="banner mb12">' +
        '<h3>Ready for the next booking</h3>' +
        '<p class="muted mt8" style="color:rgba(250,246,240,0.85);font-size:12px">Load gear from a kit preset, stage all stock, or build item-by-item.</p>' +
        '<div class="row mt12" style="gap:6px">' +
          '<button type="button" class="btn btn-primary grow mr6" data-act="new-blank">' + U.icon('plus', 'mr4') + ' Blank event</button>' +
          '<button type="button" class="btn btn-ghost grow" data-act="new-event-all-stock" style="background:#FAF6F0;border-color:var(--line-strong)">' + U.icon('package', 'mr4') + ' Stage all stock</button>' +
        '</div>' +
      '</div>' +
      '<div class="row row-between mt12 mb8">' +
        '<h2 class="section-title" style="margin:0">' + U.icon('layers') + ' Gear Kit Presets</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="manage-presets" style="width:auto;min-height:34px;padding:2px 10px;font-size:12px">' + U.icon('settings', 'mr4') + ' Manage kits</button>' +
      '</div>' +
      (presets.length ? '<div class="list mb12">' + presets.map(presetCard).join('') + '</div>' : U.empty('layers', 'No presets yet', 'Create your first kit preset to load vans fast.')) +
      (last ? '<h2 class="section-title mt16">' + U.icon('history') + ' Last event out</h2>' +
        '<div class="card"><div class="row row-between"><span class="item-name" style="word-break:break-word;line-height:1.24">' + U.esc(last.name) + '</span><span class="item-qty" style="color:var(--foliage)">' + S.tally(last).pct + '%</span></div>' +
        '<p class="muted mt4">' + U.esc(last.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(last.date)) + '</p></div>' : '');
  }

  function chev() { return U.icon('chevronRight', 'lr-disc'); }

  function thumbHtml(l, photoKey, cat, extraCls) {
    return '<span class="pack-thumb lr-thumb' + (extraCls ? ' ' + extraCls : '') + '" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + l.itemId + '" aria-label="View photo">' +
      (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') + '</span>';
  }

  function stepper(minusAct, plusAct, inputAct, id, value, small) {
    var mid = inputAct
      ? '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" data-act="' + inputAct + '" data-id="' + id + '" value="' + value + '">'
      : '<span class="step-val">' + value + '</span>';
    return '<div class="stepper' + (small ? ' stepper-sm' : '') + '">' +
      '<button type="button" class="step-btn step-minus" data-act="' + minusAct + '" data-id="' + id + '" aria-label="Decrease">' + U.icon('minus') + '</button>' +
      mid +
      '<button type="button" class="step-btn step-plus" data-act="' + plusAct + '" data-id="' + id + '" aria-label="Increase">' + U.icon('plus') + '</button>' +
    '</div>';
  }

  function tagsFor(l) {
    var label = l.brand || l.tagLabel || 'Loreto';
    var dupe = String(label).toLowerCase() === 'supply';
    return U.tag(label, l.tagColor) + (l.isConsumable && !dupe ? '<span class="tag tag-yellow">Supply</span>' : '');
  }

  function tabsHtml(ev, tab) {
    function b(id, label, icon) {
      return '<button type="button" data-act="tab" data-id="' + id + '" class="' + (tab === id ? 'on' : '') + '">' + (icon ? U.icon(icon, 'mr4') : '') + label + '</button>';
    }
    var crewLabel = 'Crew (' + (ev.staffIds || []).length + ')';
    if (ev.status === 'staging') {
      return '<div class="seg seg-animated cat-tabs"><div class="seg-glider"></div>' +
        b('load', 'Load-out', 'truck') + b('crew', crewLabel, 'users') +
      '</div>';
    }
    return '<div class="seg seg-animated cat-tabs cat-tabs-4"><div class="seg-glider"></div>' +
      b('back', 'Pack down') + b('load', 'Load-out') + b('foreign', 'Not ours') + b('crew', crewLabel) +
    '</div>';
  }

  function head(ev, tab) {
    var t = S.tally(ev);
    var staging = ev.status === 'staging';

    var issues = [];
    if (t.broken > 0) issues.push(t.broken + ' broken');
    if (t.leftVenue > 0) issues.push(t.leftVenue + ' at venue');
    if (t.missing > 0) issues.push(t.missing + ' missing');

    var meterSub = t.durableOut > 0
      ? t.durableBack + ' of ' + t.durableOut + ' gear back (' + t.pct + '%)' +
        (issues.length ? ' &middot; <strong class="cat-warn-text">' + issues.join(', ') + '</strong>' : ' &middot; all accounted for')
      : t.back + ' of ' + t.out + ' pieces back';

    var pill = '<span class="event-status-pill ' + (staging ? 'staging' : 'live') + '"><span class="status-dot"></span>' + (staging ? 'Staging' : 'Out on location') + '</span>';

    var statusRow = staging
      ? '<div class="cat-head-status">' + pill + '<span class="cat-head-counts"><b>' + t.durableOut + '</b> gear &middot; <b>' + t.consumableOut + '</b> supplies</span></div>'
      : '<div class="cat-head-status">' + pill + '</div>' +
        '<div class="cat-progress"><div class="meter"><div class="meter-fill' + (t.pct === 100 ? ' full' : '') + '" style="width:' + t.pct + '%"></div></div>' +
        '<p class="cat-progress-sub">' + meterSub + '</p></div>';

    return '<div class="cat-head">' +
      '<div class="cat-head-top">' +
        '<div class="cat-head-titles">' +
          '<h3 class="cat-head-name">' + U.esc(ev.name) + '</h3>' +
          '<div class="cat-head-where">' + U.esc(ev.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) + '</div>' +
        '</div>' +
        '<div class="cat-head-actions">' +
          '<button type="button" class="cat-head-btn" data-act="export-manifest-text" aria-label="Export manifest">' + U.icon('share') + '</button>' +
          '<button type="button" class="cat-head-btn" data-act="edit-event" aria-label="Edit event">' + U.icon('edit') + '</button>' +
        '</div>' +
      '</div>' +
      statusRow +
      tabsHtml(ev, tab || 'load') +
    '</div>';
  }

  function segs(ev, tab) { return ''; }

  /* ------------------------------------------------------------------
     LOAD-OUT · Card view
     ------------------------------------------------------------------ */
  function renderCardsView(lines, isOut, evPresetId) {
    return lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var stat = getItemStockStatus(l.itemId, l.out, evPresetId);
      var id = l.itemId;
      var tags = tagsFor(l);

      var status1 = stat.isExceeding
        ? '<span class="lr-status is-warn">' + U.icon('alertTriangle', 'lr-status-ico') + '<span>Only ' + stat.owned + ' ' + U.esc(l.unit) + ' in stock</span></span>'
        : '<span class="lr-status"><span>Stock <b>' + stat.owned + '</b> ' + U.esc(l.unit) + '</span></span>';
      var status2 = (isOut && l.back > 0)
        ? '<span class="lr-sub ok">' + l.back + ' of ' + l.out + ' returned</span>'
        : (stat.presetTarget !== null && stat.kitDiff !== 0 ? '<span class="lr-sub">Kit had ' + stat.presetTarget + '</span>' : '');

      return '<div class="swipe-row-outer" data-swipe-id="' + id + '">' +
        '<div class="swipe-row-content lr-card' + (stat.isExceeding ? ' card-shortage' : '') + '" id="swipe-content-' + id + '">' +
          '<div class="lr-main">' +
            thumbHtml(l, photoKey, cat) +
            '<div class="lr-info pack-item-clickable" data-act="inspect-item" data-id="' + id + '">' +
              '<span class="lr-name">' + U.esc(l.name) + chev() + '</span>' +
              '<span class="lr-tags">' + tags + '</span>' +
            '</div>' +
            '<button type="button" class="lr-trash" data-act="remove-line" data-id="' + id + '" aria-label="Remove ' + U.esc(l.name) + '">' + U.icon('trash') + '</button>' +
          '</div>' +
          '<div class="lr-foot">' +
            '<div class="lr-status-wrap">' + status1 + status2 + '</div>' +
            stepper('out-minus', 'out-plus', 'out-input', id, l.out) +
          '</div>' +
          '<div class="swipe-actions-bg"><button type="button" class="swipe-delete-btn" data-act="remove-line" data-id="' + id + '">' + U.icon('trash') + '<span>Remove</span></button></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------------
     Category accordion wrapper (Mirrored with Inventory Compact View)
     ------------------------------------------------------------------ */
  function accordions(lines, openAccordions, catPages, catPageSize, rowFn) {
    var cats = S.categories();
    var groups = {};
    var uncat = [];

    lines.forEach(function (l) {
      var it = S.item(l.itemId);
      var cId = it ? it.categoryId : '';
      if (cId) {
        if (!groups[cId]) groups[cId] = [];
        groups[cId].push(l);
      } else {
        uncat.push(l);
      }
    });

    var limit = parseInt(catPageSize, 10) || 5;
    var isAll = limit >= 999;
    var html = '';

    cats.forEach(function (c) {
      var cLines = groups[c.id];
      if (!cLines || !cLines.length) return;
      var isOpen = openAccordions[c.id] !== false;

      var cPage = (catPages && catPages[c.id]) || 1;
      var cTotalPages = isAll ? 1 : (Math.ceil(cLines.length / limit) || 1);
      if (cPage > cTotalPages) cPage = cTotalPages;
      if (cPage < 1) cPage = 1;

      var startIdx = isAll ? 0 : (cPage - 1) * limit;
      var paginatedCLines = isAll ? cLines : cLines.slice(startIdx, startIdx + limit);
      var rows = paginatedCLines.map(rowFn).join('');

      var pagHtml = (!isAll) ? U.catAccordionPagination({
        catId: c.id,
        page: cPage,
        totalPages: cTotalPages,
        totalItems: cLines.length,
        alwaysShow: true,
        prevAct: 'cat-acc-prev-page',
        nextAct: 'cat-acc-next-page'
      }) : '';

      html += '<div class="cat-accordion ' + (isOpen ? 'open' : '') + '" id="cat-acc-' + c.id + '">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-cat-acc" data-id="' + c.id + '">' +
          '<span class="cat-accordion-title">' +
            U.icon(c.icon || 'plate') +
            '<span>' + U.esc(c.name) + '</span>' +
            '<span class="cat-accordion-badge">' + cLines.length + '</span>' +
          '</span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + rows + pagHtml + '</div>' +
      '</div>';
    });

    if (uncat.length) {
      var isOpenUncat = openAccordions['uncat'] !== false;
      var uncatPage = (catPages && catPages['uncat']) || 1;
      var uncatTotalPages = isAll ? 1 : (Math.ceil(uncat.length / limit) || 1);
      if (uncatPage > uncatTotalPages) uncatPage = uncatTotalPages;
      if (uncatPage < 1) uncatPage = 1;

      var uncatStart = isAll ? 0 : (uncatPage - 1) * limit;
      var paginatedUncat = isAll ? uncat : uncat.slice(uncatStart, uncatStart + limit);
      var uncatRows = paginatedUncat.map(rowFn).join('');

      var uncatPagHtml = (!isAll) ? U.catAccordionPagination({
        catId: 'uncat',
        page: uncatPage,
        totalPages: uncatTotalPages,
        totalItems: uncat.length,
        alwaysShow: true,
        prevAct: 'cat-acc-prev-page',
        nextAct: 'cat-acc-next-page'
      }) : '';

      html += '<div class="cat-accordion ' + (isOpenUncat ? 'open' : '') + '" id="cat-acc-uncat">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-cat-acc" data-id="uncat">' +
          '<span class="cat-accordion-title">' +
            U.icon('grid') +
            '<span>Uncategorised</span>' +
            '<span class="cat-accordion-badge">' + uncat.length + '</span>' +
          '</span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + uncatRows + uncatPagHtml + '</div>' +
      '</div>';
    }

    return html;
  }

  /* LOAD-OUT · Compact view */
  function renderCompactView(lines, isOut, evPresetId, openAccordions, catPages, catPageSize) {
    return accordions(lines, openAccordions, catPages, catPageSize, function (l) {
      var stat = getItemStockStatus(l.itemId, l.out, evPresetId);
      var id = l.itemId;
      var brandLabel = l.brand || l.tagLabel || 'Loreto';

      return '<div class="compact-item-row' + (stat.isExceeding ? ' short' : '') + '">' +
        '<div class="compact-item-info" data-act="open-qty-modal" data-id="' + id + '">' +
          '<div class="compact-item-name truncate">' + U.esc(l.name) + '</div>' +
          '<div class="compact-item-meta">' +
            U.tag(brandLabel, l.tagColor) +
            (l.isConsumable ? '<span class="tag tag-yellow ml4" style="font-size:9.5px">Supply</span>' : '') +
            (stat.isExceeding
              ? '<span class="cm-stock is-warn ml4">' + U.icon('alertTriangle', 'lr-status-ico') + 'Only ' + stat.owned + ' in stock</span>'
              : '<span class="cm-stock ml4">Stock ' + stat.owned + '</span>') +
          '</div>' +
        '</div>' +
        stepper('out-minus', 'out-plus', '', id, l.out, true) +
      '</div>';
    });
  }

  /* LOAD-OUT · Grid view */
  function renderGridView(lines, evPresetId, gridCols) {
    var cols = parseInt(gridCols, 10) || 2;
    var densityBar = U.gridDensityBar ? U.gridDensityBar(cols, 'set-grid-cols') : '';

    var tiles = lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var stat = getItemStockStatus(l.itemId, l.out, evPresetId);

      var pillHtml = stat.isExceeding
        ? (cols >= 4
            ? '+' + stat.shortCount
            : '<span style="display:inline-flex;align-items:center">' + U.icon('alertTriangle', 'tag-svg-icon') + 'Short +' + stat.shortCount + '</span>')
        : (cols >= 4 ? l.out + ' van' : l.out + ' in van (' + stat.owned + ')');

      return '<div class="grid-item-card' + (stat.isExceeding ? ' is-short' : '') + '" data-act="open-qty-modal" data-id="' + l.itemId + '">' +
        '<div class="grid-thumb-box" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '<span class="grid-qty-badge">' + l.out + (cols >= 4 ? '' : ' ' + U.esc(l.unit)) + '</span>' +
        '</div>' +
        '<div class="grid-title">' + U.esc(l.name) + '</div>' +
        '<div class="grid-staged-pill ' + (stat.isExceeding ? 'short' : 'done') + ' truncate">' + pillHtml + '</div>' +
      '</div>';
    }).join('');

    return densityBar + '<div class="ecommerce-grid cols-' + cols + '">' + tiles + '</div>';
  }

  /* ------------------------------------------------------------------
     PACK-DOWN · result text (Itemized Breakdown)
     ------------------------------------------------------------------ */
  function packResult(l) {
    var short = l.out - l.back;
    if (l.isConsumable) {
      return l.back === l.out
        ? '<span class="lr-result ok">' + U.icon('check', 'lr-status-ico') + 'All ' + l.out + ' back</span>'
        : '<span class="lr-result soft">' + l.back + '/' + l.out + ' back &middot; ' + short + ' used</span>';
    }
    if (short === 0) {
      return '<span class="lr-result ok">' + U.icon('check', 'lr-status-ico') + 'All ' + l.out + ' back intact</span>';
    }

    var brk = l.broken || 0;
    var lv = l.leftVenue || 0;
    var mis = (l.missing !== undefined) ? l.missing : Math.max(0, short - brk - lv);

    var parts = [];
    if (brk > 0) parts.push(brk + ' broken');
    if (lv > 0) parts.push(lv + ' at venue');
    if (mis > 0) parts.push(mis + ' missing');

    var breakdownText = parts.length ? ' (' + parts.join(', ') + ')' : '';
    return '<span class="lr-result is-warn">' + U.icon('alertTriangle', 'lr-status-ico') + l.back + '/' + l.out + ' back' + U.esc(breakdownText) + '</span>';
  }

  /* PACK-DOWN · Card view */
  function renderPackCardsView(lines) {
    return lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var isConsumable = !!l.isConsumable;
      var short = l.out - l.back;
      var id = l.itemId;

      return '<div class="pack-row lr-card ' + (isConsumable ? 'done' : (short === 0 ? 'done' : 'short')) + '" id="row-' + id + '">' +
        '<div class="lr-main">' +
          thumbHtml(l, photoKey, cat) +
          '<div class="lr-info pack-item-clickable" data-act="open-pack-modal" data-id="' + id + '">' +
            '<span class="lr-name">' + U.esc(l.name) + chev() + '</span>' +
            '<span class="lr-tags">' + tagsFor(l) + '</span>' +
            '<span class="lr-resultline">' + packResult(l) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="lr-foot">' +
          '<div class="lr-quick">' +
            (isConsumable ? '<button type="button" class="lr-qbtn" data-act="consumable-all-used" data-id="' + id + '">All used</button>' : '') +
            '<button type="button" class="lr-qbtn lr-qbtn-ok" data-act="all-back" data-id="' + id + '">' + (isConsumable ? '' : U.icon('check')) + 'All back</button>' +
          '</div>' +
          stepper('back-minus', 'back-plus', 'back-input', id, l.back) +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* PACK-DOWN · Compact view */
  function renderPackCompactView(lines, openAccordions, catPages, catPageSize) {
    return accordions(lines, openAccordions, catPages, catPageSize, function (l) {
      var isConsumable = !!l.isConsumable;
      var short = l.out - l.back;
      var id = l.itemId;
      var brandLabel = l.brand || l.tagLabel || 'Loreto';

      return '<div class="compact-item-row ' + (isConsumable ? 'done' : (short === 0 ? 'done' : 'short')) + '">' +
        '<div class="compact-item-info" data-act="open-pack-modal" data-id="' + id + '">' +
          '<div class="compact-item-name truncate">' + U.esc(l.name) + '</div>' +
          '<div class="compact-item-meta">' +
            U.tag(brandLabel, l.tagColor) +
            (isConsumable ? '<span class="tag tag-yellow ml4" style="font-size:9.5px">Supply</span>' : '') +
            '<span class="ml4">' + packResult(l) + '</span>' +
          '</div>' +
        '</div>' +
        stepper('back-minus', 'back-plus', '', id, l.back, true) +
      '</div>';
    });
  }

  /* PACK-DOWN · Grid view */
  function renderPackGridView(lines, gridCols) {
    var cols = parseInt(gridCols, 10) || 2;
    var densityBar = U.gridDensityBar ? U.gridDensityBar(cols, 'set-grid-cols') : '';

    var tiles = lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var isConsumable = !!l.isConsumable;
      var short = l.out - l.back;

      var pillHtml = isConsumable
        ? l.back + '/' + l.out + ' back'
        : (short === 0
            ? (cols >= 4 ? 'All' : 'All back')
            : (cols >= 4 ? '-' + short : '<span style="display:inline-flex;align-items:center">' + U.icon('alertTriangle', 'tag-svg-icon') + short + ' shortage</span>'));

      return '<div class="grid-item-card' + (!isConsumable && short > 0 ? ' is-short' : '') + '" data-act="open-pack-modal" data-id="' + l.itemId + '">' +
        '<div class="grid-thumb-box" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '<span class="grid-qty-badge">' + l.back + '/' + l.out + '</span>' +
        '</div>' +
        '<div class="grid-title">' + U.esc(l.name) + '</div>' +
        '<div class="grid-staged-pill ' + (isConsumable ? 'supply' : (short === 0 ? 'done' : 'short')) + ' truncate">' + pillHtml + '</div>' +
      '</div>';
    }).join('');

    return densityBar + '<div class="ecommerce-grid cols-' + cols + '">' + tiles + '</div>';
  }

  function crewTab(ev) {
    var assignedIds = ev.staffIds || [];
    var staffList = assignedIds.map(function (id) { return S.staffMember(id); }).filter(Boolean);

    var html = staffList.map(function (m) {
      var photoKey = m.photoId ? (m.photoId + '-t') : '';
      return '<div class="item">' +
        '<span class="thumb staff-thumb" data-photo="' + photoKey + '">' + (!photoKey ? U.icon('user') : '') + '</span>' +
        '<span class="grow mr8" style="min-width:0"><span class="item-name" style="word-break:break-word;line-height:1.24">' + U.esc(m.name) + '</span><span class="item-sub truncate">' + U.esc(m.role || 'Staff') + '</span></span>' +
        (m.phone ? '<a class="btn btn-ghost btn-sm mr8" href="tel:' + U.esc(m.phone) + '" style="width:auto;min-height:34px;padding:4px 10px">' + U.icon('phone', 'mr4') + ' Call</a>' : '') +
        (ev.status === 'staging' ? '<button type="button" class="step-btn" data-act="unassign-staff" data-id="' + m.id + '">' + U.icon('close') + '</button>' : '') +
      '</div>';
    }).join('');

    return '<div class="card mb12"><div class="row row-between"><div><h3 style="font-size:15px;font-weight:700">Assigned Crew (' + staffList.length + ')</h3><p class="muted mt4" style="font-size:11.5px">Staff working this booking.</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-act="open-staff-picker" style="width:auto;padding:0 12px">' + U.icon('plus', 'mr4') + ' Assign crew</button></div></div>' +
      (staffList.length ? '<div class="list mb16">' + html + '</div>' : U.empty('users', 'No crew assigned', 'Assign staff to this booking.'));
  }

  /* ------------------------------------------------------------------
     NOT OURS · Foreign & Borrowed Pieces Tab
     ------------------------------------------------------------------ */
  function foreignTab(ev) {
    var t = S.tally(ev);
    var foreignList = ev.notOurs || [];

    var cardsHtml = foreignList.map(function (n) {
      var photoKey = n.photoId ? (n.photoId + '-t') : '';
      var hasPhoto = !!n.photoId;

      var thumbHtml = hasPhoto
        ? '<span class="pack-thumb foreign-thumb" data-photo="' + photoKey + '" data-act="view-foreign-photo" data-id="' + n.id + '" style="width:52px;height:52px;flex:0 0 52px;border-radius:12px;cursor:pointer;border:1px solid var(--line);position:relative;background:var(--sand-soft)" aria-label="View photo">' +
            '<span style="position:absolute;bottom:0;right:0;background:rgba(33,29,26,0.75);color:#fff;border-radius:50%;width:17px;height:17px;display:flex;align-items:center;justify-content:center">' + U.icon('zoom') + '</span>' +
          '</span>'
        : '<button type="button" class="pack-thumb foreign-thumb" data-act="edit-foreign" data-id="' + n.id + '" style="width:52px;height:52px;flex:0 0 52px;border-radius:12px;border:1px dashed var(--line-strong);background:var(--sand-soft);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--timber-soft);cursor:pointer" aria-label="Add photo">' +
            U.icon('camera') +
            '<span style="font-size:8px;margin-top:2px;font-weight:700">Add Pic</span>' +
          '</button>';

      var badgeHtml = n.itemId
        ? '<span class="tag tag-yellow" style="font-size:9.5px;font-weight:700">Borrowed</span>'
        : '<span class="tag tag-red" style="font-size:9.5px;font-weight:700">Not Ours</span>';

      var brandHtml = n.brand ? '<span class="m2">' + U.tag(n.brand, 'orange') + '</span>' : '';

      return '<div class="card mb10" style="padding:10px 12px;border-radius:14px;background:#FFF;border:1px solid var(--line)">' +
        '<div class="row" style="align-items:flex-start">' +
          thumbHtml +
          '<div class="grow ml10 mr8 pack-item-clickable" data-act="edit-foreign" data-id="' + n.id + '" style="min-width:0;cursor:pointer">' +
            '<div class="row row-between" style="align-items:flex-start">' +
              '<span class="item-name" style="font-size:14.5px;font-weight:700;color:var(--timber-ink);line-height:1.24;word-break:break-word">' +
                U.esc(n.label) + chev() +
              '</span>' +
            '</div>' +
            '<div class="row mt4" style="flex-wrap:wrap;align-items:center;margin:-2px">' +
              '<span class="m2">' + badgeHtml + '</span>' +
              brandHtml +
              '<strong class="m2" style="font-size:11.5px;color:var(--inasal-dark)">' + n.qty + ' ' + (n.qty === 1 ? 'pc' : 'pcs') + '</strong>' +
            '</div>' +
            (n.note ? '<div class="muted mt4 truncate" style="font-size:11px;color:var(--timber-soft)">' + U.icon('edit', 'mr4') + U.esc(n.note) + '</div>' : '') +
          '</div>' +
          '<button type="button" class="lr-trash" data-act="del-foreign" data-id="' + n.id + '" aria-label="Remove ' + U.esc(n.label) + '" style="margin-top:-2px;margin-right:-2px">' +
            U.icon('trash') +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="card mb12"><div class="row row-between"><div><h3 style="font-size:24px;font-family:Iowan Old Style,serif;color:var(--inasal-orange)">' + t.foreign + '</h3><p class="muted">foreign / borrowed piece' + (t.foreign === 1 ? '' : 's') + ' in van</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-act="add-foreign" style="width:auto;padding:0 12px">' + U.icon('plus', 'mr4') + ' Flag item</button></div>' +
      '<p class="muted mt8" style="font-size:12px">Log venue plates, borrowed bowls, or external gear with photos so they are safely returned.</p></div>' +
      (foreignList.length ? '<div class="list mb16">' + cardsHtml + '</div>' : U.empty('check', 'Nothing foreign flagged', 'All items belong to Loreto\u2019s.'));
  }

  return {
    getItemStockStatus: getItemStockStatus,
    presetCard: presetCard,
    startScreen: startScreen,
    head: head,
    segs: segs,
    renderCardsView: renderCardsView,
    renderCompactView: renderCompactView,
    renderGridView: renderGridView,
    renderPackCardsView: renderPackCardsView,
    renderPackCompactView: renderPackCompactView,
    renderPackGridView: renderPackGridView,
    crewTab: crewTab,
    foreignTab: foreignTab
  };
})();