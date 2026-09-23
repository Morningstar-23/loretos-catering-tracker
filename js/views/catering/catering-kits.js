/* ==========================================================================
   Loreto's Catering Tracker — File 2: Kits & Checklist (js/views/catering/catering-kits.js)
   - Inter-Modal Routing Page Slide Animations (Push & Pop Transitions)
   - Non-truncating kit presets, descriptions, and inspector cards
   - Gear checklist modal with category icons matching inventory
   - Full Modal Navigation Stack integration across all kit sub-sheets
   - Multi-line word-wrap & optimized for iPhone 5s (iOS 12 / 320px viewport)
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};
App.Views.Catering = App.Views.Catering || {};

App.Views.Catering.Kits = (function () {
  var U = App.UI, S = App.Store;
  var Nav = App.Views.Catering.Nav;

  var chkQ = '';
  var chkCat = '';
  var chkFilter = 'unadded';
  var editingPreset = null;

  function delegate(act, el) {
    if (App.Views.catering && App.Views.catering.onAct) {
      App.Views.catering.onAct(act, el);
    }
  }

  function renderChecklistRows(ev) {
    var activeEv = ev || S.activeEvent();
    if (!activeEv) return '';

    var list = S.searchItems(chkQ, chkCat, 'alpha-asc');

    if (chkFilter === 'unadded') {
      list = list.filter(function (i) {
        return !(activeEv.lines || []).some(function (l) { return l.itemId === i.id && l.out > 0; });
      });
    }

    if (!list.length) {
      return '<div class="empty"><p class="muted">No gear found matching this filter.</p></div>';
    }

    return list.map(function (i) {
      var staged = 0;
      (activeEv.lines || []).forEach(function (l) { if (l.itemId === i.id) staged = l.out; });
      var brandLabel = i.brand || i.tagLabel || 'Loreto';
      var photoKey = i.photoId ? (i.photoId + '-t') : '';
      var cat = S.category(i.categoryId);

      return '<div class="pack-row">' +
        '<div class="row row-between" style="align-items:flex-start">' +
          '<div class="row grow mr8" style="min-width:0">' +
            '<span class="pack-thumb" data-photo="' + photoKey + '" data-act="thumb-click" data-id="' + i.id + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow pack-item-clickable" data-act="inspect-item" data-id="' + i.id + '" style="min-width:0">' +
              '<span class="item-name" style="word-break:break-word;line-height:1.24">' + U.esc(i.name) + '</span>' +
              '<span class="item-sub"><strong style="color:var(--foliage)">' + i.qty + ' in stock</strong> &middot; ' + U.esc(i.unit) + '</span>' +
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

  function openGearChecklist(isBack) {
    var ev = S.activeEvent();
    if (!ev) return;

    if (!isBack) {
      Nav.push(function (b) { openGearChecklist(b); });
    }

    var cats = S.categories();
    var catChips = '<button type="button" class="chip' + (chkCat ? '' : ' on') + '" data-act="chk-cat" data-id="">All</button>' +
      cats.map(function (c) {
        return '<button type="button" class="chip' + (chkCat === c.id ? ' on' : '') + '" data-act="chk-cat" data-id="' + c.id + '">' +
          U.icon(c.icon || 'plate') + ' ' + U.esc(c.name) +
        '</button>';
      }).join('');

    var html =
      '<div class="seg mb8" style="margin-top:0">' +
        '<button type="button" class="' + (chkFilter === 'unadded' ? 'on' : '') + '" data-act="chk-filter" data-filter="unadded">Not in van</button>' +
        '<button type="button" class="' + (chkFilter === 'all' ? 'on' : '') + '" data-act="chk-filter" data-filter="all">All gear</button>' +
      '</div>' +
      '<div class="search mb8">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="chk-q" type="search" placeholder="Search gear by name or brand" value="' + U.esc(chkQ) + '">' +
      '</div>' +
      '<div class="chips filter-bar mb8">' + catChips + '</div>' +
      '<div class="list mb12" id="chk-list-container">' + renderChecklistRows(ev) + '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="done-checklist">Done Adding Items</button>' +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    var body = U.openSheet('Add Items to Van', html, delegate, dir);
    U.hydrateThumbs(body);

    var qInput = document.getElementById('chk-q');
    if (qInput) {
      qInput.addEventListener('input', function () {
        chkQ = qInput.value;
        updateChecklistDOM();
      });
    }
  }

  function openKitPickerSheet(ev, isSwitching, isBack) {
    if (!ev) return;
    if (!isBack) {
      Nav.push(function (b) { openKitPickerSheet(ev, isSwitching, b); });
    }

    var presets = S.presets();

    var listHtml = presets.map(function (p) {
      var avail = S.checkPresetAvailability(p.id, true);
      var isLoadedNow = ev.presetId === p.id;
      var isShort = avail && !avail.available;

      return '<div class="card mb8" style="' + (isLoadedNow ? 'border-color:var(--inasal-orange);background:var(--inasal-soft)' : '') + '">' +
        '<div class="row row-between mb4">' +
          '<div class="grow mr8" style="min-width:0">' +
            '<strong style="font-size:13.5px;color:var(--timber-ink);word-break:break-word;line-height:1.24;display:block">' + U.esc(p.name) + '</strong>' +
            '<div class="muted mt2" style="font-size:11px">' + p.lines.length + ' kinds &middot; ' + (avail ? avail.totalNeeded : 0) + ' pcs</div>' +
          '</div>' +
          (isLoadedNow ? '<span class="tag tag-orange">Active</span>' : '') +
        '</div>' +
        '<div class="row mb8">' +
          (isShort ? '<span class="tag tag-red" style="font-size:9.5px">' + avail.shortCount + ' items short in inventory</span>'
                   : '<span class="tag tag-green" style="font-size:9.5px">100% available</span>') +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="' + (isSwitching ? 'confirm-switch-preset' : 'select-initial-preset') + '" data-id="' + p.id + '">' +
          U.icon('check', 'mr4') + (isSwitching ? 'Switch to this kit' : 'Load kit into van') +
        '</button>' +
      '</div>';
    }).join('');

    var cancelBtn = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-ghost" data-act="sheet-close">Cancel</button>';

    var html = '<div class="list mb12">' + (listHtml || '<div class="empty"><p class="muted">No kit presets saved yet.</p></div>') + '</div>' +
      '<div class="sheet-sticky-footer">' + cancelBtn + '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    U.openSheet(isSwitching ? 'Switch to Another Kit' : 'Select a Kit Preset', html, delegate, dir);
  }

  function openPresetOptionsSheet(ev, isBack) {
    if (!ev) return;
    if (!isBack) {
      Nav.push(function (b) { openPresetOptionsSheet(ev, b); });
    }

    var p = ev.presetId ? S.preset(ev.presetId) : null;
    var isModified = (App.Views.catering && App.Views.catering.isEventPresetModified) ? App.Views.catering.isEventPresetModified(ev) : false;

    var activeCard = p ? (
      '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line)">' +
        '<div class="row row-between">' +
          '<div style="min-width:0;flex:1"><span class="muted" style="font-size:10.5px;font-weight:700">ACTIVE KIT</span>' +
          '<h4 style="font-size:14.5px;font-weight:700;word-break:break-word;line-height:1.24">' + U.esc(p.name) + '</h4></div>' +
          (isModified ? '<span class="tag tag-yellow" style="font-size:10px">Modified</span>'
                      : '<span class="tag tag-green" style="font-size:10px">In sync</span>') +
        '</div>' +
      '</div>'
    ) : '';

    var modButtons = (p && isModified) ? (
      '<button type="button" class="btn btn-primary mb8" data-act="update-current-preset" data-id="' + p.id + '">' +
        U.icon('check', 'mr4') + ' Update "' + U.esc(p.name) + '" with van load' +
      '</button>' +
      '<button type="button" class="btn btn-ghost mb8" data-act="prompt-save-new-preset">' +
        U.icon('plus', 'mr4') + ' Save load as NEW preset' +
      '</button>' +
      '<button type="button" class="btn btn-danger btn-sm mb8" data-act="revert-preset-changes">' +
        U.icon('refresh', 'mr4') + ' Discard changes & revert kit' +
      '</button>'
    ) : (
      '<button type="button" class="btn btn-ghost mb8" data-act="prompt-save-new-preset">' +
        U.icon('plus', 'mr4') + ' Save current load as preset' +
      '</button>'
    );

    var cancelBtn = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>';

    var html = activeCard + modButtons + '<div class="divider"></div>' +
      '<button type="button" class="btn btn-ghost mb8" data-act="pick-preset-to-switch">' + U.icon('layers', 'mr4') + ' Switch to another kit...</button>' +
      '<button type="button" class="btn btn-ghost mb8" data-act="manage-presets">' + U.icon('settings', 'mr4') + ' Manage all saved presets</button>' +
      '<div class="sheet-sticky-footer">' + cancelBtn + '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    U.openSheet('Kit Preset Options', html, delegate, dir);
  }

  function promptSaveNewPreset(ev, isBack) {
    if (!ev) return;
    if (!isBack) {
      Nav.push(function (b) { promptSaveNewPreset(ev, b); });
    }

    var defaultName = ev.name ? (ev.name + ' Kit') : ('Custom Kit ' + U.fmtDate(U.today()));

    var html =
      '<div class="field"><label for="new-p-name">Preset Name *</label>' +
        '<input class="input" id="new-p-name" value="' + U.esc(defaultName) + '"></div>' +
      '<div class="field"><label for="new-p-note">Description / Notes</label>' +
        '<textarea class="input" id="new-p-note">' + U.esc('Kit saved from ' + ev.name) + '</textarea></div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary mb8" data-act="confirm-save-new-preset">' + U.icon('check', 'mr4') + ' Save as new preset</button>' +
        '<button type="button" class="btn btn-ghost" data-act="' + (Nav.hasBack() ? 'modal-back' : 'open-preset-options') + '">&larr; Back</button>' +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    U.openSheet('Save New Kit Preset', html, delegate, dir);
  }

  function openPresetInspector(presetId, isBack) {
    var avail = S.checkPresetAvailability(presetId, false);
    if (!avail) return;
    var p = avail.preset;
    var ev = S.activeEvent();

    if (!isBack) {
      Nav.push(function (b) { openPresetInspector(presetId, b); });
    }

    var linesHtml = avail.lines.map(function (l) {
      return '<div class="pack-row ' + (l.isShort ? 'short' : '') + '">' +
        '<div class="row row-between">' +
          '<div class="grow mr8" style="min-width:0">' +
            '<span class="item-name" style="word-break:break-word;line-height:1.24">' + U.esc(l.name) + '</span>' +
            '<span class="item-sub">Stock: ' + l.inInventory + ' &middot; Kit needs: ' + l.targetQty + '</span>' +
          '</div>' +
          (l.isShort ? '<span class="tag tag-red" style="font-size:10px">Short by ' + l.shortBy + '</span>'
                     : '<span class="tag tag-green" style="font-size:10px">Available</span>') +
        '</div>' +
      '</div>';
    }).join('');

    var actionBtn = ev
      ? '<button type="button" class="btn btn-primary mb8" data-act="confirm-switch-preset" data-id="' + p.id + '">' + U.icon('refresh', 'mr4') + ' Switch van to this kit</button>'
      : '<button type="button" class="btn btn-primary" data-act="apply-preset-start" data-id="' + p.id + '">' + U.icon('truck', 'mr4') + ' Start event with this kit</button>';

    var cancelBtn = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost mt8" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>';

    var html = '<div class="list mb12">' + linesHtml + '</div>' +
      '<div class="sheet-sticky-footer">' +
        actionBtn +
        '<button type="button" class="btn btn-ghost mt8" data-act="edit-preset-catering" data-id="' + p.id + '">' + U.icon('edit', 'mr4') + ' Edit kit contents</button>' +
        cancelBtn +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    U.openSheet('Kit: ' + p.name, html, delegate, dir);
  }

  function openPresetManagerSheet(isBack) {
    if (!isBack) {
      Nav.push(function (b) { openPresetManagerSheet(b); });
    }

    var presets = S.presets();
    var cancelBtn = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>';

    var html =
      '<div class="row row-between mb12">' +
        '<span class="muted" style="font-size:12px">' + presets.length + ' kit presets</span>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="new-preset" style="width:auto;padding:0 12px">' + U.icon('plus', 'mr4') + ' Create new</button>' +
      '</div>' +
      '<div class="list mb12">' +
        (presets.map(function (p) {
          return '<div class="item">' +
            '<span class="thumb">' + U.icon('layers') + '</span>' +
            '<span class="grow mr8" style="min-width:0"><span class="item-name" style="word-break:break-word;line-height:1.24">' + U.esc(p.name) + '</span><span class="item-sub">' + p.lines.length + ' kinds</span></span>' +
            '<button type="button" class="btn btn-ghost btn-sm mr8" data-act="edit-preset-catering" data-id="' + p.id + '" style="width:auto;min-height:34px;padding:2px 8px">' + U.icon('edit') + '</button>' +
            '<button type="button" class="step-btn" data-act="del-preset-catering" data-id="' + p.id + '">' + U.icon('close') + '</button>' +
          '</div>';
        }).join('') || '<div class="empty"><p class="muted">No presets saved yet.</p></div>') +
      '</div>' +
      '<div class="sheet-sticky-footer">' + cancelBtn + '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    U.openSheet('Gear Kit Presets', html, delegate, dir);
  }

  function openPresetEditor(presetId, isBack, transitionDir) {
    var p = presetId ? S.preset(presetId) : null;
    editingPreset = p ? S.clone(p) : { id: '', name: '', note: '', lines: [] };

    if (!isBack && !transitionDir) {
      Nav.push(function (b) { openPresetEditor(presetId, b); });
    }

    var unadded = S.items().filter(function (it) {
      return !editingPreset.lines.some(function (l) { return l.itemId === it.id; });
    });

    var linesHtml = editingPreset.lines.map(function (l) {
      var it = S.item(l.itemId);
      return '<div class="pack-row" id="p-line-' + l.itemId + '">' +
        '<div class="row row-between">' +
          '<span class="item-name mr8" style="word-break:break-word;line-height:1.24">' + U.esc(it ? it.name : 'Unknown') + '</span>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="p-qty-minus" data-id="' + l.itemId + '">' + U.icon('minus') + '</button>' +
            '<input type="number" inputmode="numeric" class="step-num" id="p-in-' + l.itemId + '" data-act="p-qty-input" data-id="' + l.itemId + '" value="' + l.qty + '">' +
            '<button type="button" class="step-btn" data-act="p-qty-plus" data-id="' + l.itemId + '">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="row row-between mt4"><span></span><button type="button" class="muted" style="color:var(--alert);background:none;border:none;cursor:pointer" data-act="p-remove-line" data-id="' + l.itemId + '">Remove</button></div>' +
      '</div>';
    }).join('');

    var cancelBtn = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost mt8" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-ghost mt8" data-act="manage-presets">Cancel</button>';

    var html =
      '<div class="field"><label for="p-name">Kit Name *</label><input class="input" id="p-name" value="' + U.esc(editingPreset.name) + '"></div>' +
      '<div class="field"><label for="p-note">Notes</label><textarea class="input" id="p-note">' + U.esc(editingPreset.note) + '</textarea></div>' +
      '<div class="card mb12"><label style="font-size:12px;font-weight:700">Add Item</label><div class="row"><div class="grow mr8">' +
        '<select class="input" id="p-add-select"><option value="">Select gear...</option>' +
          unadded.map(function (i) { return '<option value="' + i.id + '">' + U.esc(i.name) + '</option>'; }).join('') +
        '</select></div><button type="button" class="btn btn-ghost btn-sm" data-act="p-add-gear" style="width:auto;padding:0 14px">' + U.icon('plus', 'mr4') + 'Add</button></div></div>' +
      '<div class="list mb12">' + (linesHtml || '<div class="empty"><p class="muted">No gear in kit.</p></div>') + '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="save-preset-editor">' + (p ? 'Save kit changes' : 'Create kit') + '</button>' +
        cancelBtn +
      '</div>';

    var dir = transitionDir || (isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none'));
    U.openSheet(p ? ('Edit: ' + p.name) : 'New Kit Preset', html, delegate, dir);
  }

  function eventForm(ev, presetId, clampMode, isBack) {
    var p = presetId ? S.preset(presetId) : null;
    var defaultName = p ? (p.name + ' - ' + U.fmtDate(U.today())) : ('Booking ' + U.fmtDate(U.today()));

    if (!isBack) {
      Nav.push(function (b) { eventForm(ev, presetId, clampMode, b); });
    }

    var cancelBtn = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost mt8" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>';

    var html =
      '<div class="field"><label for="e-name">Event Name *</label><input class="input" id="e-name" value="' + U.esc(ev ? ev.name : defaultName) + '"></div>' +
      '<div class="field"><label for="e-venue">Venue</label><input class="input" id="e-venue" value="' + U.esc(ev ? ev.venue : '') + '"></div>' +
      '<div class="field"><label for="e-date">Date</label><input class="input" id="e-date" type="date" value="' + U.esc(ev ? ev.date : U.today()) + '"></div>' +
      '<div class="field"><label for="e-note">Kitchen Instructions</label><textarea class="input" id="e-note">' + U.esc(ev ? ev.note : '') + '</textarea></div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="' + (ev ? 'save-event' : 'create-event') + '"' +
          (presetId ? ' data-preset="' + presetId + '"' : '') + (clampMode ? ' data-clamp="1"' : '') + '>' +
          (ev ? 'Save event details' : 'Start van load-out') +
        '</button>' +
        cancelBtn +
      '</div>';

    var dir = isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none');
    U.openSheet(ev ? 'Edit Event' : 'New Catering Event', html, delegate, dir);
  }

  function handleAction(act, el, id, ev) {
    if (act === 'open-checklist') { openGearChecklist(false); return true; }
    if (act === 'open-kit-picker') { openKitPickerSheet(ev, false, false); return true; }
    if (act === 'open-preset-options') { openPresetOptionsSheet(ev, false); return true; }
    if (act === 'pick-preset-to-switch') { openKitPickerSheet(ev, true, false); return true; }
    if (act === 'prompt-save-new-preset') { promptSaveNewPreset(ev, false); return true; }
    if (act === 'manage-presets') { openPresetManagerSheet(false); return true; }
    if (act === 'new-preset') { openPresetEditor(null, false); return true; }
    if (act === 'edit-preset-catering') { openPresetEditor(id, false); return true; }
    if (act === 'inspect-preset') { openPresetInspector(id, false); return true; }
    if (act === 'edit-event') { eventForm(ev, '', false, false); return true; }
    if (act === 'new-blank') { eventForm(null, '', false, false); return true; }
    if (act === 'apply-preset-start') { eventForm(null, id, false, false); return true; }

    if (act === 'chk-filter') {
      chkFilter = el.getAttribute('data-filter') || 'unadded';
      var tabs = document.querySelectorAll('.seg button[data-act="chk-filter"]');
      for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-filter') === chkFilter);
      updateChecklistDOM();
      return true;
    }
    if (act === 'chk-cat') {
      chkCat = id;
      var chips = document.querySelectorAll('.chip[data-act="chk-cat"]');
      for (var j = 0; j < chips.length; j++) chips[j].classList.toggle('on', (chips[j].getAttribute('data-id') || '') === chkCat);
      updateChecklistDOM();
      return true;
    }
    if (act === 'done-checklist') {
      Nav.clear();
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('Van load-out updated.');
      return true;
    }

    if (act === 'p-add-gear') {
      var sel = document.getElementById('p-add-select');
      var addId = sel ? sel.value : '';
      if (!addId) { U.toast('Select a piece of gear first.'); return true; }
      editingPreset.name = ((document.getElementById('p-name') || {}).value || '').trim();
      editingPreset.note = ((document.getElementById('p-note') || {}).value || '').trim();
      editingPreset.lines.push({ itemId: addId, qty: 1 });
      openPresetEditor(editingPreset.id || null, true, 'none'); // Stay in place without sliding
      return true;
    }
    if (act === 'p-qty-plus' || act === 'p-qty-minus') {
      var deltaP = (act === 'p-qty-plus') ? 1 : -1;
      editingPreset.lines.forEach(function (l) { if (l.itemId === id) l.qty = Math.max(1, l.qty + deltaP); });
      var inp = document.getElementById('p-in-' + id);
      if (inp) {
        var found = null;
        editingPreset.lines.forEach(function (l) { if (l.itemId === id) found = l; });
        if (found) inp.value = found.qty;
      }
      return true;
    }
    if (act === 'p-qty-input') {
      var nVal = parseInt(el.value, 10);
      editingPreset.lines.forEach(function (l) { if (l.itemId === id) l.qty = Math.max(1, isNaN(nVal) ? 1 : nVal); });
      return true;
    }
    if (act === 'p-remove-line') {
      editingPreset.lines = editingPreset.lines.filter(function (l) { return l.itemId !== id; });
      var rowEl = document.getElementById('p-line-' + id);
      if (rowEl && rowEl.parentNode) rowEl.parentNode.removeChild(rowEl);
      return true;
    }
    if (act === 'save-preset-editor') {
      var kitName = ((document.getElementById('p-name') || {}).value || '').trim();
      if (!kitName) { U.toast('Give this kit a name.'); return true; }
      editingPreset.name = kitName;
      editingPreset.note = ((document.getElementById('p-note') || {}).value || '').trim();
      S.savePreset(editingPreset);
      U.toast('Kit preset saved.');
      Nav.back();
      App.rerenderQuiet();
      return true;
    }
    if (act === 'del-preset-catering') {
      U.confirm('Delete kit preset', 'Remove this preset bundle from your list?', 'Delete', function () {
        S.removePreset(id);
        openPresetManagerSheet(true);
        U.toast('Kit preset deleted.');
        App.rerenderQuiet();
      });
      return true;
    }

    return false;
  }

  return {
    openGearChecklist: openGearChecklist,
    openKitPickerSheet: openKitPickerSheet,
    openPresetOptionsSheet: openPresetOptionsSheet,
    promptSaveNewPreset: promptSaveNewPreset,
    openPresetInspector: openPresetInspector,
    openPresetManagerSheet: openPresetManagerSheet,
    openPresetEditor: openPresetEditor,
    eventForm: eventForm,
    handleAction: handleAction
  };
})();