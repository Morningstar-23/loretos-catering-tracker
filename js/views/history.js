/* views/history.js — the ledger of finished gigs. */
window.App = window.App || {}; App.Views = App.Views || {};
App.Views.history = (function () {
  var U = App.UI, S = App.Store;
  var year = '';

  function render() {
    var all = S.history();
    if (!all.length) {
      return U.empty('\uD83D\uDCD6', 'No finished events yet',
        'Once you close an event it lands here with the count of what came home.');
    }
    var years = {};
    all.forEach(function (e) { years[(e.date || '').slice(0, 4)] = 1; });
    var ykeys = Object.keys(years).sort().reverse();
    var list = all.filter(function (e) { return year ? (e.date || '').slice(0, 4) === year : true; });

    var totOut = 0, totBack = 0;
    all.forEach(function (e) { var t = S.tally(e); totOut += t.out; totBack += t.back; });
    var rate = totOut ? Math.round(totBack / totOut * 100) : 0;

    return '<div class="card"><div class="row row-between">' +
        '<div><div class="kpi-n">' + rate + '%</div><div class="kpi-l">of everything ever loaded came back</div></div>' +
        '<div style="text-align:right"><div class="kpi-n">' + all.length + '</div><div class="kpi-l">events</div></div>' +
      '</div></div>' +
      (ykeys.length > 1 ? '<div class="chips"><button class="chip' + (year ? '' : ' on') + '" data-act="year" data-id="">All years</button>' +
        ykeys.map(function (y) { return '<button class="chip' + (year === y ? ' on' : '') + '" data-act="year" data-id="' + y + '">' + y + '</button>'; }).join('') + '</div>' : '') +
      '<div class="list">' + list.map(row).join('') + '</div>';
  }

  function row(e) {
    var t = S.tally(e);
    var good = t.missing === 0;
    return '<button class="item" data-act="open" data-id="' + e.id + '">' +
      '<span class="thumb">' + (good ? '\u2705' : '\u26A0\uFE0F') + '</span>' +
      '<span class="grow"><span class="item-name truncate">' + U.esc(e.name) + '</span>' +
      '<span class="item-sub">' + U.esc(U.fmtDate(e.date)) + ' \u00b7 ' +
        (good ? 'everything home' : t.missing + ' missing') + '</span></span>' +
      '<span class="item-qty">' + t.pct + '%</span></button>';
  }

  function detail(e) {
    var t = S.tally(e);
    var lines = e.lines.map(function (l) {
      var short = l.out - l.back;
      return '<div class="item"><span class="grow"><span class="item-name truncate">' + U.esc(l.name) + '</span>' +
        '<span class="item-sub">' + l.back + ' of ' + l.out + ' back' + (short ? ' \u00b7 ' + short + ' short' : '') + '</span></span>' +
        U.tag(l.tagLabel, l.tagColor, l.tagStyle) + '</div>';
    }).join('');
    U.openSheet(e.name,
      '<p class="muted">' + U.esc(e.venue || 'No venue') + ' \u00b7 ' + U.esc(U.fmtDate(e.date)) + '</p>' +
      (e.note ? '<p class="mt8" style="font-size:14px">' + U.esc(e.note) + '</p>' : '') +
      '<div class="card mt12"><div class="row row-between">' +
        '<div><div class="kpi-n">' + t.pct + '%</div><div class="kpi-l">came home</div></div>' +
        '<div style="text-align:right"><div class="kpi-n">' + t.missing + '</div><div class="kpi-l">pieces missing</div></div>' +
      '</div>' + (e.deducted ? '<p class="muted mt8">Missing pieces were written off the shelf.</p>' : '') + '</div>' +
      '<h2 class="section-title">What went out</h2><div class="list">' + lines + '</div>' +
      (e.notOurs.length ? '<h2 class="section-title">Flagged as not ours</h2><div class="list">' +
        e.notOurs.map(function (n) {
          return '<div class="item"><span class="thumb">\u26A0\uFE0F</span><span class="grow">' +
            '<span class="item-name truncate">' + U.esc(n.label) + '</span>' +
            '<span class="item-sub">' + n.qty + ' pc' + (n.note ? ' \u00b7 ' + U.esc(n.note) : '') + '</span></span></div>';
        }).join('') + '</div>' : '') +
      '<button class="btn btn-ghost mt12" data-act="repeat" data-id="' + e.id + '">Save this load-out as a preset</button>' +
      '<button class="btn btn-danger" data-act="del" data-id="' + e.id + '">Delete this record</button>', onAct);
  }

  function onAct(act, el) {
    var id = el.getAttribute('data-id');
    if (act === 'year') { year = id; App.rerender(); }
    else if (act === 'open') detail(S.event(id));
    else if (act === 'repeat') {
      var e = S.event(id);
      S.savePresetFromEvent(e, e.name);
      U.closeSheet(); U.toast('Preset saved.');
    }
    else if (act === 'del') {
      U.confirm('Delete record', 'The event disappears from the ledger for good.', 'Delete', function () {
        S.removeEvent(id); App.rerender(); U.toast('Record deleted.');
      });
    }
  }

  function mounted() { }

  return { title: 'Past events', render: render, mounted: mounted, onAct: onAct };
})();
