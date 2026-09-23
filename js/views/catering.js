/* ==========================================================================
   Loreto's Catering Tracker — Views: Catering (js/views/catering.js)
   - Optimized for iPhone 5s (320px screen width) & iOS 12 Mobile Safari
   - Animations ONLY on tab switch (no flashing on +/- stepper taps)
   - Full Item Detail Pop-up Modal on item tap (zero truncation)
   - Non-overlapping multi-line tags & status counts for consumables
   - Clean, compact "Export to text" button
   - Real-time crew auto-update
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.catering = (function () {
  var U = App.UI, S = App.Store;
  var tab = 'load';
  var lastRenderedTab = null;
  var onlyShort = false, pickQ = '', pickCat = '';
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

  function startScreen() {
    var presets = S.presets();
    var last = S.history()[0];

    return '<div class="banner mb12">' +
        '<h3>Ready for the next booking</h3>' +
        '<p class="muted mt8" style="color:rgba(250,246,240,0.85)">Load gear from a kit preset, or build the van load piece-by-piece from inventory.</p>' +
        '<button type="button" class="btn btn-primary mt12" data-act="new-blank">' +
          U.icon('plus', 'mr4') + ' Start a blank event' +
        '</button>' +
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
      '<button type="button" data-act="tab" data-id="foreign" class="' + (tab === 'foreign' ? 'on' : '') + '">Not ours</button>' +
      '<button type="button" data-act="tab" data-id="load" class="' + (tab === 'load' ? 'on' : '') + '">Load-out</button>' +
      '<button type="button" data-act="tab" data-id="crew" class="' + (tab === 'crew' ? 'on' : '') + '">Crew (' + (ev.staffIds || []).length + ')</button>' +
    '</div>';
  }

  function loadTab(ev) {
    var editable = ev.status === 'staging';

    var headerBtns = editable ? (
      '<div class="row row-between mb12">' +
        '<button type="button" class="btn btn-primary btn-sm grow mr8" data-act="open-checklist">' +
          U.icon('plus', 'mr4') + ' Add items' +
        '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm grow" data-act="pick-preset-load">' +
          U.icon('layers', 'mr4') + ' Load kit preset' +
        '</button>' +
      '</div>'
    ) : '';

    if (!ev.lines.length) {
      return headerBtns + U.empty('truck', 'Nothing loaded yet', 'Search gear or pick a kit preset to fill the van.',
        editable ? '<button type="button" class="btn btn-primary" data-act="open-checklist">' + U.icon('plus', 'mr4') + ' Open gear checklist</button>' : '');
    }

    var rows = ev.lines.map(function (l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var brandLabel = l.brand ? l.brand : (l.tagLabel || 'Loreto');
      var isConsumable = !!l.isConsumable;

      return '<div class="pack-row" id="row-load-' + l.itemId + '">' +
        '<div class="row row-between" style="align-items:flex-start">' +
          '<div class="row grow mr8 pack-item-clickable" data-act="inspect-item" data-id="' + l.itemId + '" style="min-width:0">' +
            '<span class="pack-thumb" data-photo="' + photoKey + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow" style="min-width:0">' +
              '<span class="item-name" style="word-break:break-word;line-height:1.25">' + U.esc(l.name) + '</span>' +
              '<div class="pack-tags-wrap">' +
                U.tag(brandLabel, l.tagColor) +
                (isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
                '<span class="muted" style="font-size:11px">' + l.out + ' ' + U.esc(l.unit) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          (editable
            ? '<div class="stepper">' +
                '<button type="button" class="step-btn" data-act="out-minus" data-id="' + l.itemId + '">' + U.icon('minus') + '</button>' +
                '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" data-act="out-input" data-id="' + l.itemId + '" value="' + l.out + '">' +
                '<button type="button" class="step-btn" data-act="out-plus" data-id="' + l.itemId + '">' + U.icon('plus') + '</button>' +
              '</div>'
            : '<span class="item-qty">' + l.out + ' ' + U.esc(l.unit) + '</span>') +
        '</div>' +
        (editable ? '<div class="row row-between mt4">' +
          '<span></span>' +
          '<button type="button" class="muted" style="font-size:11.5px;color:var(--alert);background:none;border:none;cursor:pointer" data-act="remove-line" data-id="' + l.itemId + '">Remove</button>' +
        '</div>' : '') +
      '</div>';
    }).join('');

    return headerBtns +
      '<div class="list">' + rows + '</div>' +
      (editable
        ? '<button type="button" class="btn btn-primary mt12" data-act="mark-loaded">' +
            U.icon('check', 'mr4') + ' Van is loaded \u2014 Lock it in' +
          '</button>' +
          '<button type="button" class="btn btn-ghost mt8 mb16" data-act="export-manifest-text" style="min-height:38px;font-size:12.5px">' +
            U.icon('edit', 'mr4') + ' Export to text' +
          '</button>' +
          '<button type="button" class="btn btn-danger mt8 mb16" data-act="cancel-event">Cancel this event</button>'
        : '<p class="muted mt12" style="text-align:center;font-size:12px">Counts are locked while out at the event. Track returns in Pack Down.</p>');
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

  function backTab(ev) {
    if (!ev.lines.length) return U.empty('plate', 'Nothing was loaded', 'This event went out empty.');

    var durableLines = ev.lines.filter(function (l) { return !l.isConsumable; });
    var consumableLines = ev.lines.filter(function (l) { return !!l.isConsumable; });

    if (onlyShort) {
      durableLines = durableLines.filter(function (l) { return l.back < l.out; });
      consumableLines = [];
    }

    function durableRow(l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var short = l.out - l.back;
      var brandLabel = l.brand ? l.brand : (l.tagLabel || 'Loreto');

      return '<div class="pack-row ' + (short === 0 ? 'done' : 'short') + '" id="row-' + l.itemId + '">' +
        '<div class="row row-between" style="align-items:flex-start">' +
          '<div class="row grow mr8 pack-item-clickable" data-act="inspect-item" data-id="' + l.itemId + '" style="min-width:0">' +
            '<span class="pack-thumb" data-photo="' + photoKey + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow" style="min-width:0">' +
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
    }

    function consumableRow(l) {
      var it = S.item(l.itemId);
      var photoKey = it && it.photoId ? (it.photoId + '-t') : '';
      var cat = it ? S.category(it.categoryId) : null;
      var used = l.out - l.back;
      var brandLabel = l.brand ? l.brand : (l.tagLabel || 'Supply');
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
          '<div class="row grow mr8 pack-item-clickable" data-act="inspect-item" data-id="' + l.itemId + '" style="min-width:0">' +
            '<span class="pack-thumb" data-photo="' + photoKey + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow" style="min-width:0">' +
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

    var durableHtml = durableLines.length ? (
      '<div class="list mb12">' + durableLines.map(durableRow).join('') + '</div>'
    ) : (onlyShort ? '<div class="empty mb12"><p class="muted">All reusable gear accounted for.</p></div>' : '');

    var consumableHtml = (!onlyShort && consumableLines.length) ? (
      '<div class="mt16 mb8">' +
        '<h2 class="section-title mb4" style="font-size:13px;text-transform:uppercase;letter-spacing:.04em">' +
          U.icon('sparkles') + ' Consumables & Supplies (' + consumableLines.length + ')' +
        '</h2>' +
        '<p class="muted mb8" style="font-size:11.5px">Log unused items brought back vs supplies consumed on site.</p>' +
        '<div class="list mb12">' + consumableLines.map(consumableRow).join('') + '</div>' +
      '</div>'
    ) : '';

    return '<div class="row row-between mb8">' +
        '<button type="button" class="chip' + (onlyShort ? ' on' : '') + '" data-act="toggle-short">' +
          U.icon('alert') + ' Only missing gear' +
        '</button>' +
        '<button type="button" class="chip" data-act="all-back-gear">' +
          U.icon('check') + ' Mark all gear back' +
        '</button>' +
      '</div>' +

      (durableLines.length ? '<h2 class="section-title mb4" style="font-size:13px;text-transform:uppercase;letter-spacing:.04em">' + U.icon('truck') + ' Reusable Equipment (' + durableLines.length + ')</h2>' : '') +
      durableHtml +
      consumableHtml +

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

  function mounted(root) {
    U.hydrateThumbs(root || document);
    updateGlider(root || document);
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
        '<div class="staff-avatar-large" data-photo="' + photoKey + '" style="width:84px;height:84px;border-radius:18px;margin:0 auto 10px auto;border:2px solid var(--line);background-color:var(--sand-soft)">' +
          (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
        '</div>' +
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

  function openGearChecklist() {
    var ev = S.activeEvent();
    if (!ev) return;

    var list = S.searchItems(pickQ, pickCat, 'alpha-asc');
    var cats = S.categories();

    var catChips = '<button type="button" class="chip' + (pickCat ? '' : ' on') + '" data-act="chk-cat" data-id="">All</button>' +
      cats.map(function (c) {
        return '<button type="button" class="chip' + (pickCat === c.id ? ' on' : '') + '" data-act="chk-cat" data-id="' + c.id + '">' +
          U.esc(c.name) + '</button>';
      }).join('');

    var rows = list.map(function (i) {
      var staged = 0;
      ev.lines.forEach(function (l) { if (l.itemId === i.id) staged = l.out; });
      var brandLabel = i.brand ? i.brand : (i.tagLabel || 'Loreto');
      var photoKey = i.photoId ? (i.photoId + '-t') : '';
      var cat = S.category(i.categoryId);

      return '<div class="pack-row">' +
        '<div class="row row-between" style="align-items:flex-start">' +
          '<div class="row grow mr8 pack-item-clickable" data-act="inspect-item" data-id="' + i.id + '" style="min-width:0">' +
            '<span class="pack-thumb" data-photo="' + photoKey + '">' +
              (!photoKey ? U.icon(cat ? cat.icon : 'plate') : '') +
            '</span>' +
            '<div class="grow" style="min-width:0">' +
              '<span class="item-name" style="word-break:break-word;line-height:1.25">' + U.esc(i.name) + '</span>' +
              '<span class="item-sub">' +
                '<strong style="color:var(--foliage)">' + i.qty + ' in inventory</strong> &middot; ' + U.esc(i.unit) +
              '</span>' +
              '<div class="pack-tags-wrap">' +
                U.tag(brandLabel, i.tagColor) +
                (i.isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="chk-minus" data-id="' + i.id + '">' + U.icon('minus') + '</button>' +
            '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" id="chk-in-' + i.id + '" data-act="chk-input" data-id="' + i.id + '" value="' + staged + '">' +
            '<button type="button" class="step-btn" data-act="chk-plus" data-id="' + i.id + '">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    var html =
      '<div class="search">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="chk-q" type="search" placeholder="Search gear by name or brand" value="' + U.esc(pickQ) + '">' +
      '</div>' +
      '<div class="chips filter-bar">' + catChips + '</div>' +
      '<div class="list mb12">' + (rows || '<div class="empty"><p class="muted">No gear found.</p></div>') + '</div>' +
      '<button type="button" class="btn btn-primary" data-act="sheet-close">Done staging</button>';

    var body = U.openSheet('Gear Checklist', html, onAct);
    U.hydrateThumbs(body);

    var qInput = document.getElementById('chk-q');
    if (qInput) {
      qInput.addEventListener('input', function () {
        pickQ = qInput.value;
        openGearChecklist();
        var reFocus = document.getElementById('chk-q');
        if (reFocus) reFocus.focus();
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

  function openPresetInspector(presetId, isAddingToActiveEvent) {
    var avail = S.checkPresetAvailability(presetId);
    if (!avail) return;
    var p = avail.preset;
    var hasActive = !!S.activeEvent();

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

    var clampBtnText = hasActive ? 'Add kit to van (Auto-clamp)' : 'Start event with this kit (Auto-clamp)';
    var fullBtnText  = hasActive ? 'Add full kit to van' : 'Start event with full kit';

    var html =
      alertNotice +
      '<div class="list mb12">' + linesHtml + '</div>' +
      '<div class="sheet-sticky-footer">' +
        (!avail.available
          ? '<button type="button" class="btn btn-primary" data-act="apply-preset-clamped" data-id="' + p.id + '">' +
              U.icon('check', 'mr4') + clampBtnText +
            '</button>' +
            '<button type="button" class="btn btn-ghost mt8" data-act="apply-preset-full" data-id="' + p.id + '">' +
              fullBtnText + ' (Ignore shortfall)' +
            '</button>'
          : '<button type="button" class="btn btn-primary" data-act="apply-preset-full" data-id="' + p.id + '">' +
              U.icon('truck', 'mr4') + fullBtnText +
            '</button>') +
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

  function onAct(act, el) {
    var ev = S.activeEvent();
    var id = el ? el.getAttribute('data-id') : '';

    if (act === 'inspect-item') {
      openItemDetail(id);
      return;
    }

    if (act === 'manage-presets') { openPresetManagerSheet(); return; }
    if (act === 'new-preset') { openPresetEditor(null); return; }
    if (act === 'edit-preset-catering') { openPresetEditor(id); return; }
    if (act === 'inspect-preset') { openPresetInspector(id, false); return; }
    if (act === 'pick-preset-load') {
      var presets = S.presets();
      U.openSheet('Select Kit Preset to Add',
        '<div class="list mb12">' + presets.map(function (p) {
          return '<button type="button" class="item" data-act="inspect-preset-add" data-id="' + p.id + '">' +
            '<span class="thumb">' + U.icon('layers') + '</span>' +
            '<span class="grow"><span class="item-name">' + U.esc(p.name) + '</span>' +
            '<span class="item-sub">' + p.lines.length + ' kinds included</span></span>' +
            '<span class="item-qty">' + U.icon('chevronRight') + '</span></button>';
        }).join('') + '</div>' +
        '<button type="button" class="btn btn-ghost" data-act="sheet-close">Cancel</button>', onAct);
      return;
    }
    if (act === 'inspect-preset-add') { openPresetInspector(id, true); return; }

    /* Clean Plain Text Export Action */
    if (act === 'export-manifest-text') {
      openTextManifest(ev);
      return;
    }
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

    /* Preset Editor Actions */
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
      var delta = (act === 'p-qty-plus') ? 1 : -1;
      editingPreset.lines.forEach(function (l) {
        if (l.itemId === id) l.qty = Math.max(1, l.qty + delta);
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

    /* Apply Preset Actions */
    if (act === 'apply-preset-clamped' || act === 'apply-preset-full') {
      var clamp = (act === 'apply-preset-clamped');

      if (ev) {
        var pKit = S.preset(id);
        if (pKit) {
          pKit.lines.forEach(function (l) {
            var it = S.item(l.itemId);
            if (it) {
              var q = clamp ? Math.min(l.qty, it.qty) : l.qty;
              if (q > 0) S.addLine(ev, it.id, q);
            }
          });
        }
        U.closeSheet();
        tab = 'load';
        App.rerenderQuiet();
        U.toast('Kit items added to van.');
      } else {
        eventForm(null, id, clamp);
      }
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
      App.rerenderQuiet();
      return;
    }

    if (act === 'open-checklist') { pickQ = ''; pickCat = ''; openGearChecklist(); return; }
    if (act === 'chk-cat') { pickCat = el.getAttribute('data-id'); openGearChecklist(); return; }

    if (act === 'chk-plus' || act === 'chk-minus') {
      var delta = (act === 'chk-plus') ? 1 : -1;
      var curLine = null;
      ev.lines.forEach(function (l) { if (l.itemId === id) curLine = l; });
      var curCount = curLine ? curLine.out : 0;
      var nextCount = Math.max(0, curCount + delta);

      S.setOut(ev, id, nextCount);
      var inp = document.getElementById('chk-in-' + id);
      if (inp) inp.value = nextCount;
      return;
    }
    if (act === 'chk-input') {
      var n = parseInt(el.value, 10);
      S.setOut(ev, id, isNaN(n) ? 0 : n);
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
      S.setOut(ev, id, 0);
      App.rerenderQuiet();
      return;
    }

    /* Pack-Down Returns */
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
      App.rerenderQuiet();
      U.toast('Van locked. Ready for the event.');
      return;
    }

    if (act === 'cancel-event') {
      U.confirm('Cancel event', 'Discard the staged van load-out completely?', 'Cancel event', function () {
        S.removeEvent(ev.id);
        App.rerenderQuiet();
        U.toast('Event cancelled.');
      });
      return;
    }

    /* Staff Crew Assignment with Instant Auto-Update */
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

    /* Event Closure */
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
    openPresetManagerSheet: openPresetManagerSheet
  };
})();