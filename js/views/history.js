/* ==========================================================================
   Loreto's Catering Tracker — Views: History & Ledger (js/views/history.js)
   - Optimized for iPhone 5s (320px screen width) & iOS 12 Mobile Safari
   - Plain text manifest export on past gigs (SMS / WhatsApp / Notepad)
   - Ledger breakdown: 100% Gear Recovery vs Consumed Supplies Used
   - Tracks shelf inventory write-off and consumable deduction status
   - Wording standardized to "in inventory"
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.history = (function () {
  var U = App.UI, S = App.Store;
  var q = '';

  function render() {
    var historyList = S.history();
    var query = q.toLowerCase().trim();

    var filtered = historyList.filter(function (e) {
      if (!query) return true;
      var hay = (e.name + ' ' + (e.venue || '') + ' ' + (e.date || '')).toLowerCase();
      return hay.indexOf(query) > -1;
    });

    var rows = filtered.map(function (ev) {
      var t = S.tally(ev);
      var isPerfect = t.pct === 100;

      return '<button type="button" class="item" data-act="open-history-detail" data-id="' + ev.id + '">' +
        '<span class="thumb" style="color:' + (isPerfect ? 'var(--foliage)' : 'var(--alert)') + '">' +
          U.icon(isPerfect ? 'check' : 'alert') +
        '</span>' +
        '<span class="grow truncate mr8">' +
          '<span class="item-name truncate">' + U.esc(ev.name) + '</span>' +
          '<span class="item-sub truncate">' +
            U.esc(ev.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) +
          '</span>' +
          '<span class="row mt4" style="flex-wrap:wrap;gap:4px">' +
            '<span class="tag ' + (isPerfect ? 'tag-green' : 'tag-red') + '" style="font-size:9.5px">' +
              t.pct + '% recovered' +
            '</span>' +
            (t.missing > 0 ? '<span class="tag tag-red" style="font-size:9.5px">' + t.missing + ' lost</span>' : '') +
            (t.consumed > 0 ? '<span class="tag tag-yellow" style="font-size:9.5px">' + t.consumed + ' used</span>' : '') +
            (t.foreign > 0 ? '<span class="tag tag-stamp" style="font-size:9.5px">' + t.foreign + ' foreign</span>' : '') +
          '</span>' +
        '</span>' +
        '<span class="item-qty">' + U.icon('chevronRight') + '</span>' +
      '</button>';
    }).join('');

    return '<div class="search">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="hist-q" type="search" placeholder="Search past events by name or venue" value="' + U.esc(q) + '">' +
      '</div>' +

      '<div class="row row-between mb8">' +
        '<span class="muted" style="font-size:12px">' + filtered.length + ' of ' + historyList.length + ' completed bookings</span>' +
        (historyList.length ? '<span class="muted" style="font-size:12px;color:var(--foliage);font-weight:600">Ledger Filed</span>' : '') +
      '</div>' +

      (filtered.length
        ? '<div class="list">' + rows + '</div>'
        : U.empty('history', q ? 'No past bookings match' : 'No event history yet',
            q ? 'Try another keyword.' : 'When you finish and close an event in Catering mode, it will be safely filed here.'));
  }

  function mounted() {
    var qInput = document.getElementById('hist-q');
    if (qInput) {
      qInput.addEventListener('input', function () {
        q = qInput.value;
        var pos = qInput.selectionStart;
        App.rerenderQuiet();
        var reFocus = document.getElementById('hist-q');
        if (reFocus) {
          reFocus.focus();
          try { reFocus.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }
  }

  /* Plain Text Manifest Modal for Past Event */
  function openTextManifest(ev) {
    if (!ev) return;
    var rawText = S.generateEventManifestText(ev);

    var html =
      '<p class="muted mb8" style="font-size:12px">' +
        'Copy and paste this plain text summary into Notepad, WhatsApp, or SMS to send to drivers and event staff.' +
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

  /* Detailed Past Event Ledger Inspector */
  function openHistoryDetail(id) {
    var ev = S.event(id);
    if (!ev) return;
    var t = S.tally(ev);

    var missingDurable = ev.lines.filter(function (l) { return !l.isConsumable && l.out > l.back; });
    var consumedSupplies = ev.lines.filter(function (l) { return l.isConsumable && l.out > l.back; });
    var staffList = (ev.staffIds || []).map(function (sid) { return S.staffMember(sid); }).filter(Boolean);

    // Missing durable equipment section
    var missingHtml = missingDurable.length ? (
      '<div class="card mb12" style="border-left:3.5px solid var(--alert)">' +
        '<h3 style="font-size:13px;font-weight:700;color:var(--alert);margin-bottom:6px">' +
          U.icon('alert', 'mr4') + ' Unrecovered Equipment (' + missingDurable.length + ' kinds)' +
        '</h3>' +
        '<div class="list mb8">' +
          missingDurable.map(function (l) {
            return '<div class="item" style="padding:6px 0;border:none">' +
              '<span class="grow truncate">' +
                '<span class="item-name truncate" style="font-size:13px">' + U.esc(l.name) + '</span>' +
                '<span class="item-sub" style="color:var(--alert)">' + (l.out - l.back) + ' of ' + l.out + ' ' + U.esc(l.unit) + ' missing</span>' +
              '</span>' +
              U.tag(l.brand || l.tagLabel, l.tagColor, l.tagStyle) +
            '</div>';
          }).join('') +
        '</div>' +
        '<span class="muted" style="font-size:11px">' +
          (ev.deducted ? 'Written off from inventory stock' : 'Not written off from inventory') +
        '</span>' +
      '</div>'
    ) : (
      '<div class="card mb12" style="background:var(--success-tint);border-color:rgba(36,90,62,0.3)">' +
        '<span style="font-size:12.5px;color:var(--success);font-weight:600">' +
          U.icon('check', 'mr4') + ' 100% of durable equipment came home safe' +
        '</span>' +
      '</div>'
    );

    // Consumed supplies section
    var suppliesHtml = consumedSupplies.length ? (
      '<div class="card mb12" style="border-left:3.5px solid var(--gold, #D49B42)">' +
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:6px">' +
          U.icon('sparkles', 'mr4') + ' Supplies Consumed on Site (' + t.consumed + ' items)' +
        '</h3>' +
        '<div class="list mb8">' +
          consumedSupplies.map(function (l) {
            return '<div class="item" style="padding:6px 0;border:none">' +
              '<span class="grow truncate">' +
                '<span class="item-name truncate" style="font-size:13px">' + U.esc(l.name) + '</span>' +
                '<span class="item-sub">' + (l.out - l.back) + ' ' + U.esc(l.unit) + ' consumed (' + l.back + ' returned)</span>' +
              '</span>' +
              '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<span class="muted" style="font-size:11px">' +
          (ev.deductedConsumed !== false ? 'Deducted from inventory stock' : 'Not deducted from inventory') +
        '</span>' +
      '</div>'
    ) : '';

    // Complete load-out rows
    var allLinesHtml = ev.lines.map(function (l) {
      var isConsumable = !!l.isConsumable;
      var diff = l.out - l.back;
      var statusBadge = '';

      if (isConsumable) {
        statusBadge = diff === 0
          ? '<span class="tag tag-green" style="font-size:9.5px">Unused (' + l.out + ' back)</span>'
          : '<span class="tag tag-yellow" style="font-size:9.5px">' + diff + ' used &middot; ' + l.back + ' back</span>';
      } else {
        statusBadge = diff === 0
          ? '<span class="tag tag-green" style="font-size:9.5px">All ' + l.out + ' back</span>'
          : '<span class="tag tag-red" style="font-size:9.5px">' + diff + ' missing</span>';
      }

      return '<div class="item" style="padding:8px 0">' +
        '<span class="grow truncate mr8">' +
          '<span class="item-name truncate" style="font-size:13px">' + U.esc(l.name) + '</span>' +
          '<span class="item-sub truncate">' +
            (l.brand ? U.esc(l.brand) + ' &middot; ' : '') + 'Staged: ' + l.out + ' ' + U.esc(l.unit) +
          '</span>' +
        '</span>' +
        statusBadge +
      '</div>';
    }).join('');

    // Crew assigned
    var crewHtml = staffList.length ? (
      '<div class="card mb12">' +
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:6px">' + U.icon('users', 'mr4') + ' Working Crew (' + staffList.length + ')</h3>' +
        '<div class="list">' +
          staffList.map(function (m) {
            return '<div class="item" style="padding:6px 0;border:none">' +
              '<span class="grow truncate">' +
                '<span class="item-name truncate" style="font-size:13px">' + U.esc(m.name) + '</span>' +
                '<span class="item-sub truncate">' + U.esc(m.role || 'Staff') + '</span>' +
              '</span>' +
              (m.phone ? '<a class="btn btn-ghost btn-sm" href="tel:' + U.esc(m.phone) + '" style="min-height:30px;padding:2px 8px;font-size:11.5px;width:auto">' + U.icon('phone', 'mr4') + 'Call</a>' : '') +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    ) : '';

    // Foreign pieces in van
    var foreignHtml = ev.notOurs && ev.notOurs.length ? (
      '<div class="card mb12" style="border-left:3.5px solid var(--inasal-orange)">' +
        '<h3 style="font-size:13px;font-weight:700;color:var(--inasal-orange);margin-bottom:6px">' + U.icon('alert', 'mr4') + ' Foreign Pieces Logged (' + t.foreign + ')</h3>' +
        '<div class="list">' +
          ev.notOurs.map(function (n) {
            return '<div class="item" style="padding:4px 0;border:none">' +
              '<span class="grow truncate">' +
                '<span class="item-name truncate" style="font-size:13px">' + U.esc(n.label) + '</span>' +
                '<span class="item-sub">' + n.qty + ' pc' + (n.note ? ' &middot; ' + U.esc(n.note) : '') + '</span>' +
              '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    ) : '';

    var html =
      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<div>' +
            '<h3 style="font-size:16px;font-weight:700;color:var(--timber-ink)">' + U.esc(ev.name) + '</h3>' +
            '<p class="muted mt4" style="font-size:12px">' +
              U.esc(ev.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) +
            '</p>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:23px;font-weight:700;color:var(--foliage);font-family:Iowan Old Style,serif">' + t.pct + '%</div>' +
            '<div class="muted" style="font-size:11px">recovery</div>' +
          '</div>' +
        '</div>' +
        (ev.note ? '<div class="divider"></div><p style="font-size:12px;color:var(--timber-ink)"><strong style="color:var(--timber-ink)">Gig Notes:</strong> ' + U.esc(ev.note) + '</p>' : '') +
      '</div>' +

      missingHtml +
      suppliesHtml +
      crewHtml +
      foreignHtml +

      '<div class="card mb12">' +
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:6px">' + U.icon('truck', 'mr4') + ' Complete Gear & Supply Ledger</h3>' +
        '<div class="list">' + allLinesHtml + '</div>' +
      '</div>' +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary btn-sm mb6" data-act="hist-export-manifest" data-id="' + ev.id + '">' +
          U.icon('layers', 'mr4') + ' Export text manifest' +
        '</button>' +
        '<div class="row mb6" style="gap:6px">' +
          '<button type="button" class="btn btn-ghost grow btn-sm" data-act="save-gig-as-preset" data-id="' + ev.id + '">' +
            U.icon('plus', 'mr4') + ' Save preset' +
          '</button>' +
          '<button type="button" class="btn btn-danger grow btn-sm" data-act="del-history-event" data-id="' + ev.id + '">' +
            U.icon('trash', 'mr4') + ' Delete' +
          '</button>' +
        '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="sheet-close">Done</button>' +
      '</div>';

    U.openSheet('Gig Ledger: ' + ev.name, html, onAct);
  }

  function onAct(act, el) {
    var id = el ? el.getAttribute('data-id') : '';

    if (act === 'open-history-detail') {
      openHistoryDetail(id);
      return;
    }

    if (act === 'hist-export-manifest') {
      var targetEv = S.event(id);
      if (targetEv) openTextManifest(targetEv);
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

    if (act === 'save-gig-as-preset') {
      var ev = S.event(id);
      if (!ev) return;
      var newP = S.savePresetFromEvent(ev, ev.name + ' Kit', 'Preset created from ' + ev.name + ' (' + U.fmtDate(ev.date) + ')');
      U.closeSheet();
      App.go('catering');
      U.toast('Kit preset "' + newP.name + '" created.');
      return;
    }

    if (act === 'del-history-event') {
      U.confirm('Delete event record', 'Permanently remove this booking from the historical ledger?', 'Delete', function () {
        S.removeEvent(id);
        U.closeSheet();
        App.rerenderQuiet();
        U.toast('Event record deleted.');
      });
      return;
    }
  }

  return {
    title: 'Gig ledger',
    render: render,
    mounted: mounted,
    onAct: onAct,
    openHistoryDetail: openHistoryDetail
  };
})();