/* views/catering.js — the reason the app exists: what left the kitchen,
   what came back, and what is not ours. */
window.App = window.App || {}; App.Views = App.Views || {};
App.Views.catering = (function () {
  var U = App.UI, S = App.Store;
  var tab = 'load', onlyShort = false, pickQ = '';

  /* ================= no active event ================= */
  function startScreen() {
    var presets = S.state().presets;
    var last = S.history()[0];
    return '<div class="banner">' +
        '<h3>Ready for the next booking</h3>' +
        '<p class="muted mt8">Start from a preset so nothing gets forgotten in the kitchen, or build the load piece by piece.</p>' +
        '<button class="btn btn-primary mt12" data-act="new-blank">Start a blank event</button>' +
      '</div>' +
      '<h2 class="section-title">Load from a preset</h2>' +
      (presets.length
        ? '<div class="list">' + presets.map(function (p) {
            var n = 0; p.lines.forEach(function (l) { n += l.qty; });
            return '<button class="item" data-act="use-preset" data-id="' + p.id + '">' +
              '<span class="thumb">\uD83D\uDCCB</span>' +
              '<span class="grow"><span class="item-name truncate">' + U.esc(p.name) + '</span>' +
              '<span class="item-sub">' + p.lines.length + ' kinds \u00b7 ' + n + ' pieces</span></span>' +
              '<span class="item-qty">\u203A</span></button>';
          }).join('') + '</div>' +
          '<button class="btn btn-ghost btn-sm mt12" data-act="manage-presets">Edit presets</button>'
        : U.empty('\uD83D\uDCCB', 'No presets yet', 'Finish one event and save its load-out as a preset.')) +
      (last ? '<h2 class="section-title">Last time out</h2>' +
        '<div class="card"><p style="font-size:15px;font-weight:600">' + U.esc(last.name) + '</p>' +
        '<p class="muted">' + U.esc(U.fmtDate(last.date)) + ' \u00b7 ' + S.tally(last).pct + '% came back</p></div>' : '');
  }

  /* ================= header ================= */
  function head(ev) {
    var t = S.tally(ev);
    return '<div class="banner">' +
      '<div class="row row-between">' +
        '<div class="grow"><p class="muted">' + (ev.status === 'staging' ? 'Loading the van' : 'Out at the venue') + '</p>' +
        '<h3 class="truncate">' + U.esc(ev.name) + '</h3>' +
        '<p class="muted mt8">' + U.esc(ev.venue || 'No venue') + ' \u00b7 ' + U.esc(U.fmtDate(ev.date)) + '</p></div>' +
        '<button class="step-btn" data-act="edit-event" aria-label="Edit event" style="background:transparent;border-color:rgba(250,247,242,.3);color:#FAF7F2">\u270E</button>' +
      '</div>' +
      (ev.status === 'out'
        ? '<div class="mt12"><div class="meter"><div class="meter-fill' + (t.pct === 100 ? ' full' : '') + '" id="meter" style="width:' + t.pct + '%"></div></div>' +
          '<p class="muted mt8" id="meter-text">' + t.back + ' of ' + t.out + ' back' + (t.missing ? ' \u00b7 ' + t.missing + ' still missing' : ' \u00b7 all accounted for') + '</p></div>'
        : '<p class="mt12" style="font-size:15px">' + t.out + ' pieces staged</p>') +
      '</div>';
  }

  function segs(ev) {
    if (ev.status === 'staging') return '';
    return '<div class="seg">' +
      '<button data-act="tab" data-id="back" class="' + (tab === 'back' ? 'on' : '') + '">Pack down</button>' +
      '<button data-act="tab" data-id="foreign" class="' + (tab === 'foreign' ? 'on' : '') + '">Not ours</button>' +
      '<button data-act="tab" data-id="load" class="' + (tab === 'load' ? 'on' : '') + '">Load-out</button>' +
      '</div>';
  }

  /* ================= load-out ================= */
  function loadTab(ev) {
    var editable = ev.status === 'staging';
    if (!ev.lines.length) {
      return U.empty('\uD83D\uDE9A', 'Nothing loaded yet', 'Add the trays, burners and chairs going to this event.',
        '<button class="btn btn-primary" data-act="pick">Add gear to the van</button>');
    }
    var rows = ev.lines.map(function (l) {
      return '<div class="pack-row">' +
        '<div class="item-name">' + U.esc(l.name) + '</div>' +
        '<div class="row row-between mt8">' +
          '<span class="grow truncate" style="padding-right:8px">' +
            (l.tagLabel ? U.tag(l.tagLabel, l.tagColor, l.tagStyle)
                        : '<span class="pack-count">No mark on this one</span>') + '</span>' +
          (editable ? U.stepper('out', l.itemId, l.out)
            : '<span class="item-qty">' + l.out + ' ' + U.esc(l.unit) + '</span>') +
        '</div></div>';
    }).join('');
    return '<div class="list">' + rows + '</div>' +
      (editable
        ? '<button class="btn btn-ghost mt12" data-act="pick">Add more gear</button>' +
          '<button class="btn btn-primary" data-act="mark-loaded">Van is loaded \u2014 lock it in</button>' +
          '<button class="btn btn-danger" data-act="cancel-event">Cancel this event</button>'
        : '<p class="muted mt12">Locked when the van left. Counting happens in Pack down.</p>');
  }

  /* ================= pack down ================= */
  function backTab(ev) {
    var lines = ev.lines.filter(function (l) { return onlyShort ? l.back < l.out : true; });
    if (!ev.lines.length) return U.empty('\uD83D\uDCE6', 'Nothing was loaded', 'This event went out empty.');
    var rows = lines.map(function (l) {
      var short = l.out - l.back;
      return '<div class="pack-row ' + (short === 0 ? 'done' : 'short') + '" id="row-' + l.itemId + '">' +
        '<div class="item-name">' + U.esc(l.name) + '</div>' +
        '<div class="row mt8">' +
          '<span class="grow truncate" style="padding-right:8px">' +
            (l.tagLabel ? U.tag(l.tagLabel, l.tagColor, l.tagStyle)
                        : '<span class="pack-count">No mark \u2014 check carefully</span>') + '</span>' +
          '<span class="pack-count" id="cnt-' + l.itemId + '">' +
            (short === 0 ? 'All ' + l.out + ' back' : '<span class="pack-short">' + short + ' missing</span> of ' + l.out) +
          '</span>' +
        '</div>' +
        '<div class="row row-between mt8">' +
          '<button class="step-btn" data-act="all-back" data-id="' + l.itemId + '" aria-label="Mark all back" style="width:auto;padding:0 14px;font-size:15px;font-weight:600;color:var(--foliage)">\u2713 All back</button>' +
          U.stepper('back', l.itemId, l.back) +
        '</div></div>';
    }).join('');
    return '<div class="row row-between mb8">' +
        '<button class="chip' + (onlyShort ? ' on' : '') + '" data-act="toggle-short">Show only missing</button>' +
        '<button class="chip" data-act="all-back-everything">Mark all back</button>' +
      '</div>' +
      '<div class="list">' + (rows || '<div class="empty"><p class="muted">Everything is back in the van.</p></div>') + '</div>' +
      '<button class="btn btn-primary mt12" data-act="close-event">Finish this event</button>';
  }

  /* ================= not ours ================= */
  function foreignTab(ev) {
    var t = S.tally(ev);
    return '<div class="card">' +
        '<div class="big-counter"><div class="n" id="foreign-n">' + t.foreign + '</div>' +
        '<p class="muted">pieces in the van that are not ours</p></div>' +
        '<p class="muted mt12">Venue plates, borrowed pans, a neighbour\u2019s cooler. Log it here before you drive off so it goes back to the owner.</p>' +
        '<button class="btn btn-primary mt12" data-act="add-foreign">Flag a foreign item</button>' +
      '</div>' +
      (ev.notOurs.length
        ? '<div class="list">' + ev.notOurs.map(function (n) {
            return '<div class="item">' +
              '<span class="thumb">\u26A0\uFE0F</span>' +
              '<span class="grow"><span class="item-name truncate">' + U.esc(n.label) + '</span>' +
              '<span class="item-sub">' + n.qty + ' pc' + (n.note ? ' \u00b7 ' + U.esc(n.note) : '') + '</span></span>' +
              '<button class="step-btn" data-act="del-foreign" data-id="' + n.id + '" aria-label="Remove">\u00d7</button></div>';
          }).join('') + '</div>'
        : U.empty('\uD83D\uDC4C', 'Nothing foreign flagged', 'Good. Everything in the van looks like ours.'));
  }

  /* ================= render ================= */
  function render() {
    var ev = S.activeEvent();
    if (!ev) return startScreen();
    if (ev.status === 'staging') tab = 'load';
    var body = tab === 'back' ? backTab(ev) : tab === 'foreign' ? foreignTab(ev) : loadTab(ev);
    return head(ev) + segs(ev) + body;
  }

  function mounted() { }

  /* ================= live patching (no full re-render on taps) ========= */
  function patchBack(ev, l) {
    var short = l.out - l.back;
    var val = document.querySelector('[data-val="' + l.itemId + '"]');
    if (val) val.textContent = l.back;
    var cnt = document.getElementById('cnt-' + l.itemId);
    if (cnt) cnt.innerHTML = short === 0 ? 'All ' + l.out + ' back'
      : '<span class="pack-short">' + short + ' missing</span> of ' + l.out;
    var row = document.getElementById('row-' + l.itemId);
    if (row) row.className = 'pack-row ' + (short === 0 ? 'done' : 'short');
    patchMeter(ev);
  }
  function patchMeter(ev) {
    var t = S.tally(ev);
    var m = document.getElementById('meter');
    if (m) { m.style.width = t.pct + '%'; m.className = 'meter-fill' + (t.pct === 100 ? ' full' : ''); }
    var mt = document.getElementById('meter-text');
    if (mt) mt.textContent = t.back + ' of ' + t.out + ' back' +
      (t.missing ? ' \u00b7 ' + t.missing + ' still missing' : ' \u00b7 all accounted for');
  }
  function line(ev, id) {
    var found = null;
    ev.lines.forEach(function (l) { if (l.itemId === id) found = l; });
    return found;
  }

  /* ================= sheets ================= */
  function eventForm(ev, presetId) {
    var html =
      '<div class="field"><label for="e-name">Event name</label>' +
        '<input class="input" id="e-name" value="' + U.esc(ev ? ev.name : '') + '" placeholder="Santos wedding reception"></div>' +
      '<div class="field"><label for="e-venue">Venue</label>' +
        '<input class="input" id="e-venue" value="' + U.esc(ev ? ev.venue : '') + '" placeholder="San Roque parish hall"></div>' +
      '<div class="field"><label for="e-date">Date</label>' +
        '<input class="input" id="e-date" type="date" value="' + U.esc(ev ? ev.date : U.today()) + '"></div>' +
      '<div class="field"><label for="e-note">Note for the crew</label>' +
        '<textarea class="input" id="e-note" placeholder="Pack down after 11pm, gate closes at midnight">' + U.esc(ev ? ev.note : '') + '</textarea></div>' +
      '<button class="btn btn-primary" data-act="' + (ev ? 'save-event' : 'create-event') + '"' +
        (presetId ? ' data-id="' + presetId + '"' : '') + '>' + (ev ? 'Save' : 'Start loading') + '</button>' +
      '<button class="btn btn-ghost" data-act="sheet-close">Cancel</button>';
    U.openSheet(ev ? 'Event details' : 'New event', html, onAct);
  }

  function picker() {
    var ev = S.activeEvent();
    var list = S.searchItems(pickQ, '');
    var rows = list.map(function (i) {
      var l = line(ev, i.id);
      return '<button class="item" data-act="pick-add" data-id="' + i.id + '">' +
        '<span class="thumb"' + (i.photoId ? ' data-photo="' + i.photoId + '-t"' : '') + '>' +
        (i.photoId ? '' : (S.category(i.categoryId) ? S.category(i.categoryId).emoji : '\uD83D\uDCE6')) + '</span>' +
        '<span class="grow"><span class="item-name truncate">' + U.esc(i.name) + '</span>' +
        '<span class="item-sub">' + i.qty + ' on the shelf</span></span>' +
        (l ? '<span class="item-qty" style="color:var(--terracotta)">' + l.out + '</span>' : '<span class="item-qty">+</span>') +
        '</button>';
    }).join('');
    var body = U.openSheet('Add gear to the van',
      '<div class="search"><input class="input" id="pick-q" type="search" placeholder="Search gear" value="' + U.esc(pickQ) + '" style="padding-left:13px"></div>' +
      '<div class="list">' + (rows || '<div class="empty"><p class="muted">No gear matches.</p></div>') + '</div>' +
      '<button class="btn btn-primary mt12" data-act="sheet-close">Done</button>', onAct);
    U.hydrateThumbs(body);
    var q = document.getElementById('pick-q');
    if (q) q.addEventListener('input', function () { pickQ = q.value; picker(); document.getElementById('pick-q').focus(); });
  }

  function closeSheetFlow(ev) {
    var t = S.tally(ev);
    var missing = ev.lines.filter(function (l) { return l.out > l.back; });
    U.openSheet('Finish ' + ev.name,
      '<div class="card"><div class="big-counter"><div class="n">' + t.pct + '%</div>' +
        '<p class="muted">' + t.back + ' of ' + t.out + ' pieces came home</p></div></div>' +
      (missing.length
        ? '<h2 class="section-title">Still missing</h2><div class="list">' + missing.map(function (l) {
            return '<div class="item"><span class="grow"><span class="item-name truncate">' + U.esc(l.name) + '</span>' +
              '<span class="item-sub">' + (l.out - l.back) + ' of ' + l.out + ' not back</span></span>' +
              U.tag(l.tagLabel, l.tagColor, l.tagStyle) + '</div>';
          }).join('') + '</div>' +
          '<label class="row mt12" style="font-size:14px"><input type="checkbox" id="deduct" style="width:22px;height:22px;margin-right:10px">' +
          '<span class="grow">Write the missing pieces off the shelf</span></label>'
        : '<p class="muted mt12">Every piece is back in the kitchen.</p>') +
      (t.foreign ? '<p class="muted mt12">' + t.foreign + ' foreign piece(s) still flagged \u2014 return them to the venue owner.</p>' : '') +
      '<button class="btn btn-primary mt12" data-act="confirm-close">Finish and file it</button>' +
      '<button class="btn btn-ghost" data-act="sheet-close">Not yet</button>', onAct);
  }

  function presetSheet() {
    var presets = S.state().presets;
    U.openSheet('Presets',
      '<div class="list mb8">' + (presets.map(function (p) {
        return '<div class="item"><span class="thumb">\uD83D\uDCCB</span>' +
          '<span class="grow"><span class="item-name truncate">' + U.esc(p.name) + '</span>' +
          '<span class="item-sub">' + p.lines.length + ' kinds</span></span>' +
          '<button class="step-btn" data-act="del-preset" data-id="' + p.id + '" aria-label="Delete">\u00d7</button></div>';
      }).join('') || '<div class="empty"><p class="muted">No presets yet.</p></div>') + '</div>' +
      '<button class="btn btn-ghost" data-act="sheet-close">Done</button>', onAct);
  }

  /* ================= actions ================= */
  function onAct(act, el) {
    var ev = S.activeEvent();
    var id = el ? el.getAttribute('data-id') : '';

    if (act === 'new-blank') { eventForm(null, ''); return; }
    if (act === 'use-preset') { eventForm(null, id); return; }
    if (act === 'create-event') {
      var name = (document.getElementById('e-name') || {}).value || '';
      var nev = S.createEvent({
        name: name.trim() || 'Event ' + U.fmtDate(U.today()),
        venue: (document.getElementById('e-venue') || {}).value || '',
        date: (document.getElementById('e-date') || {}).value || U.today(),
        note: (document.getElementById('e-note') || {}).value || '',
        presetId: el.getAttribute('data-id') || ''
      });
      tab = 'load'; U.closeSheet(); App.rerender();
      U.toast(nev.lines.length ? 'Preset loaded. Check the counts.' : 'Event started.');
      return;
    }
    if (act === 'edit-event') { eventForm(ev, ''); return; }
    if (act === 'save-event') {
      ev.name = ((document.getElementById('e-name') || {}).value || ev.name).trim();
      ev.venue = (document.getElementById('e-venue') || {}).value || '';
      ev.date = (document.getElementById('e-date') || {}).value || ev.date;
      ev.note = (document.getElementById('e-note') || {}).value || '';
      S.save(); U.closeSheet(); App.rerender(); return;
    }
    if (act === 'tab') { tab = id; App.rerender(); return; }
    if (act === 'pick') { pickQ = ''; picker(); return; }
    if (act === 'pick-add') { S.addLine(ev, id, 1); picker(); App.rerenderQuiet(); return; }

    if (act === 'out-plus' || act === 'out-minus') {
      var l = line(ev, id);
      if (!l) return;
      S.setOut(ev, id, l.out + (act === 'out-plus' ? 1 : -1));
      var v = document.querySelector('[data-val="' + id + '"]');
      if (l.out <= 0) { App.rerender(); } else if (v) { v.textContent = l.out; }
      return;
    }
    if (act === 'back-plus' || act === 'back-minus' || act === 'all-back') {
      var lb = line(ev, id);
      if (!lb) return;
      S.setBack(ev, id, act === 'all-back' ? lb.out : lb.back + (act === 'back-plus' ? 1 : -1));
      if (onlyShort && lb.back === lb.out) App.rerender(); else patchBack(ev, lb);
      return;
    }
    if (act === 'toggle-short') { onlyShort = !onlyShort; App.rerender(); return; }
    if (act === 'all-back-everything') {
      U.confirm('Mark everything back', 'This sets every line to fully returned. Use it only when the van is checked.', 'Mark all back', function () {
        ev.lines.forEach(function (l) { l.back = l.out; });
        S.save(); App.rerender(); U.toast('All lines marked back.');
      });
      return;
    }
    if (act === 'mark-loaded') {
      if (!ev.lines.length) { U.toast('Add gear before locking the van.'); return; }
      S.markLoaded(ev); tab = 'back'; App.rerender();
      U.toast('Locked in. Count things back after the event.');
      return;
    }
    if (act === 'cancel-event') {
      U.confirm('Cancel event', 'The staged load-out will be thrown away.', 'Cancel event', function () {
        S.removeEvent(ev.id); App.rerender(); U.toast('Event cancelled.');
      });
      return;
    }
    if (act === 'add-foreign') {
      U.openSheet('Not ours',
        '<div class="field"><label for="n-label">What is it</label>' +
          '<input class="input" id="n-label" placeholder="Blue serving bowl, venue"></div>' +
        '<div class="row"><div style="width:110px;padding-right:8px"><div class="field"><label for="n-qty">How many</label>' +
          '<input class="input" id="n-qty" type="number" inputmode="numeric" min="1" value="1"></div></div>' +
          '<div class="grow"><div class="field"><label for="n-note">Where it came from</label>' +
          '<input class="input" id="n-note" placeholder="Kitchen shelf"></div></div></div>' +
        '<button class="btn btn-primary" data-act="save-foreign">Flag it</button>' +
        '<button class="btn btn-ghost" data-act="sheet-close">Cancel</button>', onAct);
      return;
    }
    if (act === 'save-foreign') {
      var lab = (document.getElementById('n-label') || {}).value || '';
      if (!lab.trim()) { U.toast('Describe the item first.'); return; }
      S.addNotOurs(ev, lab.trim(), parseInt((document.getElementById('n-qty') || {}).value, 10) || 1,
        (document.getElementById('n-note') || {}).value || '');
      U.closeSheet(); tab = 'foreign'; App.rerender(); U.toast('Flagged. Hand it back before you leave.');
      return;
    }
    if (act === 'del-foreign') { S.removeNotOurs(ev, id); App.rerender(); return; }
    if (act === 'close-event') { closeSheetFlow(ev); return; }
    if (act === 'confirm-close') {
      var d = document.getElementById('deduct');
      var res = S.closeEvent(ev, !!(d && d.checked));
      U.closeSheet();
      tab = 'load'; App.rerender();
      U.toast(res.pct + '% of the gear came home.');
      if (ev.lines.length) {
        setTimeout(function () {
          U.confirm('Save as preset?', 'Reuse this exact load-out for the next similar booking.', false, function () {
            S.savePresetFromEvent(ev, ev.name); U.toast('Preset saved.');
          });
        }, 420);
      }
      return;
    }
    if (act === 'manage-presets') { presetSheet(); return; }
    if (act === 'del-preset') { S.removePreset(id); presetSheet(); App.rerenderQuiet(); return; }
  }

  return { title: 'Catering mode', render: render, mounted: mounted, onAct: onAct };
})();
