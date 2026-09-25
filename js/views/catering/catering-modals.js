/* ==========================================================================
   Loreto's Catering Tracker — File 1: Modals (js/views/catering/catering-modals.js)
   - Zero emojis: Clean Lucide/Feather vector SVG iconography
   - 100% Strict ES5 (iOS 12 Mobile Safari / iPhone 5s 320px viewport)
   - 4-Way Smooth Pack-Down Balancing (Auto-borrows from Intact when maxed out)
   - In-place DOM updates: Zero modal reloads, no duplicate sticky footers
   - Manual Remarks & "Other" Reason input with auto-focus
   - Separated Mode Cards & Shortage Resolution across Staging and Packed Van
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
    leftVenue: 0,
    missing: 0,
    brokenReason: 'Shattered / Dropped',
    leftVenueReason: 'Left at venue',
    missingReason: 'Lost / Unaccounted',
    customRemark: '',
    isConsumable: false
  };

  /* Active Foreign / Borrowed Modal State */
  var activeForeignState = {
    id: '',
    type: 'borrowed', // 'borrowed' | 'venue'
    label: '',
    brand: '',
    qty: 1,
    note: '',
    photoId: '',
    itemId: '',
    isCustomPhoto: false,
    searchQuery: ''
  };

  var BROKEN_REASONS = [
    'Shattered / Dropped',
    'Melted / Burnt',
    'Cracked',
    'Other'
  ];

  var LEFT_VENUE_REASONS = [
    'Left at venue',
    'Venue wash pit',
    'Guest table',
    'Coolroom',
    'Other'
  ];

  var MISSING_REASONS = [
    'Lost / Unaccounted',
    'Stolen / Took by guest',
    'Misplaced in transit',
    'Other'
  ];

  function resetFlags() {
    activeQtyModalReturnToChecklist = false;
  }

  function delegate(act, el) {
    if (App.Views.catering && App.Views.catering.onAct) {
      App.Views.catering.onAct(act, el);
    }
  }

  function focusCustomRemark() {
    setTimeout(function () {
      var rInput = document.getElementById('pack-custom-remark');
      if (rInput) {
        rInput.focus();
        try {
          rInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {}
      }
    }, 60);
  }

  /* High-Res Photo Lightbox Viewer for Catalog Items */
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

  /* High-Res Photo Lightbox Viewer for Foreign / Borrowed Items */
  function viewForeignPhoto(foreignId) {
    var ev = S.activeEvent();
    if (!ev || !ev.notOurs) return;
    var target = null;
    ev.notOurs.forEach(function (n) { if (n.id === foreignId) target = n; });
    if (!target) return;
    if (!target.photoId) {
      U.toast('No photo attached.');
      return;
    }
    var metaHtml = (target.itemId ? '<span class="tag tag-yellow" style="font-size:9.5px">Borrowed Extra</span>' : '<span class="tag tag-red" style="font-size:9.5px">Found Venue Piece</span>') +
      (target.brand ? ' ' + U.tag(target.brand, 'orange') : '') +
      ' <span class="tag tag-white" style="font-size:9.5px">' + target.qty + ' ' + (target.qty === 1 ? 'pc' : 'pcs') + '</span>';

    U.openLightbox(target.photoId, target.label, metaHtml);
  }

  /* Item Details Modal with Shortage Reconciliation in both Staging & Packed van */
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

    var outQty = line ? (line.out || 0) : 0;
    var isExceeding = outQty > stockQty;
    var surplusDiff = Math.max(0, outQty - stockQty);

    /* Dedicated Shortage Banner (Shown whenever out exceeds stock, in staging OR packed van) */
    var shortageBanner = '';
    if (isExceeding) {
      shortageBanner =
        '<div class="card mb12" style="background:#FFFAF8;border:1px solid rgba(214,57,32,0.25);border-left:4px solid var(--alert);padding:9px 10px">' +
          '<div class="row row-between" style="color:var(--alert);font-size:12px;font-weight:700">' +
            '<span>' + U.icon('alertTriangle', 'mr4') + 'Exceeds stock by ' + surplusDiff + ' ' + U.esc(it.unit) + '</span>' +
          '</div>' +
          '<p class="muted mt2 mb8" style="font-size:11px;color:var(--alert)">Loaded van count is higher than commissary shelf stock.</p>' +
          '<div class="row" style="flex-wrap:wrap;margin:-2px">' +
            '<button type="button" class="btn btn-primary btn-sm grow m2" data-act="detail-sync-stock" data-id="' + it.id + '" style="min-height:30px;font-size:11px;padding:2px 8px">' +
              U.icon('plus', 'mr4') + 'Update Stock to ' + outQty +
            '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm grow m2" data-act="detail-cap-staged" data-id="' + it.id + '" style="min-height:30px;font-size:11px;padding:2px 8px">' +
              'Cap van to ' + stockQty +
            '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm grow m2" data-act="detail-borrow-staged" data-id="' + it.id + '" style="min-height:30px;font-size:11px;padding:2px 8px;color:var(--inasal-dark);border-color:var(--inasal-orange)">' +
              U.icon('share', 'mr4') + '+' + surplusDiff + ' to Borrowed' +
            '</button>' +
            (surplusDiff >= 2 ?
              '<button type="button" class="btn btn-ghost btn-sm grow m2" data-act="detail-split-staged" data-id="' + it.id + '" style="min-height:30px;font-size:11px;padding:2px 8px;color:var(--inasal-dark)">' +
                'Split (' + surplusDiff + ')...' +
              '</button>' : '') +
          '</div>' +
        '</div>';
    }

    var statsHtml = '';
    var statusBanner = '';
    var actionBtnHtml = '';

    if (isStaging) {
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
              '<div class="kpi-n" style="color:' + (isExceeding ? 'var(--alert)' : 'var(--timber-ink)') + '">' + outQty + '</div>' +
              '<div class="kpi-l">Staged in Van</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      if (!isExceeding && outQty > 0) {
        var remainingShelf = stockQty - outQty;
        statusBanner =
          '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line);padding:7px 11px">' +
            '<div class="row row-between" style="font-size:11.5px">' +
              '<span class="muted">Remaining on shelf:</span>' +
              '<strong style="color:var(--foliage)">' + remainingShelf + ' ' + U.esc(it.unit) + ' left</strong>' +
            '</div>' +
          '</div>';
      } else if (!isExceeding) {
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
            (outQty > 0 ? U.icon('edit', 'mr4') + ' Adjust Van Count (' + outQty + ')' : U.icon('plus', 'mr4') + ' Add to Van Load') +
          '</button>';
      }

    } else {
      var backQty = line ? (line.back || 0) : 0;
      var brokenQty = line ? (line.broken || 0) : 0;
      var leftVenueQty = line ? (line.leftVenue || 0) : 0;
      var missingQty = isConsumable ? 0 : (line && line.missing !== undefined ? line.missing : Math.max(0, outQty - backQty - brokenQty - leftVenueQty));
      var usedQty = isConsumable ? Math.max(0, outQty - backQty) : 0;

      statsHtml =
        '<div class="kpi-grid mb8">' +
          '<div class="kpi">' +
            '<div class="kpi-in">' +
              '<div class="kpi-n" style="color:' + (isExceeding ? 'var(--alert)' : 'var(--timber-ink)') + '">' + outQty + '</div>' +
              '<div class="kpi-l">Loaded in Van</div>' +
            '</div>' +
          '</div>' +
          '<div class="kpi">' +
            '<div class="kpi-in">' +
              '<div class="kpi-n" style="color:' + (missingQty > 0 || brokenQty > 0 || leftVenueQty > 0 ? 'var(--alert)' : 'var(--foliage)') + '">' + backQty + '</div>' +
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
              U.icon('trash', 'mr4') + brokenQty + ' ' + U.esc(it.unit) + ' broken (' + U.esc(line.brokenReason || 'Damaged') + ')' +
            '</div>' +
          '</div>';
      }

      if (leftVenueQty > 0) {
        statusBanner +=
          '<div class="card mb8" style="background:#FFFBF0;border-left:4px solid #D49B42;padding:8px 10px">' +
            '<div class="row" style="color:#8A6805;font-size:11.5px;font-weight:700">' +
              U.icon('warehouse', 'mr4') + leftVenueQty + ' ' + U.esc(it.unit) + ' left at venue (' + U.esc(line.leftVenueReason || 'Venue') + ')' +
            '</div>' +
          '</div>';
      }

      if (missingQty > 0) {
        statusBanner +=
          '<div class="card mb12" style="background:var(--alert-tint);border-left:4px solid var(--alert);padding:8px 10px">' +
            '<div class="row" style="color:var(--alert);font-size:11.5px;font-weight:700">' +
              U.icon('alertTriangle', 'mr4') + missingQty + ' ' + U.esc(it.unit) + ' missing/lost (' + U.esc(line.missingReason || 'Lost') + ')' +
            '</div>' +
          '</div>';
      } else if (isConsumable && usedQty > 0) {
        statusBanner +=
          '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line);padding:7px 11px">' +
            '<div class="row row-between" style="font-size:11.5px">' +
              '<span class="muted">Supplies used on site:</span>' +
              '<strong style="color:var(--gold)">' + usedQty + ' ' + U.esc(it.unit) + ' consumed</strong>' +
            '</div>' +
          '</div>';
      } else if (outQty > 0 && backQty >= outQty && brokenQty === 0) {
        statusBanner +=
          '<div class="card mb12" style="background:var(--success-tint);border-color:rgba(36,90,62,0.3);padding:7px 11px">' +
            '<div class="row" style="color:var(--success);font-size:12px;font-weight:700">' +
              U.icon('check', 'mr4') + 'All ' + outQty + ' pieces accounted for' +
            '</div>' +
          '</div>';
      }

      actionBtnHtml =
        '<button type="button" class="btn btn-ghost mb8" data-act="open-qty-modal-from-detail" data-id="' + it.id + '">' +
          U.icon('edit', 'mr4') + ' Adjust Loaded Count (' + outQty + ')' +
        '</button>' +
        (line ? '<button type="button" class="btn btn-primary mb8" data-act="open-pack-modal-from-detail" data-id="' + it.id + '">' +
          U.icon('check', 'mr4') + ' Record Returns (' + backQty + '/' + outQty + ')' +
        '</button>' : '');
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
      shortageBanner +
      statusBanner +
      '<div class="card mb12">' +
        '<div class="row row-between mb4"><span class="muted">Commissary Stock:</span><strong>' + stockQty + ' ' + U.esc(it.unit) + '</strong></div>' +
        '<div class="row row-between mb4"><span class="muted">Low Stock Threshold:</span><span>' + lowThreshold + ' ' + U.esc(it.unit) + '</span></div>' +
        (it.brand ? '<div class="row row-between mb4"><span class="muted">Brand / Stamp:</span><span>' + U.esc(it.brand) + '</span></div>' : '') +
        (it.note ? '<div class="mt8 pt8" style="border-top:1px solid var(--line)"><span class="muted">Notes:</span><p style="margin-top:2px;font-size:12.5px">' + U.esc(it.note) + '</p></div>' : '') +
      '</div>' +

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
    var surplusQty = Math.max(0, stagedQty - maxStock);

    var cancelAction = Nav.hasBack() ? 'modal-back' : (activeQtyModalReturnToChecklist ? 'cancel-to-chk' : 'sheet-close');
    var cancelLabel = (Nav.hasBack() || activeQtyModalReturnToChecklist) ? '&larr; Back' : 'Cancel';

    var shortageNotice = isOverStock ? (
      '<div class="card mb8" style="background:#FFFAF8;border:1px solid rgba(214,57,32,0.25);border-left:3px solid var(--alert);padding:8px 10px;text-align:left">' +
        '<div class="row row-between mb4" style="font-size:11.5px;color:var(--alert);font-weight:700">' +
          '<span>' + U.icon('alertTriangle', 'mr4') + 'Staged ' + surplusQty + ' over commissary stock</span>' +
        '</div>' +
        '<div class="row" style="flex-wrap:wrap;margin:-2px">' +
          '<button type="button" class="btn btn-primary btn-sm grow m2" data-act="modal-sync-stock" data-id="' + it.id + '" data-qty="' + stagedQty + '" style="min-height:28px;font-size:10.5px;padding:0 8px">' +
            'Update Stock to ' + stagedQty +
          '</button>' +
          '<button type="button" class="btn btn-ghost btn-sm grow m2" data-act="modal-borrow-stock" data-id="' + it.id + '" data-staged="' + stagedQty + '" style="min-height:28px;font-size:10.5px;padding:0 8px;color:var(--inasal-dark)">' +
            '+' + surplusQty + ' to Borrowed' +
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
     PACKDOWN RETURN TRIAGE MODAL BUILDER
     ========================================================================== */
  function buildPackReturnBodyHtml(ev, line) {
    var it = S.item(line.itemId);
    var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
    var cat = it ? S.category(it.categoryId) : null;
    var isConsumable = activePackState.isConsumable;

    var outQty = activePackState.out;
    var backQty = activePackState.back;
    var brokenQty = isConsumable ? 0 : activePackState.broken;
    var leftVenueQty = isConsumable ? 0 : activePackState.leftVenue;
    var missingQty = isConsumable ? 0 : activePackState.missing;
    var totalDiscrepancy = brokenQty + leftVenueQty + missingQty;

    var brokenChipsHtml = '';
    if (!isConsumable && brokenQty > 0) {
      brokenChipsHtml =
        '<div class="mt8">' +
          '<span class="pack-reason-label">Damage Type (1-Tap):</span>' +
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

    var leftVenueChipsHtml = '';
    if (!isConsumable && leftVenueQty > 0) {
      leftVenueChipsHtml =
        '<div class="mt8">' +
          '<span class="pack-reason-label">Where Left Behind? (1-Tap):</span>' +
          '<div class="pack-chips-cloud">' +
            LEFT_VENUE_REASONS.map(function (lvrsn) {
              var isSel = (activePackState.leftVenueReason === lvrsn);
              return '<button type="button" class="pack-reason-chip chip-missing' + (isSel ? ' on' : '') + '" data-act="pack-pick-leftvenue-reason" data-val="' + U.esc(lvrsn) + '">' +
                U.esc(lvrsn) +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    var missingChipsHtml = '';
    if (!isConsumable && missingQty > 0) {
      missingChipsHtml =
        '<div class="mt8">' +
          '<span class="pack-reason-label">Loss Details (1-Tap):</span>' +
          '<div class="pack-chips-cloud">' +
            MISSING_REASONS.map(function (mrsn) {
              var isSel = (activePackState.missingReason === mrsn);
              return '<button type="button" class="pack-reason-chip chip-broken' + (isSel ? ' on' : '') + '" data-act="pack-pick-missing-reason" data-val="' + U.esc(mrsn) + '">' +
                U.esc(mrsn) +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    var triageKpiHtml = isConsumable ? (
      '<div class="pack-triage-card mb8">' +
        '<div class="pack-triage-grid">' +
          '<div class="pack-triage-col col-returned"><div class="pack-triage-num" style="color:var(--foliage)">' + backQty + '</div><div class="pack-triage-lbl">Returned</div></div>' +
          '<div class="pack-triage-col col-missing"><div class="pack-triage-num" style="color:#D49B42">' + (outQty - backQty) + '</div><div class="pack-triage-lbl">Consumed</div></div>' +
        '</div>' +
      '</div>'
    ) : (
      '<div class="pack-triage-card mb8">' +
        '<div class="pack-triage-grid" style="grid-template-columns:repeat(4,1fr)">' +
          '<div class="pack-triage-col col-returned"><div class="pack-triage-num" style="color:var(--foliage)">' + backQty + '</div><div class="pack-triage-lbl">Intact</div></div>' +
          '<div class="pack-triage-col col-broken"><div class="pack-triage-num" style="color:var(--alert)">' + brokenQty + '</div><div class="pack-triage-lbl">Broken</div></div>' +
          '<div class="pack-triage-col col-missing"><div class="pack-triage-num" style="color:#D49B42">' + leftVenueQty + '</div><div class="pack-triage-lbl">At Venue</div></div>' +
          '<div class="pack-triage-col col-broken"><div class="pack-triage-num" style="color:#B03A2E">' + missingQty + '</div><div class="pack-triage-lbl">Lost</div></div>' +
        '</div>' +
      '</div>'
    );

    var brokenBlockHtml = isConsumable ? '' : (
      '<div class="pack-step-card broken-box mb8">' +
        '<div class="row row-between">' +
          '<div style="min-width:0;flex:1 1 auto;margin-right:8px">' +
            '<div style="font-size:12.5px;font-weight:700;color:var(--alert)">' + U.icon('trash', 'mr4') + 'Broken / Scrapped</div>' +
            '<div class="muted" style="font-size:10.5px">Damaged gear permanently scrapped from stock</div>' +
          '</div>' +
          '<div class="stepper stepper-red">' +
            '<button type="button" class="step-btn" data-act="pack-broken-minus"' + (brokenQty <= 0 ? ' disabled' : '') + '>' + U.icon('minus') + '</button>' +
            '<span class="step-num" style="display:flex;align-items:center;justify-content:center;font-weight:700">' + brokenQty + '</span>' +
            '<button type="button" class="step-btn" data-act="pack-broken-plus">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
        brokenChipsHtml +
      '</div>'
    );

    var leftVenueBlockHtml = isConsumable ? '' : (
      '<div class="pack-step-card missing-box mb8">' +
        '<div class="row row-between">' +
          '<div style="min-width:0;flex:1 1 auto;margin-right:8px">' +
            '<div style="font-size:12.5px;font-weight:700;color:#8A6805">' + U.icon('warehouse', 'mr4') + 'Left at Venue</div>' +
            '<div class="muted" style="font-size:10.5px">Left behind on site (can mark found later)</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="pack-leftvenue-minus"' + (leftVenueQty <= 0 ? ' disabled' : '') + '>' + U.icon('minus') + '</button>' +
            '<span class="step-num" style="display:flex;align-items:center;justify-content:center;font-weight:700;color:#8A6805">' + leftVenueQty + '</span>' +
            '<button type="button" class="step-btn" data-act="pack-leftvenue-plus">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
        leftVenueChipsHtml +
      '</div>'
    );

    var missingBlockHtml = isConsumable ? '' : (
      '<div class="pack-step-card mb8" style="border-left:3.5px solid #B03A2E;background:#FFF9F8">' +
        '<div class="row row-between">' +
          '<div style="min-width:0;flex:1 1 auto;margin-right:8px">' +
            '<div style="font-size:12.5px;font-weight:700;color:#B03A2E">' + U.icon('alertTriangle', 'mr4') + 'Missing / Lost / Stolen</div>' +
            '<div class="muted" style="font-size:10.5px">Unaccounted for or stolen</div>' +
          '</div>' +
          '<div class="stepper stepper-red">' +
            '<button type="button" class="step-btn" data-act="pack-missing-minus"' + (missingQty <= 0 ? ' disabled' : '') + '>' + U.icon('minus') + '</button>' +
            '<span class="step-num" style="display:flex;align-items:center;justify-content:center;font-weight:700;color:#B03A2E">' + missingQty + '</span>' +
            '<button type="button" class="step-btn" data-act="pack-missing-plus">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
        missingChipsHtml +
      '</div>'
    );

    var customRemarksHtml = (!isConsumable && totalDiscrepancy > 0) ? (
      '<div class="card mb8" style="background:var(--sand-soft);padding:10px">' +
        '<label for="pack-custom-remark" style="font-size:11px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:4px">' +
          U.icon('edit', 'mr4') + 'Manual Reason / Custom Remarks (Optional)' +
        '</label>' +
        '<input class="input" id="pack-custom-remark" placeholder="e.g. Dropped in grease trap / Given as souvenir / Broken during cleanup" value="' + U.esc(activePackState.customRemark || '') + '" style="font-size:12px;background:#FFFFFF">' +
      '</div>'
    ) : '';

    return '<div class="row mb8" style="align-items:flex-start">' +
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

      '<div class="pack-step-card intact-box mb8">' +
        '<div class="row row-between">' +
          '<div style="min-width:0;flex:1 1 auto;margin-right:8px">' +
            '<div style="font-size:12.5px;font-weight:700;color:var(--foliage)">' + U.icon('check', 'mr4') + 'Returned Intact</div>' +
            '<div class="muted" style="font-size:10.5px">' + (isConsumable ? 'Unused supplies brought back' : 'Good condition, goes back on shelf') + '</div>' +
          '</div>' +
          '<div class="stepper stepper-green">' +
            '<button type="button" class="step-btn" data-act="pack-back-minus"' + (backQty <= 0 ? ' disabled' : '') + '>' + U.icon('minus') + '</button>' +
            '<span class="step-num" style="display:flex;align-items:center;justify-content:center;font-weight:700">' + backQty + '</span>' +
            '<button type="button" class="step-btn" data-act="pack-back-plus"' + (backQty >= outQty ? ' disabled' : '') + '>' + U.icon('plus') + '</button>' +
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
      leftVenueBlockHtml +
      missingBlockHtml +
      customRemarksHtml;
  }

  function openPackReturnModal(itemId, isBack) {
    var ev = S.activeEvent();
    if (!ev) return;
    var line = null;
    ev.lines.forEach(function (l) { if (l.itemId === itemId) line = l; });
    if (!line) return;

    if (!isBack) {
      Nav.push(function (b) { openPackReturnModal(itemId, b); });
    }

    var outQty = line.out || 0;
    var backQty = line.back !== undefined ? line.back : line.out;
    var isConsumable = !!line.isConsumable;

    var brokenQty = isConsumable ? 0 : (line.broken || 0);
    var leftVenueQty = isConsumable ? 0 : (line.leftVenue || 0);
    var missingQty = isConsumable ? 0 : (line.missing !== undefined ? line.missing : Math.max(0, outQty - backQty - brokenQty - leftVenueQty));

    var totalShortfall = Math.max(0, outQty - backQty);
    var currentSum = brokenQty + leftVenueQty + missingQty;
    if (currentSum !== totalShortfall && !isConsumable) {
      missingQty = Math.max(0, totalShortfall - brokenQty - leftVenueQty);
    }

    activePackState = {
      itemId: itemId,
      out: outQty,
      back: backQty,
      broken: brokenQty,
      leftVenue: leftVenueQty,
      missing: missingQty,
      brokenReason: line.brokenReason || 'Shattered / Dropped',
      leftVenueReason: line.leftVenueReason || 'Left at venue',
      missingReason: line.missingReason || 'Lost / Unaccounted',
      customRemark: line.customRemark || '',
      isConsumable: isConsumable
    };

    var contentHtml =
      '<div class="quick-qty-modal">' +
        '<div id="pack-modal-scrollable">' +
          buildPackReturnBodyHtml(ev, line) +
        '</div>' +
        '<div class="sheet-sticky-footer">' +
          '<button type="button" class="btn btn-primary mb8" data-act="pack-return-save" data-id="' + line.itemId + '">' +
            U.icon('check', 'mr4') + ' Save Pack-Down Count' +
          '</button>' +
          '<button type="button" class="btn btn-ghost" data-act="' + (Nav.hasBack() ? 'modal-back' : 'sheet-close') + '">' +
            (Nav.hasBack() ? '&larr; Back' : 'Cancel') +
          '</button>' +
        '</div>' +
      '</div>';

    var body = U.openSheet('Returns: ' + line.name, contentHtml, delegate, 'forward');
    U.hydrateThumbs(body);
  }

  function refreshPackReturnInPlace(ev, line) {
    var currentRemarkInput = document.getElementById('pack-custom-remark');
    if (currentRemarkInput) {
      activePackState.customRemark = currentRemarkInput.value;
    }

    var scrollable = document.getElementById('pack-modal-scrollable');
    if (scrollable) {
      scrollable.innerHTML = buildPackReturnBodyHtml(ev, line);
      U.hydrateThumbs(scrollable);
    } else {
      openPackReturnModal(line.itemId, true);
    }
  }

  /* ==========================================================================
     FLAG / EDIT FOREIGN ITEM MODAL WITH SEPARATED CARDS & SEARCHABLE PICKER
     ========================================================================== */
  function buildForeignModeCardsHtml() {
    var isBorrowed = activeForeignState.type === 'borrowed';

    return '<div class="row mb12" style="margin:-4px">' +
      '<button type="button" class="btn grow m4 foreign-mode-btn ' + (isBorrowed ? 'active' : '') + '" data-act="toggle-foreign-type" data-val="borrowed" style="flex:1 1 0%;text-align:left;padding:10px 12px;border-radius:12px;border:2px solid ' + (isBorrowed ? 'var(--inasal-orange)' : 'var(--line-strong)') + ';background:' + (isBorrowed ? 'var(--inasal-soft)' : '#FFFFFF') + ';cursor:pointer;transition:all 0.16s ease">' +
        '<div class="row row-between" style="align-items:center">' +
          '<span style="font-size:12px;font-weight:700;color:' + (isBorrowed ? 'var(--inasal-dark)' : 'var(--timber-ink)') + '">' +
            U.icon('share', 'mr4') + 'Borrowed Extra' +
          '</span>' +
          (isBorrowed ? '<span style="color:var(--inasal-orange);font-size:14px;font-weight:700">' + U.icon('check') + '</span>' : '') +
        '</div>' +
        '<div class="muted mt2" style="font-size:10.5px;color:' + (isBorrowed ? 'var(--inasal-dark)' : 'var(--timber-soft)') + '">' +
          'Matches Loreto stock' +
        '</div>' +
      '</button>' +

      '<button type="button" class="btn grow m4 foreign-mode-btn ' + (!isBorrowed ? 'active' : '') + '" data-act="toggle-foreign-type" data-val="venue" style="flex:1 1 0%;text-align:left;padding:10px 12px;border-radius:12px;border:2px solid ' + (!isBorrowed ? 'var(--alert)' : 'var(--line-strong)') + ';background:' + (!isBorrowed ? '#FFF5F4' : '#FFFFFF') + ';cursor:pointer;transition:all 0.16s ease">' +
        '<div class="row row-between" style="align-items:center">' +
          '<span style="font-size:12px;font-weight:700;color:' + (!isBorrowed ? 'var(--alert)' : 'var(--timber-ink)') + '">' +
            U.icon('warehouse', 'mr4') + 'Found Venue Piece' +
          '</span>' +
          (!isBorrowed ? '<span style="color:var(--alert);font-size:14px;font-weight:700">' + U.icon('check') + '</span>' : '') +
        '</div>' +
        '<div class="muted mt2" style="font-size:10.5px;color:' + (!isBorrowed ? 'var(--alert)' : 'var(--timber-soft)') + '">' +
          'Belongs to venue/client' +
        '</div>' +
      '</button>' +
    '</div>';
  }

  function buildForeignCatalogSearchResultsHtml() {
    var q = (activeForeignState.searchQuery || '').toLowerCase().trim();
    var allItems = S.items().slice().sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '');
    });

    var filtered = allItems.filter(function (it) {
      if (!q) return true;
      var text = (it.name + ' ' + (it.brand || '') + ' ' + (it.tagLabel || '')).toLowerCase();
      return text.indexOf(q) > -1;
    });

    if (!filtered.length) {
      return '<div class="empty" style="padding:16px 10px"><p class="muted" style="font-size:11.5px">No commissary gear matches "' + U.esc(q) + '".</p></div>';
    }

    return filtered.map(function (it) {
      var photoKey = it.photoId ? (it.photoId + '-t') : '';
      var cat = S.category(it.categoryId);

      return '<button type="button" class="item" data-act="pick-foreign-catalog-item" data-id="' + it.id + '" style="padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;width:100%;background:#FFF;cursor:pointer">' +
        '<span class="pack-thumb mr8" data-photo="' + photoKey + '" style="width:36px;height:36px;flex:0 0 36px;border-radius:8px;background:var(--sand-soft);border:1px solid var(--line)">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
        '</span>' +
        '<div class="grow truncate mr8" style="min-width:0">' +
          '<div style="font-size:12.5px;font-weight:700;color:var(--timber-ink);line-height:1.24" class="truncate">' + U.esc(it.name) + '</div>' +
          '<div class="row mt2" style="font-size:10.5px;color:var(--timber-soft);align-items:center">' +
            (it.brand ? '<span class="tag tag-orange mr4" style="font-size:8.5px;padding:1px 5px">' + U.esc(it.brand) + '</span>' : '') +
            '<span class="muted">' + (it.qty || 0) + ' ' + U.esc(it.unit) + ' in commissary</span>' +
          '</div>' +
        '</div>' +
        '<span style="color:var(--inasal-orange);display:flex;align-items:center;justify-content:center;flex:0 0 auto">' +
          U.icon('plus') +
        '</span>' +
      '</button>';
    }).join('');
  }

  function buildForeignCatalogPickerHtml() {
    if (activeForeignState.type !== 'borrowed') {
      return '';
    }

    if (activeForeignState.itemId) {
      var linkedIt = S.item(activeForeignState.itemId);
      var photoKey = linkedIt && linkedIt.photoId ? (linkedIt.photoId + '-t') : '';
      var cat = linkedIt ? S.category(linkedIt.categoryId) : null;

      return '<div class="card mb12" style="background:#FFFBF8;border:1.5px solid var(--inasal-soft);border-left:4px solid var(--inasal-orange);padding:9px 10px">' +
        '<div class="row row-between" style="align-items:center">' +
          '<div class="row" style="align-items:center;min-width:0;flex:1 1 auto;margin-right:8px">' +
            '<span class="pack-thumb mr8" data-photo="' + photoKey + '" style="width:38px;height:38px;flex:0 0 38px;border-radius:8px;background:var(--sand-soft);border:1px solid var(--line)">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow truncate" style="min-width:0">' +
              '<div style="font-size:12.5px;font-weight:700;color:var(--timber-ink);line-height:1.2" class="truncate">' +
                U.esc(linkedIt ? linkedIt.name : 'Linked Commissary Item') +
              '</div>' +
              '<div class="row mt2" style="font-size:10px;align-items:center">' +
                '<span class="tag tag-yellow mr4" style="font-size:8.5px;padding:1px 5px">Linked to Shelf</span>' +
                (linkedIt && linkedIt.brand ? '<span class="muted">' + U.esc(linkedIt.brand) + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="unlink-foreign-item" style="min-height:28px;width:auto;padding:2px 8px;font-size:11px;color:var(--inasal-dark)">' +
            'Change' +
          '</button>' +
        '</div>' +
      '</div>';
    }

    return '<div class="field mb12">' +
      '<label style="font-size:11px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:4px">' +
        U.icon('search', 'mr4') + 'Search Commissary Gear to Link (Autofills Details)' +
      '</label>' +
      '<div class="search mb6">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="foreign-catalog-search" type="search" placeholder="Search plates, kawa, chafing dishes..." value="' + U.esc(activeForeignState.searchQuery) + '">' +
      '</div>' +
      '<div id="foreign-catalog-results" style="max-height:148px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;background:#FFF;box-shadow:inset 0 1px 3px rgba(0,0,0,0.03)">' +
        buildForeignCatalogSearchResultsHtml() +
      '</div>' +
    '</div>';
  }

  function buildForeignPhotoPreviewHtml() {
    var pId = activeForeignState.photoId;
    if (pId) {
      return '<div class="row mb12" style="align-items:center">' +
        '<div class="pack-thumb" data-photo="' + pId + '-t" data-act="foreign-photo-zoom" style="width:62px;height:62px;border-radius:12px;border:1px solid var(--line);background:var(--sand-soft);cursor:pointer;position:relative;flex:0 0 62px;margin-right:10px">' +
          '<div style="position:absolute;bottom:2px;right:2px;background:rgba(33,29,26,0.8);color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center">' + U.icon('zoom') + '</div>' +
        '</div>' +
        '<div class="grow" style="min-width:0">' +
          '<div style="font-size:11.5px;font-weight:700;color:var(--foliage);margin-bottom:4px">' +
            U.icon('check', 'mr4') + (activeForeignState.isCustomPhoto ? 'Custom photo attached' : 'Using reference photo from shelf') +
          '</div>' +
          '<div class="row" style="margin:-2px">' +
            '<button type="button" class="btn btn-ghost btn-sm m2" data-act="trigger-foreign-file" style="min-height:28px;font-size:11px;padding:2px 8px">' +
              U.icon('camera', 'mr4') + 'Change Pic' +
            '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm m2" data-act="remove-foreign-photo" style="min-height:28px;font-size:11px;padding:2px 8px;color:var(--alert)">' +
              'Remove' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="card mb12" style="background:var(--sand-soft);border:1px dashed var(--line-strong);padding:10px;text-align:center">' +
      '<p class="muted mb8" style="font-size:11.5px">Attach a picture to help crew identify this piece during pack down.</p>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="trigger-foreign-file" style="width:auto;margin:0 auto;background:#FFF">' +
        U.icon('camera', 'mr4') + 'Take / Upload Photo' +
      '</button>' +
    '</div>';
  }

  function refreshForeignPhotoPreview() {
    var wrap = document.getElementById('foreign-photo-preview-wrap');
    if (wrap) {
      wrap.innerHTML = buildForeignPhotoPreviewHtml();
      U.hydrateThumbs(wrap);
    }
  }

  function refreshForeignCatalogPicker() {
    var pickerWrap = document.getElementById('foreign-catalog-picker-wrap');
    if (pickerWrap) {
      pickerWrap.innerHTML = buildForeignCatalogPickerHtml();
      U.hydrateThumbs(pickerWrap);
      attachCatalogSearchListener();
    }
  }

  function attachCatalogSearchListener() {
    var searchInput = document.getElementById('foreign-catalog-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        activeForeignState.searchQuery = searchInput.value;
        var resWrap = document.getElementById('foreign-catalog-results');
        if (resWrap) {
          resWrap.innerHTML = buildForeignCatalogSearchResultsHtml();
          U.hydrateThumbs(resWrap);
        }
      });
    }
  }

  function openAddForeignModal(isBack, foreignId) {
    var ev = S.activeEvent();
    if (!ev) {
      U.toast('No active event open.');
      return;
    }

    if (!isBack) {
      Nav.push(function (b) { openAddForeignModal(b, foreignId); });
    }

    var existing = null;
    if (foreignId && ev.notOurs) {
      ev.notOurs.forEach(function (n) { if (n.id === foreignId) existing = n; });
    }

    var isEdit = !!existing;
    var defaultType = (existing && existing.itemId) ? 'borrowed' : (existing ? 'venue' : 'borrowed');

    activeForeignState = {
      id: existing ? existing.id : '',
      type: defaultType,
      label: existing ? existing.label : '',
      brand: existing ? (existing.brand || '') : '',
      qty: existing ? existing.qty : 1,
      note: existing ? existing.note : '',
      photoId: existing ? (existing.photoId || '') : '',
      itemId: existing ? (existing.itemId || '') : '',
      isCustomPhoto: !!(existing && existing.photoId && (!existing.itemId || (S.item(existing.itemId) && S.item(existing.itemId).photoId !== existing.photoId))),
      searchQuery: ''
    };

    var title = isEdit ? 'Edit Foreign / Borrowed Item' : 'Flag Foreign Item';

    var html =
      '<div class="quick-qty-modal">' +
        '<!-- Two Fully Separated Mode Cards -->' +
        '<div id="foreign-mode-cards-wrap">' +
          buildForeignModeCardsHtml() +
        '</div>' +

        '<div id="foreign-catalog-picker-wrap">' +
          buildForeignCatalogPickerHtml() +
        '</div>' +

        '<div class="field mb12">' +
          '<label for="foreign-label" style="font-size:11.5px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:4px">Item Name / Description *</label>' +
          '<input class="input" id="foreign-label" placeholder="e.g. White porcelain soup bowl" value="' + U.esc(activeForeignState.label) + '" ' + (isEdit ? '' : 'autofocus') + '>' +
        '</div>' +

        '<div class="field mb12">' +
          '<label for="foreign-brand" style="font-size:11.5px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:4px">Brand / Stamp / Identifying Mark</label>' +
          '<input class="input" id="foreign-brand" placeholder="e.g. Royal Bone / Blue tape / Town Hall stamp" value="' + U.esc(activeForeignState.brand) + '">' +
        '</div>' +

        '<div class="field mb12">' +
          '<label for="foreign-qty" style="font-size:11.5px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:4px">Quantity</label>' +
          '<div class="row">' +
            '<div class="stepper">' +
              '<button type="button" class="step-btn" data-act="foreign-qty-delta" data-delta="-1">' + U.icon('minus') + '</button>' +
              '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" id="foreign-qty" value="' + activeForeignState.qty + '">' +
              '<button type="button" class="step-btn" data-act="foreign-qty-delta" data-delta="1">' + U.icon('plus') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="field mb12">' +
          '<label for="foreign-note" style="font-size:11.5px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:4px">Owner / Venue / Lender / Notes</label>' +
          '<input class="input" id="foreign-note" placeholder="e.g. Borrowed from Tita Maria / Return by Monday" value="' + U.esc(activeForeignState.note) + '">' +
        '</div>' +

        '<div class="field mb16">' +
          '<label style="font-size:11.5px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:4px">' +
            U.icon('camera', 'mr4') + 'Photo of Piece (Ours or Borrowed)' +
          '</label>' +
          '<div id="foreign-photo-preview-wrap">' +
            buildForeignPhotoPreviewHtml() +
          '</div>' +
          '<input type="file" id="foreign-photo-input" accept="image/*" capture="environment" style="display:none">' +
        '</div>' +

        '<div class="sheet-sticky-footer">' +
          '<button type="button" class="btn btn-primary mb8" data-act="save-foreign-item">' +
            U.icon('check', 'mr4') + (isEdit ? 'Save Changes' : 'Save Item') +
          '</button>' +
          '<button type="button" class="btn btn-ghost" data-act="' + (Nav.hasBack() ? 'modal-back' : 'sheet-close') + '">' +
            (Nav.hasBack() ? '&larr; Back' : 'Cancel') +
          '</button>' +
        '</div>' +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    var body = U.openSheet(title, html, delegate, dir);
    U.hydrateThumbs(body);
    attachCatalogSearchListener();

    var fileInput = document.getElementById('foreign-photo-input');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (!fileInput.files || !fileInput.files[0]) return;
        var f = fileInput.files[0];
        U.toast('Processing photo...');
        if (App.Image && App.Image.compress) {
          App.Image.compress(f).then(function (res) {
            var pId = S.uid('img-');
            App.DB.set(pId, res.full);
            App.DB.set(pId + '-t', res.thumb);
            activeForeignState.photoId = pId;
            activeForeignState.isCustomPhoto = true;
            refreshForeignPhotoPreview();
            U.toast('Photo attached.');
          }).catch(function () {
            U.toast('Could not process photo.');
          });
        }
      });
    }
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

    /* Foreign Item Actions */
    if (act === 'add-foreign') {
      openAddForeignModal(false, '');
      return true;
    }
    if (act === 'edit-foreign') {
      openAddForeignModal(false, id);
      return true;
    }
    if (act === 'view-foreign-photo') {
      viewForeignPhoto(id);
      return true;
    }
    if (act === 'toggle-foreign-type') {
      var nextType = el.getAttribute('data-val') || 'borrowed';
      activeForeignState.type = nextType;

      var lblIn = document.getElementById('foreign-label');
      if (lblIn) activeForeignState.label = lblIn.value;
      var brandIn = document.getElementById('foreign-brand');
      if (brandIn) activeForeignState.brand = brandIn.value;
      var qtyIn = document.getElementById('foreign-qty');
      if (qtyIn) activeForeignState.qty = parseInt(qtyIn.value, 10) || 1;
      var noteIn = document.getElementById('foreign-note');
      if (noteIn) activeForeignState.note = noteIn.value;

      if (nextType === 'venue') {
        activeForeignState.itemId = '';
      }

      var cardsWrap = document.getElementById('foreign-mode-cards-wrap');
      if (cardsWrap) {
        cardsWrap.innerHTML = buildForeignModeCardsHtml();
      }
      refreshForeignCatalogPicker();
      return true;
    }
    if (act === 'pick-foreign-catalog-item') {
      var matchedIt = S.item(id);
      if (matchedIt) {
        activeForeignState.itemId = matchedIt.id;
        activeForeignState.label = matchedIt.name;
        activeForeignState.brand = matchedIt.brand || matchedIt.tagLabel || '';

        var lblIn2 = document.getElementById('foreign-label');
        if (lblIn2) lblIn2.value = matchedIt.name;
        var brandIn2 = document.getElementById('foreign-brand');
        if (brandIn2) brandIn2.value = activeForeignState.brand;

        if (!activeForeignState.isCustomPhoto && matchedIt.photoId) {
          activeForeignState.photoId = matchedIt.photoId;
          refreshForeignPhotoPreview();
        }
        refreshForeignCatalogPicker();
        U.toast('Linked to ' + matchedIt.name + '.');
      }
      return true;
    }
    if (act === 'unlink-foreign-item') {
      activeForeignState.itemId = '';
      if (!activeForeignState.isCustomPhoto) {
        activeForeignState.photoId = '';
        refreshForeignPhotoPreview();
      }
      refreshForeignCatalogPicker();
      return true;
    }
    if (act === 'trigger-foreign-file') {
      var fInputTrigger = document.getElementById('foreign-photo-input');
      if (fInputTrigger) fInputTrigger.click();
      return true;
    }
    if (act === 'remove-foreign-photo') {
      activeForeignState.photoId = '';
      activeForeignState.isCustomPhoto = false;
      refreshForeignPhotoPreview();
      U.toast('Photo removed.');
      return true;
    }
    if (act === 'foreign-photo-zoom') {
      if (activeForeignState.photoId) {
        var fZoomName = ((document.getElementById('foreign-label') || {}).value || 'Foreign Item').trim();
        U.openLightbox(activeForeignState.photoId, fZoomName, '<span class="tag tag-yellow">Not Ours / Borrowed</span>');
      }
      return true;
    }
    if (act === 'foreign-qty-delta') {
      var fDelta = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var fInput = document.getElementById('foreign-qty');
      if (fInput) {
        var currentFVal = parseInt(fInput.value, 10) || 1;
        fInput.value = Math.max(1, currentFVal + fDelta);
      }
      return true;
    }
    if (act === 'save-foreign-item') {
      var fLabel = ((document.getElementById('foreign-label') || {}).value || '').trim();
      var fQty = parseInt(((document.getElementById('foreign-qty') || {}).value || '1'), 10) || 1;
      var fNote = ((document.getElementById('foreign-note') || {}).value || '').trim();
      var fBrand = ((document.getElementById('foreign-brand') || {}).value || '').trim();
      var fLinkedItem = activeForeignState.type === 'borrowed' ? activeForeignState.itemId : '';

      if (!fLabel) {
        U.toast('Enter item description.');
        return true;
      }

      if (activeForeignState.id) {
        S.updateNotOurs(ev, activeForeignState.id, {
          label: fLabel,
          qty: fQty,
          note: fNote,
          brand: fBrand,
          photoId: activeForeignState.photoId,
          itemId: fLinkedItem
        });
        U.toast('Updated "' + fLabel + '".');
      } else {
        S.addNotOurs(ev, fLabel, fQty, fNote, activeForeignState.photoId, fLinkedItem, fBrand);
        U.toast('Flagged ' + fQty + ' "' + fLabel + '".');
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
    if (act === 'del-foreign') {
      S.removeNotOurs(ev, id);
      App.rerenderQuiet();
      U.toast('Flagged item removed.');
      return true;
    }

    /* Direct 1-Tap Stock Sync, Cap & Borrow Actions inside Item Detail Modal */
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

    if (act === 'detail-borrow-staged') {
      var itBorrow = S.item(id);
      var lineBorrow = null;
      if (ev && ev.lines) {
        ev.lines.forEach(function (l) { if (l.itemId === id) lineBorrow = l; });
      }
      var ownedB = itBorrow ? (itBorrow.qty || 0) : 0;
      if (lineBorrow && lineBorrow.out > ownedB) {
        var surplusB = lineBorrow.out - ownedB;
        lineBorrow.out = ownedB;
        S.addNotOurs(ev, lineBorrow.name, surplusB, 'Borrowed extra for ' + (ev.name || 'event'), itBorrow.photoId, itBorrow.id, itBorrow.brand);
        ev.lines = ev.lines.filter(function (l) { return l.out > 0; });
        S.save();
        U.toast(surplusB + ' pieces moved to Foreign/Borrowed.');
        App.rerenderQuiet();
        if (ownedB > 0) {
          openItemDetail(id, true);
        } else {
          Nav.clear();
          U.closeSheet();
        }
      }
      return true;
    }

    if (act === 'detail-split-staged') {
      if (App.Views.catering && App.Views.catering.openSplitDeficitModal) {
        App.Views.catering.openSplitDeficitModal(ev, id, false);
      }
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

    if (act === 'modal-borrow-stock') {
      var itMb = S.item(id);
      var lineMb = null;
      if (ev && ev.lines) {
        ev.lines.forEach(function (l) { if (l.itemId === id) lineMb = l; });
      }
      var ownedMb = itMb ? (itMb.qty || 0) : 0;
      var stagedMb = parseInt(el.getAttribute('data-staged'), 10) || (lineMb ? lineMb.out : 0);
      if (stagedMb > ownedMb) {
        var surplusMb = stagedMb - ownedMb;
        S.setOut(ev, id, ownedMb);
        S.addNotOurs(ev, itMb.name, surplusMb, 'Borrowed extra for ' + (ev.name || 'event'), itMb.photoId, itMb.id, itMb.brand);
        U.toast(surplusMb + ' pieces moved to Foreign/Borrowed.');
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

    /* Pack-Down Triage Balancing Steppers */
    var activeLine = null;
    if (ev && ev.lines) {
      ev.lines.forEach(function (l) { if (l.itemId === activePackState.itemId) activeLine = l; });
    }

    if (act === 'pack-back-plus') {
      if (activePackState.back < activePackState.out) {
        activePackState.back++;
        if (activePackState.missing > 0) activePackState.missing--;
        else if (activePackState.leftVenue > 0) activePackState.leftVenue--;
        else if (activePackState.broken > 0) activePackState.broken--;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }
    if (act === 'pack-back-minus') {
      if (activePackState.back > 0) {
        activePackState.back--;
        activePackState.missing++;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }
    if (act === 'pack-back-delta') {
      var dVal = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var newBack = Math.max(0, Math.min(activePackState.out, activePackState.back + dVal));
      var diffB = newBack - activePackState.back;
      activePackState.back = newBack;
      if (diffB > 0) {
        for (var i = 0; i < diffB; i++) {
          if (activePackState.missing > 0) activePackState.missing--;
          else if (activePackState.leftVenue > 0) activePackState.leftVenue--;
          else if (activePackState.broken > 0) activePackState.broken--;
        }
      } else if (diffB < 0) {
        activePackState.missing += Math.abs(diffB);
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }
    if (act === 'pack-back-set') {
      var targetBack = parseInt(el.getAttribute('data-val'), 10) || 0;
      activePackState.back = Math.max(0, Math.min(activePackState.out, targetBack));
      var targetShort = activePackState.out - activePackState.back;
      if (targetShort === 0) {
        activePackState.broken = 0;
        activePackState.leftVenue = 0;
        activePackState.missing = 0;
      } else {
        activePackState.missing = targetShort;
        activePackState.broken = 0;
        activePackState.leftVenue = 0;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }

    if (act === 'pack-broken-plus') {
      var totalOtherB = activePackState.broken + activePackState.leftVenue + activePackState.missing;
      if (totalOtherB < activePackState.out) {
        if (activePackState.missing > 0) activePackState.missing--;
        else if (activePackState.leftVenue > 0) activePackState.leftVenue--;
        else if (activePackState.back > 0) activePackState.back--;
        activePackState.broken++;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }
    if (act === 'pack-broken-minus') {
      if (activePackState.broken > 0) {
        activePackState.broken--;
        activePackState.back++;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }

    if (act === 'pack-leftvenue-plus') {
      var totalOtherLV = activePackState.broken + activePackState.leftVenue + activePackState.missing;
      if (totalOtherLV < activePackState.out) {
        if (activePackState.missing > 0) activePackState.missing--;
        else if (activePackState.back > 0) activePackState.back--;
        else if (activePackState.broken > 0) activePackState.broken--;
        activePackState.leftVenue++;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }
    if (act === 'pack-leftvenue-minus') {
      if (activePackState.leftVenue > 0) {
        activePackState.leftVenue--;
        activePackState.back++;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }

    if (act === 'pack-missing-plus') {
      var totalOtherM = activePackState.broken + activePackState.leftVenue + activePackState.missing;
      if (totalOtherM < activePackState.out) {
        if (activePackState.back > 0) activePackState.back--;
        else if (activePackState.leftVenue > 0) activePackState.leftVenue--;
        else if (activePackState.broken > 0) activePackState.broken--;
        activePackState.missing++;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }
    if (act === 'pack-missing-minus') {
      if (activePackState.missing > 0) {
        activePackState.missing--;
        activePackState.back++;
      }
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      return true;
    }

    if (act === 'pack-pick-broken-reason') {
      var valB = el.getAttribute('data-val') || 'Shattered / Dropped';
      activePackState.brokenReason = valB;
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      if (valB === 'Other') focusCustomRemark();
      return true;
    }

    if (act === 'pack-pick-leftvenue-reason') {
      var valLV = el.getAttribute('data-val') || 'Left at venue';
      activePackState.leftVenueReason = valLV;
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      if (valLV === 'Other') focusCustomRemark();
      return true;
    }

    if (act === 'pack-pick-missing-reason') {
      var valM = el.getAttribute('data-val') || 'Lost / Unaccounted';
      activePackState.missingReason = valM;
      if (activeLine) refreshPackReturnInPlace(ev, activeLine);
      if (valM === 'Other') focusCustomRemark();
      return true;
    }

    if (act === 'pack-return-save') {
      var saveItemId = activePackState.itemId;
      var cleanBack = Math.max(0, Math.min(activePackState.out, activePackState.back));
      var shortfallSave = Math.max(0, activePackState.out - cleanBack);

      var cleanBroken = activePackState.isConsumable ? 0 : Math.max(0, Math.min(shortfallSave, activePackState.broken));
      var remB = shortfallSave - cleanBroken;
      var cleanLeftVenue = activePackState.isConsumable ? 0 : Math.max(0, Math.min(remB, activePackState.leftVenue));
      var cleanMissing = activePackState.isConsumable ? 0 : Math.max(0, remB - cleanLeftVenue);

      var remarkInput = document.getElementById('pack-custom-remark');
      var customRemarkVal = (remarkInput ? remarkInput.value : (activePackState.customRemark || '')).trim();

      S.setPackReturn(
        ev,
        saveItemId,
        cleanBack,
        cleanBroken,
        cleanMissing,
        cleanLeftVenue,
        activePackState.brokenReason,
        activePackState.missingReason,
        activePackState.leftVenueReason,
        customRemarkVal
      );

      if (cleanBroken > 0 || cleanLeftVenue > 0 || cleanMissing > 0) {
        var parts = [cleanBack + ' intact'];
        if (cleanBroken > 0) parts.push(cleanBroken + ' broken');
        if (cleanLeftVenue > 0) parts.push(cleanLeftVenue + ' at venue');
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
    viewForeignPhoto: viewForeignPhoto,
    openItemDetail: openItemDetail,
    openQtyModal: openQtyModal,
    openPackReturnModal: openPackReturnModal,
    openAddForeignModal: openAddForeignModal,
    openTextManifest: openTextManifest,
    openStaffPicker: openStaffPicker,
    resetFlags: resetFlags,
    handleAction: handleAction
  };
})();