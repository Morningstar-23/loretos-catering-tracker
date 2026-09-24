/* ==========================================================================
   Loreto's Catering Tracker — File 3: Views (js/views/catering/catering-views.js)
   - Zero emojis: 100% clean Lucide/Feather vector SVG iconography
   - Removed re-render animation wrappers (Eliminates quantity change flashing)
   - Vector warning badges for stock shortages in card, compact, and grid views
   - Adjustable 2, 3, or 4 Column E-Commerce Grid with dedicated density bar
   - Independent Per-Category Pagination inside Collapsible Accordions
   - Multi-line word-wrap on item names and kit presets (no truncated ellipses)
   - Category icons matching Commissary inventory
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

  function head(ev) {
    var t = S.tally(ev);
    var staging = ev.status === 'staging';
    var meterSub = t.durableOut > 0
      ? t.durableBack + ' of ' + t.durableOut + ' gear back (' + t.pct + '%)' + (t.missing ? ' &middot; <strong style="color:#FFA494">' + t.missing + ' missing</strong>' : ' &middot; all accounted for')
      : t.back + ' of ' + t.out + ' pieces back';

    return '<div class="banner mb12">' +
      '<div class="row row-between" style="align-items:flex-start">' +
        '<div class="grow mr8" style="min-width:0">' +
          '<div class="row mb6"><span class="event-status-pill ' + (staging ? 'staging' : 'live') + '"><span class="status-dot"></span>' + (staging ? 'Staging & Van Loading' : 'Out on Location') + '</span></div>' +
          '<h3 style="font-family:Iowan Old Style,Georgia,serif;font-size:17.5px;font-weight:700;line-height:1.24;word-break:break-word">' + U.esc(ev.name) + '</h3>' +
          '<p class="muted mt4" style="font-size:12px;color:rgba(250,246,240,0.85)">' + U.esc(ev.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) + '</p>' +
        '</div>' +
        '<div class="row" style="flex-shrink:0;margin-top:2px">' +
          '<button type="button" class="step-btn mr4" data-act="export-manifest-text" aria-label="Export manifest" style="background:rgba(250,246,240,0.14);border:1px solid rgba(250,246,240,.3);color:#FAF6F0;width:34px;height:34px">' + U.icon('edit') + '</button>' +
          '<button type="button" class="step-btn" data-act="edit-event" aria-label="Edit event" style="background:rgba(250,246,240,0.14);border:1px solid rgba(250,246,240,.3);color:#FAF6F0;width:34px;height:34px">' + U.icon('settings') + '</button>' +
        '</div>' +
      '</div>' +
      (staging
        ? '<div class="row row-between mt12" style="border-top:1px solid rgba(250,246,240,0.15);padding-top:8px">' +
            '<span style="font-size:13px;font-weight:600">' + t.durableOut + ' gear &middot; ' + t.consumableOut + ' supplies</span>' +
            '<span class="muted" style="font-size:12px;color:rgba(250,246,240,0.85)">' + (ev.staffIds || []).length + ' crew</span>' +
          '</div>'
        : '<div class="mt12"><div class="meter"><div class="meter-fill' + (t.pct === 100 ? ' full' : '') + '" style="width:' + t.pct + '%"></div></div>' +
            '<p class="muted mt8" style="font-size:12px;color:rgba(250,246,240,0.88)">' + meterSub + '</p></div>') +
    '</div>';
  }

  function segs(ev, tab) {
    if (ev.status === 'staging') {
      return '<div class="seg seg-animated mb12"><div class="seg-glider"></div>' +
        '<button type="button" data-act="tab" data-id="load" class="' + (tab === 'load' ? 'on' : '') + '">' + U.icon('truck', 'mr4') + 'Load-out</button>' +
        '<button type="button" data-act="tab" data-id="crew" class="' + (tab === 'crew' ? 'on' : '') + '">' + U.icon('users', 'mr4') + 'Crew (' + (ev.staffIds || []).length + ')</button>' +
      '</div>';
    }
    return '<div class="seg seg-animated mb12"><div class="seg-glider"></div>' +
      '<button type="button" data-act="tab" data-id="back" class="' + (tab === 'back' ? 'on' : '') + '">Pack down</button>' +
      '<button type="button" data-act="tab" data-id="load" class="' + (tab === 'load' ? 'on' : '') + '">Load-out</button>' +
      '<button type="button" data-act="tab" data-id="foreign" class="' + (tab === 'foreign' ? 'on' : '') + '">Not ours</button>' +
      '<button type="button" data-act="tab" data-id="crew" class="' + (tab === 'crew' ? 'on' : '') + '">Crew (' + (ev.staffIds || []).length + ')</button>' +
    '</div>';
  }

  /* Cards View (No animation wrapper to eliminate flashing on qty change) */
  function renderCardsView(lines, isOut, evPresetId) {
    return lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var stat = getItemStockStatus(l.itemId, l.out, evPresetId);

      var alertTag = stat.isExceeding
        ? '<span class="tag tag-red" style="font-size:9.5px;font-weight:700;display:inline-flex;align-items:center;gap:3px">' +
            U.icon('alertTriangle', 'tag-svg-icon') + 'Over stock: ' + stat.staged + ' vs ' + stat.owned +
          '</span>'
        : (stat.presetTarget !== null && stat.kitDiff !== 0 ? '<span class="tag tag-yellow" style="font-size:9.5px">Kit: ' + stat.presetTarget + '</span>' : '');

      return '<div class="swipe-row-outer" data-swipe-id="' + l.itemId + '">' +
        '<div class="swipe-actions-bg"><button type="button" class="swipe-delete-btn" data-act="remove-line" data-id="' + l.itemId + '">' + U.icon('trash') + '<span>Remove</span></button></div>' +
        '<div class="swipe-row-content' + (stat.isExceeding ? ' card-shortage' : '') + '" id="swipe-content-' + l.itemId + '">' +
          '<div class="row row-between" style="align-items:flex-start">' +
            '<div class="row grow mr8" style="min-width:0">' +
              '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + l.itemId + '">' + (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') + '</span>' +
              '<div class="grow pack-item-clickable" data-act="inspect-item" data-id="' + l.itemId + '" style="min-width:0">' +
                '<span class="item-name" style="word-break:break-word;line-height:1.24;display:block">' + U.esc(l.name) + '</span>' +
                '<div class="pack-tags-wrap">' +
                  U.tag(l.brand || l.tagLabel || 'Loreto', l.tagColor) +
                  (l.isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
                  alertTag +
                  '<span class="muted" style="font-size:11px">' + l.out + ' ' + U.esc(l.unit) + ' (Stock: ' + stat.owned + ')</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="stepper">' +
              '<button type="button" class="step-btn" data-act="out-minus" data-id="' + l.itemId + '">' + U.icon('minus') + '</button>' +
              '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" data-act="out-input" data-id="' + l.itemId + '" value="' + l.out + '">' +
              '<button type="button" class="step-btn" data-act="out-plus" data-id="' + l.itemId + '">' + U.icon('plus') + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="row row-between mt4">' +
            (isOut && l.back > 0 ? '<span class="muted" style="font-size:11px;color:var(--foliage)">' + l.back + ' of ' + l.out + ' returned</span>' : '<span class="muted" style="font-size:10.5px;color:var(--timber-soft)">&larr; Swipe left to remove</span>') +
            '<button type="button" class="muted" style="font-size:11.5px;color:var(--alert);background:none;border:none;cursor:pointer" data-act="remove-line" data-id="' + l.itemId + '">Remove</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* Compact View */
  function renderCompactView(lines, isOut, evPresetId, openAccordions, catPages) {
    var cats = S.categories();
    var groups = {}, uncat = [];
    lines.forEach(function (l) {
      var it = S.item(l.itemId);
      var cId = it ? it.categoryId : '';
      if (cId) { if (!groups[cId]) groups[cId] = []; groups[cId].push(l); } else uncat.push(l);
    });

    var catPageSize = 6;
    var html = '';
    cats.forEach(function (c) {
      var cLines = groups[c.id];
      if (!cLines || !cLines.length) return;
      var isOpen = openAccordions[c.id] !== false;

      var cPage = (catPages && catPages[c.id]) || 1;
      var cTotalPages = Math.ceil(cLines.length / catPageSize) || 1;
      if (cPage > cTotalPages) cPage = cTotalPages;
      if (cPage < 1) cPage = 1;

      var startIdx = (cPage - 1) * catPageSize;
      var visible = cLines.slice(startIdx, startIdx + catPageSize);

      var rows = visible.map(function (l) {
        var stat = getItemStockStatus(l.itemId, l.out, evPresetId);
        return '<div class="compact-item-row' + (stat.isExceeding ? ' short' : '') + '">' +
          '<div class="compact-item-info" data-act="open-qty-modal" data-id="' + l.itemId + '">' +
            '<div class="compact-item-name" style="word-break:break-word;line-height:1.22">' + U.esc(l.name) + '</div>' +
            '<div class="compact-item-meta">' +
              U.tag(l.brand || l.tagLabel || 'Loreto', l.tagColor) +
              (stat.isExceeding
                ? '<span class="tag tag-red ml4" style="font-size:9.5px;display:inline-flex;align-items:center;gap:2px">' + U.icon('alertTriangle', 'tag-svg-icon') + 'Stock: ' + stat.owned + '</span>'
                : '<span class="muted ml4" style="font-size:10px">Stock: ' + stat.owned + '</span>') +
            '</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="out-minus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('minus') + '</button>' +
            '<span style="font-size:14px;font-weight:700;min-width:30px;text-align:center">' + l.out + '</span>' +
            '<button type="button" class="step-btn" data-act="out-plus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>';
      }).join('');

      var pagHtml = U.catAccordionPagination({
        catId: c.id,
        page: cPage,
        totalPages: cTotalPages,
        totalItems: cLines.length,
        prevAct: 'cat-acc-prev-page',
        nextAct: 'cat-acc-next-page'
      });

      html += '<div class="cat-accordion ' + (isOpen ? 'open' : '') + '" id="cat-acc-' + c.id + '">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-cat-acc" data-id="' + c.id + '">' +
          '<span class="cat-accordion-title">' + U.icon(c.icon || 'plate') + '<span>' + U.esc(c.name) + '</span><span class="cat-accordion-badge">' + cLines.length + '</span></span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + rows + pagHtml + '</div>' +
      '</div>';
    });
    return html;
  }

  /* Grid View */
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
            : '<span style="display:inline-flex;align-items:center;gap:3px">' + U.icon('alertTriangle', 'tag-svg-icon') + 'Short +' + stat.shortCount + '</span>')
        : (cols >= 4 ? l.out + ' van' : l.out + ' in van (' + stat.owned + ')');

      return '<div class="grid-item-card" data-act="open-qty-modal" data-id="' + l.itemId + '">' +
        '<div class="grid-thumb-box" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '<span class="grid-qty-badge">' + l.out + (cols >= 4 ? '' : ' ' + U.esc(l.unit)) + '</span>' +
        '</div>' +
        '<div class="grid-title">' + U.esc(l.name) + '</div>' +
        '<div class="grid-staged-pill ' + (stat.isExceeding ? 'short' : 'done') + ' truncate">' +
          pillHtml +
        '</div>' +
      '</div>';
    }).join('');

    return densityBar + '<div class="ecommerce-grid cols-' + cols + '">' + tiles + '</div>';
  }

  /* Pack Cards View */
  function renderPackCardsView(lines) {
    return lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var isConsumable = !!l.isConsumable;
      var short = l.out - l.back;

      return '<div class="pack-row ' + (isConsumable ? 'done' : (short === 0 ? 'done' : 'short')) + '" id="row-' + l.itemId + '">' +
        '<div class="row row-between" style="align-items:flex-start">' +
          '<div class="row grow mr8" style="min-width:0">' +
            '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + l.itemId + '">' + (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') + '</span>' +
            '<div class="grow pack-item-clickable" data-act="inspect-item" data-id="' + l.itemId + '" style="min-width:0">' +
              '<span class="item-name" style="word-break:break-word;line-height:1.24;display:block">' + U.esc(l.name) + '</span>' +
              '<div class="pack-tags-wrap">' +
                U.tag(l.brand || l.tagLabel, l.tagColor) +
                (isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
                '<span class="muted" style="font-size:11px">' + l.out + ' ' + U.esc(l.unit) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="pack-count" style="text-align:right;flex-shrink:0">' +
            (isConsumable
              ? (l.back === l.out ? '<strong style="color:var(--success);font-size:12px">All ' + l.out + ' back</strong>' : '<span class="muted" style="font-size:11px">' + l.back + ' back &middot; ' + (l.out - l.back) + ' used</span>')
              : (short === 0
                  ? '<strong style="color:var(--success);font-size:12px">All ' + l.out + ' back</strong>'
                  : '<span class="pack-short" style="font-size:12px;display:inline-flex;align-items:center;gap:3px">' + U.icon('alertTriangle', 'tag-svg-icon') + short + ' missing</span>')) +
          '</div>' +
        '</div>' +
        '<div class="row row-between mt8">' +
          '<div class="row">' +
            (isConsumable ? '<button type="button" class="btn btn-ghost btn-sm mr4" data-act="consumable-all-used" data-id="' + l.itemId + '" style="width:auto;min-height:34px;padding:2px 8px;font-size:11px">All used</button>' : '') +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="all-back" data-id="' + l.itemId + '" style="width:auto;min-height:34px;padding:2px 10px;color:var(--foliage);font-weight:700;font-size:11.5px">' + U.icon('check', 'mr4') + 'All back</button>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="back-minus" data-id="' + l.itemId + '">' + U.icon('minus') + '</button>' +
            '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" data-act="back-input" data-id="' + l.itemId + '" value="' + l.back + '">' +
            '<button type="button" class="step-btn" data-act="back-plus" data-id="' + l.itemId + '">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* Pack Compact View */
  function renderPackCompactView(lines, openAccordions, catPages) {
    var cats = S.categories();
    var groups = {}, uncat = [];
    lines.forEach(function (l) {
      var it = S.item(l.itemId);
      var cId = it ? it.categoryId : '';
      if (cId) { if (!groups[cId]) groups[cId] = []; groups[cId].push(l); } else uncat.push(l);
    });

    var catPageSize = 6;
    var html = '';
    cats.forEach(function (c) {
      var cLines = groups[c.id];
      if (!cLines || !cLines.length) return;
      var isOpen = openAccordions[c.id] !== false;

      var cPage = (catPages && catPages[c.id]) || 1;
      var cTotalPages = Math.ceil(cLines.length / catPageSize) || 1;
      if (cPage > cTotalPages) cPage = cTotalPages;
      if (cPage < 1) cPage = 1;

      var startIdx = (cPage - 1) * catPageSize;
      var visible = cLines.slice(startIdx, startIdx + catPageSize);

      var rows = visible.map(function (l) {
        var isConsumable = !!l.isConsumable;
        var short = l.out - l.back;
        return '<div class="compact-item-row ' + (isConsumable ? 'done' : (short === 0 ? 'done' : 'short')) + '">' +
          '<div class="compact-item-info" data-act="open-pack-modal" data-id="' + l.itemId + '">' +
            '<div class="compact-item-name" style="word-break:break-word;line-height:1.22">' + U.esc(l.name) + '</div>' +
            '<div class="compact-item-meta">' +
              (isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">' + l.back + '/' + l.out + ' back</span>'
                            : (short === 0 ? '<strong style="color:var(--success);font-size:10.5px">All back</strong>' : '<span style="color:var(--alert);font-size:10.5px;font-weight:700;display:inline-flex;align-items:center;gap:3px">' + U.icon('alertTriangle', 'tag-svg-icon') + short + ' missing</span>')) +
            '</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="back-minus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('minus') + '</button>' +
            '<span style="font-size:14px;font-weight:700;min-width:30px;text-align:center">' + l.back + '</span>' +
            '<button type="button" class="step-btn" data-act="back-plus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>';
      }).join('');

      var pagHtml = U.catAccordionPagination({
        catId: c.id,
        page: cPage,
        totalPages: cTotalPages,
        totalItems: cLines.length,
        prevAct: 'cat-acc-prev-page',
        nextAct: 'cat-acc-next-page'
      });

      html += '<div class="cat-accordion ' + (isOpen ? 'open' : '') + '" id="cat-acc-' + c.id + '">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-cat-acc" data-id="' + c.id + '">' +
          '<span class="cat-accordion-title">' + U.icon(c.icon || 'plate') + '<span>' + U.esc(c.name) + '</span><span class="cat-accordion-badge">' + cLines.length + '</span></span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + rows + pagHtml + '</div>' +
      '</div>';
    });
    return html;
  }

  /* Pack Grid View */
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
            : (cols >= 4 ? '-' + short : '<span style="display:inline-flex;align-items:center;gap:3px">' + U.icon('alertTriangle', 'tag-svg-icon') + short + ' missing</span>'));

      return '<div class="grid-item-card" data-act="open-pack-modal" data-id="' + l.itemId + '">' +
        '<div class="grid-thumb-box" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '<span class="grid-qty-badge">' + l.back + '/' + l.out + '</span>' +
        '</div>' +
        '<div class="grid-title">' + U.esc(l.name) + '</div>' +
        '<div class="grid-staged-pill ' + (isConsumable ? 'supply' : (short === 0 ? 'done' : 'short')) + ' truncate">' +
          pillHtml +
        '</div>' +
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

  function foreignTab(ev) {
    var t = S.tally(ev);
    return '<div class="card mb12"><div class="row row-between"><div><h3 style="font-size:24px;font-family:Iowan Old Style,serif;color:var(--inasal-orange)">' + t.foreign + '</h3><p class="muted">foreign piece' + (t.foreign === 1 ? '' : 's') + ' in van</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-act="add-foreign" style="width:auto;padding:0 12px">' + U.icon('plus', 'mr4') + ' Flag item</button></div>' +
      '<p class="muted mt8" style="font-size:12px">Log venue plates or borrowed bowls so they get returned.</p></div>' +
      (ev.notOurs.length ? '<div class="list mb16">' + ev.notOurs.map(function (n) {
        return '<div class="item"><span class="thumb" style="color:var(--alert)">' + U.icon('alertTriangle') + '</span><span class="grow mr8" style="min-width:0"><span class="item-name truncate">' + U.esc(n.label) + '</span><span class="item-sub">' + n.qty + ' pc' + (n.note ? ' &middot; ' + U.esc(n.note) : '') + '</span></span><button type="button" class="step-btn" data-act="del-foreign" data-id="' + n.id + '">' + U.icon('close') + '</button></div>';
      }).join('') + '</div>' : U.empty('check', 'Nothing foreign flagged', 'All items belong to Loreto\u2019s.'));
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