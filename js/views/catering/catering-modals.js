/* ==========================================================================
   Loreto's Catering Tracker — File 1: Modals (js/views/catering/catering-modals.js)
   - Inter-Modal Routing Page Slide Animations (Push & Pop Transitions)
   - Self-healing Modal Navigation History Stack (Prevents stuck Back buttons)
   - Item details, photo lightbox, quick qty steppers, returns counter,
     staff directory picker, and plain text manifest
   - Multi-line word-wrap & optimized for iPhone 5s (iOS 12 / 320px viewport)
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};
App.Views.Catering = App.Views.Catering || {};

/* Shared Modal Navigation History Stack across all catering pop-ups */
App.Views.Catering.Nav = {
  stack: [],
  push: function (openFn) {
    // If the sheet is currently closed, this is a fresh root modal session
    if (!App.UI.isSheetOpen() || this.stack.length === 0) {
      this.stack = [];
    }
    this.stack.push(openFn);
  },
  back: function () {
    if (this.stack.length > 1) {
      this.stack.pop(); // Remove current modal
      var prevFn = this.stack[this.stack.length - 1];
      if (prevFn) {
        prevFn(true); // Reopen previous modal with isBack = true (slides back)
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

  function resetFlags() {
    activeQtyModalReturnToChecklist = false;
  }

  function delegate(act, el) {
    if (App.Views.catering && App.Views.catering.onAct) {
      App.Views.catering.onAct(act, el);
    }
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

    var statsHtml = line ? (
      '<div class="kpi-grid mb12">' +
        '<div class="kpi"><div class="kpi-in"><div class="kpi-n">' + line.out + '</div><div class="kpi-l">Staged in Van</div></div></div>' +
        '<div class="kpi"><div class="kpi-in"><div class="kpi-n" style="color:var(--foliage)">' + line.back + '</div><div class="kpi-l">Back in Hand</div></div></div>' +
      '</div>'
    ) : '';

    var backBtnHtml = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost mt8" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-primary" data-act="sheet-close">Done</button>';

    var html =
      '<div style="text-align:center;margin-bottom:12px">' +
        '<div class="staff-avatar-large" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + it.id + '" style="width:84px;height:84px;border-radius:18px;margin:0 auto 8px auto;border:2px solid var(--line);background-color:var(--sand-soft);cursor:pointer;position:relative">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
        '</div>' +
        '<h3 style="font-family:Iowan Old Style,Georgia,serif;font-size:18px;font-weight:700;color:var(--timber-ink);line-height:1.24;word-break:break-word">' +
          U.esc(it.name) +
        '</h3>' +
        '<div class="row" style="justify-content:center;margin-top:6px;flex-wrap:wrap;gap:4px">' +
          U.tag(brandLabel, it.tagColor) +
          (it.isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
          (cat ? '<span class="tag tag-white" style="font-size:9.5px">' + U.esc(cat.name) + '</span>' : '') +
        '</div>' +
      '</div>' +
      statsHtml +
      '<div class="card mb12">' +
        '<div class="row row-between mb4"><span class="muted">Total Owned:</span><strong>' + it.qty + ' ' + U.esc(it.unit) + '</strong></div>' +
        '<div class="row row-between mb4"><span class="muted">Low Stock Threshold:</span><span>' + (it.lowStockThreshold || 2) + ' ' + U.esc(it.unit) + '</span></div>' +
        (it.brand ? '<div class="row row-between mb4"><span class="muted">Brand / Stamp:</span><span>' + U.esc(it.brand) + '</span></div>' : '') +
        (it.note ? '<div class="mt8 pt8" style="border-top:1px solid var(--line)"><span class="muted">Notes:</span><p style="margin-top:2px;font-size:12.5px">' + U.esc(it.note) + '</p></div>' : '') +
      '</div>' +
      '<div class="sheet-sticky-footer">' + backBtnHtml + '</div>';

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

    var cancelAction = Nav.hasBack() ? 'modal-back' : (activeQtyModalReturnToChecklist ? 'cancel-to-chk' : 'sheet-close');
    var cancelLabel = (Nav.hasBack() || activeQtyModalReturnToChecklist) ? '&larr; Back' : 'Cancel';

    var html =
      '<div class="quick-qty-modal">' +
        '<div class="row mb12" style="align-items:flex-start">' +
          '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + it.id + '" style="width:48px;height:48px;flex:0 0 48px;margin-right:10px">' +
            (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '</span>' +
          '<div class="grow" style="min-width:0">' +
            '<h3 style="font-size:15px;font-weight:700;color:var(--timber-ink);line-height:1.24;word-break:break-word">' + U.esc(it.name) + '</h3>' +
            '<div class="row mt4" style="flex-wrap:wrap;gap:4px">' +
              U.tag(it.brand || it.tagLabel || 'Loreto', it.tagColor) +
              '<span class="muted" style="font-size:11px">' + maxStock + ' in inventory</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
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

  function openPackReturnModal(itemId, isBack) {
    var ev = S.activeEvent();
    if (!ev) return;
    var line = null;
    ev.lines.forEach(function (l) { if (l.itemId === itemId) line = l; });
    if (!line) return;

    if (!isBack) {
      Nav.push(function (b) { openPackReturnModal(itemId, b); });
    }

    var it = S.item(itemId);
    var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
    var cat = it ? S.category(it.categoryId) : null;
    var isConsumable = !!line.isConsumable;

    var html =
      '<div class="quick-qty-modal">' +
        '<div class="row mb12" style="align-items:flex-start">' +
          '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + line.itemId + '" style="width:48px;height:48px;flex:0 0 48px;margin-right:10px">' +
            (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
          '</span>' +
          '<div class="grow" style="min-width:0">' +
            '<h3 style="font-size:15px;font-weight:700;color:var(--timber-ink);line-height:1.24;word-break:break-word">' + U.esc(line.name) + '</h3>' +
            '<div class="row mt4" style="flex-wrap:wrap;gap:4px">' +
              U.tag(line.brand || line.tagLabel || 'Loreto', line.tagColor) +
              '<span class="muted" style="font-size:11px">' + line.out + ' in van</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card mb12" style="text-align:center;padding:14px 10px">' +
          '<label style="font-size:11.5px;font-weight:700;color:var(--timber-soft);text-transform:uppercase;display:block;margin-bottom:8px">Pieces Returned</label>' +
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
          '<button type="button" class="btn btn-primary mb8" data-act="modal-pack-save" data-id="' + line.itemId + '" data-max="' + line.out + '">Save Return Count</button>' +
          '<button type="button" class="btn btn-ghost" data-act="' + (Nav.hasBack() ? 'modal-back' : 'sheet-close') + '">' + (Nav.hasBack() ? '&larr; Back' : 'Cancel') + '</button>' +
        '</div>' +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    var body = U.openSheet('Returns: ' + line.name, html, delegate, dir);
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

    if (act === 'thumb-click') { viewItemPhoto(id); return true; }
    if (act === 'inspect-item') { openItemDetail(id); return true; }
    if (act === 'open-qty-modal') { openQtyModal(id, false); return true; }
    if (act === 'open-qty-modal-chk') { openQtyModal(id, true); return true; }
    if (act === 'open-pack-modal') { openPackReturnModal(id); return true; }
    if (act === 'export-manifest-text') { openTextManifest(ev); return true; }
    if (act === 'open-staff-picker') { openStaffPicker(); return true; }

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

      if (Nav.hasBack()) {
        Nav.back();
      } else if (activeQtyModalReturnToChecklist && App.Views.Catering.Kits) {
        App.Views.Catering.Kits.openGearChecklist(true);
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      U.toast(finalQty > 0 ? 'Item updated in van.' : 'Item removed from van.');
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

    if (act === 'modal-pack-delta') {
      var pDelta = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var pInput = document.getElementById('modal-pack-input');
      if (pInput) {
        var curVal = parseInt(pInput.value, 10) || 0;
        pInput.value = Math.max(0, curVal + pDelta);
      }
      return true;
    }
    if (act === 'modal-pack-set') {
      var pSetVal = parseInt(el.getAttribute('data-val'), 10) || 0;
      var pInputDirect = document.getElementById('modal-pack-input');
      if (pInputDirect) pInputDirect.value = pSetVal;
      return true;
    }
    if (act === 'modal-pack-save') {
      var pSaveInput = document.getElementById('modal-pack-input');
      var pMax = parseInt(el.getAttribute('data-max'), 10) || 9999;
      var finalReturnQty = Math.min(pMax, Math.max(0, parseInt(pSaveInput ? pSaveInput.value : 0, 10) || 0));
      S.setBack(ev, id, finalReturnQty);
      if (Nav.hasBack()) {
        Nav.back();
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      U.toast('Return count saved.');
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
      openStaffPicker(true, 'none'); // Update in place without horizontal slide
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