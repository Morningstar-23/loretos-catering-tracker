/* ==========================================================================
   Loreto's Catering Tracker — File 1: Modals (js/views/catering/catering-modals.js)
   - Zero emojis: Clean Lucide/Feather vector SVG iconography
   - 100% Strict ES5 (iOS 12 Mobile Safari / iPhone 5s 320px viewport)
   - Pack-Down Return Triage: Returned Intact vs. Broken Scrap vs. Missing at Venue
   - 1-Tap Reason Chips (No keyboard typing):
       Broken:  [ Shattered / Dropped ], [ Melted / Burnt ], [ Cracked ]
       Missing: [ Left at venue ], [ Venue wash pit ], [ Guest table ]
   - Direct link to Shelf/Inventory: 1-tap jump to item audit & editing
   - Enlarge Photo Lightbox with zoom badge & high-resolution preview
   - Inter-Modal Routing Page Slide Animations (Push & Pop Transitions)
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};
App.Views.Catering = App.Views.Catering || {};

/* Shared Modal Navigation History Stack across all catering pop-ups */
App.Views.Catering.Nav = {
  stack: [],
  push: function (openFn) {
    if (!App.UI.isSheetOpen() || this.stack.length === 0) {
      this.stack = [];
    }
    this.stack.push(openFn);
  },
  back: function () {
    if (this.stack.length > 1) {
      this.stack.pop();
      var prevFn = this.stack[this.stack.length - 1];
      if (prevFn) {
        prevFn(true);
        return true;
      }
    }
    this.clear();
    App.UI.closeSheet();
    return false;
  },
  hasBack: function () {
    return this.stack.length > 1;
  },
  clear: function () {
    this.stack = [];
    if (App.Views.Catering.Modals && App.Views.Catering.Modals.resetFlags) {
      App.Views.Catering.Modals.resetFlags();
    }
  }
};

App.Views.Catering.Modals = (function () {
  var U = App.UI, S = App.Store;
  var Nav = App.Views.Catering.Nav;
  var activeQtyModalReturnToChecklist = false;

  /* Active Packdown Return In-Modal State */
  var activePackState = {
    itemId: '',
    out: 0,
    back: 0,
    broken: 0,
    brokenReason: 'Shattered / Dropped',
    missingReason: 'Left at venue',
    isConsumable: false
  };

  var BROKEN_REASONS = [
    'Shattered / Dropped',
    'Melted / Burnt',
    'Cracked'
  ];

  var MISSING_REASONS = [
    'Left at venue',
    'Venue wash pit',
    'Guest table'
  ];

  function resetFlags() {
    activeQtyModalReturnToChecklist = false;
  }

  function delegate(act, el) {
    if (App.Views.catering && App.Views.catering.onAct) {
      App.Views.catering.onAct(act, el);
    }
  }

  /* High-Res Photo Lightbox Viewer */
  function viewItemPhoto(itemId) {
    var it = S.item(itemId);
    if (!it) return;
    if (!it.photoId) {
      U.toast('No photo attached yet. Add one in Shelf.');
      return;
    }
    var cat = S.category(it.categoryId);
    var metaHtml = U.tag(it.brand || it.tagLabel || 'Loreto', it.tagColor) +
      (it.isConsumable ? ' <span class="tag tag-yellow" style="font-size:9.5px;margin-left:4px">Supply</span>' : '') +
      (cat ? ' <span class="tag tag-white" style="font-size:9.5px;margin-left:4px">' + U.esc(cat.name) + '</span>' : '');

    U.openLightbox(it.photoId, it.name, metaHtml);
  }

  /* Item Details Modal with Direct Shelf Link & Stock Reconciliation */
  function openItemDetail(itemId, isBack) {
    var it = S.item(itemId);
    if (!it) return;

    if (!isBack) {
      Nav.push(function (b) { openItemDetail(itemId, b); });
    }

    var ev = S.activeEvent();
    var line = null;
    if (ev && ev.lines) {
      ev.lines.forEach(function (l) { if (l.itemId === itemId) line = l; });
    }

    var cat = S.category(it.categoryId);
    var photoKey = it.photoId ? it.photoId : '';
    var brandLabel = it.brand || it.tagLabel || 'Loreto';
    var isConsumable = !!it.isConsumable;
    var stockQty = it.qty || 0;
    var lowThreshold = it.lowStockThreshold || 2;
    var isLowStock = stockQty <= lowThreshold;
    var isStaging = !ev || ev.status === 'staging';

    var statsHtml = '';
    var statusBanner = '';
    var actionBtnHtml = '';

    if (isStaging) {
      // 1. VAN STAGING CONTEXT
      var stagedQty = line ? (line.out || 0) : 0;
      var isExceeding = stagedQty > stockQty;

      statsHtml =
        '<div class="kpi-grid mb12">' +
          '<div class="kpi">' +
            '<div class="kpi-in">' +
              '<div class="kpi-n" style="color:' + (isLowStock ? 'var(--alert)' : 'var(--foliage)') + '">' + stockQty + '</div>' +
              '<div class="kpi-l">In Commissary</div>' +
            '</div>' +
          '</div>' +
          '<div class="kpi">' +
            '<div class="kpi-in">' +
              '<div class="kpi-n" style="color:' + (isExceeding ? 'var(--alert)' : 'var(--timber-ink)') + '">' + stagedQty + '</div>' +
              '<div class="kpi-l">Staged in Van</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      if (isExceeding) {
        statusBanner =
          '<div class="card mb12" style="background:#FFFAF8;border:1px solid rgba(214,57,32,0.25);border-left:4px solid var(--alert);padding:9px 10px">' +
            '<div class="row row-between" style="color:var(--alert);font-size:12px;font-weight:700">' +
              '<span>' + U.icon('alertTriangle', 'mr4') + 'Exceeds stock by ' + (stagedQty - stockQty) + ' ' + U.esc(it.unit) + '</span>' +
            '</div>' +
            '<p class="muted mt2 mb8" style="font-size:11px;color:var(--alert)">Staged count is higher than commissary shelf stock.</p>' +
            '<div class="row" style="margin:-2px">' +
              '<button type="button" class="btn btn-primary btn-sm grow m2" data-act="detail-sync-stock" data-id="' + it.id + '" style="min-height:30px;font-size:11px;padding:2px 8px">' +
                U.icon('plus', 'mr4') + 'Update Stock to ' + stagedQty +
              '</button>' +
              '<button type="button" class="btn btn-ghost btn-sm grow m2" data-act="detail-cap-staged" data-id="' + it.id + '" style="min-height:30px;font-size:11px;padding:2px 8px">' +
                'Cap van to ' + stockQty +
              '</button>' +
            '</div>' +
          '</div>';
      } else if (stagedQty > 0) {
        var remainingShelf = stockQty - stagedQty;
        statusBanner =
          '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line);padding:7px 11px">' +
            '<div class="row row-between" style="font-size:11.5px">' +
              '<span class="muted">Remaining on shelf:</span>' +
              '<strong style="color:var(--foliage)">' + remainingShelf + ' ' + U.esc(it.unit) + ' left</strong>' +
            '</div>' +
          '</div>';
      } else {
        statusBanner =
          '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line);padding:7px 11px">' +
            '<div class="row row-between" style="font-size:11.5px">' +
              '<span class="muted">Van load status:</span>' +
              '<span class="muted">Not staged yet</span>' +
            '</div>' +
          '</div>';
      }

      if (ev) {
        actionBtnHtml =
          '<button type="button" class="btn btn-primary mb8" data-act="open-qty-modal-from-detail" data-id="' + it.id + '">' +
            (stagedQty > 0 ? U.icon('edit', 'mr4') + ' Adjust Van Count (' + stagedQty + ')' : U.icon('plus', 'mr4') + ' Add to Van Load') +
          '</button>';
      }

    } else {
      // 2. LIVE ON LOCATION CONTEXT (Shows Intact, Broken, Missing)
      var outQty = line ? (line.out || 0) : 0;
      var backQty = line ? (line.back || 0) : 0;
      var brokenQty = line ? (line.broken || 0) : 0;
      var missingQty = isConsumable ? 0 : Math.max(0, outQty - backQty - brokenQty);
      var usedQty = isConsumable ? Math.max(0, outQty - backQty) : 0;

      statsHtml =
        '<div class="kpi-grid mb8">' +
          '<div class="kpi">' +
            '<div class="kpi-in">' +
              '<div class="kpi-n">' + outQty + '</div>' +
              '<div class="kpi-l">Loaded in Van</div>' +
            '</div>' +
          '</div>' +
          '<div class="kpi">' +
            '<div class="kpi-in">' +
              '<div class="kpi-n" style="color:' + (missingQty > 0 || brokenQty > 0 ? 'var(--alert)' : 'var(--foliage)') + '">' + backQty + '</div>' +
              '<div class="kpi-l">Returned Intact</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card mb12" style="padding:7px 11px;background:var(--sand-soft);border-color:var(--line)">' +
          '<div class="row row-between" style="font-size:12px">' +
            '<span class="muted">Total Commissary Stock:</span>' +
            '<strong style="color:var(--timber-ink)">' + stockQty + ' ' + U.esc(it.unit) + '</strong>' +
          '</div>' +
        '</div>';

      if (brokenQty > 0) {
        statusBanner +=
          '<div class="card mb8" style="background:#FFF9F8;border-left:4px solid var(--alert);padding:8px 10px">' +
            '<div class="row" style="color:var(--alert);font-size:11.5px;font-weight:700">' +
              U.icon('alertTriangle', 'mr4') + brokenQty + ' ' + U.esc(it.unit) + ' broken (' + U.esc(line.brokenReason || 'Damaged') + ')' +
            '</div>' +
          '</div>';
      }

      if (missingQty > 0) {
        statusBanner +=
          '<div class="card mb12" style="background:var(--alert-tint);border-left:4px solid #D49B42;padding:8px 10px">' +
            '<div class="row" style="color:#8A6805;font-size:11.5px;font-weight:700">' +
              U.icon('alertTriangle', 'mr4') + missingQty + ' ' + U.esc(it.unit) + ' missing (' + U.esc(line.missingReason || 'Left at venue') + ')' +
            '</div>' +
          '</div>';
      } else if (isConsumable && usedQty > 0) {
        statusBanner =
          '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line);padding:7px 11px">' +
            '<div class="row row-between" style="font-size:11.5px">' +
              '<span class="muted">Supplies used on site:</span>' +
              '<strong style="color:var(--gold)">' + usedQty + ' ' + U.esc(it.unit) + ' consumed</strong>' +
            '</div>' +
          '</div>';
      } else if (outQty > 0 && backQty >= outQty && brokenQty === 0) {
        statusBanner =
          '<div class="card mb12" style="background:var(--success-tint);border-color:rgba(36,90,62,0.3);padding:7px 11px">' +
            '<div class="row" style="color:var(--success);font-size:12px;font-weight:700">' +
              U.icon('check', 'mr4') + 'All ' + outQty + ' pieces accounted for' +
            '</div>' +
          '</div>';
      }

      if (line) {
        actionBtnHtml =
          '<button type="button" class="btn btn-primary mb8" data-act="open-pack-modal-from-detail" data-id="' + it.id + '">' +
            U.icon('check', 'mr4') + ' Record Returns (' + backQty + '/' + outQty + ')' +
          '</button>';
      }
    }

    var backBtnHtml = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>';

    var html =
      '<div style="text-align:center;margin-bottom:12px">' +
        '<div class="staff-avatar-large" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + it.id + '" style="width:78px;height:78px;border-radius:18px;margin:0 auto 8px auto;border:2px solid var(--line);background-color:var(--sand-soft);cursor:pointer;position:relative">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          (photoKey ? '<div style="position:absolute;bottom:0;right:0;background:rgba(33,29,26,0.85);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3)">' + U.icon('zoom') + '</div>' : '') +
        '</div>' +
        '<h3 style="font-family:Iowan Old Style,Georgia,serif;font-size:17.5px;font-weight:700;color:var(--timber-ink);line-height:1.24;word-break:break-word">' +
          U.esc(it.name) +
        '</h3>' +
        '<div class="row" style="justify-content:center;margin-top:6px;flex-wrap:wrap;margin:-2px">' +
          '<span class="m2">' + U.tag(brandLabel, it.tagColor) + '</span>' +
          (isConsumable ? '<span class="tag tag-yellow m2" style="font-size:9.5px">Supply</span>' : '') +
          (cat ? '<span class="tag tag-white m2" style="font-size:9.5px">' + U.esc(cat.name) + '</span>' : '') +
        '</div>' +
        (photoKey ? '<button type="button" class="btn btn-ghost btn-sm mt8" data-act="thumb-click" data-id="' + it.id + '" style="width:auto;min-height:28px;padding:2px 10px;font-size:11px;margin:8px auto 0 auto">' + U.icon('zoom', 'mr4') + 'Enlarge Photo</button>' : '') +
      '</div>' +
      statsHtml +
      statusBanner +
      '<div class="card mb12">' +
        '<div class="row row-between mb4"><span class="muted">Commissary Stock:</span><strong>' + stockQty + ' ' + U.esc(it.unit) + '</strong></div>' +
        '<div class="row row-between mb4"><span class="muted">Low Stock Threshold:</span><span>' + lowThreshold + ' ' + U.esc(it.unit) + '</span></div>' +
        (it.brand ? '<div class="row row-between mb4"><span class="muted">Brand / Stamp:</span><span>' + U.esc(it.brand) + '</span></div>' : '') +
        (it.note ? '<div class="mt8 pt8" style="border-top:1px solid var(--line)"><span class="muted">Notes:</span><p style="margin-top:2px;font-size:12.5px">' + U.esc(it.note) + '</p></div>' : '') +
      '</div>' +

      /* DIRECT LINK TO INVENTORY SHELF */
      '<button type="button" class="btn btn-ghost mb8" data-act="goto-inventory-item" data-id="' + it.id + '" style="border-color:var(--line-strong);background:var(--sand-soft)">' +
        U.icon('package', 'mr4') + ' View on Shelf (Audit & Edit)' +
      '</button>' +

      '<div class="sheet-sticky-footer">' +
        actionBtnHtml +
        backBtnHtml +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    var body = U.openSheet('Item Details', html, delegate, dir);
    U.hydrateThumbs(body);
  }

  function openQtyModal(itemId, returnToChecklist, isBack) {
    activeQtyModalReturnToChecklist = !!returnToChecklist;
    var ev = S.activeEvent();
    if (!ev) return;
    var it = S.item(itemId);
    if (!it) return;

    if (!isBack) {
      Nav.push(function (b) { openQtyModal(itemId, returnToChecklist, b); });
    }

    var line = null;
    ev.lines.forEach(function (l) { if (l.itemId === itemId) line = l; });
    var stagedQty = line ? line.out : 0;
    var maxStock = it.qty || 0;
    var initialInputVal = stagedQty > 0 ? stagedQty : Math.min(1, maxStock);
    var photoKey = it.photoId ? (it.photoId + '-t') : '';
    var cat = S.category(it.categoryId);
    var isOverStock = stagedQty > maxStock;

    var cancelAction = Nav.hasBack() ? 'modal-back' : (activeQtyModalReturnToChecklist ? 'cancel-to-chk' : 'sheet-close');
    var cancelLabel = (Nav.hasBack() || activeQtyModalReturnToChecklist) ? '&larr; Back' : 'Cancel';

    var shortageNotice = isOverStock ? (
      '<div class="card mb8" style="background:#FFFAF8;border:1px solid rgba(214,57,32,0.25);border-left:3px solid var(--alert);padding:8px 10px;text-align:left">' +
        '<div class="row row-between" style="font-size:11.5px;color:var(--alert);font-weight:700">' +
          '<span>' + U.icon('alertTriangle', 'mr4') + 'Staged ' + (stagedQty - maxStock) + ' over stock</span>' +
          '<button type="button" class="btn btn-primary btn-sm" data-act="modal-sync-stock" data-id="' + it.id + '" data-qty="' + stagedQty + '" style="min-height:26px;font-size:10.5px;padding:0 8px;width:auto">' +
            'Update Stock to ' + stagedQty +
          '</button>' +
        '</div>' +
      '</div>'
    ) : '';

    var html =
      '<div class="quick-qty-modal">' +
        '<div class="row mb12" style="align-items:flex-start">' +
          '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + it.id + '" style="width:48px;height:48px;flex:0 0 48px;margin-right:10px">' +
            (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '</span>' +
          '<div class="grow" style="min-width:0">' +
            '<h3 style="font-size:15px;font-weight:700;color:var(--timber-ink);line-height:1.24;word-break:break-word">' + U.esc(it.name) + '</h3>' +
            '<div class="row mt4" style="flex-wrap:wrap;margin:-2px">' +
              '<span class="m2">' + U.tag(it.brand || it.tagLabel || 'Loreto', it.tagColor) + '</span>' +
              '<span class="muted m2" style="font-size:11px">' + maxStock + ' in commissary</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        shortageNotice +
        '<div class="card mb12" style="text-align:center;padding:14px 10px">' +
          '<label style="font-size:11.5px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:8px">Pieces Staged in Van</label>' +
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
          '<button type="button" class="btn btn-primary mb8" data-act="modal-qty-save" data-id="' + it.id + '">' + (stagedQty > 0 ? 'Update Van Count' : '+ Add to Van') + '</button>' +
          (stagedQty > 0 ? '<button type="button" class="btn btn-danger btn-sm mb8" data-act="modal-qty-remove" data-id="' + it.id + '">Remove from Van</button>' : '') +
          '<button type="button" class="btn btn-ghost" data-act="' + cancelAction + '">' + cancelLabel + '</button>' +
        '</div>' +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    var body = U.openSheet(stagedQty > 0 ? 'Adjust Van Count' : 'Add to Van', html, delegate, dir);
    U.hydrateThumbs(body);
  }

  /* ==========================================================================
     FEATURE 2: BROKEN VS MISSING VS RETURNED PACKDOWN MODAL
     ========================================================================== */
  function openPackReturnModal(itemId, isBack) {
    var ev = S.activeEvent();
    if (!ev) return;
    var line = null;
    ev.lines.forEach(function (l) { if (l.itemId === itemId) line = l; });
    if (!line) return;

    if (!isBack) {
      Nav.push(function (b) { openPackReturnModal(itemId, b); });
    }

    activePackState = {
      itemId: itemId,
      out: line.out || 0,
      back: line.back !== undefined ? line.back : line.out,
      broken: line.broken || 0,
      brokenReason: line.brokenReason || 'Shattered / Dropped',
      missingReason: line.missingReason || 'Left at venue',
      isConsumable: !!line.isConsumable
    };

    renderPackReturnSheet(ev, line);
  }

  function renderPackReturnSheet(ev, line) {
    var it = S.item(line.itemId);
    var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
    var cat = it ? S.category(it.categoryId) : null;
    var isConsumable = activePackState.isConsumable;

    var outQty = activePackState.out;
    var backQty = activePackState.back;
    var brokenQty = isConsumable ? 0 : activePackState.broken;
    var missingQty = isConsumable ? Math.max(0, outQty - backQty) : Math.max(0, outQty - backQty - brokenQty);

    // 1-Tap Broken Reason Chips
    var brokenChipsHtml = '';
    if (!isConsumable && brokenQty > 0) {
      brokenChipsHtml =
        '<div class="mt8">' +
          '<span class="pack-reason-label">Damage Reason (1-Tap):</span>' +
          '<div class="pack-chips-cloud">' +
            BROKEN_REASONS.map(function (rsn) {
              var isSel = (activePackState.brokenReason === rsn);
              return '<button type="button" class="pack-reason-chip chip-broken' + (isSel ? ' on' : '') + '" data-act="pack-pick-broken-reason" data-val="' + U.esc(rsn) + '">' +
                U.esc(rsn) +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    // 1-Tap Missing Reason Chips
    var missingSectionHtml = '';
    if (!isConsumable && missingQty > 0) {
      missingSectionHtml =
        '<div class="pack-step-card missing-box mt8">' +
          '<div class="row row-between mb4">' +
            '<div>' +
              '<div style="font-size:12.5px;font-weight:700;color:#8A6805">' + U.icon('alertTriangle', 'mr4') + missingQty + ' Missing Pieces</div>' +
              '<div class="muted" style="font-size:10.5px">Left behind on site / unaccounted for</div>' +
            '</div>' +
            '<span class="tag tag-yellow" style="font-size:11px;font-weight:700">' + missingQty + ' missing</span>' +
          '</div>' +
          '<span class="pack-reason-label">Where Was It Left? (1-Tap):</span>' +
          '<div class="pack-chips-cloud">' +
            MISSING_REASONS.map(function (mrsn) {
              var isSel = (activePackState.missingReason === mrsn);
              return '<button type="button" class="pack-reason-chip chip-missing' + (isSel ? ' on' : '') + '" data-act="pack-pick-missing-reason" data-val="' + U.esc(mrsn) + '">' +
                U.esc(mrsn) +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    // Triage KPI summary header
    var triageKpiHtml = isConsumable ? (
      '<div class="pack-triage-card mb8">' +
        '<div class="pack-triage-grid">' +
          '<div class="pack-triage-col col-returned"><div class="pack-triage-num" style="color:var(--foliage)">' + backQty + '</div><div class="pack-triage-lbl">Returned</div></div>' +
          '<div class="pack-triage-col col-missing"><div class="pack-triage-num" style="color:#D49B42">' + (outQty - backQty) + '</div><div class="pack-triage-lbl">Consumed</div></div>' +
        '</div>' +
      '</div>'
    ) : (
      '<div class="pack-triage-card mb8">' +
        '<div class="pack-triage-grid">' +
          '<div class="pack-triage-col col-returned"><div class="pack-triage-num" style="color:var(--foliage)">' + backQty + '</div><div class="pack-triage-lbl">Intact</div></div>' +
          '<div class="pack-triage-col col-broken"><div class="pack-triage-num" style="color:var(--alert)">' + brokenQty + '</div><div class="pack-triage-lbl">Broken</div></div>' +
          '<div class="pack-triage-col col-missing"><div class="pack-triage-num" style="color:#D49B42">' + missingQty + '</div><div class="pack-triage-lbl">Missing</div></div>' +
        '</div>' +
      '</div>'
    );

    // Broken Stepper Block
    var brokenBlockHtml = isConsumable ? '' : (
      '<div class="pack-step-card broken-box mb8">' +
        '<div class="row row-between">' +
          '<div style="min-width:0;flex:1 1 auto;margin-right:8px">' +
            '<div style="font-size:12.5px;font-weight:700;color:var(--alert)">' + U.icon('trash', 'mr4') + 'Broken / Scrap</div>' +
            '<div class="muted" style="font-size:10.5px">Damaged gear permanently scrapped</div>' +
          '</div>' +
          '<div class="stepper stepper-red">' +
            '<button type="button" class="step-btn" data-act="pack-broken-minus">' + U.icon('minus') + '</button>' +
            '<span class="step-num" style="display:flex;align-items:center;justify-content:center;font-weight:700">' + brokenQty + '</span>' +
            '<button type="button" class="step-btn" data-act="pack-broken-plus">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
        brokenChipsHtml +
      '</div>'
    );

    var html =
      '<div class="quick-qty-modal">' +
        '<div class="row mb8" style="align-items:flex-start">' +
          '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + line.itemId + '" style="width:46px;height:46px;flex:0 0 46px;margin-right:10px">' +
            (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '</span>' +
          '<div class="grow" style="min-width:0">' +
            '<h3 style="font-size:15px;font-weight:700;color:var(--timber-ink);line-height:1.24;word-break:break-word">' + U.esc(line.name) + '</h3>' +
            '<div class="row mt4" style="flex-wrap:wrap;margin:-2px">' +
              '<span class="m2">' + U.tag(line.brand || line.tagLabel || 'Loreto', line.tagColor) + '</span>' +
              '<span class="muted m2" style="font-size:11px">Staged: ' + outQty + ' ' + U.esc(line.unit) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        triageKpiHtml +

        '<!-- Intact Return Stepper Card -->' +
        '<div class="pack-step-card intact-box mb8">' +
          '<div class="row row-between">' +
            '<div style="min-width:0;flex:1 1 auto;margin-right:8px">' +
              '<div style="font-size:12.5px;font-weight:700;color:var(--foliage)">' + U.icon('check', 'mr4') + 'Returned Intact</div>' +
              '<div class="muted" style="font-size:10.5px">' + (isConsumable ? 'Unused supplies brought back' : 'Good condition, goes back on shelf') + '</div>' +
            '</div>' +
            '<div class="stepper stepper-green">' +
              '<button type="button" class="step-btn" data-act="pack-back-minus">' + U.icon('minus') + '</button>' +
              '<span class="step-num" style="display:flex;align-items:center;justify-content:center;font-weight:700">' + backQty + '</span>' +
              '<button type="button" class="step-btn" data-act="pack-back-plus">' + U.icon('plus') + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="quick-qty-pills mt8" style="margin-bottom:0">' +
            (isConsumable ? '<button type="button" data-act="pack-back-set" data-val="0" style="color:var(--alert);font-weight:700">All used (0)</button>' : '') +
            '<button type="button" data-act="pack-back-delta" data-delta="1">+1</button>' +
            '<button type="button" data-act="pack-back-delta" data-delta="5">+5</button>' +
            '<button type="button" data-act="pack-back-set" data-val="' + outQty + '" style="color:var(--foliage);font-weight:700">All ' + outQty + ' back</button>' +
          '</div>' +
        '</div>' +

        brokenBlockHtml +
        missingSectionHtml +

        '<div class="sheet-sticky-footer">' +
          '<button type="button" class="btn btn-primary mb8" data-act="pack-return-save" data-id="' + line.itemId + '">' +
            U.icon('check', 'mr4') + ' Save Pack-Down Count' +
          '</button>' +
          '<button type="button" class="btn btn-ghost" data-act="' + (Nav.hasBack() ? 'modal-back' : 'sheet-close') + '">' +
            (Nav.hasBack() ? '&larr; Back' : 'Cancel') +
          '</button>' +
        '</div>' +
      '</div>';

    var body = U.openSheet('Returns: ' + line.name, html, delegate, 'forward');
    U.hydrateThumbs(body);
  }

  function openTextManifest(ev, isBack) {
    if (!ev) return;
    if (!isBack) {
      Nav.push(function (b) { openTextManifest(ev, b); });
    }
    var rawText = S.generateEventManifestText(ev);

    var html =
      '<p class="muted mb8" style="font-size:12px">Plain text manifest ready to copy.</p>' +
      '<div class="field mb12">' +
        '<textarea class="input" id="manifest-text-box" readonly style="height:200px;font-family:monospace;font-size:11px;line-height:1.4;white-space:pre;background:var(--sand-soft);border-color:var(--line-strong)">' +
          U.esc(rawText) +
        '</textarea>' +
      '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="copy-manifest-clipboard">' + U.icon('check', 'mr4') + ' Copy text to clipboard</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="' + (Nav.hasBack() ? 'modal-back' : 'sheet-close') + '">' + (Nav.hasBack() ? '&larr; Back' : 'Close') + '</button>' +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    U.openSheet('Event Manifest (Text)', html, delegate, dir);
  }

  function openStaffPicker(isBack, transitionDir) {
    var ev = S.activeEvent();
    if (!ev) return;
    if (!isBack && !transitionDir) {
      Nav.push(function (b) { openStaffPicker(b); });
    }

    var allStaff = S.staff();
    var assigned = ev.staffIds || [];

    var rows = allStaff.map(function (m) {
      var isAssigned = assigned.indexOf(m.id) > -1;
      var photoKey = m.photoId ? (m.photoId + '-t') : '';
      return '<button type="button" class="item" data-act="toggle-staff-assign" data-id="' + m.id + '">' +
        '<span class="thumb staff-thumb" data-photo="' + photoKey + '">' + (!photoKey ? U.icon('user') : '') + '</span>' +
        '<span class="grow mr8" style="min-width:0"><span class="item-name" style="word-break:break-word;line-height:1.2">' + U.esc(m.name) + '</span><span class="item-sub truncate">' + U.esc(m.role || 'Staff') + '</span></span>' +
        '<span style="color:' + (isAssigned ? 'var(--inasal-orange)' : 'var(--line-strong)') + ';font-size:20px">' + (isAssigned ? U.icon('check') : U.icon('plus')) + '</span>' +
      '</button>';
    }).join('');

    var html =
      '<div class="list mb12">' + (rows || '<div class="empty"><p class="muted">No staff in directory yet.</p></div>') + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm mb8" data-act="add-staff-from-event">' + U.icon('plus', 'mr4') + ' Add new staff member</button>' +
      '<button type="button" class="btn btn-primary" data-act="' + (Nav.hasBack() ? 'modal-back' : 'done-staff-picker') + '">' + (Nav.hasBack() ? '&larr; Back' : 'Done') + '</button>';

    var dir = transitionDir || (isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none'));
    var body = U.openSheet('Assign Crew to Event', html, delegate, dir);
    U.hydrateThumbs(body);
  }

  function handleAction(act, el, id, ev) {
    if (act === 'modal-back') {
      Nav.back();
      return true;
    }
    if (act === 'sheet-close') {
      Nav.clear();
      U.closeSheet();
      return true;
    }
    if (act === 'lightbox-close') {
      U.closeLightbox();
      return true;
    }

    if (act === 'thumb-click') { viewItemPhoto(id); return true; }
    if (act === 'inspect-item') { openItemDetail(id); return true; }
    if (act === 'open-qty-modal') { openQtyModal(id, false); return true; }
    if (act === 'open-qty-modal-chk') { openQtyModal(id, true); return true; }
    if (act === 'open-qty-modal-from-detail') { openQtyModal(id, false); return true; }
    if (act === 'open-pack-modal') { openPackReturnModal(id); return true; }
    if (act === 'open-pack-modal-from-detail') { openPackReturnModal(id); return true; }
    if (act === 'export-manifest-text') { openTextManifest(ev); return true; }
    if (act === 'open-staff-picker') { openStaffPicker(); return true; }

    /* Direct 1-Tap Stock Sync & Cap Actions inside Modal */
    if (act === 'detail-sync-stock') {
      var itSync = S.item(id);
      var lineSync = null;
      if (ev && ev.lines) {
        ev.lines.forEach(function (l) { if (l.itemId === id) lineSync = l; });
      }
      if (itSync && lineSync) {
        S.setStock(id, lineSync.out);
        U.toast('Stock updated to ' + lineSync.out + ' in commissary.');
        App.rerenderQuiet();
        openItemDetail(id, true);
      }
      return true;
    }

    if (act === 'detail-cap-staged') {
      var itCap = S.item(id);
      var ownedQty = itCap ? (itCap.qty || 0) : 0;
      S.setOut(ev, id, ownedQty);
      U.toast('Van load capped to ' + ownedQty + '.');
      App.rerenderQuiet();
      openItemDetail(id, true);
      return true;
    }

    if (act === 'modal-sync-stock') {
      var targetQty = parseInt(el.getAttribute('data-qty'), 10) || 0;
      if (targetQty > 0) {
        S.setStock(id, targetQty);
        U.toast('Commissary stock updated to ' + targetQty + '.');
        App.rerenderQuiet();
        openQtyModal(id, activeQtyModalReturnToChecklist, true);
      }
      return true;
    }

    /* 1-Tap Jump to Shelf */
    if (act === 'goto-inventory-item') {
      if (Nav) Nav.clear();
      U.closeSheet();
      App.go('inventory');
      setTimeout(function () {
        if (App.Views.inventory && App.Views.inventory.openStats) {
          App.Views.inventory.openStats(id, true);
        }
      }, 80);
      return true;
    }

    if (act === 'modal-qty-delta') {
      var delta = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var qInput = document.getElementById('modal-qty-input');
      if (qInput) {
        var current = parseInt(qInput.value, 10) || 0;
        qInput.value = Math.max(0, current + delta);
      }
      return true;
    }
    if (act === 'modal-qty-set') {
      var setVal = parseInt(el.getAttribute('data-val'), 10) || 0;
      var qInputSet = document.getElementById('modal-qty-input');
      if (qInputSet) qInputSet.value = setVal;
      return true;
    }
    if (act === 'modal-qty-save') {
      var saveInput = document.getElementById('modal-qty-input');
      var finalQty = Math.max(0, parseInt(saveInput ? saveInput.value : 0, 10) || 0);
      S.setOut(ev, id, finalQty);

      var itObj = S.item(id);
      var ownedNow = itObj ? (itObj.qty || 0) : 0;
      if (finalQty > ownedNow) {
        U.toast('Staged ' + finalQty + ' (' + (finalQty - ownedNow) + ' over commissary stock).');
      } else {
        U.toast(finalQty > 0 ? 'Item updated in van.' : 'Item removed from van.');
      }

      if (Nav.hasBack()) {
        Nav.back();
      } else if (activeQtyModalReturnToChecklist && App.Views.Catering.Kits) {
        App.Views.Catering.Kits.openGearChecklist(true);
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      return true;
    }
    if (act === 'modal-qty-remove') {
      S.setOut(ev, id, 0);
      if (Nav.hasBack()) {
        Nav.back();
      } else if (activeQtyModalReturnToChecklist && App.Views.Catering.Kits) {
        App.Views.Catering.Kits.openGearChecklist(true);
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      U.toast('Item removed from van.');
      return true;
    }
    if (act === 'cancel-to-chk') {
      if (Nav.hasBack()) Nav.back();
      else if (App.Views.Catering.Kits) App.Views.Catering.Kits.openGearChecklist(true);
      return true;
    }

    /* Pack-Down Triage Actions */
    if (act === 'pack-back-plus' || act === 'pack-back-minus') {
      var deltaBack = (act === 'pack-back-plus') ? 1 : -1;
      var maxBack = activePackState.out - activePackState.broken;
      activePackState.back = Math.max(0, Math.min(maxBack, activePackState.back + deltaBack));
      var lineForBack = null;
      ev.lines.forEach(function (l) { if (l.itemId === activePackState.itemId) lineForBack = l; });
      if (lineForBack) renderPackReturnSheet(ev, lineForBack);
      return true;
    }
    if (act === 'pack-back-delta') {
      var dVal = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var maxB = activePackState.out - activePackState.broken;
      activePackState.back = Math.max(0, Math.min(maxB, activePackState.back + dVal));
      var lineForBD = null;
      ev.lines.forEach(function (l) { if (l.itemId === activePackState.itemId) lineForBD = l; });
      if (lineForBD) renderPackReturnSheet(ev, lineForBD);
      return true;
    }
    if (act === 'pack-back-set') {
      var targetBack = parseInt(el.getAttribute('data-val'), 10) || 0;
      var maxBS = activePackState.out - activePackState.broken;
      activePackState.back = Math.max(0, Math.min(maxBS, targetBack));
      var lineForBS = null;
      ev.lines.forEach(function (l) { if (l.itemId === activePackState.itemId) lineForBS = l; });
      if (lineForBS) renderPackReturnSheet(ev, lineForBS);
      return true;
    }

    if (act === 'pack-broken-plus' || act === 'pack-broken-minus') {
      var deltaBrk = (act === 'pack-broken-plus') ? 1 : -1;
      var maxBrk = activePackState.out - activePackState.back;
      activePackState.broken = Math.max(0, Math.min(maxBrk, activePackState.broken + deltaBrk));
      var lineForBrk = null;
      ev.lines.forEach(function (l) { if (l.itemId === activePackState.itemId) lineForBrk = l; });
      if (lineForBrk) renderPackReturnSheet(ev, lineForBrk);
      return true;
    }

    if (act === 'pack-pick-broken-reason') {
      activePackState.brokenReason = el.getAttribute('data-val') || 'Shattered / Dropped';
      var lineForBrsn = null;
      ev.lines.forEach(function (l) { if (l.itemId === activePackState.itemId) lineForBrsn = l; });
      if (lineForBrsn) renderPackReturnSheet(ev, lineForBrsn);
      return true;
    }

    if (act === 'pack-pick-missing-reason') {
      activePackState.missingReason = el.getAttribute('data-val') || 'Left at venue';
      var lineForMrsn = null;
      ev.lines.forEach(function (l) { if (l.itemId === activePackState.itemId) lineForMrsn = l; });
      if (lineForMrsn) renderPackReturnSheet(ev, lineForMrsn);
      return true;
    }

    if (act === 'pack-return-save') {
      var saveItemId = activePackState.itemId;
      var cleanBack = Math.max(0, Math.min(activePackState.out, activePackState.back));
      var maxAllowedBroken = activePackState.out - cleanBack;
      var cleanBroken = activePackState.isConsumable ? 0 : Math.max(0, Math.min(maxAllowedBroken, activePackState.broken));
      var cleanMissing = activePackState.isConsumable ? 0 : Math.max(0, activePackState.out - cleanBack - cleanBroken);

      S.setPackReturn(
        ev,
        saveItemId,
        cleanBack,
        cleanBroken,
        activePackState.brokenReason,
        activePackState.missingReason
      );

      if (cleanBroken > 0 || cleanMissing > 0) {
        var parts = [cleanBack + ' returned'];
        if (cleanBroken > 0) parts.push(cleanBroken + ' broken');
        if (cleanMissing > 0) parts.push(cleanMissing + ' missing');
        U.toast(parts.join(', ') + '.');
      } else {
        U.toast('All ' + cleanBack + ' returned in good shape.');
      }

      if (Nav.hasBack()) {
        Nav.back();
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      return true;
    }

    if (act === 'copy-manifest-clipboard') {
      var box = document.getElementById('manifest-text-box');
      if (box) {
        box.select();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(box.value).then(function () { U.toast('Manifest copied!'); });
          } else {
            document.execCommand('copy');
            U.toast('Manifest copied!');
          }
        } catch (e) {
          U.toast('Hold text to copy.');
        }
      }
      return true;
    }

    if (act === 'toggle-staff-assign') {
      var isAssigned = (ev.staffIds || []).indexOf(id) > -1;
      if (isAssigned) S.unassignStaff(ev, id);
      else S.assignStaff(ev, id);
      openStaffPicker(true, 'none');
      App.rerenderQuiet();
      return true;
    }
    if (act === 'done-staff-picker') {
      Nav.clear();
      U.closeSheet();
      App.rerenderQuiet();
      return true;
    }
    if (act === 'unassign-staff') {
      S.unassignStaff(ev, id);
      App.rerenderQuiet();
      return true;
    }
    if (act === 'add-staff-from-event') {
      U.openSheet('Add Staff Member',
        '<div class="field"><label for="st-name">Full Name *</label><input class="input" id="st-name" placeholder="e.g. Maria Santos"></div>' +
        '<div class="field"><label for="st-role">Role</label><input class="input" id="st-role" placeholder="e.g. Server / Cook"></div>' +
        '<div class="field"><label for="st-phone">Phone Number</label><input class="input" id="st-phone" type="tel" placeholder="0412 000 000"></div>' +
        '<button type="button" class="btn btn-primary" data-act="save-staff-from-event">Save to directory</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="modal-back">&larr; Back</button>',
        delegate, 'forward');
      return true;
    }
    if (act === 'save-staff-from-event') {
      var sName = ((document.getElementById('st-name') || {}).value || '').trim();
      if (!sName) { U.toast('Enter staff name.'); return true; }
      var newStaff = S.saveStaff({
        name: sName,
        role: ((document.getElementById('st-role') || {}).value || '').trim(),
        phone: ((document.getElementById('st-phone') || {}).value || '').trim()
      });
      S.assignStaff(ev, newStaff.id);
      openStaffPicker(true, 'back');
      App.rerenderQuiet();
      U.toast(sName + ' assigned to crew.');
      return true;
    }

    return false;
  }

  return {
    viewItemPhoto: viewItemPhoto,
    openItemDetail: openItemDetail,
    openQtyModal: openQtyModal,
    openPackReturnModal: openPackReturnModal,
    openTextManifest: openTextManifest,
    openStaffPicker: openStaffPicker,
    resetFlags: resetFlags,
    handleAction: handleAction
  };
})();