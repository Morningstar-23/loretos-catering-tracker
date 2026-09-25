/* ==========================================================================
   Loreto's Catering Tracker — File 2: Kits & Checklist (js/views/catering/catering-kits.js)
   - Zero emojis: 100% clean Lucide/Feather vector SVG iconography
   - Dual-tab Preset Editor with Distinct Icons & Animated Glider Pill
   - Unsaved Changes Guard: "Save & Exit", "Discard Changes", or "Keep Editing"
   - In-Kit Search & Category Filters: Fast editing of large preset manifests
   - Standalone Delegate Routing: Operates directly inside Settings with no page jump
   - Unclipped multi-line item cards (no truncated gear names or brand stamps)
   - Live Gear Search, Category Filter Chips, and Scope Toggle (All / Not in Kit)
   - Inline Catalog Steppers: 1-tap add and adjust without leaving search
   - Inter-Modal Routing Page Slide Animations (Push & Pop Transitions)
   - Full Modal Navigation Stack integration across all kit sub-sheets
   - Optimized for iPhone 5s (iOS 12 / 320px viewport)
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

  /* Preset Editor In-Memory State */
  var editingPreset = null;
  var initialPresetSnapshot = null;
  var presetTab = 'items'; // 'items' | 'add'

  // "In Kit" filter state
  var inKitQ = '';
  var inKitCat = '';

  // "Add Gear" catalog filter state
  var presetQ = '';
  var presetCat = '';
  var presetFilter = 'all'; // 'all' | 'not-in-kit'

  function delegate(act, el) {
    var id = el ? el.getAttribute('data-id') : '';
    var ev = S.activeEvent ? S.activeEvent() : null;
    if (handleAction(act, el, id, ev)) return;
    if (App.Views.catering && App.Views.catering.onAct) {
      App.Views.catering.onAct(act, el);
    }
  }

  /* --------------------------------------------------------------------------
     DIRTY CHECK & UNSAVED CHANGES GUARD
     -------------------------------------------------------------------------- */
  function syncPresetInputsToMemory() {
    if (!editingPreset) return;
    var nameIn = document.getElementById('p-name');
    var noteIn = document.getElementById('p-note');
    if (nameIn) editingPreset.name = nameIn.value.trim();
    if (noteIn) editingPreset.note = noteIn.value.trim();
  }

  function isPresetDirty() {
    if (!editingPreset || !initialPresetSnapshot) return false;
    syncPresetInputsToMemory();

    // If a brand new preset was opened and remains completely untouched
    if (!editingPreset.id && !editingPreset.name && !editingPreset.note && (!editingPreset.lines || editingPreset.lines.length === 0)) {
      return false;
    }

    return JSON.stringify(editingPreset) !== initialPresetSnapshot;
  }

  function promptExitPresetEditor() {
    if (!isPresetDirty()) {
      initialPresetSnapshot = null;
      editingPreset = null;
      if (Nav.hasBack()) {
        Nav.back();
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      return true;
    }

    var html =
      '<div class="card mb12" style="background:#FFFAF8;border:1px solid rgba(214,57,32,0.25);border-left:4px solid var(--alert);padding:11px 12px">' +
        '<div class="row" style="color:var(--alert);font-size:13.5px;font-weight:700">' +
          U.icon('alertTriangle', 'mr4') + 'Unsaved Changes' +
        '</div>' +
        '<p class="muted mt4" style="font-size:12px;line-height:1.35">' +
          'You have modified this kit preset without saving. What would you like to do?' +
        '</p>' +
      '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary mb8" data-act="p-save-and-exit">' +
          U.icon('check', 'mr4') + 'Save & Exit' +
        '</button>' +
        '<button type="button" class="btn btn-danger btn-sm mb8" data-act="p-confirm-discard">' +
          U.icon('trash', 'mr4') + 'Discard Changes' +
        '</button>' +
        '<button type="button" class="btn btn-ghost" data-act="p-cancel-discard">' +
          'Keep Editing' +
        '</button>' +
      '</div>';

    U.openSheet('Unsaved Changes', html, delegate, 'forward');
    return true;
  }

  /* --------------------------------------------------------------------------
     PRESET EDITOR SLIDING GLIDER PILL ANIMATOR
     -------------------------------------------------------------------------- */
  function updatePresetGlider(root, immediate) {
    var seg = (root && root.querySelector)
      ? (root.querySelector('#p-seg-tabs') || document.getElementById('p-seg-tabs'))
      : document.getElementById('p-seg-tabs');

    if (!seg) return;
    var glider = seg.querySelector('#p-seg-glider');
    var activeBtn = seg.querySelector('button.on');
    if (!glider || !activeBtn) return;

    var targetX = activeBtn.offsetLeft;
    var targetW = activeBtn.offsetWidth;

    if (targetW === 0) {
      setTimeout(function () { updatePresetGlider(root, immediate); }, 35);
      return;
    }

    if (immediate) {
      glider.style.transition = 'none';
      glider.style.transform = 'translate3d(' + targetX + 'px, 0, 0)';
      glider.style.width = targetW + 'px';
      void glider.offsetWidth;
    } else {
      glider.style.transition = 'transform 0.28s cubic-bezier(0.34, 1.45, 0.64, 1), width 0.24s cubic-bezier(0.34, 1.45, 0.64, 1)';
      glider.style.transform = 'translate3d(' + targetX + 'px, 0, 0)';
      glider.style.width = targetW + 'px';
    }
  }

  /* --------------------------------------------------------------------------
     VAN CHECKLIST LOGIC
     -------------------------------------------------------------------------- */
  function renderChecklistRows(ev) {
    var activeEv = ev || (S.activeEvent ? S.activeEvent() : null);
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
    var ev = S.activeEvent ? S.activeEvent() : null;
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

  /* --------------------------------------------------------------------------
     PRESET PICKER & OPTIONS
     -------------------------------------------------------------------------- */
  function openKitPickerSheet(ev, isSwitching, isBack) {
    if (!ev) return;
    if (!isBack) {
      Nav.push(function (b) { openKitPickerSheet(ev, isSwitching, b); });
    }

    var presets = S.presets();
    var hasVanLines = ev && ev.lines && ev.lines.length > 0;

    var saveCurrentCard = hasVanLines ? (
      '<div class="card mb12" style="background:var(--sand-soft);border:1.5px solid var(--line-strong);padding:10px 12px">' +
        '<div class="row row-between">' +
          '<div class="grow mr8" style="min-width:0">' +
            '<span class="muted" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em">CURRENT LOAD-OUT</span>' +
            '<strong style="display:block;font-size:13px;color:var(--timber-ink)">' + ev.lines.length + ' item types in van</strong>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-sm" data-act="prompt-save-new-preset" style="width:auto;min-height:34px;padding:2px 10px;font-size:11.5px">' +
            U.icon('plus', 'mr4') + 'Save as Preset' +
          '</button>' +
        '</div>' +
      '</div>'
    ) : '';

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
          (isShort ? '<span class="tag tag-red" style="font-size:9.5px;display:inline-flex;align-items:center;gap:3px">' + U.icon('alertTriangle', 'tag-svg-icon') + avail.shortCount + ' items short in inventory</span>'
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

    var html = saveCurrentCard +
      '<div class="row row-between mb8">' +
        '<span class="muted" style="font-size:11.5px;font-weight:700">Saved Kit Presets (' + presets.length + ')</span>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="new-preset" style="width:auto;min-height:30px;padding:2px 8px;font-size:11px">' +
          U.icon('plus', 'mr4') + 'Blank Preset' +
        '</button>' +
      '</div>' +
      '<div class="list mb12">' + (listHtml || '<div class="empty"><p class="muted">No kit presets saved yet.</p></div>') + '</div>' +
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
    var hasVanLines = ev.lines && ev.lines.length > 0;

    var headerCard = '';
    var modButtons = '';

    if (p) {
      headerCard =
        '<div class="card mb12" style="background:var(--sand-soft);border-color:var(--line)">' +
          '<div class="row row-between">' +
            '<div style="min-width:0;flex:1"><span class="muted" style="font-size:10.5px;font-weight:700">ACTIVE KIT</span>' +
            '<h4 style="font-size:14.5px;font-weight:700;word-break:break-word;line-height:1.24">' + U.esc(p.name) + '</h4></div>' +
            (isModified ? '<span class="tag tag-yellow" style="font-size:10px">Modified</span>'
                        : '<span class="tag tag-green" style="font-size:10px">In sync</span>') +
          '</div>' +
        '</div>';

      modButtons = (isModified) ? (
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
          U.icon('plus', 'mr4') + ' Save current load as NEW preset' +
        '</button>'
      );
    } else {
      headerCard =
        '<div class="card mb12" style="background:var(--sand-soft);border:1.5px solid var(--line-strong);padding:11px 12px">' +
          '<div class="row row-between">' +
            '<div style="min-width:0;flex:1">' +
              '<span class="muted" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em">LOAD-OUT STATUS</span>' +
              '<h4 style="font-size:14.5px;font-weight:700;word-break:break-word;line-height:1.24">Manual Load-out</h4>' +
              '<p class="muted mt2" style="font-size:11.5px">' + (hasVanLines ? ev.lines.length + ' item types staged without a kit' : 'Empty van') + '</p>' +
            '</div>' +
            '<span class="tag tag-yellow" style="font-size:10px">No Kit Linked</span>' +
          '</div>' +
        '</div>';

      modButtons = hasVanLines ? (
        '<button type="button" class="btn btn-primary mb8" data-act="prompt-save-new-preset">' +
          U.icon('plus', 'mr4') + ' Save current van load as NEW preset' +
        '</button>'
      ) : (
        '<button type="button" class="btn btn-primary mb8" data-act="new-preset">' +
          U.icon('plus', 'mr4') + ' Create new blank preset' +
        '</button>'
      );
    }

    var cancelBtn = Nav.hasBack()
      ? '<button type="button" class="btn btn-ghost" data-act="modal-back">&larr; Back</button>'
      : '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>';

    var html = headerCard + modButtons + '<div class="divider"></div>' +
      '<button type="button" class="btn btn-ghost mb8" data-act="pick-preset-to-switch">' + U.icon('layers', 'mr4') + ' Switch / load another kit...</button>' +
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
        '<textarea class="input" id="new-p-note">' + U.esc('Kit saved from ' + (ev.name || 'custom van load')) + '</textarea></div>' +
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
    var ev = S.activeEvent ? S.activeEvent() : null;

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
          (l.isShort ? '<span class="tag tag-red" style="font-size:10px;display:inline-flex;align-items:center;gap:3px">' + U.icon('alertTriangle', 'tag-svg-icon') + 'Short by ' + l.shortBy + '</span>'
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

  /* --------------------------------------------------------------------------
     PRESET EDITOR: IN-KIT FILTERING & UNCLIPPED MULTI-LINE CARDS
     -------------------------------------------------------------------------- */
  function renderPresetLinesHtml() {
    if (!editingPreset || !editingPreset.lines.length) {
      return '<div class="empty" style="padding:24px 10px">' +
        '<div class="empty-icon" style="width:48px;height:48px;margin-bottom:8px">' + U.icon('layers') + '</div>' +
        '<div class="empty-title" style="font-size:14.5px">Kit is currently empty</div>' +
        '<p class="empty-desc mb12" style="font-size:11.5px">Search and browse gear from the catalog to add items and target quantities.</p>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="p-switch-tab" data-tab="add" style="width:auto;min-height:34px;padding:0 16px;margin:0 auto">' +
          U.icon('plus', 'mr4') + 'Browse Gear Catalog' +
        '</button>' +
      '</div>';
    }

    var q = (inKitQ || '').toLowerCase().trim();
    var filtered = editingPreset.lines.filter(function (l) {
      var it = S.item(l.itemId);
      if (inKitCat && it && it.categoryId !== inKitCat) return false;
      if (!q) return true;
      var hay = ((it ? it.name : '') + ' ' + (it ? (it.brand || '') + ' ' + (it.tagLabel || '') : '')).toLowerCase();
      return hay.indexOf(q) > -1;
    });

    var totalPcs = editingPreset.lines.reduce(function (sum, l) { return sum + (l.qty || 0); }, 0);
    var filteredPcs = filtered.reduce(function (sum, l) { return sum + (l.qty || 0); }, 0);
    var isFiltered = !!(q || inKitCat);

    var countSummary = isFiltered
      ? ('Showing <b>' + filtered.length + '</b> of ' + editingPreset.lines.length + ' items (' + filteredPcs + ' pcs)')
      : ('<b>' + editingPreset.lines.length + '</b> items &middot; <b>' + totalPcs + '</b> total pieces');

    if (!filtered.length) {
      return '<div class="row row-between mb8" style="font-size:11.5px;color:var(--timber-soft);align-items:center">' +
          '<span>' + countSummary + '</span>' +
          '<button type="button" class="muted" style="color:var(--inasal-orange);font-weight:700;font-size:11.5px;background:none;border:none;cursor:pointer" data-act="p-switch-tab" data-tab="add">+ Add more gear</button>' +
        '</div>' +
        '<div class="empty" style="padding:18px 10px">' +
          '<p class="muted" style="font-size:12px;margin-bottom:8px">No gear in this kit matches your filter.</p>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="p-clear-in-kit-filters" style="width:auto;min-height:28px;padding:0 12px;font-size:11px;margin:0 auto">' +
            U.icon('refresh', 'mr4') + 'Clear filter' +
          '</button>' +
        '</div>';
    }

    var listRows = filtered.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var brandLabel = it ? (it.brand || it.tagLabel || 'Loreto') : '';
      var stock = it ? (it.qty || 0) : 0;

      return '<div class="pack-row preset-item-card" id="p-line-' + l.itemId + '">' +
        /* TOP ROW: Thumbnail, Full Item Name (wrapping), and Top-Right Trash */
        '<div class="row row-between preset-item-top" style="align-items:flex-start">' +
          '<div class="row grow mr8" style="min-width:0;align-items:flex-start">' +
            '<span class="pack-thumb preset-card-thumb" data-photo="' + photoKey + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow" style="min-width:0">' +
              '<span class="preset-item-title">' + U.esc(it ? it.name : 'Unknown gear') + '</span>' +
              (cat ? '<span class="preset-cat-sub">' + U.esc(cat.name) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<button type="button" class="preset-trash-btn" data-act="p-remove-line" data-id="' + l.itemId + '" title="Remove from kit" aria-label="Remove item">' +
            U.icon('trash') +
          '</button>' +
        '</div>' +

        /* BOTTOM ROW: Brand Tag + Commissary Stock (left); Stepper (right) */
        '<div class="row row-between preset-item-bottom">' +
          '<div class="row preset-meta-wrap">' +
            U.tag(brandLabel, it ? it.tagColor : 'orange') +
            '<span class="preset-stock-pill ' + (stock === 0 ? 'is-empty' : '') + '">' + stock + ' in commissary</span>' +
            (it && it.isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
          '</div>' +
          '<div class="stepper preset-card-stepper">' +
            '<button type="button" class="step-btn" data-act="p-qty-minus" data-id="' + l.itemId + '" aria-label="Decrease">' + U.icon('minus') + '</button>' +
            '<input type="number" inputmode="numeric" class="step-num" id="p-in-' + l.itemId + '" data-act="p-qty-input" data-id="' + l.itemId + '" value="' + l.qty + '">' +
            '<button type="button" class="step-btn" data-act="p-qty-plus" data-id="' + l.itemId + '" aria-label="Increase">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="row row-between mb8" style="font-size:11.5px;color:var(--timber-soft);align-items:center">' +
        '<span>' + countSummary + '</span>' +
        '<button type="button" class="muted" style="color:var(--inasal-orange);font-weight:700;font-size:11.5px;background:none;border:none;cursor:pointer" data-act="p-switch-tab" data-tab="add">+ Add more gear</button>' +
      '</div>' +
      '<div class="list mb12">' + listRows + '</div>';
  }

  function updatePresetItemsDOM() {
    var container = document.getElementById('p-items-container');
    if (container) {
      container.innerHTML = renderPresetLinesHtml();
      U.hydrateThumbs(container);
    }
  }

  function renderPresetCatalogRows() {
    var rawList = S.searchItems(presetQ, presetCat, 'alpha-asc');

    var list = (presetFilter === 'not-in-kit') ? rawList.filter(function (it) {
      return !editingPreset.lines.some(function (l) { return l.itemId === it.id; });
    }) : rawList;

    if (!list.length) {
      return '<div class="empty" style="padding:24px 10px"><p class="muted" style="font-size:12px">No gear found matching your search and category filter.</p></div>';
    }

    return list.map(function (it) {
      var existingLine = null;
      (editingPreset.lines || []).forEach(function (l) {
        if (l.itemId === it.id) existingLine = l;
      });

      var photoKey = it.photoId ? (it.photoId + '-t') : '';
      var cat = S.category(it.categoryId);
      var brandLabel = it.brand || it.tagLabel || 'Loreto';

      return '<div class="pack-row preset-item-card ' + (existingLine ? 'done' : '') + '" id="p-cat-row-' + it.id + '">' +
        /* TOP ROW: Full Item Name + In-Kit Status Pill */
        '<div class="row row-between preset-item-top" style="align-items:flex-start">' +
          '<div class="row grow mr8" style="min-width:0;align-items:flex-start">' +
            '<span class="pack-thumb preset-card-thumb" data-photo="' + photoKey + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow" style="min-width:0">' +
              '<span class="preset-item-title">' + U.esc(it.name) + '</span>' +
              (cat ? '<span class="preset-cat-sub">' + U.esc(cat.name) + '</span>' : '') +
            '</div>' +
          '</div>' +
          (existingLine ? '<span class="tag tag-green" style="font-size:9.5px;flex-shrink:0">' + U.icon('check', 'tag-svg-icon') + 'In kit</span>' : '') +
        '</div>' +

        /* BOTTOM ROW: Brand Tag + Commissary Stock (left); Add Button or Stepper (right) */
        '<div class="row row-between preset-item-bottom">' +
          '<div class="row preset-meta-wrap">' +
            U.tag(brandLabel, it.tagColor) +
            '<span class="preset-stock-pill">' + (it.qty || 0) + ' in commissary</span>' +
            (it.isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
          '</div>' +
          (existingLine
            ? ('<div class="stepper preset-card-stepper">' +
                '<button type="button" class="step-btn" data-act="p-qty-minus" data-id="' + it.id + '" data-context="catalog">' + U.icon('minus') + '</button>' +
                '<input type="number" inputmode="numeric" class="step-num" id="p-cat-in-' + it.id + '" data-act="p-qty-input" data-id="' + it.id + '" data-context="catalog" value="' + existingLine.qty + '">' +
                '<button type="button" class="step-btn" data-act="p-qty-plus" data-id="' + it.id + '" data-context="catalog">' + U.icon('plus') + '</button>' +
              '</div>')
            : ('<button type="button" class="btn btn-primary btn-sm preset-add-btn" data-act="p-add-item" data-id="' + it.id + '">' +
                U.icon('plus', 'mr4') + 'Add to Kit' +
              '</button>')
          ) +
        '</div>' +
      '</div>';
    }).join('');
  }

  function updatePresetCatalogDOM() {
    var container = document.getElementById('p-catalog-container');
    if (container) {
      container.innerHTML = renderPresetCatalogRows();
      U.hydrateThumbs(container);
    }
  }

  function renderPresetEditorBody() {
    var inKitCount = editingPreset.lines.length;
    var isNewPreset = !editingPreset.id;

    // Header Details Card: Compact for existing kits, fully open for new kits
    var metaCardHtml = isNewPreset ? (
      '<div class="field mb6">' +
        '<label for="p-name" style="font-size:11.5px;font-weight:700">Preset Name *</label>' +
        '<input class="input" id="p-name" placeholder="e.g. Standard 100 pax buffet" value="' + U.esc(editingPreset.name) + '" style="min-height:40px;font-size:14px">' +
      '</div>' +
      '<div class="field mb10">' +
        '<label for="p-note" style="font-size:11.5px;font-weight:700">Notes (optional)</label>' +
        '<input class="input" id="p-note" placeholder="e.g. Complete heavy kit for church or hall banquets" value="' + U.esc(editingPreset.note || '') + '" style="min-height:36px;font-size:13px">' +
      '</div>'
    ) : (
      '<div class="card mb10" style="padding:9px 12px;background:var(--sand-soft);border:1px solid var(--line)">' +
        '<div class="row row-between" style="align-items:center">' +
          '<div style="min-width:0;flex:1;margin-right:8px">' +
            '<span class="muted" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em">KIT PRESET</span>' +
            '<h4 style="font-size:14px;font-weight:700;color:var(--timber-ink);margin-top:1px" class="truncate" id="p-name-preview">' + U.esc(editingPreset.name || 'Untitled Kit') + '</h4>' +
            (editingPreset.note ? '<p class="muted truncate" style="font-size:11px;margin-top:1px" id="p-note-preview">' + U.esc(editingPreset.note) + '</p>' : '') +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="p-toggle-meta" style="width:auto;min-height:28px;padding:0 9px;font-size:11px;border-radius:var(--r-pill)">' +
            U.icon('edit', 'mr4') + 'Rename' +
          '</button>' +
        '</div>' +
        '<div id="p-meta-fields" style="display:none;margin-top:10px;padding-top:8px;border-top:1px solid var(--line)">' +
          '<div class="field mb6">' +
            '<label for="p-name" style="font-size:11px;font-weight:700">Preset Name *</label>' +
            '<input class="input" id="p-name" value="' + U.esc(editingPreset.name) + '" style="min-height:36px;font-size:13.5px">' +
          '</div>' +
          '<div class="field mb4">' +
            '<label for="p-note" style="font-size:11px;font-weight:700">Notes</label>' +
            '<input class="input" id="p-note" value="' + U.esc(editingPreset.note || '') + '" style="min-height:34px;font-size:12.5px">' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    // In-Kit Category Chips
    var inKitCatChips = '<button type="button" class="chip' + (inKitCat ? '' : ' on') + '" data-act="p-in-kit-cat" data-id="">All</button>' +
      S.categories().map(function (c) {
        return '<button type="button" class="chip' + (inKitCat === c.id ? ' on' : '') + '" data-act="p-in-kit-cat" data-id="' + c.id + '">' +
          U.icon(c.icon || 'plate') + ' ' + U.esc(c.name) +
        '</button>';
      }).join('');

    // Catalog Category Chips
    var catalogCatChips = '<button type="button" class="chip' + (presetCat ? '' : ' on') + '" data-act="p-filter-cat" data-id="">All</button>' +
      S.categories().map(function (c) {
        return '<button type="button" class="chip' + (presetCat === c.id ? ' on' : '') + '" data-act="p-filter-cat" data-id="' + c.id + '">' +
          U.icon(c.icon || 'plate') + ' ' + U.esc(c.name) +
        '</button>';
      }).join('');

    var tabContent = (presetTab === 'items')
      ? ('<div class="preset-inkit-tab">' +
          (inKitCount > 0 ? (
            '<div class="search mb8">' +
              U.icon('search', 'search-icon') +
              '<input class="input" id="p-in-kit-q" type="search" placeholder="Search items in this kit..." value="' + U.esc(inKitQ) + '">' +
            '</div>' +
            '<div class="chips filter-bar mb8" id="p-in-kit-cat-chips">' + inKitCatChips + '</div>'
          ) : '') +
          '<div id="p-items-container">' + renderPresetLinesHtml() + '</div>' +
        '</div>')
      : ('<div class="preset-catalog-tab">' +
          '<div class="search mb8">' +
            U.icon('search', 'search-icon') +
            '<input class="input" id="p-search-q" type="search" placeholder="Search gear by name, brand, or tag" value="' + U.esc(presetQ) + '">' +
          '</div>' +
          '<div class="chips filter-bar mb8" id="p-cat-chips">' + catalogCatChips + '</div>' +
          '<div class="row row-between mb8" style="font-size:11.5px">' +
            '<div class="row" style="gap:4px">' +
              '<button type="button" class="btn btn-ghost btn-sm ' + (presetFilter === 'all' ? 'on' : '') + '" data-act="p-filter-scope" data-scope="all" style="min-height:26px;font-size:11px;padding:0 8px;border-radius:var(--r-pill)">All Gear</button>' +
              '<button type="button" class="btn btn-ghost btn-sm ' + (presetFilter === 'not-in-kit' ? 'on' : '') + '" data-act="p-filter-scope" data-scope="not-in-kit" style="min-height:26px;font-size:11px;padding:0 8px;border-radius:var(--r-pill)">Not in Kit</button>' +
            '</div>' +
            '<span class="muted" style="font-size:11px">1-tap Add to Kit</span>' +
          '</div>' +
          '<div class="list mb12" id="p-catalog-container">' + renderPresetCatalogRows() + '</div>' +
        '</div>');

    return metaCardHtml +
      /* ANIMATED MAGIC PILL TAB BAR WITH DISTINCT ICONS */
      '<div class="seg seg-animated mb10" id="p-seg-tabs" style="margin-top:0">' +
        '<div class="seg-glider" id="p-seg-glider"></div>' +
        '<button type="button" class="' + (presetTab === 'items' ? 'on' : '') + '" data-act="p-switch-tab" data-tab="items">' +
          U.icon('layers', 'mr4') + 'In Kit (<span id="p-kit-count">' + inKitCount + '</span>)' +
        '</button>' +
        '<button type="button" class="' + (presetTab === 'add' ? 'on' : '') + '" data-act="p-switch-tab" data-tab="add">' +
          U.icon('plus', 'mr4') + 'Add Gear' +
        '</button>' +
      '</div>' +
      '<div id="p-tab-viewport">' + tabContent + '</div>';
  }

  function openPresetEditor(presetId, isBack, transitionDir) {
    var p = presetId ? S.preset(presetId) : null;
    editingPreset = p ? S.clone(p) : { id: '', name: '', note: '', lines: [] };

    // Reset filters and capture pristine snapshot on initial entry
    if (!isBack && !transitionDir) {
      initialPresetSnapshot = JSON.stringify(editingPreset);
      presetTab = editingPreset.lines.length ? 'items' : 'add';
      inKitQ = '';
      inKitCat = '';
      presetQ = '';
      presetCat = '';
      presetFilter = 'all';
      Nav.push(function (b) { openPresetEditor(presetId, b); });
    }

    var html = renderPresetEditorBody() +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary mb8" data-act="save-preset-editor">' +
          U.icon('check', 'mr4') + (p ? 'Save Kit Changes' : 'Create Kit Preset') +
        '</button>' +
        '<button type="button" class="btn btn-ghost" data-act="p-cancel-editor">' +
          (Nav.hasBack() ? '&larr; Back' : 'Cancel') +
        '</button>' +
      '</div>';

    var dir = transitionDir || (isBack ? 'back' : (Nav.hasBack() ? 'forward' : 'none'));
    var body = U.openSheet(p ? ('Edit: ' + p.name) : 'New Kit Preset', html, delegate, dir);
    U.hydrateThumbs(body);

    attachPresetEditorInputListeners();

    setTimeout(function () {
      updatePresetGlider(body, true);
    }, 30);
  }

  function attachPresetEditorInputListeners() {
    var nameIn = document.getElementById('p-name');
    if (nameIn) {
      nameIn.addEventListener('input', function () {
        if (editingPreset) {
          editingPreset.name = nameIn.value;
          var prev = document.getElementById('p-name-preview');
          if (prev) prev.textContent = nameIn.value || 'Untitled Kit';
        }
      });
    }

    var noteIn = document.getElementById('p-note');
    if (noteIn) {
      noteIn.addEventListener('input', function () {
        if (editingPreset) {
          editingPreset.note = noteIn.value;
          var nPrev = document.getElementById('p-note-preview');
          if (nPrev) nPrev.textContent = noteIn.value || '';
        }
      });
    }

    var inKitQIn = document.getElementById('p-in-kit-q');
    if (inKitQIn) {
      inKitQIn.addEventListener('input', function () {
        inKitQ = inKitQIn.value;
        updatePresetItemsDOM();
      });
    }

    var qIn = document.getElementById('p-search-q');
    if (qIn) {
      qIn.addEventListener('input', function () {
        presetQ = qIn.value;
        updatePresetCatalogDOM();
      });
    }
  }

  /* --------------------------------------------------------------------------
     EVENT METADATA FORM
     -------------------------------------------------------------------------- */
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

  /* --------------------------------------------------------------------------
     ACTION HANDLER
     -------------------------------------------------------------------------- */
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

    /* Exit Guard from Preset Editor */
    if (act === 'p-cancel-editor') {
      return promptExitPresetEditor();
    }
    if (act === 'sheet-close' && editingPreset) {
      return promptExitPresetEditor();
    }
    if (act === 'modal-back' && editingPreset) {
      return promptExitPresetEditor();
    }

    /* Pop-up confirmation choices */
    if (act === 'p-cancel-discard') {
      Nav.back();
      return true;
    }
    if (act === 'p-confirm-discard') {
      initialPresetSnapshot = null;
      editingPreset = null;
      Nav.pop(); // pop confirmation
      if (Nav.hasBack()) {
        Nav.back();
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      U.toast('Changes discarded.');
      return true;
    }
    if (act === 'p-save-and-exit') {
      var kName = (editingPreset ? editingPreset.name : '').trim();
      if (!kName) {
        Nav.back();
        U.toast('Please give this kit a name first.');
        return true;
      }
      S.savePreset(editingPreset);
      initialPresetSnapshot = null;
      editingPreset = null;
      Nav.pop();
      if (Nav.hasBack()) {
        Nav.back();
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      U.toast('Kit preset "' + kName + '" saved.');
      return true;
    }

    /* Checklist filters */
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

    /* Toggle Rename/Notes in preset edit */
    if (act === 'p-toggle-meta') {
      var metaEl = document.getElementById('p-meta-fields');
      if (metaEl) {
        var isHidden = metaEl.style.display === 'none';
        metaEl.style.display = isHidden ? 'block' : 'none';
        var btn = el ? el.closest('[data-act="p-toggle-meta"]') : null;
        if (btn && btn.tagName === 'BUTTON') {
          btn.innerHTML = isHidden ? (U.icon('check', 'mr4') + 'Done') : (U.icon('edit', 'mr4') + 'Rename');
        }
      }
      return true;
    }

    /* Preset Editor Tab Switch (In Kit <-> Add Gear) with Glider Animation */
    if (act === 'p-switch-tab') {
      presetTab = el.getAttribute('data-tab') || 'items';
      syncPresetInputsToMemory();

      var viewport = document.getElementById('p-tab-viewport');
      if (viewport) {
        var segBtns = document.querySelectorAll('#p-seg-tabs button[data-act="p-switch-tab"]');
        for (var s = 0; s < segBtns.length; s++) {
          segBtns[s].classList.toggle('on', segBtns[s].getAttribute('data-tab') === presetTab);
        }

        updatePresetGlider(document, false);

        var inKitCount = editingPreset.lines.length;
        var inKitCatChips = '<button type="button" class="chip' + (inKitCat ? '' : ' on') + '" data-act="p-in-kit-cat" data-id="">All</button>' +
          S.categories().map(function (c) {
            return '<button type="button" class="chip' + (inKitCat === c.id ? ' on' : '') + '" data-act="p-in-kit-cat" data-id="' + c.id + '">' +
              U.icon(c.icon || 'plate') + ' ' + U.esc(c.name) +
            '</button>';
          }).join('');

        var catalogCatChips = '<button type="button" class="chip' + (presetCat ? '' : ' on') + '" data-act="p-filter-cat" data-id="">All</button>' +
          S.categories().map(function (c) {
            return '<button type="button" class="chip' + (presetCat === c.id ? ' on' : '') + '" data-act="p-filter-cat" data-id="' + c.id + '">' +
              U.icon(c.icon || 'plate') + ' ' + U.esc(c.name) +
            '</button>';
          }).join('');

        viewport.innerHTML = (presetTab === 'items')
          ? ('<div class="preset-inkit-tab">' +
              (inKitCount > 0 ? (
                '<div class="search mb8">' +
                  U.icon('search', 'search-icon') +
                  '<input class="input" id="p-in-kit-q" type="search" placeholder="Search items in this kit..." value="' + U.esc(inKitQ) + '">' +
                '</div>' +
                '<div class="chips filter-bar mb8" id="p-in-kit-cat-chips">' + inKitCatChips + '</div>'
              ) : '') +
              '<div id="p-items-container">' + renderPresetLinesHtml() + '</div>' +
            '</div>')
          : ('<div class="preset-catalog-tab">' +
              '<div class="search mb8">' +
                U.icon('search', 'search-icon') +
                '<input class="input" id="p-search-q" type="search" placeholder="Search gear by name, brand, or tag" value="' + U.esc(presetQ) + '">' +
              '</div>' +
              '<div class="chips filter-bar mb8" id="p-cat-chips">' + catalogCatChips + '</div>' +
              '<div class="row row-between mb8" style="font-size:11.5px">' +
                '<div class="row" style="gap:4px">' +
                  '<button type="button" class="btn btn-ghost btn-sm ' + (presetFilter === 'all' ? 'on' : '') + '" data-act="p-filter-scope" data-scope="all" style="min-height:26px;font-size:11px;padding:0 8px;border-radius:var(--r-pill)">All Gear</button>' +
                  '<button type="button" class="btn btn-ghost btn-sm ' + (presetFilter === 'not-in-kit' ? 'on' : '') + '" data-act="p-filter-scope" data-scope="not-in-kit" style="min-height:26px;font-size:11px;padding:0 8px;border-radius:var(--r-pill)">Not in Kit</button>' +
                '</div>' +
                '<span class="muted" style="font-size:11px">1-tap Add to Kit</span>' +
              '</div>' +
              '<div class="list mb12" id="p-catalog-container">' + renderPresetCatalogRows() + '</div>' +
            '</div>');

        U.hydrateThumbs(viewport);
        attachPresetEditorInputListeners();
      }
      return true;
    }

    /* In-Kit Filter Actions */
    if (act === 'p-in-kit-cat') {
      inKitCat = id;
      var inChips = document.querySelectorAll('#p-in-kit-cat-chips .chip');
      for (var ik = 0; ik < inChips.length; ik++) {
        inChips[ik].classList.toggle('on', (inChips[ik].getAttribute('data-id') || '') === inKitCat);
      }
      updatePresetItemsDOM();
      return true;
    }

    if (act === 'p-clear-in-kit-filters') {
      inKitQ = '';
      inKitCat = '';
      var sIn = document.getElementById('p-in-kit-q');
      if (sIn) sIn.value = '';
      var chipsClear = document.querySelectorAll('#p-in-kit-cat-chips .chip');
      for (var k = 0; k < chipsClear.length; k++) {
        chipsClear[k].classList.toggle('on', (chipsClear[k].getAttribute('data-id') || '') === '');
      }
      updatePresetItemsDOM();
      return true;
    }

    /* Catalog Filter Actions */
    if (act === 'p-filter-cat') {
      presetCat = id;
      var pChips = document.querySelectorAll('#p-cat-chips .chip');
      for (var cIdx = 0; cIdx < pChips.length; cIdx++) {
        pChips[cIdx].classList.toggle('on', (pChips[cIdx].getAttribute('data-id') || '') === presetCat);
      }
      updatePresetCatalogDOM();
      return true;
    }

    if (act === 'p-filter-scope') {
      presetFilter = el.getAttribute('data-scope') || 'all';
      var scopeBtns = document.querySelectorAll('button[data-act="p-filter-scope"]');
      for (var bIdx = 0; bIdx < scopeBtns.length; bIdx++) {
        scopeBtns[bIdx].classList.toggle('on', scopeBtns[bIdx].getAttribute('data-scope') === presetFilter);
      }
      updatePresetCatalogDOM();
      return true;
    }

    /* 1-Tap Add Gear to Preset */
    if (act === 'p-add-item') {
      if (!editingPreset) return true;
      var itToAdd = S.item(id);
      if (!itToAdd) return true;

      editingPreset.lines.push({ itemId: id, qty: 1 });
      U.toast('Added "' + itToAdd.name + '" (1 pc).');

      var kitCountSpan = document.getElementById('p-kit-count');
      if (kitCountSpan) kitCountSpan.textContent = editingPreset.lines.length;
      updatePresetGlider(document, false);

      updatePresetCatalogDOM();
      return true;
    }

    /* Stepper Increment / Decrement inside Preset */
    if (act === 'p-qty-plus' || act === 'p-qty-minus') {
      if (!editingPreset) return true;
      var deltaP = (act === 'p-qty-plus') ? 1 : -1;
      var context = el.getAttribute('data-context');

      var foundLine = null;
      editingPreset.lines.forEach(function (l) { if (l.itemId === id) foundLine = l; });

      if (foundLine) {
        foundLine.qty = Math.max(0, foundLine.qty + deltaP);
        if (foundLine.qty === 0) {
          editingPreset.lines = editingPreset.lines.filter(function (l) { return l.itemId !== id; });

          var kitCountSpanZ = document.getElementById('p-kit-count');
          if (kitCountSpanZ) kitCountSpanZ.textContent = editingPreset.lines.length;
          updatePresetGlider(document, false);

          if (context === 'catalog') {
            updatePresetCatalogDOM();
          } else {
            updatePresetItemsDOM();
          }
          return true;
        }

        var itemInput = document.getElementById('p-in-' + id);
        if (itemInput) itemInput.value = foundLine.qty;
        var catInput = document.getElementById('p-cat-in-' + id);
        if (catInput) catInput.value = foundLine.qty;
      }
      return true;
    }

    /* Manual numeric input change */
    if (act === 'p-qty-input') {
      if (!editingPreset) return true;
      var nVal = parseInt(el.value, 10);
      editingPreset.lines.forEach(function (l) {
        if (l.itemId === id) l.qty = Math.max(1, isNaN(nVal) ? 1 : nVal);
      });
      return true;
    }

    /* Remove item from Preset */
    if (act === 'p-remove-line') {
      if (!editingPreset) return true;
      editingPreset.lines = editingPreset.lines.filter(function (l) { return l.itemId !== id; });

      var kitCountSpanR = document.getElementById('p-kit-count');
      if (kitCountSpanR) kitCountSpanR.textContent = editingPreset.lines.length;
      updatePresetGlider(document, false);

      updatePresetItemsDOM();
      U.toast('Item removed from kit.');
      return true;
    }

    /* Save Preset Changes */
    if (act === 'save-preset-editor') {
      syncPresetInputsToMemory();
      var kitName = (editingPreset ? editingPreset.name : '').trim();
      if (!kitName) { U.toast('Please give this kit a name.'); return true; }

      S.savePreset(editingPreset);
      initialPresetSnapshot = null;
      editingPreset = null;
      U.toast('Kit preset "' + kitName + '" saved.');
      if (Nav.hasBack()) {
        Nav.back();
      } else {
        Nav.clear();
        U.closeSheet();
        App.rerenderQuiet();
      }
      return true;
    }

    /* Delete Preset */
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