/* views/dashboard.js */
window.App = window.App || {}; App.Views = App.Views || {};
App.Views.dashboard = (function () {
  var U = App.UI, S = App.Store;

  function banner(k) {
    var ev = k.active;
    if (!ev) {
      return '<div class="banner">' +
        '<h3>Nothing on the road</h3>' +
        '<p class="muted mt8">The van is empty and everything is on the shelf. Start an event when the next booking is loading up.</p>' +
        '<button class="btn btn-primary mt12" data-act="go-event">Start an event</button>' +
        '</div>';
    }
    var t = k.activeTally;
    var staging = ev.status === 'staging';
    return '<div class="banner">' +
      '<p class="muted">' + (staging ? 'Loading the van' : 'Out at the venue') + '</p>' +
      '<h3>' + U.esc(ev.name) + '</h3>' +
      '<p class="muted mt8">' + U.esc(ev.venue || 'No venue set') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) + '</p>' +
      (staging
        ? '<p class="mt12" style="font-size:15px">' + t.out + ' pieces staged</p>'
        : '<div class="mt12"><div class="meter"><div class="meter-fill' + (t.pct === 100 ? ' full' : '') + '" style="width:' + t.pct + '%"></div></div>' +
          '<p class="muted mt8">' + t.back + ' of ' + t.out + ' back in the van</p></div>') +
      '<button class="btn btn-primary mt12" data-act="go-event">' + (staging ? 'Continue loading' : 'Count things back') + '</button>' +
      '</div>';
  }

  function kpi(n, label, hot) {
    return '<div class="kpi"><div class="kpi-in' + (hot ? ' kpi-hot' : '') + '">' +
      '<div class="kpi-n">' + n + '</div><div class="kpi-l">' + U.esc(label) + '</div></div></div>';
  }

  function render() {
    var k = S.kpis();
    var recent = S.items().slice().sort(function (a, b) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }).slice(0, 4);

    var html = banner(k) +
      '<div class="kpi-grid">' +
        kpi(k.kinds, 'Kinds of gear') +
        kpi(k.units, 'Pieces owned') +
        kpi(k.outNow, k.outNow ? 'Still out there' : 'All home', k.outNow > 0) +
        kpi(k.lastRecovery === null ? '\u2014' : k.lastRecovery + '%', 'Came back last gig') +
      '</div>' +
      '<h2 class="section-title">Quick moves</h2>' +
      '<div class="list">' +
        '<button class="item" data-act="go-event"><span class="thumb">\uD83D\uDE9A</span>' +
          '<span class="grow"><span class="item-name">Load the van</span><span class="item-sub">Build a load-out from a preset</span></span></button>' +
        '<button class="item" data-act="add-item"><span class="thumb">\u2795</span>' +
          '<span class="grow"><span class="item-name">Add gear</span><span class="item-sub">New tray, burner or borrowed piece</span></span></button>' +
        '<button class="item" data-act="go-history"><span class="thumb">\uD83D\uDCD6</span>' +
          '<span class="grow"><span class="item-name">Past events</span><span class="item-sub">' + k.events + ' finished</span></span></button>' +
      '</div>' +
      '<h2 class="section-title">Recently touched</h2>' +
      (recent.length ? '<div class="list">' + recent.map(row).join('') + '</div>'
        : U.empty('\uD83E\uDDFA', 'No gear yet', 'Add your first tray or burner to start counting.'));
    return html;
  }

  function row(i) {
    return '<button class="item" data-act="open-item" data-id="' + i.id + '">' +
      '<span class="thumb"' + (i.photoId ? ' data-photo="' + i.photoId + '-t"' : '') + '>' +
        (i.photoId ? '' : (S.category(i.categoryId) ? S.category(i.categoryId).emoji : '\uD83D\uDCE6')) + '</span>' +
      '<span class="grow"><span class="item-name truncate">' + U.esc(i.name) + '</span>' +
      '<span class="item-sub truncate">' + U.esc(S.categoryName(i.categoryId)) +
      (i.tagLabel ? ' &nbsp;' + U.tag(i.tagLabel, i.tagColor, i.tagStyle) : '') + '</span></span>' +
      '<span class="item-qty">' + i.qty + '</span></button>';
  }

  function mounted(root) { U.hydrateThumbs(root); }

  function onAct(act, el) {
    if (act === 'go-event') App.go('/catering');
    else if (act === 'go-history') App.go('/history');
    else if (act === 'add-item') { App.go('/inventory'); setTimeout(function () { App.Views.inventory.openEditor(null); }, 320); }
    else if (act === 'open-item') { App.go('/inventory'); var id = el.getAttribute('data-id'); setTimeout(function () { App.Views.inventory.openEditor(id); }, 320); }
  }

  return { title: 'Loreto\u2019s Kitchen', render: render, mounted: mounted, onAct: onAct };
})();
