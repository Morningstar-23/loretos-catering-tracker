/* ==========================================================================
   Loreto's Catering Tracker — Views: Dashboard (js/views/dashboard.js)
   - Harmonized Active Booking Card (Matches Catering Mode .cat-head 1:1)
   - Multi-Way Incident Indicators: Broken, At Venue, Missing, Recovered
   - Real Vector SVG Recovery Trend Line/Bar Chart (Zero Cut-Offs)
   - Redesigned Inventory Stock Health Widget with Dedicated Full-Width Action
   - Direct Tab Routing into Catering Mode (Load-out, Crew, Pack-down)
   - Strictly optimized for iPhone 5s (320px viewport) & iOS 12 Safari
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

    // Inventory Health Distribution
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

    // Active Booking Card (Harmonized with Catering Mode)
    var activeCardHtml = '';
    if (ev) {
      var isStaging = ev.status === 'staging';
      var crewCount = (ev.staffIds || []).length;

      var pillHtml = isStaging
        ? '<span class="event-status-pill staging"><span class="status-dot"></span>Staging</span>'
        : '<span class="event-status-pill live"><span class="status-dot"></span>Out on location</span>';

      var countsHtml = isStaging
        ? '<span class="cat-head-counts"><b>' + t.durableOut + '</b> gear &middot; <b>' + t.consumableOut + '</b> supplies</span>'
        : '<span class="cat-head-counts"><b>' + t.pct + '%</b> returned</span>';

      var statusRow = '<div class="cat-head-status">' + pillHtml + countsHtml + '</div>';

      var progressSection = '';
      if (!isStaging) {
        var issues = [];
        if (t.broken > 0) issues.push(t.broken + ' broken');
        if (t.leftVenue > 0) issues.push(t.leftVenue + ' at venue');
        if (t.missing > 0) issues.push(t.missing + ' missing');

        var issueSub = issues.length
          ? ' &middot; <strong class="cat-warn-text">' + issues.join(', ') + '</strong>'
          : ' &middot; all accounted for';

        var meterSub = t.durableOut > 0
          ? t.durableBack + ' of ' + t.durableOut + ' gear back (' + t.pct + '%)' +
            issueSub +
            (t.consumed > 0 ? ' &middot; ' + t.consumed + ' used' : '')
          : t.back + ' of ' + t.out + ' pieces back' +
            (t.consumed > 0 ? ' &middot; ' + t.consumed + ' used' : '');

        progressSection =
          '<div class="cat-progress">' +
            '<div class="meter">' +
              '<div class="meter-fill' + (t.pct === 100 ? ' full' : '') + '" style="width:' + t.pct + '%"></div>' +
            '</div>' +
            '<p class="cat-progress-sub">' + meterSub + '</p>' +
          '</div>';
      }

      var tabsSection = isStaging
        ? '<div class="cat-head-home-tabs">' +
            '<button type="button" class="on" data-act="go-catering" data-tab="load">' +
              U.icon('truck') + ' Load-out' +
            '</button>' +
            '<button type="button" data-act="go-catering" data-tab="crew">' +
              U.icon('users') + ' Crew (' + crewCount + ')' +
            '</button>' +
          '</div>'
        : '<div class="cat-head-home-tabs">' +
            '<button type="button" class="on" data-act="go-catering" data-tab="back">' +
              U.icon('check') + ' Pack down' +
            '</button>' +
            '<button type="button" data-act="go-catering" data-tab="load">' +
              U.icon('truck') + ' Load-out' +
            '</button>' +
            '<button type="button" data-act="go-catering" data-tab="crew">' +
              U.icon('users') + ' Crew (' + crewCount + ')' +
            '</button>' +
          '</div>';

      activeCardHtml =
        '<div class="cat-head dashboard-hero-card">' +
          '<div class="cat-head-top">' +
            '<div class="cat-head-titles" data-act="go-catering" style="cursor:pointer">' +
              '<h3 class="cat-head-name">' + U.esc(ev.name) + '</h3>' +
              '<div class="cat-head-where">' + U.esc(ev.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) + '</div>' +
            '</div>' +
            '<button type="button" class="cat-head-open-btn" data-act="go-catering" aria-label="Open catering">' +
              '<span>Open</span>' + U.icon('chevronRight') +
            '</button>' +
          '</div>' +
          statusRow +
          progressSection +
          tabsSection +
        '</div>';
    } else {
      activeCardHtml =
        '<div class="dashboard-empty-card mb12">' +
          '<div class="row row-between">' +
            '<div class="grow mr8">' +
              '<h3 class="dashboard-empty-title">No active catering event</h3>' +
              '<p class="muted mt4" style="font-size:12px">All equipment is currently home in inventory.</p>' +
            '</div>' +
            '<button type="button" class="btn btn-primary btn-sm" data-act="go-catering" style="width:auto;padding:0 12px;flex-shrink:0">' +
              U.icon('plus', 'mr4') + ' New event' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    // KPI Tiles (iPhone 5s 2-column grid)
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

    // REAL VECTOR SVG CHART: Equipment Recovery Trend
    var recoveryTrends = S.overallRecoveryTrend();
    var recoveryChartHtml = '';

    if (recoveryTrends.length) {
      var svgW = 280, svgH = 80;
      var padLeft = 24, padRight = 20, padTop = 18, padBottom = 22;
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
        '<line x1="' + padLeft + '" y1="' + padTop + '" x2="' + (svgW - padRight) + '" y2="' + padTop + '" stroke="var(--line)" stroke-dasharray="3,3" stroke-width="1"/>' +
        '<text x="0" y="' + (padTop + 3) + '" font-size="8.5" fill="var(--timber-soft)" font-weight="600">100%</text>' +
        '<line x1="' + padLeft + '" y1="' + (padTop + chartH) + '" x2="' + (svgW - padRight) + '" y2="' + (padTop + chartH) + '" stroke="var(--line)" stroke-width="1"/>' +
        (pts.length > 1 ? '<polyline points="' + polyPoints + '" fill="none" stroke="var(--inasal-orange)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' : '');

      pts.forEach(function (p) {
        var color = p.pct === 100 ? 'var(--foliage)' : 'var(--inasal-orange)';
        svgContent +=
          '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#FFFFFF" stroke="' + color + '" stroke-width="2.5"/>' +
          '<text x="' + p.x + '" y="' + (p.y - 6) + '" font-size="9" font-weight="700" fill="' + color + '" text-anchor="middle">' + p.pct + '%</text>' +
          '<text x="' + p.x + '" y="' + (svgH - 2) + '" font-size="8.5" fill="var(--timber-soft)" text-anchor="middle">' + U.esc(p.date) + '</text>';
      });

      recoveryChartHtml =
        '<div class="card mb12">' +
          '<div class="row row-between mb4">' +
            '<strong style="font-size:12px;color:var(--timber-ink)">' + U.icon('history', 'mr4') + ' Equipment Recovery Trend</strong>' +
            '<span class="muted" style="font-size:11px">Past ' + recoveryTrends.length + ' events</span>' +
          '</div>' +
          '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" width="100%" height="' + svgH + '" style="display:block;margin:4px 0">' +
            svgContent +
          '</svg>' +
          '<div class="row row-between mt2" style="font-size:10.5px;color:var(--timber-soft)">' +
            '<span>Green dot = 100% equipment returned</span>' +
            '<span>Orange = gear discrepancies</span>' +
          '</div>' +
        '</div>';
    }

    // Health Status Badge in Header
    var healthTag = emptyCount > 0
      ? '<span class="tag tag-red" style="font-size:9.5px">' + emptyCount + ' Out</span>'
      : (lowCount > 0
        ? '<span class="tag tag-orange" style="font-size:9.5px">' + lowCount + ' Low</span>'
        : '<span class="tag tag-green" style="font-size:9.5px">Healthy</span>');

    // Inventory Stock Health Card
    var healthBarHtml =
      '<div class="card mb12">' +
        '<div class="row row-between mb8">' +
          '<strong style="font-size:13px;color:var(--timber-ink);display:flex;align-items:center">' +
            U.icon('plate', 'mr6') + ' Inventory Stock Health' +
          '</strong>' +
          healthTag +
        '</div>' +
        '<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--sand-soft);margin:6px 0">' +
          '<div style="width:' + pctInStock + '%;background:var(--foliage)" title="In Stock"></div>' +
          '<div style="width:' + pctLow + '%;background:var(--inasal-orange)" title="Low Stock"></div>' +
          '<div style="width:' + pctEmpty + '%;background:var(--alert)" title="Out of Stock"></div>' +
        '</div>' +
        '<div class="row row-between mt4 mb12" style="font-size:11px">' +
          '<span style="color:var(--foliage);font-weight:700">' + inStockCount + ' In Stock</span>' +
          '<span style="color:var(--inasal-orange);font-weight:700">' + lowCount + ' Low</span>' +
          '<span style="color:var(--alert);font-weight:700">' + emptyCount + ' Out</span>' +
        '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="go-inventory" style="min-height:36px;font-size:12px;font-weight:700;color:var(--inasal-orange);border-color:var(--line);background:var(--sand-soft);box-shadow:none">' +
          'View Shelf Inventory &rarr;' +
        '</button>' +
      '</div>';

    // Recent Completed Events List with Multi-Way Incident Tags
    var recentGigsHtml = '';
    if (historyList.length) {
      var recent = historyList.slice(0, 3);
      recentGigsHtml =
        '<div class="row row-between mb8 mt16">' +
          '<h2 class="section-title" style="margin:0">' + U.icon('history') + ' Recent Completed Events</h2>' +
          '<button type="button" class="muted" data-act="go-history" style="font-size:12px;font-weight:600;color:var(--inasal-orange);background:none;border:none;cursor:pointer;padding:0">' +
            'All history &rarr;' +
          '</button>' +
        '</div>' +
        '<div class="list mb12">' +
          recent.map(function (evItem) {
            var evTally = S.tally(evItem);
            var isPerfect = evTally.pct === 100 && evTally.broken === 0;

            var badgesHtml = '<span class="tag ' + (isPerfect ? 'tag-green' : 'tag-orange') + '" style="font-size:9.5px;margin-right:4px">' + evTally.pct + '% recovered</span>';
            if (evTally.broken > 0) {
              badgesHtml += '<span class="tag tag-red" style="font-size:9.5px;margin-right:4px">' + evTally.broken + ' broken</span>';
            }
            if (evTally.leftVenue > 0) {
              badgesHtml += '<span class="tag" style="background:#FFFBF0;color:#8A6805;font-size:9.5px;margin-right:4px">' + evTally.leftVenue + ' at venue</span>';
            }
            if (evTally.missing > 0) {
              badgesHtml += '<span class="tag tag-red" style="font-size:9.5px;margin-right:4px">' + evTally.missing + ' lost</span>';
            }
            if (evTally.consumed > 0) {
              badgesHtml += '<span class="tag tag-yellow" style="font-size:9.5px;margin-right:4px">' + evTally.consumed + ' used</span>';
            }

            return '<button type="button" class="item" data-act="inspect-past-gig" data-id="' + evItem.id + '">' +
              '<span class="thumb" style="' + (isPerfect ? 'color:var(--foliage);background:var(--foliage-tint)' : 'color:var(--inasal-orange);background:var(--inasal-soft)') + '">' +
                U.icon(isPerfect ? 'check' : 'calendar') +
              '</span>' +
              '<span class="grow truncate mr8">' +
                '<span class="item-name truncate">' + U.esc(evItem.name) + '</span>' +
                '<span class="item-sub truncate">' +
                  U.esc(evItem.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(evItem.date)) +
                '</span>' +
                '<span class="row mt4" style="flex-wrap:wrap;gap:2px">' +
                  badgesHtml +
                '</span>' +
              '</span>' +
              '<span class="item-qty">' + U.icon('chevronRight') + '</span>' +
            '</button>';
          }).join('') +
        '</div>';
    }

    // Quick Shortcuts Bar
    var quickBar =
      '<div class="row row-between mb12 mt8">' +
        '<button type="button" class="btn btn-ghost grow btn-sm mr8" data-act="go-catering" style="min-height:38px;font-size:12px">' +
          U.icon('truck', 'mr4') + ' Catering Van' +
        '</button>' +
        '<button type="button" class="btn btn-ghost grow btn-sm" data-act="go-inventory" style="min-height:38px;font-size:12px">' +
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
      var targetTab = el ? el.getAttribute('data-tab') : '';
      if (targetTab && App.Views.catering && App.Views.catering.onAct) {
        var fakeEl = document.createElement('button');
        fakeEl.setAttribute('data-id', targetTab);
        App.Views.catering.onAct('tab', fakeEl);
      }
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