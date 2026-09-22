/* ==========================================================================
   Loreto's Catering Tracker — Views: Dashboard (js/views/dashboard.js)
   - Clean Vector SVG Recovery Trend Chart (No solid block fill)
   - Segmented Inventory Health Gauge
   - Live Active Booking Card with recovery progress
   - Wording standardized to "inventory"
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.dashboard = (function () {
  var U = App.UI, S = App.Store;

  function render() {
    var k = S.kpis();
    var ev = k.active;
    var t = k.activeTally;
    var historyList = S.history();
    var allItems = S.items();

    // Inventory Health Calculations
    var emptyCount = 0, lowCount = 0, inStockCount = 0;
    allItems.forEach(function (i) {
      var thresh = i.lowStockThreshold || 2;
      var q = i.qty || 0;
      if (q === 0) emptyCount++;
      else if (q <= thresh) lowCount++;
      else inStockCount++;
    });

    var totalItems = allItems.length || 1;
    var pctInStock = Math.round((inStockCount / totalItems) * 100);
    var pctLow = Math.round((lowCount / totalItems) * 100);
    var pctEmpty = Math.round((emptyCount / totalItems) * 100);

    // Active Booking Card
    var activeCardHtml = '';
    if (ev) {
      var isStaging = ev.status === 'staging';
      var subtitle = '';

      if (isStaging) {
        subtitle = t.durableOut + ' gear &middot; ' + t.consumableOut + ' supplies staged';
      } else if (t.durableOut > 0) {
        subtitle = t.durableBack + ' of ' + t.durableOut + ' gear back (' + t.pct + '%)' +
          (t.missing ? ' &middot; <strong style="color:#FFA494">' + t.missing + ' gear missing</strong>' : ' &middot; all accounted for') +
          (t.consumed > 0 ? ' &middot; ' + t.consumed + ' supplies used' : '');
      } else {
        subtitle = t.back + ' of ' + t.out + ' back' +
          (t.consumed > 0 ? ' &middot; ' + t.consumed + ' supplies used' : '');
      }

      activeCardHtml =
        '<div class="banner mb12">' +
          '<div class="row row-between">' +
            '<div class="grow mr8 truncate">' +
              '<span class="section-badge" style="background:rgba(250,247,242,0.22);color:#FFFFFF;margin-left:0;margin-bottom:4px;display:inline-block">' +
                (isStaging ? 'Staging & Van Loading' : 'Live Booking & Pack Down') +
              '</span>' +
              '<h3 class="truncate">' + U.esc(ev.name) + '</h3>' +
              '<p class="muted mt4" style="font-size:12px">' + U.esc(ev.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) + '</p>' +
            '</div>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="go-catering" style="width:auto;min-height:34px;padding:3px 10px;font-size:12px;background:rgba(250,247,242,0.18);color:#fff;border-color:rgba(250,247,242,0.35)">' +
              'Open &rarr;' +
            '</button>' +
          '</div>' +
          (isStaging
            ? '<div class="row row-between mt12" style="border-top:1px solid rgba(250,247,242,0.15);padding-top:8px">' +
                '<span style="font-size:13px;font-weight:600">' + subtitle + '</span>' +
                '<span class="muted" style="font-size:12px">' + (ev.staffIds || []).length + ' crew</span>' +
              '</div>'
            : '<div class="mt12">' +
                '<div class="meter"><div class="meter-fill' + (t.pct === 100 ? ' full' : '') + '" style="width:' + t.pct + '%"></div></div>' +
                '<p class="muted mt8" style="font-size:12px">' + subtitle + '</p>' +
              '</div>') +
        '</div>';
    } else {
      activeCardHtml =
        '<div class="card mb12" style="background:var(--cream);border-color:var(--line)">' +
          '<div class="row row-between">' +
            '<div>' +
              '<h3 style="font-size:15px;font-weight:600;color:var(--foliage)">No active catering gig</h3>' +
              '<p class="muted mt4" style="font-size:12px">All equipment is home in inventory.</p>' +
            '</div>' +
            '<button type="button" class="btn btn-primary btn-sm" data-act="go-catering" style="width:auto;padding:0 12px">' +
              U.icon('plus', 'mr4') + ' New gig' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    // KPI Tiles
    var kpiGrid =
      '<div class="kpi-grid mb12">' +
        '<div class="kpi"><div class="kpi-in">' +
          '<div class="kpi-n" style="color:var(--foliage)">' + (k.lastRecovery !== null ? k.lastRecovery + '%' : '100%') + '</div>' +
          '<div class="kpi-l">Last recovery</div></div></div>' +
        '<div class="kpi"><div class="kpi-in' + (k.outNow > 0 ? ' kpi-hot' : '') + '">' +
          '<div class="kpi-n">' + k.outNow + '</div>' +
          '<div class="kpi-l">Gear in van</div></div></div>' +
        '<div class="kpi"><div class="kpi-in">' +
          '<div class="kpi-n">' + k.kinds + '</div>' +
          '<div class="kpi-l">Inventory kinds</div></div></div>' +
        '<div class="kpi"><div class="kpi-in">' +
          '<div class="kpi-n">' + k.staffCount + '</div>' +
          '<div class="kpi-l">Active crew</div></div></div>' +
      '</div>';

    // REAL VECTOR SVG CHART: Clean line chart with clear dots & dates
    var recoveryTrends = (S.overallRecoveryTrend && typeof S.overallRecoveryTrend === 'function') ? S.overallRecoveryTrend() : [];
    var recoveryChartHtml = '';

    if (recoveryTrends.length) {
      var svgW = 280, svgH = 88;
      var padLeft = 32, padRight = 20, padTop = 16, padBottom = 22;
      var chartW = svgW - padLeft - padRight;
      var chartH = svgH - padTop - padBottom;

      var pts = recoveryTrends.map(function (pt, idx) {
        var x = padLeft + (recoveryTrends.length === 1 ? chartW / 2 : (idx / (recoveryTrends.length - 1)) * chartW);
        var yPct = Math.min(100, Math.max(0, pt.recoveryPct));
        var y = padTop + chartH - ((yPct / 100) * chartH);
        return { x: x, y: y, pct: pt.recoveryPct, date: pt.date || pt.name };
      });

      var polyPoints = pts.map(function (p) { return p.x + ',' + p.y; }).join(' ');

      var svgContent =
        // 100% Dashed Reference Line
        '<line x1="' + padLeft + '" y1="' + padTop + '" x2="' + (svgW - padRight) + '" y2="' + padTop + '" stroke="var(--line-strong)" stroke-dasharray="3,3" stroke-width="1"/>' +
        '<text x="' + (padLeft - 4) + '" y="' + (padTop + 3) + '" font-size="8.5" fill="var(--ink-muted)" font-weight="600" text-anchor="end">100%</text>' +
        // Baseline
        '<line x1="' + padLeft + '" y1="' + (padTop + chartH) + '" x2="' + (svgW - padRight) + '" y2="' + (padTop + chartH) + '" stroke="var(--line)" stroke-width="1"/>' +
        // Clean line connecting data points (no solid box fill)
        (pts.length > 1 ? '<polyline points="' + polyPoints + '" fill="none" stroke="var(--terracotta)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : '');

      pts.forEach(function (p) {
        var dotColor = p.pct === 100 ? 'var(--foliage)' : 'var(--terracotta)';
        svgContent +=
          '<circle cx="' + p.x + '" cy="' + p.y + '" r="3.5" fill="#FFFFFF" stroke="' + dotColor + '" stroke-width="2.2"/>' +
          '<text x="' + p.x + '" y="' + (p.y - 6) + '" font-size="9" font-weight="700" fill="' + dotColor + '" text-anchor="middle">' + p.pct + '%</text>' +
          '<text x="' + p.x + '" y="' + (svgH - 4) + '" font-size="8.5" font-weight="500" fill="var(--ink-soft)" text-anchor="middle">' + U.esc(p.date) + '</text>';
      });

      recoveryChartHtml =
        '<div class="card mb12">' +
          '<div class="row row-between mb4">' +
            '<strong style="font-size:12px;color:var(--foliage)">' + U.icon('history', 'mr4') + ' Equipment Recovery Trend</strong>' +
            '<span class="muted" style="font-size:11px">Past ' + recoveryTrends.length + ' bookings</span>' +
          '</div>' +
          '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" width="100%" height="' + svgH + '" style="display:block;margin:6px 0">' +
            svgContent +
          '</svg>' +
          '<div class="row row-between mt2" style="font-size:10.5px;color:var(--ink-soft);border-top:1px solid var(--line);padding-top:4px">' +
            '<span><span style="color:var(--foliage);font-weight:700">&#9679;</span> 100% returned safe</span>' +
            '<span><span style="color:var(--terracotta);font-weight:700">&#9679;</span> Shortfall</span>' +
          '</div>' +
        '</div>';
    }

    // Inventory Health Gauge
    var healthBarHtml =
      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<strong style="font-size:12px;color:var(--foliage)">' + U.icon('plate', 'mr4') + ' Inventory Stock Health</strong>' +
          '<button type="button" class="muted" data-act="go-inventory" style="font-size:11px;color:var(--terracotta);font-weight:600">View shelf &rarr;</button>' +
        '</div>' +
        '<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--cream);margin:6px 0">' +
          '<div style="width:' + pctInStock + '%;background:var(--foliage)" title="In Stock"></div>' +
          '<div style="width:' + pctLow + '%;background:var(--gold)" title="Low Stock"></div>' +
          '<div style="width:' + pctEmpty + '%;background:var(--alert)" title="Out of Stock"></div>' +
        '</div>' +
        '<div class="row row-between mt4" style="font-size:11px">' +
          '<span style="color:var(--foliage);font-weight:600">' + inStockCount + ' In Stock</span>' +
          '<span style="color:var(--gold);font-weight:600">' + lowCount + ' Low</span>' +
          '<span style="color:var(--alert);font-weight:600">' + emptyCount + ' Out</span>' +
        '</div>' +
      '</div>';

    // Recent Completed Gigs
    var recentGigsHtml = '';
    if (historyList.length) {
      var recent = historyList.slice(0, 3);
      recentGigsHtml =
        '<div class="row row-between mb8 mt12">' +
          '<h2 class="section-title" style="margin:0">' + U.icon('history') + ' Recent Completed Gigs</h2>' +
          '<button type="button" class="muted" data-act="go-history" style="font-size:12px;font-weight:600;color:var(--terracotta)">All history &rarr;</button>' +
        '</div>' +
        '<div class="list mb12">' +
          recent.map(function (evItem) {
            var evTally = S.tally(evItem);
            var isPerfect = evTally.pct === 100;
            return '<button type="button" class="item" data-act="inspect-past-gig" data-id="' + evItem.id + '">' +
              '<span class="thumb" style="color:' + (isPerfect ? 'var(--foliage)' : 'var(--alert)') + '">' +
                U.icon(isPerfect ? 'check' : 'alert') +
              '</span>' +
              '<span class="grow truncate mr8">' +
                '<span class="item-name truncate">' + U.esc(evItem.name) + '</span>' +
                '<span class="item-sub truncate">' +
                  U.esc(evItem.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(evItem.date)) +
                '</span>' +
                '<span class="row mt4" style="gap:4px">' +
                  '<span class="tag ' + (isPerfect ? 'tag-green' : 'tag-red') + '" style="font-size:9.5px">' + evTally.pct + '% recovered</span>' +
                  (evTally.consumed > 0 ? '<span class="tag tag-yellow" style="font-size:9.5px">' + evTally.consumed + ' used</span>' : '') +
                '</span>' +
              '</span>' +
              '<span class="item-qty">' + U.icon('chevronRight') + '</span>' +
            '</button>';
          }).join('') +
        '</div>';
    }

    var quickBar =
      '<div class="row row-between mb12" style="gap:8px">' +
        '<button type="button" class="btn btn-ghost grow btn-sm" data-act="go-catering" style="min-height:36px;font-size:12px">' +
          U.icon('truck', 'mr4') + ' Catering Van' +
        '</button>' +
        '<button type="button" class="btn btn-ghost grow btn-sm" data-act="go-inventory" style="min-height:36px;font-size:12px">' +
          U.icon('plate', 'mr4') + ' Gear Shelf' +
        '</button>' +
      '</div>';

    return activeCardHtml +
      kpiGrid +
      recoveryChartHtml +
      healthBarHtml +
      quickBar +
      recentGigsHtml;
  }

  function mounted() {}

  function onAct(act, el) {
    var id = el ? el.getAttribute('data-id') : '';

    if (act === 'go-catering') {
      App.go('catering');
      return;
    }
    if (act === 'go-inventory') {
      App.go('inventory');
      return;
    }
    if (act === 'go-history') {
      App.go('history');
      return;
    }
    if (act === 'inspect-past-gig') {
      App.Views.history.openHistoryDetail(id);
      return;
    }
  }

  return {
    title: "Loreto's Kitchen",
    render: render,
    mounted: mounted,
    onAct: onAct
  };
})();