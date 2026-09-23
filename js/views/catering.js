/* ==========================================================================
   Loreto's Catering Tracker — Views: Catering (js/views/catering.js) - PART 1
   - Clean Kit Selection: "Kit presets" when empty, "Kit: [Name]" when loaded
   - Preset Modifications: Update existing, Save as new, or Discard & Revert
   - 1-Tap Kit Switching with clear-load confirmation (No messy merging)
   - Real-time Inventory Stock Shortage Warnings & Auto-Cap
   - Category-Safe Compact View: No fragmented or lost categories
   - Reusable Icon View Switcher (Cards / Compact / Grid)
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.catering = (function () {
  var U = App.UI, S = App.Store;
  var tab = 'load';
  var lastRenderedTab = null;
  var onlyShort = false;

  /* Catering Page Controls */
  var loadQ = '';
  var loadCat = '';
  var loadSort = 'cat'; // 'cat' | 'alpha-asc' | 'qty-desc'
  var viewMode = 'cards'; // 'cards' | 'compact' | 'grid'
  var openAccordions = {}; // catId -> boolean
  var catPageLimits = {}; // catId -> visible count limit

  /* Global Pagination (for Cards and Grid views) */
  var page = 1;
  var pageSize = 10;
  var totalPages = 1;

  /* Add Items / Checklist Controls */
  var chkQ = '';
  var chkCat = '';
  var chkFilter = 'unadded'; // 'unadded' | 'all'
  var activeQtyModalReturnToChecklist = false;

  var editingPreset = null;
  var lastGliderState = null;

  function updateGlider(root) {
    var container = (root || document).querySelector('.seg-animated');
    if (!container) return;
    var glider = container.querySelector('.seg-glider');
    var activeBtn = container.querySelector('button.on');
    if (!glider || !activeBtn) return;

    var targetX = activeBtn.offsetLeft;
    var targetW = activeBtn.offsetWidth;

    if (lastGliderState && (lastGliderState.x !== targetX || lastGliderState.w !== targetW)) {
      glider.style.transition = 'none';
      glider.style.transform = 'translate3d(' + lastGliderState.x + 'px, 0, 0)';
      glider.style.width = lastGliderState.w + 'px';
      void glider.offsetWidth;

      glider.style.transition = 'transform 0.32s cubic-bezier(0.34, 1.45, 0.64, 1), width 0.28s cubic-bezier(0.34, 1.45, 0.64, 1)';
      glider.style.transform = 'translate3d(' + targetX + 'px, 0, 0)';
      glider.style.width = targetW + 'px';
    } else {
      glider.style.transition = 'none';
      glider.style.transform = 'translate3d(' + targetX + 'px, 0, 0)';
      glider.style.width = targetW + 'px';
    }

    lastGliderState = { x: targetX, w: targetW };
  }

  function viewItemPhoto(itemId) {
    var it = S.item(itemId);
    if (!it) return;
    if (!it.photoId) {
      openItemDetail(itemId);
      return;
    }
    var cat = S.category(it.categoryId);
    var metaHtml = U.tag(it.brand || it.tagLabel || 'Loreto', it.tagColor) +
      (it.isConsumable ? ' <span class="tag tag-yellow" style="font-size:9.5px;margin-left:4px">Supply</span>' : '') +
      (cat ? ' <span class="tag tag-white" style="font-size:9.5px;margin-left:4px">' + U.esc(cat.name) + '</span>' : '');

    U.openLightbox(it.photoId, it.name, metaHtml);
  }

  /* Compares staged count against actual stock and kit preset template */
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
    var shortCount = isExceeding ? (stagedQty - owned) : 0;
    var kitDiff = (presetTarget !== null) ? (stagedQty - presetTarget) : 0;

    return {
      owned: owned,
      staged: stagedQty,
      presetTarget: presetTarget,
      isExceeding: isExceeding,
      shortCount: shortCount,
      kitDiff: kitDiff,
      unit: it ? it.unit : 'pc'
    };
  }

  /* Returns all items in the active event that exceed available inventory */
  function getActiveShortages(ev) {
    if (!ev || !ev.lines) return [];
    var list = [];
    for (var i = 0; i < ev.lines.length; i++) {
      var l = ev.lines[i];
      var it = S.item(l.itemId);
      var owned = it ? (it.qty || 0) : 0;
      if (l.out > owned) {
        list.push({
          line: l,
          item: it,
          staged: l.out,
          owned: owned,
          shortBy: l.out - owned
        });
      }
    }
    return list;
  }

  /* Detects if active van load differs from loaded preset */
  function isEventPresetModified(ev) {
    if (!ev || !ev.presetId) return false;
    var p = S.preset(ev.presetId);
    if (!p) return false;
    if (p.lines.length !== ev.lines.length) return true;
    var pMap = {};
    p.lines.forEach(function (l) { pMap[l.itemId] = l.qty; });
    for (var i = 0; i < ev.lines.length; i++) {
      var el = ev.lines[i];
      if (pMap[el.itemId] !== el.out) return true;
    }
    return false;
  }

  function startScreen() {
    var presets = S.presets();
    var last = S.history()[0];

    return '<div class="banner mb12">' +
        '<h3>Ready for the next booking</h3>' +
        '<p class="muted mt8" style="color:rgba(250,246,240,0.85)">Load gear from a kit preset, stage 100% of inventory, or build item-by-item.</p>' +
        '<div class="row mt12" style="gap:6px">' +
          '<button type="button" class="btn btn-primary grow mr6" data-act="new-blank">' +
            U.icon('plus', 'mr4') + ' Blank event' +
          '</button>' +
          '<button type="button" class="btn btn-ghost grow" data-act="new-event-all-stock" style="background:#FAF6F0;border-color:var(--line-strong)">' +
            U.icon('package', 'mr4') + ' Stage all stock' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<div class="row row-between mt12 mb8">' +
        '<h2 class="section-title" style="margin:0">' +
          U.icon('layers') + ' Gear Kit Presets' +
        '</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="manage-presets" style="width:auto;min-height:34px;padding:2px 10px;font-size:12px">' +
          U.icon('settings', 'mr4') + ' Manage kits' +
        '</button>' +
      '</div>' +

      (presets.length
        ? '<div class="list mb12">' + presets.map(presetCard).join('') + '</div>'
        : U.empty('layers', 'No kit presets yet', 'Create your first standard kit preset to load vans in seconds.')) +

      (last ? '<h2 class="section-title mt16">' + U.icon('history') + ' Last event out</h2>' +
        '<div class="card">' +
          '<div class="row row-between">' +
            '<span class="item-name truncate">' + U.esc(last.name) + '</span>' +
            '<span class="item-qty" style="color:var(--foliage)">' + S.tally(last).pct + '%</span>' +
          '</div>' +
          '<p class="muted mt4">' + U.esc(last.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(last.date)) + '</p>' +
        '</div>' : '');
  }

  function presetCard(p) {
    var avail = S.checkPresetAvailability(p.id);
    var isShort = avail && !avail.available;

    return '<button type="button" class="item" data-act="inspect-preset" data-id="' + p.id + '">' +
      '<span class="thumb">' + U.icon('layers') + '</span>' +
      '<span class="grow truncate mr8">' +
        '<span class="item-name truncate">' + U.esc(p.name) + '</span>' +
        '<span class="item-sub truncate">' +
          p.lines.length + ' kinds &middot; ' + (avail ? avail.totalNeeded : 0) + ' pieces' +
          (p.note ? ' &middot; ' + U.esc(p.note) : '') +
        '</span>' +
        '<span class="row mt4">' +
          (isShort
            ? '<span class="tag tag-red" style="font-size:10px">' + avail.shortCount + ' short in inventory</span>'
            : '<span class="tag tag-green" style="font-size:10px">Ready in inventory</span>') +
        '</span>' +
      '</span>' +
      '<span class="item-qty">' + U.icon('chevronRight') + '</span>' +
      '</button>';
  }

  function head(ev) {
    var t = S.tally(ev);
    var staging = ev.status === 'staging';
    var crewCount = (ev.staffIds || []).length;

    var meterSubtitle = '';
    if (t.durableOut > 0) {
      meterSubtitle = t.durableBack + ' of ' + t.durableOut + ' gear back (' + t.pct + '%)' +
        (t.missing ? ' &middot; <strong style="color:#FFA494">' + t.missing + ' gear missing</strong>' : ' &middot; all gear accounted for') +
        (t.consumableOut > 0 ? ' &middot; ' + t.consumed + ' supplies used' : '');
    } else {
      meterSubtitle = t.back + ' of ' + t.out + ' pieces back' +
        (t.consumed > 0 ? ' &middot; ' + t.consumed + ' supplies used' : '');
    }

    return '<div class="banner mb12">' +
      '<div class="row row-between" style="align-items:flex-start">' +
        '<div class="grow mr8">' +
          '<div class="row mb6">' +
            '<span class="event-status-pill ' + (staging ? 'staging' : 'live') + '">' +
              '<span class="status-dot"></span>' +
              (staging ? 'Staging & Van Loading' : 'Out on Location') +
            '</span>' +
          '</div>' +
          '<h3 style="font-family:Iowan Old Style,Georgia,serif;font-size:17.5px;font-weight:700;line-height:1.24;word-break:break-word;letter-spacing:-0.01em">' +
            U.esc(ev.name) +
          '</h3>' +
          '<p class="muted mt4" style="font-size:12px;color:rgba(250,246,240,0.85)">' +
            U.esc(ev.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) +
          '</p>' +
        '</div>' +
        '<div class="row" style="flex-shrink:0;margin-top:2px">' +
          '<button type="button" class="step-btn mr4" data-act="export-manifest-text" aria-label="Export manifest" style="background:rgba(250,246,240,0.14);border:1px solid rgba(250,246,240,.3);color:#FAF6F0;border-radius:var(--r-sm);width:34px;height:34px">' +
            U.icon('edit') +
          '</button>' +
          '<button type="button" class="step-btn" data-act="edit-event" aria-label="Edit event details" style="background:rgba(250,246,240,0.14);border:1px solid rgba(250,246,240,.3);color:#FAF6F0;border-radius:var(--r-sm);width:34px;height:34px">' +
            U.icon('settings') +
          '</button>' +
        '</div>' +
      '</div>' +
      (staging
        ? '<div class="row row-between mt12" style="border-top:1px solid rgba(250,246,240,0.15);padding-top:8px">' +
            '<span style="font-size:13px;font-weight:600">' + t.durableOut + ' gear &middot; ' + t.consumableOut + ' supplies staged</span>' +
            '<span class="muted" style="font-size:12px;color:rgba(250,246,240,0.85)">' + crewCount + ' crew</span>' +
          '</div>'
        : '<div class="mt12">' +
            '<div class="meter"><div class="meter-fill' + (t.pct === 100 ? ' full' : '') + '" id="meter" style="width:' + t.pct + '%"></div></div>' +
            '<p class="muted mt8" id="meter-text" style="font-size:12px;color:rgba(250,246,240,0.88)">' + meterSubtitle + '</p>' +
          '</div>') +
    '</div>';
  }

  function segs(ev) {
    if (ev.status === 'staging') {
      return '<div class="seg seg-animated mb12">' +
        '<div class="seg-glider"></div>' +
        '<button type="button" data-act="tab" data-id="load" class="' + (tab === 'load' ? 'on' : '') + '">' +
          U.icon('truck', 'mr4') + 'Load-out' +
        '</button>' +
        '<button type="button" data-act="tab" data-id="crew" class="' + (tab === 'crew' ? 'on' : '') + '">' +
          U.icon('users', 'mr4') + 'Crew (' + (ev.staffIds || []).length + ')' +
        '</button>' +
      '</div>';
    }

    return '<div class="seg seg-animated mb12">' +
      '<div class="seg-glider"></div>' +
      '<button type="button" data-act="tab" data-id="back" class="' + (tab === 'back' ? 'on' : '') + '">Pack down</button>' +
      '<button type="button" data-act="tab" data-id="load" class="' + (tab === 'load' ? 'on' : '') + '">Load-out</button>' +
      '<button type="button" data-act="tab" data-id="foreign" class="' + (tab === 'foreign' ? 'on' : '') + '">Not ours</button>' +
      '<button type="button" data-act="tab" data-id="crew" class="' + (tab === 'crew' ? 'on' : '') + '">Crew (' + (ev.staffIds || []).length + ')</button>' +
    '</div>';
  }

  function getFilteredLines(lines) {
    var q = (loadQ || '').toLowerCase().trim();
    return lines.filter(function (l) {
      if (loadCat) {
        var it = S.item(l.itemId);
        if (!it || it.categoryId !== loadCat) return false;
      }
      if (!q) return true;
      var hay = (l.name + ' ' + (l.brand || '') + ' ' + (l.tagLabel || '')).toLowerCase();
      return hay.indexOf(q) > -1;
    }).sort(function (a, b) {
      if (loadSort === 'alpha-asc') return (a.name || '').localeCompare(b.name || '');
      if (loadSort === 'qty-desc') return (b.out || 0) - (a.out || 0);
      var itA = S.item(a.itemId), itB = S.item(b.itemId);
      var catA = itA ? itA.categoryId : '', catB = itB ? itB.categoryId : '';
      if (catA !== catB) return catA.localeCompare(catB);
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  function getFilteredBackLines(lines) {
    var q = (loadQ || '').toLowerCase().trim();
    return lines.filter(function (l) {
      if (onlyShort) {
        if (l.isConsumable || l.back >= l.out) return false;
      }
      if (loadCat) {
        var it = S.item(l.itemId);
        if (!it || it.categoryId !== loadCat) return false;
      }
      if (!q) return true;
      var hay = (l.name + ' ' + (l.brand || '') + ' ' + (l.tagLabel || '')).toLowerCase();
      return hay.indexOf(q) > -1;
    }).sort(function (a, b) {
      var shortA = (!a.isConsumable && a.back < a.out) ? 1 : 0;
      var shortB = (!b.isConsumable && b.back < b.out) ? 1 : 0;
      if (shortA !== shortB) return shortB - shortA;

      var itA = S.item(a.itemId), itB = S.item(b.itemId);
      var catA = itA ? itA.categoryId : '', catB = itB ? itB.categoryId : '';
      if (catA !== catB) return catA.localeCompare(catB);
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  /* ==========================================================================
     Load-Out Mode View Renderers (Cards / Compact / Grid)
     ========================================================================== */
  function renderCardsView(lines, editable, isOut, evPresetId) {
    return lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var brandLabel = l.brand ? l.brand : (l.tagLabel || 'Loreto');
      var isConsumable = !!l.isConsumable;

      var stat = getItemStockStatus(l.itemId, l.out, evPresetId);

      var alertTagsHtml = '';
      if (stat.isExceeding) {
        alertTagsHtml = '<span class="tag tag-red" style="font-size:9.5px;font-weight:700">⚠️ OVER STOCK: ' + stat.staged + ' staged vs ' + stat.owned + ' in inventory</span>';
      } else if (stat.presetTarget !== null && stat.kitDiff !== 0) {
        var diffLabel = stat.kitDiff > 0 ? ('+' + stat.kitDiff) : String(stat.kitDiff);
        alertTagsHtml = '<span class="tag tag-yellow" style="font-size:9.5px">Kit: ' + stat.presetTarget + ' (' + diffLabel + ')</span>';
      }

      return '<div class="swipe-row-outer" data-swipe-id="' + l.itemId + '">' +
        '<div class="swipe-actions-bg">' +
          '<button type="button" class="swipe-delete-btn" data-act="remove-line" data-id="' + l.itemId + '">' +
            U.icon('trash') +
            '<span>Remove</span>' +
          '</button>' +
        '</div>' +
        '<div class="swipe-row-content' + (stat.isExceeding ? ' card-shortage' : '') + '" id="swipe-content-' + l.itemId + '">' +
          '<div class="row row-between" style="align-items:flex-start">' +
            '<div class="row grow mr8" style="min-width:0">' +
              '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + l.itemId + '">' +
                (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
              '</span>' +
              '<div class="grow pack-item-clickable" data-act="inspect-item" data-id="' + l.itemId + '" style="min-width:0">' +
                '<span class="item-name" style="word-break:break-word;line-height:1.25">' + U.esc(l.name) + '</span>' +
                '<div class="pack-tags-wrap">' +
                  U.tag(brandLabel, l.tagColor) +
                  (isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
                  alertTagsHtml +
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
            (isOut && l.back > 0
              ? '<span class="muted" style="font-size:11px;color:var(--foliage)">' + l.back + ' of ' + l.out + ' returned</span>'
              : '<span class="muted" style="font-size:10.5px;color:var(--timber-soft)">&larr; Swipe left to remove</span>') +
            '<button type="button" class="muted" style="font-size:11.5px;color:var(--alert);background:none;border:none;cursor:pointer" data-act="remove-line" data-id="' + l.itemId + '">Remove</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* Compact View: Category-isolated layout so categories are never cut or pushed across global pages */
  function renderCompactView(lines, editable, isOut, evPresetId) {
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

    var html = '';

    cats.forEach(function (c) {
      var cLines = groups[c.id];
      if (!cLines || !cLines.length) return;

      var isOpen = openAccordions[c.id] !== false;
      var limit = catPageLimits[c.id] || 10;
      var visibleLines = cLines.slice(0, limit);
      var hasMore = cLines.length > limit;

      var rowsHtml = visibleLines.map(function (l) {
        var brandLabel = l.brand ? l.brand : (l.tagLabel || 'Loreto');
        var stat = getItemStockStatus(l.itemId, l.out, evPresetId);

        return '<div class="compact-item-row' + (stat.isExceeding ? ' short' : '') + '" id="row-compact-' + l.itemId + '">' +
          '<div class="compact-item-info" data-act="open-qty-modal" data-id="' + l.itemId + '">' +
            '<div class="compact-item-name truncate">' + U.esc(l.name) + '</div>' +
            '<div class="compact-item-meta">' +
              U.tag(brandLabel, l.tagColor) +
              (stat.isExceeding
                ? '<span class="tag tag-red ml4" style="font-size:9px">⚠️ Stock: ' + stat.owned + '</span>'
                : '<span class="muted ml4" style="font-size:10.5px">Stock: ' + stat.owned + '</span>') +
              (isOut && l.back > 0 ? '<span class="muted ml4" style="font-size:10.5px;color:var(--foliage)">(' + l.back + ' back)</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="out-minus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('minus') + '</button>' +
            '<span style="font-size:14px;font-weight:700;min-width:32px;text-align:center;' + (stat.isExceeding ? 'color:var(--alert)' : '') + '">' + l.out + '</span>' +
            '<button type="button" class="step-btn" data-act="out-plus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>';
      }).join('');

      var moreBtn = hasMore ? (
        '<div class="row row-between mt4" style="padding:4px 6px">' +
          '<span class="muted" style="font-size:11px">Showing ' + limit + ' of ' + cLines.length + '</span>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="expand-cat-limit" data-id="' + c.id + '" style="width:auto;min-height:28px;padding:1px 8px;font-size:11px">' +
            '+ Show more' +
          '</button>' +
        '</div>'
      ) : '';

      html += '<div class="cat-accordion ' + (isOpen ? 'open' : '') + '" id="cat-acc-' + c.id + '">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-cat-acc" data-id="' + c.id + '">' +
          '<span class="cat-accordion-title">' +
            U.icon(c.icon || 'plate') +
            '<span>' + U.esc(c.name) + '</span>' +
            '<span class="cat-accordion-badge">' + cLines.length + '</span>' +
          '</span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + rowsHtml + moreBtn + '</div>' +
      '</div>';
    });

    if (uncat.length) {
      var isOpenUncat = openAccordions['uncat'] !== false;
      var uncatRows = uncat.map(function (l) {
        return '<div class="compact-item-row">' +
          '<div class="compact-item-info" data-act="open-qty-modal" data-id="' + l.itemId + '">' +
            '<div class="compact-item-name truncate">' + U.esc(l.name) + '</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="out-minus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('minus') + '</button>' +
            '<span style="font-size:14px;font-weight:700;min-width:32px;text-align:center">' + l.out + '</span>' +
            '<button type="button" class="step-btn" data-act="out-plus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>';
      }).join('');

      html += '<div class="cat-accordion ' + (isOpenUncat ? 'open' : '') + '" id="cat-acc-uncat">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-cat-acc" data-id="uncat">' +
          '<span class="cat-accordion-title"><span>Uncategorised</span><span class="cat-accordion-badge">' + uncat.length + '</span></span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + uncatRows + '</div>' +
      '</div>';
    }

    return html;
  }

  function renderGridView(lines, evPresetId) {
    var tiles = lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var brandLabel = l.brand ? l.brand : (l.tagLabel || '');
      var stat = getItemStockStatus(l.itemId, l.out, evPresetId);

      var pillHtml = '';
      if (stat.isExceeding) {
        pillHtml = '<div class="grid-staged-pill short truncate">⚠️ +' + stat.shortCount + ' short!</div>';
      } else {
        pillHtml = '<div class="grid-staged-pill done truncate">' + l.out + ' in van (' + stat.owned + ')</div>';
      }

      return '<div class="grid-item-card" data-act="open-qty-modal" data-id="' + l.itemId + '">' +
        '<div class="grid-thumb-box" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '<span class="grid-qty-badge">' + l.out + ' ' + U.esc(l.unit) + '</span>' +
        '</div>' +
        '<div class="grid-title">' + U.esc(l.name) + '</div>' +
        (brandLabel ? '<div class="grid-brand truncate">' + U.esc(brandLabel) + '</div>' : '') +
        pillHtml +
      '</div>';
    }).join('');

    return '<div class="ecommerce-grid">' + tiles + '</div>';
  }

  /* Kit Picker Sheet: Used when no kit is loaded, or when switching to another kit */
  function openKitPickerSheet(ev, isSwitching) {
    if (!ev) return;
    var presets = S.presets();

    var listHtml = presets.map(function (p) {
      var avail = S.checkPresetAvailability(p.id, true);
      var isLoadedNow = ev.presetId === p.id;
      var isShort = avail && !avail.available;

      return '<div class="card mb8" style="' + (isLoadedNow ? 'border-color:var(--inasal-orange);background:var(--inasal-soft)' : '') + '">' +
        '<div class="row row-between mb4">' +
          '<div class="grow mr8 truncate">' +
            '<strong style="font-size:13.5px;color:var(--timber-ink)">' + U.esc(p.name) + '</strong>' +
            '<div class="muted mt2" style="font-size:11px">' +
              p.lines.length + ' item types &middot; ' + (avail ? avail.totalNeeded : 0) + ' pieces' +
            '</div>' +
          '</div>' +
          (isLoadedNow ? '<span class="tag tag-orange">Currently Active</span>' : '') +
        '</div>' +
        '<div class="row mb8">' +
          (isShort
            ? '<span class="tag tag-red" style="font-size:9.5px">' + avail.shortCount + ' items short in inventory</span>'
            : '<span class="tag tag-green" style="font-size:9.5px">100% available in stock</span>') +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="' + (isSwitching ? 'confirm-switch-preset' : 'select-initial-preset') + '" data-id="' + p.id + '">' +
          U.icon('check', 'mr4') + (isSwitching ? 'Switch to this kit' : 'Load this kit into van') +
        '</button>' +
      '</div>';
    }).join('');

    var title = isSwitching ? 'Switch to Another Kit' : 'Select a Kit Preset';
    var html =
      '<p class="muted mb12" style="font-size:12px">' +
        (isSwitching
          ? 'Pick a new kit preset. Switching will replace current van items with this kit.'
          : 'Choose a standard equipment bundle to stage the van in seconds.') +
      '</p>' +
      '<div class="list mb12">' +
        (listHtml || '<div class="empty"><p class="muted">No kit presets saved yet.</p></div>') +
      '</div>' +
      '<button type="button" class="btn btn-ghost" data-act="' + (isSwitching ? 'open-preset-options' : 'sheet-close') + '">' +
        (isSwitching ? 'Back to kit options' : 'Cancel') +
      '</button>';

    U.openSheet(title, html, onAct);
  }

  /* Kit Preset Options Sheet: Update, Save as New, Discard, or Switch */
  function openPresetOptionsSheet(ev) {
    if (!ev) return;
    var p = ev.presetId ? S.preset(ev.presetId) : null;
    var isModified = isEventPresetModified(ev);

    var activeKitCard = p ? (
      '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line)">' +
        '<div class="row row-between">' +
          '<div>' +
            '<span class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase">Active Kit Preset</span>' +
            '<h4 style="font-size:15px;font-weight:700;color:var(--timber-ink)">' + U.esc(p.name) + '</h4>' +
          '</div>' +
          (isModified
            ? '<span class="tag tag-yellow" style="font-size:10px">Modified (' + ev.lines.length + ' kinds)</span>'
            : '<span class="tag tag-green" style="font-size:10px">In sync</span>') +
        '</div>' +
        (isModified
          ? '<p class="muted mt4" style="font-size:11.5px">Loaded gear counts or items differ from the saved preset template.</p>'
          : '<p class="muted mt4" style="font-size:11.5px">Van load matches the template exactly.</p>') +
      '</div>'
    ) : '';

    var modActionButtons = '';
    if (p && isModified) {
      modActionButtons =
        '<button type="button" class="btn btn-primary mb8" data-act="update-current-preset" data-id="' + p.id + '">' +
          U.icon('check', 'mr4') + ' Update "' + U.esc(p.name) + '" with current van load' +
        '</button>' +
        '<button type="button" class="btn btn-ghost mb8" data-act="prompt-save-new-preset">' +
          U.icon('plus', 'mr4') + ' Save current van load as NEW preset' +
        '</button>' +
        '<button type="button" class="btn btn-danger btn-sm mb8" data-act="revert-preset-changes">' +
          U.icon('refresh', 'mr4') + ' Discard changes & revert to original kit' +
        '</button>';
    } else if (p) {
      modActionButtons =
        '<button type="button" class="btn btn-ghost mb8" data-act="prompt-save-new-preset">' +
          U.icon('plus', 'mr4') + ' Save current van load as NEW preset' +
        '</button>';
    } else {
      modActionButtons =
        '<button type="button" class="btn btn-primary mb8" data-act="prompt-save-new-preset">' +
          U.icon('plus', 'mr4') + ' Save current van load as kit preset' +
        '</button>';
    }

    var html =
      activeKitCard +
      modActionButtons +
      '<div class="divider"></div>' +
      '<button type="button" class="btn btn-ghost mb8" data-act="pick-preset-to-switch">' +
        U.icon('layers', 'mr4') + ' Switch to another kit...' +
      '</button>' +
      '<button type="button" class="btn btn-ghost mb8" data-act="manage-presets">' +
        U.icon('settings', 'mr4') + ' Manage all saved kit presets' +
      '</button>' +
      '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>';

    U.openSheet('Kit Preset Options', html, onAct);
  }

  function promptSaveNewPreset(ev) {
    if (!ev) return;
    var defaultName = ev.name ? (ev.name + ' Kit') : ('Custom Kit ' + U.fmtDate(U.today()));

    var html =
      '<div class="field"><label for="new-p-name">Preset Name *</label>' +
        '<input class="input" id="new-p-name" value="' + U.esc(defaultName) + '" placeholder="e.g. 50 Pax Buffet Special"></div>' +
      '<div class="field"><label for="new-p-note">Description / Notes</label>' +
        '<textarea class="input" id="new-p-note" placeholder="Kit bundle description">' + U.esc('Kit saved from ' + ev.name) + '</textarea></div>' +
      '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line)">' +
        '<span class="muted" style="font-size:12px">Includes ' + ev.lines.length + ' gear item types staged in van.</span>' +
      '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary mb8" data-act="confirm-save-new-preset">' +
          U.icon('check', 'mr4') + ' Save as new preset' +
        '</button>' +
        '<button type="button" class="btn btn-ghost" data-act="open-preset-options">Back</button>' +
      '</div>';

    U.openSheet('Save New Kit Preset', html, onAct);
  }

  function loadTab(ev) {
    var isStaging = ev.status === 'staging';
    var isOut = ev.status === 'out';
    var p = ev.presetId ? S.preset(ev.presetId) : null;
    var isModified = isEventPresetModified(ev);

    var shortages = getActiveShortages(ev);

    // Dynamic Kit Button Label
    var kitBtnLabel = p
      ? (U.icon('layers', 'mr4') + 'Kit: ' + U.esc(p.name) + (isModified ? ' *' : ''))
      : (U.icon('layers', 'mr4') + 'Kit presets');

    var headerBtns =
      '<div class="row row-between mb8">' +
        '<button type="button" class="btn btn-primary btn-sm grow mr8" data-act="open-checklist">' +
          U.icon('plus', 'mr4') + ' Add items' +
        '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm grow truncate" data-act="' + (p ? 'open-preset-options' : 'open-kit-picker') + '" style="font-weight:700">' +
          kitBtnLabel +
        '</button>' +
      '</div>';

    var liveNotice = isOut ? (
      '<div class="live-edit-banner">' +
        '<h4>' + U.icon('truck') + ' Live In-Field Load-out</h4>' +
        '<p>Adjust quantities or add items. Returns in Pack down are automatically updated.</p>' +
      '</div>'
    ) : '';

    // Real-Time Shortage Alert Banner
    var shortageAlertBanner = (shortages.length > 0) ? (
      '<div class="card mb8" style="background:var(--alert-tint);border-left:4px solid var(--alert);padding:10px 12px">' +
        '<div class="row row-between">' +
          '<div class="grow mr8">' +
            '<span style="font-size:12.5px;font-weight:700;color:var(--alert)">' +
              '⚠️ Shortage Alert: ' + shortages.length + ' item(s) exceed stock' +
            '</span>' +
            '<p class="muted" style="font-size:11px;margin-top:2px">Van load is higher than total inventory owned.</p>' +
          '</div>' +
          '<button type="button" class="btn btn-danger btn-sm" data-act="auto-clamp-stock" style="width:auto;min-height:30px;padding:2px 10px;font-size:11px">' +
            'Cap to stock' +
          '</button>' +
        '</div>' +
      '</div>'
    ) : '';

    var presetAlertBanner = (p && isModified && shortages.length === 0) ? (
      '<div class="card mb8" style="background:var(--gold-tint);border-color:rgba(212,155,66,0.35);padding:8px 12px">' +
        '<div class="row row-between">' +
          '<div class="grow mr8">' +
            '<span style="font-size:12px;font-weight:700;color:var(--inasal-dark)">' +
              U.icon('layers', 'mr4') + ' Kit modified from "' + U.esc(p.name) + '"' +
            '</span>' +
            '<p class="muted" style="font-size:10.5px;margin-top:2px">Items or piece counts have changed.</p>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-sm" data-act="open-preset-options" style="width:auto;min-height:30px;padding:2px 10px;font-size:11px">' +
            'Options' +
          '</button>' +
        '</div>' +
      '</div>'
    ) : '';

    if (!ev.lines.length) {
      return liveNotice + headerBtns + U.empty('truck', 'Nothing loaded yet', 'Search gear, pick a kit preset, or stage your whole inventory.',
        '<div class="row" style="gap:6px">' +
          '<button type="button" class="btn btn-primary grow mr4" data-act="open-checklist">' + U.icon('plus', 'mr4') + ' Add items</button>' +
          '<button type="button" class="btn btn-ghost grow mr4" data-act="open-kit-picker">' + U.icon('layers', 'mr4') + ' Load a kit</button>' +
          '<button type="button" class="btn btn-ghost grow" data-act="stage-all-inventory">' + U.icon('package', 'mr4') + ' All stock</button>' +
        '</div>'
      );
    }

    var cats = S.categories();
    var catChips = '<button type="button" class="chip' + (loadCat ? '' : ' on') + '" data-act="filter-load-cat" data-id="">All</button>' +
      cats.map(function (c) {
        return '<button type="button" class="chip' + (loadCat === c.id ? ' on' : '') + '" data-act="filter-load-cat" data-id="' + c.id + '">' +
          U.esc(c.name) + '</button>';
      }).join('');

    var filtered = getFilteredLines(ev.lines);

    // Global pagination only applies to Cards and Grid views
    totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    var startIdx = (page - 1) * pageSize;
    var endIdx = Math.min(startIdx + pageSize, filtered.length);
    var paginatedLines = filtered.slice(startIdx, endIdx);

    var searchBarHtml =
      '<div class="search mb8">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="catering-search" type="search" placeholder="Search loaded gear..." value="' + U.esc(loadQ) + '">' +
      '</div>' +
      '<div class="chips filter-bar mb8">' + catChips + '</div>' +
      '<div class="row row-between mb8">' +
        '<span class="muted" style="font-size:11px">' +
          (viewMode === 'compact'
            ? filtered.length + ' item types in categories'
            : (filtered.length ? 'Showing ' + (startIdx + 1) + '&ndash;' + endIdx + ' of ' + filtered.length : '0 items')) +
        '</span>' +
        U.viewModeToggle(viewMode, 'set-view-mode') +
      '</div>';

    var contentHtml = '';
    if (!filtered.length) {
      contentHtml = '<div class="empty mb12"><p class="muted">No items match search or category.</p></div>';
    } else if (viewMode === 'compact') {
      contentHtml = renderCompactView(filtered, true, isOut, ev.presetId);
    } else if (viewMode === 'grid') {
      contentHtml = renderGridView(paginatedLines, ev.presetId);
    } else {
      contentHtml = '<div class="list">' + renderCardsView(paginatedLines, true, isOut, ev.presetId) + '</div>';
    }

    var paginationHtml = (viewMode !== 'compact' && filtered.length > 0) ? U.paginationBar({
      page: page,
      totalPages: totalPages,
      pageSize: pageSize,
      prevAct: 'cat-prev-page',
      nextAct: 'cat-next-page',
      sizeAct: 'cat-change-page-size'
    }) : '';

    var bottomActions = isStaging ? (
      '<button type="button" class="btn btn-primary mt12" data-act="mark-loaded">' +
        U.icon('check', 'mr4') + ' Van is loaded \u2014 Lock it in' +
      '</button>' +
      '<div class="row mt8" style="gap:6px">' +
        '<button type="button" class="btn btn-ghost grow mr4 btn-sm" data-act="stage-all-inventory" style="min-height:38px;font-size:11.5px">' +
          U.icon('package', 'mr4') + ' Stage all stock' +
        '</button>' +
        '<button type="button" class="btn btn-ghost grow btn-sm" data-act="export-manifest-text" style="min-height:38px;font-size:11.5px">' +
          U.icon('edit', 'mr4') + ' Export text' +
        '</button>' +
      '</div>' +
      '<button type="button" class="btn btn-danger mt8 mb16" data-act="cancel-event">Cancel this event</button>'
    ) : (
      '<button type="button" class="btn btn-primary mt12" data-act="goto-packdown">' +
        U.icon('check', 'mr4') + ' Continue Pack Down' +
      '</button>' +
      '<div class="row mt8 mb16" style="gap:6px">' +
        '<button type="button" class="btn btn-ghost grow btn-sm mr4" data-act="export-manifest-text" style="min-height:38px;font-size:12px">' +
          U.icon('edit', 'mr4') + ' Export text' +
        '</button>' +
        '<button type="button" class="btn btn-ghost grow btn-sm" data-act="revert-to-staging" style="min-height:38px;font-size:12px">' +
          U.icon('refresh', 'mr4') + ' Re-stage van' +
        '</button>' +
      '</div>'
    );

    return liveNotice + shortageAlertBanner + presetAlertBanner + headerBtns + searchBarHtml + contentHtml + paginationHtml + bottomActions;
  }

  function crewTab(ev) {
    var assignedIds = ev.staffIds || [];
    var staffList = assignedIds.map(function (id) {
      return S.staffMember(id);
    }).filter(Boolean);

    var html = staffList.map(function (m) {
      var photoKey = m.photoId ? (m.photoId + '-t') : '';
      return '<div class="item">' +
        '<span class="thumb staff-thumb" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon('user') : '') +
        '</span>' +
        '<span class="grow truncate mr8">' +
          '<span class="item-name truncate">' + U.esc(m.name) + '</span>' +
          '<span class="item-sub truncate">' + U.esc(m.role || 'Catering Staff') + '</span>' +
        '</span>' +
        (m.phone ? '<a class="btn btn-ghost btn-sm mr8" href="tel:' + U.esc(m.phone) + '" style="min-height:34px;padding:4px 10px;font-size:12px;width:auto">' +
          U.icon('phone', 'mr4') + ' Call</a>' : '') +
        (ev.status === 'staging'
          ? '<button type="button" class="step-btn" data-act="unassign-staff" data-id="' + m.id + '" aria-label="Remove crew member">' + U.icon('close') + '</button>'
          : '') +
      '</div>';
    }).join('');

    return '<div class="card mb12">' +
        '<div class="row row-between">' +
          '<div>' +
            '<h3 style="font-size:15px;font-weight:700">Assigned Crew (' + staffList.length + ')</h3>' +
            '<p class="muted mt4" style="font-size:11.5px">Staff working this booking.</p>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-sm" data-act="open-staff-picker" style="width:auto;padding:0 12px">' +
            U.icon('plus', 'mr4') + ' Assign crew' +
          '</button>' +
        '</div>' +
      '</div>' +
      (staffList.length ? '<div class="list mb16">' + html + '</div>'
        : U.empty('users', 'No crew assigned', 'Assign staff from your directory to track who is working this job.'));
  }

  /* ==========================================================================
     Pack-Down View Renderers (Cards / Category-Safe Compact / Grid)
     ========================================================================== */
  function renderPackCardsView(lines) {
    return lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var brandLabel = l.brand ? l.brand : (l.tagLabel || 'Loreto');
      var isConsumable = !!l.isConsumable;
      var short = l.out - l.back;

      if (isConsumable) {
        var used = l.out - l.back;
        var statusHtml = '';
        if (l.back === l.out) {
          statusHtml = '<strong style="color:var(--success);font-size:12px">All ' + l.out + ' back</strong>';
        } else if (l.back === 0) {
          statusHtml = '<span style="color:var(--timber-soft);font-size:12px;font-weight:700">All ' + l.out + ' used</span>';
        } else {
          statusHtml = '<span style="color:var(--timber-soft);font-size:11.5px"><strong>' + l.back + '</strong> back &middot; <strong>' + used + '</strong> used</span>';
        }

        return '<div class="pack-row done" id="row-' + l.itemId + '" style="border-left:3.5px solid var(--gold, #D49B42)">' +
          '<div class="row row-between" style="align-items:flex-start">' +
            '<div class="row grow mr8" style="min-width:0">' +
              '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + l.itemId + '">' +
                (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
              '</span>' +
              '<div class="grow pack-item-clickable" data-act="inspect-item" data-id="' + l.itemId + '" style="min-width:0">' +
                '<span class="item-name" style="word-break:break-word;line-height:1.25">' + U.esc(l.name) + '</span>' +
                '<div class="pack-tags-wrap">' +
                  U.tag(brandLabel, l.tagColor || 'yellow') +
                  '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' +
                  '<span class="muted" style="font-size:11px">' + l.out + ' ' + U.esc(l.unit) + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="pack-count" id="cnt-' + l.itemId + '" style="text-align:right;flex-shrink:0;margin-left:4px">' +
              statusHtml +
            '</div>' +
          '</div>' +
          '<div class="row row-between mt8">' +
            '<div class="row">' +
              '<button type="button" class="btn btn-ghost btn-sm mr6" data-act="consumable-all-used" data-id="' + l.itemId + '" style="width:auto;min-height:34px;padding:3px 9px;font-size:11.5px">' +
                'All used' +
              '</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-act="all-back" data-id="' + l.itemId + '" style="width:auto;min-height:34px;padding:3px 9px;font-size:11.5px;color:var(--foliage);font-weight:700">' +
                'All back' +
              '</button>' +
            '</div>' +
            '<div class="stepper">' +
              '<button type="button" class="step-btn" data-act="back-minus" data-id="' + l.itemId + '">' + U.icon('minus') + '</button>' +
              '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" data-act="back-input" data-id="' + l.itemId + '" value="' + l.back + '">' +
              '<button type="button" class="step-btn" data-act="back-plus" data-id="' + l.itemId + '">' + U.icon('plus') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      return '<div class="pack-row ' + (short === 0 ? 'done' : 'short') + '" id="row-' + l.itemId + '">' +
        '<div class="row row-between" style="align-items:flex-start">' +
          '<div class="row grow mr8" style="min-width:0">' +
            '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + l.itemId + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow pack-item-clickable" data-act="inspect-item" data-id="' + l.itemId + '" style="min-width:0">' +
              '<span class="item-name" style="word-break:break-word;line-height:1.25">' + U.esc(l.name) + '</span>' +
              '<div class="pack-tags-wrap">' +
                U.tag(brandLabel, l.tagColor) +
                '<span class="muted" style="font-size:11px">' + l.out + ' ' + U.esc(l.unit) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="pack-count" id="cnt-' + l.itemId + '" style="text-align:right;flex-shrink:0;margin-left:4px">' +
            (short === 0 ? '<strong style="color:var(--success);font-size:12px">All ' + l.out + ' back</strong>'
                         : '<span class="pack-short" style="font-size:12px">' + short + ' missing</span>') +
          '</div>' +
        '</div>' +
        '<div class="row row-between mt8">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="all-back" data-id="' + l.itemId + '" style="width:auto;min-height:36px;padding:4px 12px;font-size:12px;color:var(--foliage);font-weight:700">' +
            U.icon('check', 'mr4') + ' All back' +
          '</button>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="back-minus" data-id="' + l.itemId + '">' + U.icon('minus') + '</button>' +
            '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" data-act="back-input" data-id="' + l.itemId + '" value="' + l.back + '">' +
            '<button type="button" class="step-btn" data-act="back-plus" data-id="' + l.itemId + '">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderPackCompactView(lines) {
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

    var html = '';

    cats.forEach(function (c) {
      var cLines = groups[c.id];
      if (!cLines || !cLines.length) return;

      var isOpen = openAccordions[c.id] !== false;
      var limit = catPageLimits[c.id] || 10;
      var visibleLines = cLines.slice(0, limit);
      var hasMore = cLines.length > limit;

      var rowsHtml = visibleLines.map(function (l) {
        var isConsumable = !!l.isConsumable;
        var short = l.out - l.back;
        var statusClass = isConsumable ? 'done' : (short === 0 ? 'done' : 'short');

        return '<div class="compact-item-row ' + statusClass + '" id="row-compact-' + l.itemId + '">' +
          '<div class="compact-item-info" data-act="open-pack-modal" data-id="' + l.itemId + '">' +
            '<div class="compact-item-name truncate">' + U.esc(l.name) + '</div>' +
            '<div class="compact-item-meta">' +
              (isConsumable
                ? '<span class="tag tag-yellow" style="font-size:9.5px">' + l.back + '/' + l.out + ' back</span>'
                : (short === 0
                    ? '<strong style="color:var(--success);font-size:11px">All ' + l.out + ' back</strong>'
                    : '<span style="color:var(--alert);font-size:11px;font-weight:700">' + short + ' missing</span>')) +
            '</div>' +
          '</div>' +
          '<div class="row" style="flex-shrink:0">' +
            '<button type="button" class="btn btn-ghost btn-sm mr4" data-act="all-back" data-id="' + l.itemId + '" style="width:auto;min-height:34px;padding:2px 8px;font-size:11.5px;color:var(--foliage)">' +
              'All' +
            '</button>' +
            '<div class="stepper">' +
              '<button type="button" class="step-btn" data-act="back-minus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('minus') + '</button>' +
              '<span style="font-size:14px;font-weight:700;min-width:30px;text-align:center">' + l.back + '</span>' +
              '<button type="button" class="step-btn" data-act="back-plus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('plus') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      var moreBtn = hasMore ? (
        '<div class="row row-between mt4" style="padding:4px 6px">' +
          '<span class="muted" style="font-size:11px">Showing ' + limit + ' of ' + cLines.length + '</span>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="expand-cat-limit" data-id="' + c.id + '" style="width:auto;min-height:28px;padding:1px 8px;font-size:11px">' +
            '+ Show more' +
          '</button>' +
        '</div>'
      ) : '';

      html += '<div class="cat-accordion ' + (isOpen ? 'open' : '') + '" id="cat-acc-' + c.id + '">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-cat-acc" data-id="' + c.id + '">' +
          '<span class="cat-accordion-title">' +
            U.icon(c.icon || 'plate') +
            '<span>' + U.esc(c.name) + '</span>' +
            '<span class="cat-accordion-badge">' + cLines.length + '</span>' +
          '</span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + rowsHtml + moreBtn + '</div>' +
      '</div>';
    });

    if (uncat.length) {
      var isOpenUncat = openAccordions['uncat'] !== false;
      var uncatRows = uncat.map(function (l) {
        var short = l.out - l.back;
        var statusClass = l.isConsumable ? 'done' : (short === 0 ? 'done' : 'short');
        return '<div class="compact-item-row ' + statusClass + '">' +
          '<div class="compact-item-info" data-act="open-pack-modal" data-id="' + l.itemId + '">' +
            '<div class="compact-item-name truncate">' + U.esc(l.name) + '</div>' +
            '<div class="compact-item-meta">' +
              (short === 0 ? '<strong style="color:var(--success);font-size:11px">All back</strong>' : '<span style="color:var(--alert);font-size:11px;font-weight:700">' + short + ' missing</span>') +
            '</div>' +
          '</div>' +
          '<div class="row">' +
            '<button type="button" class="btn btn-ghost btn-sm mr4" data-act="all-back" data-id="' + l.itemId + '" style="width:auto;min-height:34px;padding:2px 8px;font-size:11.5px;color:var(--foliage)">All</button>' +
            '<div class="stepper">' +
              '<button type="button" class="step-btn" data-act="back-minus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('minus') + '</button>' +
              '<span style="font-size:14px;font-weight:700;min-width:30px;text-align:center">' + l.back + '</span>' +
              '<button type="button" class="step-btn" data-act="back-plus" data-id="' + l.itemId + '" style="width:34px;height:34px">' + U.icon('plus') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      html += '<div class="cat-accordion ' + (isOpenUncat ? 'open' : '') + '" id="cat-acc-uncat">' +
        '<button type="button" class="cat-accordion-head" data-act="toggle-cat-acc" data-id="uncat">' +
          '<span class="cat-accordion-title"><span>Uncategorised</span><span class="cat-accordion-badge">' + uncat.length + '</span></span>' +
          U.icon('chevronDown', 'cat-accordion-chevron') +
        '</button>' +
        '<div class="cat-accordion-body">' + uncatRows + '</div>' +
      '</div>';
    }

    return html;
  }

  function renderPackGridView(lines) {
    var tiles = lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var isConsumable = !!l.isConsumable;
      var short = l.out - l.back;

      var pillHtml = '';
      if (isConsumable) {
        pillHtml = '<div class="grid-staged-pill supply truncate">' + l.back + '/' + l.out + ' back</div>';
      } else if (short === 0) {
        pillHtml = '<div class="grid-staged-pill done truncate">' + U.icon('check', 'mr4') + 'All back</div>';
      } else {
        pillHtml = '<div class="grid-staged-pill short truncate">' + short + ' missing</div>';
      }

      return '<div class="grid-item-card" data-act="open-pack-modal" data-id="' + l.itemId + '">' +
        '<div class="grid-thumb-box" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '<span class="grid-qty-badge">' + l.back + '/' + l.out + '</span>' +
        '</div>' +
        '<div class="grid-title">' + U.esc(l.name) + '</div>' +
        pillHtml +
      '</div>';
    }).join('');

    return '<div class="ecommerce-grid">' + tiles + '</div>';
  }

  function openPackReturnModal(itemId) {
    var ev = S.activeEvent();
    if (!ev) return;
    var line = null;
    ev.lines.forEach(function (l) { if (l.itemId === itemId) line = l; });
    if (!line) return;

    var it = S.item(itemId);
    var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
    var cat = it ? S.category(it.categoryId) : null;
    var isConsumable = !!line.isConsumable;
    var brandLabel = line.brand || line.tagLabel || 'Loreto';

    var html =
      '<div class="quick-qty-modal">' +
        '<div class="row mb12" style="align-items:flex-start">' +
          '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + line.itemId + '" style="width:48px;height:48px;flex:0 0 48px;margin-right:10px">' +
            (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '</span>' +
          '<div class="grow">' +
            '<h3 style="font-size:16px;font-weight:700;color:var(--timber-ink);line-height:1.25">' + U.esc(line.name) + '</h3>' +
            '<div class="row mt4" style="flex-wrap:wrap;gap:4px">' +
              U.tag(brandLabel, line.tagColor) +
              (isConsumable ? '<span class="tag tag-yellow ml4" style="font-size:9.5px">Supply</span>' : '') +
              '<span class="muted ml4" style="font-size:11.5px">' + line.out + ' ' + U.esc(line.unit) + ' in van</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card mb12" style="text-align:center;padding:16px 12px">' +
          '<label style="font-size:12px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:8px">Pieces Returned / Recovered</label>' +
          '<div class="row" style="justify-content:center;align-items:center">' +
            '<div class="stepper" style="transform:scale(1.15)">' +
              '<button type="button" class="step-btn" data-act="modal-pack-delta" data-delta="-1">' + U.icon('minus') + '</button>' +
              '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" id="modal-pack-input" value="' + line.back + '">' +
              '<button type="button" class="step-btn" data-act="modal-pack-delta" data-delta="1">' + U.icon('plus') + '</button>' +
            '</div>' +
            '<button type="button" class="btn-max" data-act="modal-pack-set" data-val="' + line.out + '">All (' + line.out + ')</button>' +
          '</div>' +

          '<div class="quick-qty-pills mt12">' +
            '<button type="button" data-act="modal-pack-delta" data-delta="1">+1</button>' +
            '<button type="button" data-act="modal-pack-delta" data-delta="5">+5</button>' +
            (isConsumable ? '<button type="button" data-act="modal-pack-set" data-val="0" style="color:var(--alert);font-weight:700">All used</button>' : '') +
            '<button type="button" data-act="modal-pack-set" data-val="' + line.out + '" style="color:var(--foliage);font-weight:700">All ' + line.out + ' back</button>' +
          '</div>' +
        '</div>' +

        '<div class="sheet-sticky-footer">' +
          '<button type="button" class="btn btn-primary mb8" data-act="modal-pack-save" data-id="' + line.itemId + '" data-max="' + line.out + '">' +
            'Save Return Count' +
          '</button>' +
          '<button type="button" class="btn btn-ghost" data-act="sheet-close">Cancel</button>' +
        '</div>' +
      '</div>';

    var body = U.openSheet('Update Returns: ' + line.name, html, onAct);
    U.hydrateThumbs(body);
  }

  function backTab(ev) {
    if (!ev.lines.length) return U.empty('plate', 'Nothing was loaded', 'This event went out empty.');

    var filtered = getFilteredBackLines(ev.lines);

    // Global pagination only applies to Cards and Grid views
    totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    var startIdx = (page - 1) * pageSize;
    var endIdx = Math.min(startIdx + pageSize, filtered.length);
    var paginatedLines = filtered.slice(startIdx, endIdx);

    var cats = S.categories();
    var catChips = '<button type="button" class="chip' + (loadCat ? '' : ' on') + '" data-act="filter-load-cat" data-id="">All</button>' +
      cats.map(function (c) {
        return '<button type="button" class="chip' + (loadCat === c.id ? ' on' : '') + '" data-act="filter-load-cat" data-id="' + c.id + '">' +
          U.esc(c.name) + '</button>';
      }).join('');

    var filterControls =
      '<div class="row row-between mb8">' +
        '<button type="button" class="chip' + (onlyShort ? ' on' : '') + '" data-act="toggle-short">' +
          U.icon('alert') + ' Only missing gear' +
        '</button>' +
        '<button type="button" class="chip" data-act="all-back-gear">' +
          U.icon('check') + ' Mark all gear back' +
        '</button>' +
      '</div>' +

      '<div class="search mb8">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="catering-search" type="search" placeholder="Search gear in pack down..." value="' + U.esc(loadQ) + '">' +
      '</div>' +
      '<div class="chips filter-bar mb8">' + catChips + '</div>' +

      '<div class="row row-between mb8">' +
        '<span class="muted" style="font-size:11px">' +
          (viewMode === 'compact'
            ? filtered.length + ' item types in categories'
            : (filtered.length ? 'Showing ' + (startIdx + 1) + '&ndash;' + endIdx + ' of ' + filtered.length + ' pieces' : '0 items')) +
        '</span>' +
        U.viewModeToggle(viewMode, 'set-view-mode') +
      '</div>';

    var contentHtml = '';
    if (!filtered.length) {
      contentHtml = '<div class="empty mb12"><p class="muted">' +
        (onlyShort ? 'All reusable equipment accounted for!' : 'No items match your filter.') +
      '</p></div>';
    } else if (viewMode === 'compact') {
      contentHtml = renderPackCompactView(filtered);
    } else if (viewMode === 'grid') {
      contentHtml = renderPackGridView(paginatedLines);
    } else {
      contentHtml = '<div class="list mb12">' + renderPackCardsView(paginatedLines) + '</div>';
    }

    var paginationHtml = (viewMode !== 'compact' && filtered.length > 0) ? U.paginationBar({
      page: page,
      totalPages: totalPages,
      pageSize: pageSize,
      prevAct: 'cat-prev-page',
      nextAct: 'cat-next-page',
      sizeAct: 'cat-change-page-size'
    }) : '';

    return filterControls +
      '<div class="row row-between mb12" style="background:var(--sand-card);border:1px solid var(--line);border-radius:var(--r-md);padding:8px 10px">' +
        '<span class="muted" style="font-size:12px">Need to add extra gear on site?</span>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="open-checklist" style="width:auto;min-height:32px;padding:2px 10px;font-size:11.5px">' +
          U.icon('plus', 'mr4') + ' Add items' +
        '</button>' +
      '</div>' +

      contentHtml +
      paginationHtml +

      '<button type="button" class="btn btn-primary mt12" data-act="close-event">' +
        U.icon('check', 'mr4') + ' Finish this event' +
      '</button>' +
      '<button type="button" class="btn btn-ghost mt8 mb16" data-act="export-manifest-text" style="min-height:38px;font-size:12.5px">' +
        U.icon('edit', 'mr4') + ' Export to text' +
      '</button>';
  }

  function foreignTab(ev) {
    var t = S.tally(ev);

    return '<div class="card mb12">' +
        '<div class="row row-between">' +
          '<div>' +
            '<h3 style="font-size:24px;font-family:Iowan Old Style,serif;color:var(--inasal-orange)">' + t.foreign + '</h3>' +
            '<p class="muted">foreign piece' + (t.foreign === 1 ? '' : 's') + ' in the van</p>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-sm" data-act="add-foreign" style="width:auto;padding:0 12px">' +
            U.icon('plus', 'mr4') + ' Flag item' +
          '</button>' +
        '</div>' +
        '<p class="muted mt8" style="font-size:12px">Log venue plates, borrowed bowls, or guest pans before driving off so they are returned to their owners.</p>' +
      '</div>' +
      (ev.notOurs.length
        ? '<div class="list mb16">' + ev.notOurs.map(function (n) {
            return '<div class="item">' +
              '<span class="thumb" style="color:var(--alert)">' + U.icon('alert') + '</span>' +
              '<span class="grow truncate mr8">' +
                '<span class="item-name truncate">' + U.esc(n.label) + '</span>' +
                '<span class="item-sub truncate">' + n.qty + ' pc' + (n.note ? ' &middot; ' + U.esc(n.note) : '') + '</span>' +
              '</span>' +
              '<button type="button" class="step-btn" data-act="del-foreign" data-id="' + n.id + '" aria-label="Remove">' +
                U.icon('close') +
              '</button>' +
            '</div>';
          }).join('') + '</div>'
        : U.empty('check', 'Nothing foreign flagged', 'All items in the van belong to Loreto\u2019s inventory.'));
  }

  function render() {
    var ev = S.activeEvent();
    if (!ev) return startScreen();
    if (ev.status === 'staging' && tab === 'back') tab = 'load';

    var body = (tab === 'back')    ? backTab(ev)
             : (tab === 'foreign') ? foreignTab(ev)
             : (tab === 'crew')    ? crewTab(ev)
             : loadTab(ev);

    var tabSwitched = (lastRenderedTab !== tab);
    lastRenderedTab = tab;

    var animClass = tabSwitched ? ' tab-pane-enter list-stagger' : '';

    return head(ev) + segs(ev) + '<div class="catering-tab-pane' + animClass + '">' + body + '</div>';
  }

  function attachSwipeListeners(root) {
    var swipeRows = (root || document).querySelectorAll('.swipe-row-outer');
    for (var i = 0; i < swipeRows.length; i++) {
      (function (row) {
        var content = row.querySelector('.swipe-row-content');
        if (!content) return;

        var startX = 0, currentDeltaX = 0, isSwiping = false;

        row.addEventListener('touchstart', function (e) {
          if (!e.touches || !e.touches[0]) return;
          startX = e.touches[0].clientX;
          currentDeltaX = 0;
          isSwiping = false;

          var allOpen = document.querySelectorAll('.swipe-row-content.swiped');
          for (var j = 0; j < allOpen.length; j++) {
            if (allOpen[j] !== content) allOpen[j].classList.remove('swiped');
          }
        }, { passive: true });

        row.addEventListener('touchmove', function (e) {
          if (!e.touches || !e.touches[0]) return;
          var x = e.touches[0].clientX;
          var diff = x - startX;

          if (diff < -15) {
            isSwiping = true;
            currentDeltaX = Math.max(-80, diff);
            content.style.transition = 'none';
            content.style.transform = 'translate3d(' + currentDeltaX + 'px, 0, 0)';
          } else if (diff > 15 && content.classList.contains('swiped')) {
            isSwiping = true;
            content.style.transition = 'none';
            content.style.transform = 'translate3d(' + Math.min(0, -76 + diff) + 'px, 0, 0)';
          }
        }, { passive: true });

        row.addEventListener('touchend', function () {
          if (!isSwiping) return;
          content.style.transition = 'transform 0.22s var(--ease-out)';
          content.style.transform = '';

          if (currentDeltaX < -40) {
            content.classList.add('swiped');
          } else {
            content.classList.remove('swiped');
          }
          isSwiping = false;
        }, { passive: true });
      })(swipeRows[i]);
    }
  }

  function mounted(root) {
    U.hydrateThumbs(root || document);
    updateGlider(root || document);
    attachSwipeListeners(root || document);

    var cSearch = document.getElementById('catering-search');
    if (cSearch) {
      cSearch.addEventListener('input', function () {
        loadQ = cSearch.value;
        page = 1;
        var pos = cSearch.selectionStart;
        App.rerenderQuiet();
        var reFocus = document.getElementById('catering-search');
        if (reFocus) {
          reFocus.focus();
          try { reFocus.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }
  }

  function openItemDetail(itemId) {
    var it = S.item(itemId);
    if (!it) return;
    var ev = S.activeEvent();
    var line = null;
    if (ev && ev.lines) {
      ev.lines.forEach(function (l) { if (l.itemId === itemId) line = l; });
    }
    var cat = S.category(it.categoryId);
    var photoKey = it.photoId ? it.photoId : '';
    var brandLabel = it.brand || it.tagLabel || 'Loreto';

    var statsHtml = '';
    if (line) {
      statsHtml =
        '<div class="kpi-grid mb12">' +
          '<div class="kpi"><div class="kpi-in">' +
            '<div class="kpi-n">' + line.out + '</div>' +
            '<div class="kpi-l">Staged in Van</div>' +
          '</div></div>' +
          '<div class="kpi"><div class="kpi-in">' +
            '<div class="kpi-n" style="color:var(--foliage)">' + line.back + '</div>' +
            '<div class="kpi-l">Back in Hand</div>' +
          '</div></div>' +
        '</div>';
    }

    var html =
      '<div style="text-align:center;margin-bottom:12px">' +
        '<div class="staff-avatar-large" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + it.id + '" style="width:88px;height:88px;border-radius:18px;margin:0 auto 8px auto;border:2px solid var(--line);background-color:var(--sand-soft);cursor:pointer;position:relative">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          (photoKey ? '<div style="position:absolute;bottom:4px;right:4px;background:rgba(33,29,26,0.85);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center">' + U.icon('zoom') + '</div>' : '') +
        '</div>' +
        (photoKey ? '<span class="muted" style="font-size:11px;display:block;margin-bottom:6px">Tap photo to enlarge</span>' : '') +
        '<h3 style="font-family:Iowan Old Style,Georgia,serif;font-size:18px;font-weight:700;color:var(--timber-ink);word-break:break-word">' +
          U.esc(it.name) +
        '</h3>' +
        '<div class="row" style="justify-content:center;margin-top:6px;flex-wrap:wrap">' +
          U.tag(brandLabel, it.tagColor) +
          (it.isConsumable ? '<span class="tag tag-yellow ml4" style="font-size:9.5px">Consumable Supply</span>' : '') +
          (cat ? '<span class="tag tag-white ml4" style="font-size:9.5px">' + U.esc(cat.name) + '</span>' : '') +
        '</div>' +
      '</div>' +

      statsHtml +

      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<span class="muted">Total Inventory Owned:</span>' +
          '<strong>' + it.qty + ' ' + U.esc(it.unit) + '</strong>' +
        '</div>' +
        '<div class="row row-between mb4">' +
          '<span class="muted">Low Stock Alert Level:</span>' +
          '<span>' + (it.lowStockThreshold || 2) + ' ' + U.esc(it.unit) + '</span>' +
        '</div>' +
        (it.brand ? '<div class="row row-between mb4"><span class="muted">Brand / Stamp:</span><span>' + U.esc(it.brand) + '</span></div>' : '') +
        (it.note ? '<div class="mt8 pt8" style="border-top:1px solid var(--line)"><span class="muted">Notes:</span><p style="margin-top:2px;font-size:12.5px">' + U.esc(it.note) + '</p></div>' : '') +
      '</div>' +

      '<button type="button" class="btn btn-primary" data-act="sheet-close">Done</button>';

    var body = U.openSheet('Item Details', html, onAct);
    U.hydrateThumbs(body);
  }

  function openQtyModal(itemId, returnToChecklist) {
    activeQtyModalReturnToChecklist = !!returnToChecklist;
    var ev = S.activeEvent();
    if (!ev) return;
    var it = S.item(itemId);
    if (!it) return;

    var line = null;
    ev.lines.forEach(function (l) { if (l.itemId === itemId) line = l; });
    var stagedQty = line ? line.out : 0;
    var maxStock = it.qty || 0;
    var initialInputVal = stagedQty > 0 ? stagedQty : Math.min(1, maxStock);
    var photoKey = it.photoId ? (it.photoId + '-t') : '';
    var cat = S.category(it.categoryId);

    var html =
      '<div class="quick-qty-modal">' +
        '<div class="row mb12" style="align-items:flex-start">' +
          '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + it.id + '" style="width:48px;height:48px;flex:0 0 48px;margin-right:10px">' +
            (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '</span>' +
          '<div class="grow">' +
            '<h3 style="font-size:16px;font-weight:700;color:var(--timber-ink);line-height:1.25">' + U.esc(it.name) + '</h3>' +
            '<div class="row mt4" style="flex-wrap:wrap;gap:4px">' +
              U.tag(it.brand || it.tagLabel || 'Loreto', it.tagColor) +
              '<span class="muted" style="font-size:11.5px">' + maxStock + ' ' + U.esc(it.unit) + ' in inventory</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card mb12" style="text-align:center;padding:16px 12px">' +
          '<label style="font-size:12px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:8px">Pieces Staged in Van</label>' +
          '<div class="row" style="justify-content:center;align-items:center">' +
            '<div class="stepper" style="transform:scale(1.15)">' +
              '<button type="button" class="step-btn" data-act="modal-qty-delta" data-delta="-1">' + U.icon('minus') + '</button>' +
              '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" id="modal-qty-input" value="' + initialInputVal + '">' +
              '<button type="button" class="step-btn" data-act="modal-qty-delta" data-delta="1">' + U.icon('plus') + '</button>' +
            '</div>' +
            '<button type="button" class="btn-max" data-act="modal-qty-set" data-val="' + maxStock + '">MAX (' + maxStock + ')</button>' +
          '</div>' +

          '<div class="quick-qty-pills mt12">' +
            '<button type="button" data-act="modal-qty-delta" data-delta="1">+1</button>' +
            '<button type="button" data-act="modal-qty-delta" data-delta="5">+5</button>' +
            '<button type="button" data-act="modal-qty-delta" data-delta="10">+10</button>' +
            '<button type="button" data-act="modal-qty-set" data-val="' + maxStock + '" style="color:var(--inasal-orange);font-weight:700">All ' + maxStock + '</button>' +
          '</div>' +
        '</div>' +

        '<div class="sheet-sticky-footer">' +
          '<button type="button" class="btn btn-primary mb8" data-act="modal-qty-save" data-id="' + it.id + '">' +
            (stagedQty > 0 ? 'Update Van Count' : '+ Add to Van') +
          '</button>' +
          (stagedQty > 0
            ? '<button type="button" class="btn btn-danger btn-sm mb8" data-act="modal-qty-remove" data-id="' + it.id + '">Remove from Van</button>'
            : '') +
          '<button type="button" class="btn btn-ghost" data-act="' + (activeQtyModalReturnToChecklist ? 'cancel-to-chk' : 'sheet-close') + '">Cancel</button>' +
        '</div>' +
      '</div>';

    var body = U.openSheet(stagedQty > 0 ? 'Adjust Van Count' : 'Add to Van', html, onAct);
    U.hydrateThumbs(body);
  }

  function renderChecklistRows(ev) {
    var activeEv = ev || S.activeEvent();
    if (!activeEv) return '';

    var list = S.searchItems(chkQ, chkCat, 'alpha-asc');

    if (chkFilter === 'unadded') {
      list = list.filter(function (i) {
        var isAdded = activeEv.lines.some(function (l) { return l.itemId === i.id && l.out > 0; });
        return !isAdded;
      });
    }

    if (!list.length) {
      return '<div class="empty"><p class="muted">No gear found matching this filter.</p></div>';
    }

    return list.map(function (i) {
      var staged = 0;
      activeEv.lines.forEach(function (l) { if (l.itemId === i.id) staged = l.out; });
      var brandLabel = i.brand ? i.brand : (i.tagLabel || 'Loreto');
      var photoKey = i.photoId ? (i.photoId + '-t') : '';
      var cat = S.category(i.categoryId);

      return '<div class="pack-row">' +
        '<div class="row row-between" style="align-items:flex-start">' +
          '<div class="row grow mr8" style="min-width:0">' +
            '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + i.id + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow pack-item-clickable" data-act="inspect-item" data-id="' + i.id + '" style="min-width:0">' +
              '<span class="item-name" style="word-break:break-word;line-height:1.25">' + U.esc(i.name) + '</span>' +
              '<span class="item-sub">' +
                '<strong style="color:var(--foliage)">' + i.qty + ' in stock</strong> &middot; ' + U.esc(i.unit) +
              '</span>' +
              '<div class="pack-tags-wrap">' +
                U.tag(brandLabel, i.tagColor) +
                (i.isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
                (staged > 0 ? '<span class="tag tag-green" style="font-size:9.5px">' + staged + ' in van</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div style="flex-shrink:0">' +
            (staged > 0
              ? '<button type="button" class="btn btn-ghost btn-sm" data-act="open-qty-modal-chk" data-id="' + i.id + '" style="width:auto;min-height:34px;padding:2px 10px;font-size:12px">' +
                  U.icon('edit', 'mr4') + 'Edit (' + staged + ')' +
                '</button>'
              : '<button type="button" class="btn btn-primary btn-sm" data-act="open-qty-modal-chk" data-id="' + i.id + '" style="width:auto;min-height:34px;padding:2px 12px;font-size:12px">' +
                  U.icon('plus', 'mr4') + 'Add' +
                '</button>') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function updateChecklistDOM() {
    var container = document.getElementById('chk-list-container');
    if (container) {
      container.innerHTML = renderChecklistRows();
      U.hydrateThumbs(container);
    }
  }

  function openGearChecklist() {
    var ev = S.activeEvent();
    if (!ev) return;

    var cats = S.categories();
    var catChips = '<button type="button" class="chip' + (chkCat ? '' : ' on') + '" data-act="chk-cat" data-id="">All</button>' +
      cats.map(function (c) {
        return '<button type="button" class="chip' + (chkCat === c.id ? ' on' : '') + '" data-act="chk-cat" data-id="' + c.id + '">' +
          U.esc(c.name) + '</button>';
      }).join('');

    var filterTabsHtml =
      '<div class="seg mb8" style="margin-top:0">' +
        '<button type="button" class="' + (chkFilter === 'unadded' ? 'on' : '') + '" data-act="chk-filter" data-filter="unadded">Not yet in van</button>' +
        '<button type="button" class="' + (chkFilter === 'all' ? 'on' : '') + '" data-act="chk-filter" data-filter="all">All gear shelf</button>' +
      '</div>';

    var html =
      filterTabsHtml +
      '<div class="search mb8">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="chk-q" type="search" placeholder="Search gear by name or brand" value="' + U.esc(chkQ) + '">' +
      '</div>' +
      '<div class="chips filter-bar mb8">' + catChips + '</div>' +
      '<div class="list mb12" id="chk-list-container">' +
        renderChecklistRows(ev) +
      '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="done-checklist">Done Adding Items</button>' +
      '</div>';

    var body = U.openSheet('Add Items to Van', html, onAct);
    U.hydrateThumbs(body);

    var qInput = document.getElementById('chk-q');
    if (qInput) {
      qInput.addEventListener('input', function () {
        chkQ = qInput.value;
        updateChecklistDOM();
      });
    }

    return body;
  }

  function openTextManifest(ev) {
    if (!ev) return;
    var rawText = S.generateEventManifestText(ev);

    var html =
      '<p class="muted mb8" style="font-size:12px">' +
        'Plain text catering manifest ready to copy.' +
      '</p>' +
      '<div class="field mb12">' +
        '<textarea class="input" id="manifest-text-box" readonly style="height:220px;font-family:monospace;font-size:11px;line-height:1.4;white-space:pre;background:var(--sand-soft);border-color:var(--line-strong)">' +
          U.esc(rawText) +
        '</textarea>' +
      '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="copy-manifest-clipboard">' +
          U.icon('check', 'mr4') + ' Copy text to clipboard' +
        '</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Close</button>' +
      '</div>';

    U.openSheet('Event Manifest (Text)', html, onAct);
  }

  function openPresetInspector(presetId) {
    var avail = S.checkPresetAvailability(presetId, false);
    if (!avail) return;
    var p = avail.preset;
    var ev = S.activeEvent();

    var linesHtml = avail.lines.map(function (l) {
      return '<div class="pack-row ' + (l.isShort ? 'short' : '') + '">' +
        '<div class="row row-between">' +
          '<div class="grow truncate mr8">' +
            '<span class="item-name truncate">' + U.esc(l.name) + '</span>' +
            '<span class="item-sub truncate">In inventory: ' + l.inInventory + ' &middot; Kit needs: ' + l.targetQty + '</span>' +
            (l.isConsumable ? '<div class="mt2"><span class="tag tag-yellow" style="font-size:9.5px">Supply</span></div>' : '') +
          '</div>' +
          (l.isShort
            ? '<span class="tag tag-red" style="font-size:10px">Short by ' + l.shortBy + '</span>'
            : '<span class="tag tag-green" style="font-size:10px">Available</span>') +
        '</div>' +
      '</div>';
    }).join('');

    var alertNotice = !avail.available ? (
      '<div class="card mb12" style="border-left:3.5px solid var(--alert);padding:10px 12px">' +
        '<p style="font-size:12.5px;color:var(--alert)"><strong>Low Inventory Alert:</strong> ' + avail.shortCount + ' item(s) do not have enough stock in inventory to fulfill this kit.</p>' +
      '</div>'
    ) : (
      '<div class="card mb12" style="background:var(--success-tint);border-color:rgba(36,90,62,0.3)">' +
        '<div class="row">' +
          '<div style="color:var(--success);margin-right:8px">' + U.icon('check') + '</div>' +
          '<span style="font-size:13px;font-weight:600;color:var(--success)">All ' + avail.totalNeeded + ' items ready in inventory</span>' +
        '</div>' +
      '</div>'
    );

    var actionButtonsHtml = '';
    if (ev) {
      actionButtonsHtml =
        '<button type="button" class="btn btn-primary mb8" data-act="confirm-switch-preset" data-id="' + p.id + '">' +
          U.icon('refresh', 'mr4') + ' Switch van load to this kit' +
        '</button>';
    } else {
      actionButtonsHtml =
        '<button type="button" class="btn btn-primary" data-act="apply-preset-start" data-id="' + p.id + '">' +
          U.icon('truck', 'mr4') + ' Start event with this kit' +
        '</button>';
    }

    var html =
      alertNotice +
      '<div class="list mb12">' + linesHtml + '</div>' +
      '<div class="sheet-sticky-footer">' +
        actionButtonsHtml +
        '<button type="button" class="btn btn-ghost mt8" data-act="edit-preset-catering" data-id="' + p.id + '">' +
          U.icon('edit', 'mr4') + ' Edit kit contents' +
        '</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>' +
      '</div>';

    U.openSheet('Kit: ' + p.name, html, onAct);
  }

  function openPresetManagerSheet() {
    var presets = S.presets();
    var html =
      '<div class="row row-between mb12">' +
        '<span class="muted" style="font-size:12px">' + presets.length + ' saved kit presets</span>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="new-preset" style="width:auto;padding:0 12px">' +
          U.icon('plus', 'mr4') + ' Create new kit' +
        '</button>' +
      '</div>' +

      '<div class="list mb12">' +
        (presets.map(function (p) {
          return '<div class="item">' +
            '<span class="thumb">' + U.icon('layers') + '</span>' +
            '<span class="grow truncate mr8">' +
              '<span class="item-name truncate">' + U.esc(p.name) + '</span>' +
              '<span class="item-sub truncate">' + p.lines.length + ' kinds included' + (p.note ? ' &middot; ' + U.esc(p.note) : '') + '</span>' +
            '</span>' +
            '<button type="button" class="btn btn-ghost btn-sm mr8" data-act="edit-preset-catering" data-id="' + p.id + '" style="width:auto;min-height:34px;padding:2px 8px;font-size:12px">' +
              U.icon('edit') +
            '</button>' +
            '<button type="button" class="step-btn" data-act="del-preset-catering" data-id="' + p.id + '" aria-label="Delete kit">' +
              U.icon('close') +
            '</button>' +
          '</div>';
        }).join('') || '<div class="empty"><p class="muted">No presets saved yet.</p></div>') +
      '</div>' +
      '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>';

    U.openSheet('Gear Kit Presets', html, onAct);
  }

  function openPresetEditor(presetId) {
    var p = presetId ? S.preset(presetId) : null;
    editingPreset = p ? S.clone(p) : { id: '', name: '', note: '', lines: [] };
    var allItems = S.items();

    var linesHtml = editingPreset.lines.map(function (l) {
      var it = S.item(l.itemId);
      var brandLabel = it && it.brand ? it.brand : (it ? it.tagLabel : '');

      return '<div class="pack-row" id="p-line-' + l.itemId + '">' +
        '<div class="row row-between">' +
          '<div class="grow truncate mr8">' +
            '<span class="item-name truncate">' + U.esc(it ? it.name : 'Unknown gear') + '</span>' +
            '<div class="pack-tags-wrap">' +
              (brandLabel ? U.tag(brandLabel, it.tagColor) : '') +
              (it && it.isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="p-qty-minus" data-id="' + l.itemId + '">' + U.icon('minus') + '</button>' +
            '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" id="p-in-' + l.itemId + '" data-act="p-qty-input" data-id="' + l.itemId + '" value="' + l.qty + '">' +
            '<button type="button" class="step-btn" data-act="p-qty-plus" data-id="' + l.itemId + '">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="row row-between mt4">' +
          '<span></span>' +
          '<button type="button" class="muted" style="font-size:11.5px;color:var(--alert);background:none;border:none;cursor:pointer" data-act="p-remove-line" data-id="' + l.itemId + '">Remove</button>' +
        '</div>' +
      '</div>';
    }).join('');

    var unaddedItems = allItems.filter(function (it) {
      return !editingPreset.lines.some(function (l) { return l.itemId === it.id; });
    });

    var addItemSelect =
      '<div class="card mb12">' +
        '<label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px">Add Gear to Kit</label>' +
        '<div class="row">' +
          '<div class="grow mr8">' +
            '<select class="input" id="p-add-select" style="font-size:13px">' +
              '<option value="">Select gear from inventory...</option>' +
              unaddedItems.map(function (it) {
                return '<option value="' + it.id + '">' + U.esc(it.name) + (it.brand ? ' (' + U.esc(it.brand) + ')' : '') + (it.isConsumable ? ' [Supply]' : '') + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="p-add-gear" style="width:auto;padding:0 14px">' +
            U.icon('plus', 'mr4') + 'Add' +
          '</button>' +
        '</div>' +
      '</div>';

    var html =
      '<div class="field">' +
        '<label for="p-name">Kit Preset Name *</label>' +
        '<input class="input" id="p-name" value="' + U.esc(editingPreset.name) + '" placeholder="e.g. Standard 100 pax buffet">' +
      '</div>' +
      '<div class="field">' +
        '<label for="p-note">Description / Inventory Notes</label>' +
        '<textarea class="input" id="p-note" placeholder="Kit bundle details">' + U.esc(editingPreset.note) + '</textarea>' +
      '</div>' +

      addItemSelect +

      '<h3 class="section-title" style="margin-top:14px">' +
        U.icon('layers') + ' Included Gear Lines (' + editingPreset.lines.length + ')' +
      '</h3>' +
      '<div class="list mb12" id="p-lines-list">' +
        (linesHtml || '<div class="empty"><p class="muted">No gear added to this kit yet.</p></div>') +
      '</div>' +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="save-preset-editor">' +
          (p ? 'Save kit changes' : 'Create kit preset') +
        '</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="manage-presets">Cancel</button>' +
      '</div>';

    U.openSheet(p ? ('Edit: ' + p.name) : 'New Kit Preset', html, onAct);
  }

  function eventForm(ev, presetId, clampMode) {
    var p = presetId ? S.preset(presetId) : null;
    var defaultName = p ? (p.name + ' - ' + U.fmtDate(U.today())) : ('Booking ' + U.fmtDate(U.today()));

    var html =
      '<div class="field"><label for="e-name">Event Name *</label>' +
        '<input class="input" id="e-name" value="' + U.esc(ev ? ev.name : defaultName) + '" placeholder="e.g. Santos Wedding Buffet"></div>' +
      '<div class="field"><label for="e-venue">Venue Location</label>' +
        '<input class="input" id="e-venue" value="' + U.esc(ev ? ev.venue : '') + '" placeholder="e.g. San Roque Parish Hall"></div>' +
      '<div class="field"><label for="e-date">Date</label>' +
        '<input class="input" id="e-date" type="date" value="' + U.esc(ev ? ev.date : U.today()) + '"></div>' +
      '<div class="field"><label for="e-note">Kitchen & Crew Instructions</label>' +
        '<textarea class="input" id="e-note" placeholder="Pack down after 11pm. Bring extra fuel cans.">' + U.esc(ev ? ev.note : '') + '</textarea></div>' +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="' + (ev ? 'save-event' : 'create-event') + '"' +
          (presetId ? ' data-preset="' + presetId + '"' : '') +
          (clampMode ? ' data-clamp="1"' : '') + '>' +
          (ev ? 'Save event details' : 'Start van load-out') +
        '</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>' +
      '</div>';

    U.openSheet(ev ? 'Edit Event' : 'New Catering Event', html, onAct);
  }

  function openStaffPicker() {
    var ev = S.activeEvent();
    if (!ev) return;
    var allStaff = S.staff();
    var assigned = ev.staffIds || [];

    var rows = allStaff.map(function (m) {
      var isAssigned = assigned.indexOf(m.id) > -1;
      var photoKey = m.photoId ? (m.photoId + '-t') : '';
      return '<button type="button" class="item" data-act="toggle-staff-assign" data-id="' + m.id + '">' +
        '<span class="thumb staff-thumb" data-photo="' + photoKey + '">' +
          (!photoKey ? U.icon('user') : '') +
        '</span>' +
        '<span class="grow truncate mr8">' +
          '<span class="item-name truncate">' + U.esc(m.name) + '</span>' +
          '<span class="item-sub truncate">' + U.esc(m.role || 'Staff') + (m.phone ? ' &middot; ' + U.esc(m.phone) : '') + '</span>' +
        '</span>' +
        '<span style="color:' + (isAssigned ? 'var(--inasal-orange)' : 'var(--line-strong)') + ';font-size:20px">' +
          (isAssigned ? U.icon('check') : U.icon('plus')) +
        '</span>' +
      '</button>';
    }).join('');

    var html =
      '<div class="list mb12">' +
        (rows || '<div class="empty"><p class="muted">No staff in directory yet.</p></div>') +
      '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm mb8" data-act="add-staff-from-event">' +
        U.icon('plus', 'mr4') + ' Add new staff member to directory' +
      '</button>' +
      '<button type="button" class="btn btn-primary" data-act="done-staff-picker">Done</button>';

    var body = U.openSheet('Assign Crew to Event', html, onAct);
    U.hydrateThumbs(body);
  }

  /* Master Event Delegation Handler */
  function onAct(act, el) {
    var ev = S.activeEvent();
    var id = el ? el.getAttribute('data-id') : '';

    if (act === 'thumb-click') { viewItemPhoto(id); return; }
    if (act === 'inspect-item') { openItemDetail(id); return; }

    if (act === 'set-view-mode') {
      viewMode = el.getAttribute('data-mode') || 'cards';
      App.rerenderQuiet();
      return;
    }

    if (act === 'toggle-cat-acc') {
      var accEl = document.getElementById('cat-acc-' + id);
      if (accEl) {
        var willOpen = !accEl.classList.contains('open');
        openAccordions[id] = willOpen;
        accEl.classList.toggle('open', willOpen);
      }
      return;
    }

    if (act === 'expand-cat-limit') {
      catPageLimits[id] = (catPageLimits[id] || 10) + 15;
      App.rerenderQuiet();
      return;
    }

    if (act === 'filter-load-cat') {
      loadCat = id;
      page = 1;
      App.rerenderQuiet();
      return;
    }

    if (act === 'cat-prev-page') {
      if (page > 1) {
        page--;
        App.rerenderQuiet();
        var vPrev = document.getElementById('view');
        if (vPrev) vPrev.scrollTop = 0;
      }
      return;
    }
    if (act === 'cat-next-page') {
      if (page < totalPages) {
        page++;
        App.rerenderQuiet();
        var vNext = document.getElementById('view');
        if (vNext) vNext.scrollTop = 0;
      }
      return;
    }
    if (act === 'cat-change-page-size') {
      var sz = parseInt(el.getAttribute('data-size'), 10);
      if (sz && sz !== pageSize) {
        pageSize = sz;
        page = 1;
        App.rerenderQuiet();
        var vEl = document.getElementById('view');
        if (vEl) vEl.scrollTop = 0;
      }
      return;
    }

    /* Kit Preset Picker & Switching Flow */
    if (act === 'open-kit-picker') {
      openKitPickerSheet(ev, false);
      return;
    }
    if (act === 'open-preset-options') {
      openPresetOptionsSheet(ev);
      return;
    }
    if (act === 'pick-preset-to-switch') {
      openKitPickerSheet(ev, true);
      return;
    }

    if (act === 'select-initial-preset') {
      var pToLoad = S.preset(id);
      if (!pToLoad) return;

      function doInitialLoad() {
        S.applyPresetToEvent(ev, id, 'replace', false);
        U.closeSheet();
        tab = 'load';
        page = 1;
        App.rerenderQuiet();
        U.toast('Kit "' + pToLoad.name + '" loaded into van.');
      }

      if (ev.lines && ev.lines.length > 0) {
        U.confirm('Load Kit Preset?',
          'Loading this kit will replace current staged items with the "' + pToLoad.name + '" kit template.',
          'Load Kit',
          doInitialLoad
        );
      } else {
        doInitialLoad();
      }
      return;
    }

    if (act === 'confirm-switch-preset') {
      var pTarget = S.preset(id);
      if (!pTarget) return;

      U.confirm('Switch to ' + pTarget.name + '?',
        'Switching kits will discard any current van customizations and replace your load with this kit.',
        'Switch Kit',
        function () {
          S.applyPresetToEvent(ev, id, 'replace', false);
          U.closeSheet();
          tab = 'load';
          page = 1;
          App.rerenderQuiet();
          U.toast('Switched van load to "' + pTarget.name + '".');
        }
      );
      return;
    }

    /* Discard Changes & Revert to OG Preset */
    if (act === 'revert-preset-changes') {
      if (!ev.presetId) return;
      var loadedP = S.preset(ev.presetId);
      var kitName = loadedP ? loadedP.name : 'preset';

      U.confirm('Discard changes & revert?',
        'This will discard all customizations and restore the van load to match the original "' + kitName + '" template.',
        'Revert Kit',
        function () {
          S.applyPresetToEvent(ev, ev.presetId, 'replace', false);
          U.closeSheet();
          tab = 'load';
          page = 1;
          App.rerenderQuiet();
          U.toast('Reverted to original "' + kitName + '" kit.');
        }
      );
      return;
    }

    /* Update Existing Preset with Current Van Load */
    if (act === 'update-current-preset') {
      var updatedKit = S.updatePresetFromEvent(ev, id || ev.presetId);
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('Kit preset "' + (updatedKit ? updatedKit.name : 'preset') + '" updated with current load.');
      return;
    }

    /* Save Current Load as Brand New Preset */
    if (act === 'prompt-save-new-preset') {
      promptSaveNewPreset(ev);
      return;
    }
    if (act === 'confirm-save-new-preset') {
      var newPName = ((document.getElementById('new-p-name') || {}).value || '').trim();
      var newPNote = ((document.getElementById('new-p-note') || {}).value || '').trim();
      if (!newPName) { U.toast('Give the new preset a name.'); return; }
      var createdKit = S.savePresetFromEvent(ev, newPName, newPNote);
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('New kit preset "' + createdKit.name + '" saved.');
      return;
    }

    /* Stage 100% of Inventory Actions */
    if (act === 'stage-all-inventory') {
      U.confirm('Stage 100% of Inventory?',
        'This will load every item with available stock in your commissary into this event.',
        'Stage all stock',
        function () {
          var all = S.items();
          all.forEach(function (it) {
            if (it.qty > 0) {
              S.setOut(ev, it.id, it.qty);
            }
          });
          tab = 'load';
          page = 1;
          App.rerenderQuiet();
          U.toast('All commissary stock staged into van (' + ev.lines.length + ' item types).');
        }
      );
      return;
    }
    if (act === 'new-event-all-stock') {
      var nev = S.createEvent({
        name: 'Full Inventory Booking ' + U.fmtDate(U.today()),
        date: U.today()
      });
      var allItems = S.items();
      allItems.forEach(function (it) {
        if (it.qty > 0) {
          S.setOut(nev, it.id, it.qty);
        }
      });
      tab = 'load';
      page = 1;
      App.rerenderQuiet();
      U.toast('Full inventory staged into new booking.');
      return;
    }

    /* Auto-clamp items that exceed inventory stock */
    if (act === 'auto-clamp-stock') {
      ev.lines.forEach(function (l) {
        var it = S.item(l.itemId);
        var owned = it ? (it.qty || 0) : 0;
        if (l.out > owned) {
          l.out = owned;
          if (l.back > l.out) l.back = l.out;
        }
      });
      ev.lines = ev.lines.filter(function (l) { return l.out > 0; });
      S.save();
      App.rerenderQuiet();
      U.toast('Staged quantities capped to inventory stock.');
      return;
    }

    /* Load-out Quantity Modal Actions */
    if (act === 'open-qty-modal') { openQtyModal(id, false); return; }
    if (act === 'open-qty-modal-chk') { openQtyModal(id, true); return; }
    if (act === 'cancel-to-chk') { openGearChecklist(); return; }

    if (act === 'modal-qty-delta') {
      var delta = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var qInput = document.getElementById('modal-qty-input');
      if (qInput) {
        var current = parseInt(qInput.value, 10) || 0;
        qInput.value = Math.max(0, current + delta);
      }
      return;
    }
    if (act === 'modal-qty-set') {
      var setVal = parseInt(el.getAttribute('data-val'), 10) || 0;
      var qInputSet = document.getElementById('modal-qty-input');
      if (qInputSet) qInputSet.value = setVal;
      return;
    }
    if (act === 'modal-qty-save') {
      var saveInput = document.getElementById('modal-qty-input');
      var finalQty = Math.max(0, parseInt(saveInput ? saveInput.value : 0, 10) || 0);
      S.setOut(ev, id, finalQty);

      if (activeQtyModalReturnToChecklist) {
        openGearChecklist();
        U.toast(finalQty > 0 ? 'Item added to van.' : 'Item removed from van.');
      } else {
        U.closeSheet();
        App.rerenderQuiet();
        U.toast(finalQty > 0 ? 'Van count updated.' : 'Item removed from van.');
      }
      return;
    }
    if (act === 'modal-qty-remove') {
      S.setOut(ev, id, 0);
      if (activeQtyModalReturnToChecklist) {
        openGearChecklist();
        U.toast('Item removed from van.');
      } else {
        U.closeSheet();
        App.rerenderQuiet();
        U.toast('Item removed from van.');
      }
      return;
    }

    /* Pack-down Return Modal Handlers */
    if (act === 'open-pack-modal') { openPackReturnModal(id); return; }
    if (act === 'modal-pack-delta') {
      var pDelta = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var pInput = document.getElementById('modal-pack-input');
      if (pInput) {
        var curVal = parseInt(pInput.value, 10) || 0;
        pInput.value = Math.max(0, curVal + pDelta);
      }
      return;
    }
    if (act === 'modal-pack-set') {
      var pSetVal = parseInt(el.getAttribute('data-val'), 10) || 0;
      var pInputDirect = document.getElementById('modal-pack-input');
      if (pInputDirect) pInputDirect.value = pSetVal;
      return;
    }
    if (act === 'modal-pack-save') {
      var pSaveInput = document.getElementById('modal-pack-input');
      var pMax = parseInt(el.getAttribute('data-max'), 10) || 9999;
      var finalReturnQty = Math.min(pMax, Math.max(0, parseInt(pSaveInput ? pSaveInput.value : 0, 10) || 0));
      S.setBack(ev, id, finalReturnQty);
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('Return count updated.');
      return;
    }

    /* Checklist Actions */
    if (act === 'chk-filter') {
      chkFilter = el.getAttribute('data-filter') || 'unadded';
      var allTabs = document.querySelectorAll('.seg button[data-act="chk-filter"]');
      for (var tIdx = 0; tIdx < allTabs.length; tIdx++) {
        allTabs[tIdx].classList.toggle('on', allTabs[tIdx].getAttribute('data-filter') === chkFilter);
      }
      updateChecklistDOM();
      return;
    }
    if (act === 'chk-cat') {
      chkCat = id;
      var allCatBtns = document.querySelectorAll('.chip[data-act="chk-cat"]');
      for (var cIdx = 0; cIdx < allCatBtns.length; cIdx++) {
        allCatBtns[cIdx].classList.toggle('on', (allCatBtns[cIdx].getAttribute('data-id') || '') === chkCat);
      }
      updateChecklistDOM();
      return;
    }
    if (act === 'done-checklist') {
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('Van load-out updated.');
      return;
    }

    if (act === 'goto-packdown') {
      tab = 'back';
      page = 1;
      App.rerenderQuiet();
      return;
    }

    if (act === 'revert-to-staging') {
      U.confirm('Re-stage van load-out',
        'Move this booking back to Staging mode? Use this if departures are delayed or you need to re-verify the full load.',
        'Re-stage van',
        function () {
          S.returnToStaging(ev);
          tab = 'load';
          page = 1;
          App.rerenderQuiet();
          U.toast('Event returned to staging mode.');
        }
      );
      return;
    }

    if (act === 'manage-presets') { openPresetManagerSheet(); return; }
    if (act === 'new-preset') { openPresetEditor(null); return; }
    if (act === 'edit-preset-catering') { openPresetEditor(id); return; }
    if (act === 'inspect-preset') { openPresetInspector(id); return; }

    if (act === 'export-manifest-text') { openTextManifest(ev); return; }
    if (act === 'copy-manifest-clipboard') {
      var box = document.getElementById('manifest-text-box');
      if (box) {
        box.select();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(box.value).then(function () {
              U.toast('Manifest copied to clipboard!');
            });
          } else {
            document.execCommand('copy');
            U.toast('Manifest copied to clipboard!');
          }
        } catch (e) {
          U.toast('Press & hold text to copy.');
        }
      }
      return;
    }

    if (act === 'p-add-gear') {
      var selBox = document.getElementById('p-add-select');
      var addId = selBox ? selBox.value : '';
      if (!addId) { U.toast('Select a piece of gear first.'); return; }
      editingPreset.name = ((document.getElementById('p-name') || {}).value || '').trim();
      editingPreset.note = ((document.getElementById('p-note') || {}).value || '').trim();
      editingPreset.lines.push({ itemId: addId, qty: 1 });
      openPresetEditor(editingPreset.id || null);
      return;
    }
    if (act === 'p-qty-plus' || act === 'p-qty-minus') {
      var deltaP = (act === 'p-qty-plus') ? 1 : -1;
      editingPreset.lines.forEach(function (l) {
        if (l.itemId === id) l.qty = Math.max(1, l.qty + deltaP);
      });
      var inpEl = document.getElementById('p-in-' + id);
      if (inpEl) {
        var foundLine = null;
        editingPreset.lines.forEach(function (l) { if (l.itemId === id) foundLine = l; });
        if (foundLine) inpEl.value = foundLine.qty;
      }
      return;
    }
    if (act === 'p-qty-input') {
      var nVal = parseInt(el.value, 10);
      editingPreset.lines.forEach(function (l) {
        if (l.itemId === id) l.qty = Math.max(1, isNaN(nVal) ? 1 : nVal);
      });
      return;
    }
    if (act === 'p-remove-line') {
      editingPreset.lines = editingPreset.lines.filter(function (l) { return l.itemId !== id; });
      var lineEl = document.getElementById('p-line-' + id);
      if (lineEl && lineEl.parentNode) lineEl.parentNode.removeChild(lineEl);
      return;
    }
    if (act === 'save-preset-editor') {
      var kitName = ((document.getElementById('p-name') || {}).value || '').trim();
      if (!kitName) { U.toast('Give this kit a name.'); return; }
      editingPreset.name = kitName;
      editingPreset.note = ((document.getElementById('p-note') || {}).value || '').trim();
      S.savePreset(editingPreset);
      U.toast('Kit preset saved.');
      openPresetManagerSheet();
      App.rerenderQuiet();
      return;
    }
    if (act === 'del-preset-catering') {
      U.confirm('Delete kit preset', 'Remove this preset bundle from your list?', 'Delete', function () {
        S.removePreset(id);
        openPresetManagerSheet();
        U.toast('Kit preset deleted.');
        App.rerenderQuiet();
      });
      return;
    }

    if (act === 'apply-preset-start') {
      eventForm(null, id, false);
      return;
    }

    if (act === 'new-blank') { eventForm(null, '', false); return; }

    if (act === 'create-event') {
      var nameVal = (document.getElementById('e-name') || {}).value || '';
      var nev = S.createEvent({
        name: nameVal.trim() || 'Event ' + U.fmtDate(U.today()),
        venue: (document.getElementById('e-venue') || {}).value || '',
        date: (document.getElementById('e-date') || {}).value || U.today(),
        note: (document.getElementById('e-note') || {}).value || '',
        presetId: el.getAttribute('data-preset') || '',
        clamp: !!el.getAttribute('data-clamp')
      });
      tab = 'load';
      page = 1;
      U.closeSheet();
      App.rerenderQuiet();
      U.toast(nev.lines.length ? 'Kit loaded into van. Check counts.' : 'Event started.');
      return;
    }

    if (act === 'edit-event') { eventForm(ev, '', false); return; }
    if (act === 'save-event') {
      ev.name = ((document.getElementById('e-name') || {}).value || ev.name).trim();
      ev.venue = (document.getElementById('e-venue') || {}).value || '';
      ev.date = (document.getElementById('e-date') || {}).value || ev.date;
      ev.note = (document.getElementById('e-note') || {}).value || '';
      S.save();
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('Event details saved.');
      return;
    }

    if (act === 'tab') {
      tab = id;
      page = 1;
      App.rerenderQuiet();
      return;
    }

    if (act === 'out-plus' || act === 'out-minus') {
      var outLine = null;
      ev.lines.forEach(function (l) { if (l.itemId === id) outLine = l; });
      if (!outLine) return;
      var nextOut = Math.max(0, outLine.out + (act === 'out-plus' ? 1 : -1));
      S.setOut(ev, id, nextOut);
      App.rerenderQuiet();
      return;
    }
    if (act === 'out-input') {
      var outVal = parseInt(el.value, 10);
      S.setOut(ev, id, isNaN(outVal) ? 0 : outVal);
      App.rerenderQuiet();
      return;
    }
    if (act === 'remove-line') {
      var lineToRemove = null;
      ev.lines.forEach(function (l) { if (l.itemId === id) lineToRemove = l; });
      if (!lineToRemove) return;

      if (lineToRemove.back > 0) {
        U.confirm('Remove item from load-out?',
          'This item has ' + lineToRemove.back + ' returned piece(s) logged. Removing it will discard recorded return counts.',
          'Remove anyway',
          function () {
            S.removeLine(ev, id);
            App.rerenderQuiet();
            U.toast('Item removed from event.');
          }
        );
      } else {
        S.removeLine(ev, id);
        App.rerenderQuiet();
        U.toast('Item removed from event.');
      }
      return;
    }

    if (act === 'back-plus' || act === 'back-minus' || act === 'all-back') {
      var bLine = null;
      ev.lines.forEach(function (l) { if (l.itemId === id) bLine = l; });
      if (!bLine) return;
      var nextBack = (act === 'all-back') ? bLine.out : (bLine.back + (act === 'back-plus' ? 1 : -1));
      S.setBack(ev, id, nextBack);
      App.rerenderQuiet();
      return;
    }
    if (act === 'consumable-all-used') {
      S.setBack(ev, id, 0);
      App.rerenderQuiet();
      return;
    }
    if (act === 'back-input') {
      var backVal = parseInt(el.value, 10);
      S.setBack(ev, id, isNaN(backVal) ? 0 : backVal);
      App.rerenderQuiet();
      return;
    }
    if (act === 'toggle-short') {
      onlyShort = !onlyShort;
      page = 1;
      App.rerenderQuiet();
      return;
    }
    if (act === 'all-back-gear') {
      U.confirm('Mark all reusable gear back', 'Marks all non-consumable equipment as returned (100%). Supplies remain at their current count.', 'Mark gear back', function () {
        ev.lines.forEach(function (l) {
          if (!l.isConsumable) l.back = l.out;
        });
        S.save();
        App.rerenderQuiet();
        U.toast('All reusable gear marked back.');
      });
      return;
    }

    if (act === 'mark-loaded') {
      if (!ev.lines.length) {
        U.toast('Stage gear into the van before locking.');
        return;
      }
      S.markLoaded(ev);
      tab = 'back';
      page = 1;
      App.rerenderQuiet();
      U.toast('Van locked. Ready for the event.');
      return;
    }

    if (act === 'cancel-event') {
      U.confirm('Cancel event', 'Discard the staged van load-out completely?', 'Cancel event', function () {
        S.removeEvent(ev.id);
        page = 1;
        App.rerenderQuiet();
        U.toast('Event cancelled.');
      });
      return;
    }

    if (act === 'open-staff-picker') { openStaffPicker(); return; }
    if (act === 'toggle-staff-assign') {
      var isAssigned = (ev.staffIds || []).indexOf(id) > -1;
      if (isAssigned) S.unassignStaff(ev, id);
      else S.assignStaff(ev, id);
      openStaffPicker();
      App.rerenderQuiet();
      return;
    }
    if (act === 'done-staff-picker') {
      U.closeSheet();
      App.rerenderQuiet();
      return;
    }
    if (act === 'unassign-staff') {
      S.unassignStaff(ev, id);
      App.rerenderQuiet();
      return;
    }
    if (act === 'add-staff-from-event') {
      U.openSheet('Add Staff to Directory',
        '<div class="field"><label for="st-name">Full Name *</label><input class="input" id="st-name" placeholder="e.g. Maria Santos"></div>' +
        '<div class="field"><label for="st-role">Role</label><input class="input" id="st-role" placeholder="e.g. Server / Cook / Driver"></div>' +
        '<div class="field"><label for="st-phone">Phone Number</label><input class="input" id="st-phone" type="tel" placeholder="0412 000 000"></div>' +
        '<button type="button" class="btn btn-primary" data-act="save-staff-from-event">Save to directory</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>', onAct);
      return;
    }
    if (act === 'save-staff-from-event') {
      var sName = ((document.getElementById('st-name') || {}).value || '').trim();
      if (!sName) { U.toast('Enter staff name.'); return; }
      var newStaff = S.saveStaff({
        name: sName,
        role: ((document.getElementById('st-role') || {}).value || '').trim(),
        phone: ((document.getElementById('st-phone') || {}).value || '').trim()
      });
      S.assignStaff(ev, newStaff.id);
      U.closeSheet();
      tab = 'crew';
      App.rerenderQuiet();
      U.toast(sName + ' assigned to crew.');
      return;
    }

    if (act === 'add-foreign') {
      U.openSheet('Flag Foreign Item (Not Ours)',
        '<div class="field"><label for="n-label">Item Description *</label>' +
          '<input class="input" id="n-label" placeholder="e.g. Blue venue tray, borrowed glass bowl"></div>' +
        '<div class="row"><div style="width:90px;margin-right:8px"><div class="field"><label for="n-qty">Quantity</label>' +
          '<input class="input" id="n-qty" type="number" inputmode="numeric" min="1" value="1"></div></div>' +
          '<div class="grow"><div class="field"><label for="n-note">Owner / Location</label>' +
          '<input class="input" id="n-note" placeholder="Venue kitchen / Caterer partner"></div></div></div>' +
        '<button type="button" class="btn btn-primary" data-act="save-foreign">Flag item in van</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>', onAct);
      return;
    }
    if (act === 'save-foreign') {
      var fLabel = ((document.getElementById('n-label') || {}).value || '').trim();
      if (!fLabel) { U.toast('Please describe the item.'); return; }
      S.addNotOurs(ev, fLabel, parseInt((document.getElementById('n-qty') || {}).value, 10) || 1,
        ((document.getElementById('n-note') || {}).value || '').trim());
      U.closeSheet();
      tab = 'foreign';
      App.rerenderQuiet();
      U.toast('Foreign item flagged.');
      return;
    }
    if (act === 'del-foreign') {
      S.removeNotOurs(ev, id);
      App.rerenderQuiet();
      return;
    }

    if (act === 'close-event') {
      var t = S.tally(ev);
      var missingDurable = ev.lines.filter(function (l) { return !l.isConsumable && l.out > l.back; });
      var usedSupplies = ev.lines.filter(function (l) { return l.isConsumable && l.out > l.back; });

      var missingDurableHtml = missingDurable.length ? (
        '<div class="mb12">' +
          '<h3 class="section-title" style="color:var(--alert);margin-bottom:6px">' + U.icon('alert', 'mr4') + ' Missing Equipment (' + missingDurable.length + ')</h3>' +
          '<div class="list mb8">' + missingDurable.map(function (l) {
            return '<div class="item"><span class="grow truncate mr8">' +
              '<span class="item-name truncate">' + U.esc(l.name) + '</span>' +
              '<span class="item-sub" style="color:var(--alert)">' + (l.out - l.back) + ' of ' + l.out + ' ' + U.esc(l.unit) + ' missing</span></span>' +
              U.tag(l.brand || l.tagLabel, l.tagColor) + '</div>';
          }).join('') + '</div>' +
          '<label class="row mb8" style="font-size:13px;align-items:flex-start">' +
            '<input type="checkbox" id="deduct-missing" style="width:18px;height:18px;margin-right:8px;margin-top:2px">' +
            '<span>Write off missing durable gear from inventory</span>' +
          '</label>' +
        '</div>'
      ) : '<div class="card mb12" style="background:var(--success-tint);border-color:rgba(36,90,62,0.3)"><span style="font-size:13px;color:var(--success);font-weight:600">' + U.icon('check', 'mr4') + ' All durable equipment accounted for</span></div>';

      var usedSuppliesHtml = usedSupplies.length ? (
        '<div class="mb12">' +
          '<h3 class="section-title" style="margin-bottom:6px">' + U.icon('sparkles', 'mr4') + ' Supplies Consumed (' + usedSupplies.length + ')</h3>' +
          '<div class="list mb8">' + usedSupplies.map(function (l) {
            return '<div class="item"><span class="grow truncate mr8">' +
              '<span class="item-name truncate">' + U.esc(l.name) + '</span>' +
              '<span class="item-sub">' + (l.out - l.back) + ' of ' + l.out + ' ' + U.esc(l.unit) + ' used on site</span></span>' +
              '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span></div>';
          }).join('') + '</div>' +
          '<label class="row mb8" style="font-size:13px;align-items:flex-start">' +
            '<input type="checkbox" id="deduct-consumed" checked style="width:18px;height:18px;margin-right:8px;margin-top:2px">' +
            '<span>Deduct consumed supplies from inventory</span>' +
          '</label>' +
        '</div>'
      ) : '';

      U.openSheet('Finish ' + ev.name,
        '<div class="card mb12"><div class="row row-between">' +
          '<div><div class="kpi-n" style="color:var(--foliage)">' + t.pct + '%</div><div class="kpi-l">gear recovered</div></div>' +
          '<div style="text-align:center"><div class="kpi-n" style="color:' + (t.missing ? 'var(--alert)' : 'var(--timber-ink)') + '">' + t.missing + '</div><div class="kpi-l">gear missing</div></div>' +
          '<div style="text-align:right"><div class="kpi-n" style="color:var(--timber-soft)">' + t.consumed + '</div><div class="kpi-l">supplies used</div></div>' +
        '</div></div>' +
        missingDurableHtml +
        usedSuppliesHtml +
        '<button type="button" class="btn btn-primary" data-act="confirm-close">Finish and file into event history</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Not yet</button>', onAct);
      return;
    }

    if (act === 'confirm-close') {
      var dCheck = document.getElementById('deduct-missing');
      var cCheck = document.getElementById('deduct-consumed');
      var res = S.closeEvent(ev, !!(dCheck && dCheck.checked), cCheck ? cCheck.checked : true);
      U.closeSheet();
      tab = 'load';
      page = 1;
      App.rerenderQuiet();
      U.toast(res.pct + '% gear recovered. Event closed.');
      return;
    }
  }

  return {
    title: 'Catering mode',
    render: render,
    mounted: mounted,
    onAct: onAct,
    openGearChecklist: openGearChecklist,
    openPresetEditor: openPresetEditor,
    openPresetManagerSheet: openPresetManagerSheet,
    viewItemPhoto: viewItemPhoto,
    openQtyModal: openQtyModal,
    openPackReturnModal: openPackReturnModal,
    openPresetOptionsSheet: openPresetOptionsSheet,
    openKitPickerSheet: openKitPickerSheet
  };
})();