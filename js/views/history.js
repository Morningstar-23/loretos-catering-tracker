/* ==========================================================================
   Loreto's Catering Tracker — Views: Event History & Analytics (js/views/history.js)
   - 100% Strict ES5 (iOS 12 Mobile Safari / iPhone 5s 320px viewport)
   - Zero emojis: Clean Feather/Lucide vector SVG iconography
   - Dual-View Navigation: Animated Magic Pill Glider (Event Logs vs. Analytics)
       * Hardware-accelerated CSS spring glide across tabs
       * Reflow-restarted staggered card entrance (tabPaneRise) on every toggle
   - Custom Themed Sort Dropdown (No ugly OS/browser select popups)
   - Historical Event Logs Engine:
       * Deep search (matches event name, venue, date, notes, and staged gear)
       * Incident status filter chips (All, 100% Intact, Discrepancies, Venue Leftovers)
       * Custom pill sort selector (Newest, Oldest, Lowest Recovery %, Highest Recovery %)
       * Top mini-pager & bottom pagination bar with page sizes [5, 10, 20, 50]
   - Interactive Venue Incident Watchlist Drill-Down:
       * Tap any watchlist venue to view casualty debriefs, notes & loss patterns
       * 1-Tap "Found it (+1 to stock)" directly inside the venue sheet
   - Paginated, Searchable & Filterable Event History Manifest:
       * Filter by All, Durable Gear, Consumable Supplies, or Incidents
       * Configurable pagination (5, 10, 25, or All) to handle 100+ items smoothly
   - Pure SVG/CSS Analytics Dashboard:
       1. KPI 4-Grid (Total Gigs, Intact Recovery %, Losses, Consumables)
       2. 6-Month Recovery Sparkline (Pure SVG Polyline)
       3. 3-Way Loss & Damage Donut (Broken vs. Venue vs. Missing)
       4. Top Consumables Burn Rate (CSS Horizontal Flex Bars)
       5. Interactive Venue Incident Watchlist
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.history = (function () {
  var U = App.UI, S = App.Store;
  var q = '';
  var activeHistTab = 'logs'; // 'logs' | 'analytics'

  /* State for History Bookings List (Filter, Sort & Pagination) */
  var logsFilter = 'all'; // 'all' | 'perfect' | 'issues' | 'venue' | 'consumed'
  var logsSort = 'date-desc'; // 'date-desc' | 'date-asc' | 'pct-asc' | 'pct-desc'
  var isSortMenuOpen = false;
  var logsPage = 1;
  var logsPageSize = 10;

  var SORT_LABELS = {
    'date-desc': 'Newest First',
    'date-asc': 'Oldest First',
    'pct-asc': 'Lowest Recovery %',
    'pct-desc': 'Highest Recovery %'
  };

  /* State for the History Event Detail Modal (Pagination & Filters) */
  var detailState = {
    eventId: '',
    q: '',
    filter: 'all', // 'all' | 'durable' | 'consumable' | 'incidents'
    page: 1,
    pageSize: 10
  };

  function setTab(tabName) {
    if (tabName === 'logs' || tabName === 'analytics') {
      activeHistTab = tabName;
    }
  }

  /* ==========================================================================
     TAB A: HISTORICAL EVENT LOGS WITH FILTER, SORT & PAGINATION
     ========================================================================== */
  function renderLogsTab() {
    var historyList = S.history();
    var query = q.toLowerCase().trim();

    // Calculate category breakdown counters
    var countTotal = historyList.length;
    var countPerfect = 0;
    var countIssues = 0;
    var countVenue = 0;
    var countConsumed = 0;

    historyList.forEach(function (ev) {
      var t = S.tally(ev);
      var isPerfect = t.pct === 100 && t.broken === 0 && t.leftVenue === 0 && t.missing === 0;
      if (isPerfect) countPerfect++;
      if (t.broken > 0 || t.leftVenue > 0 || t.missing > 0) countIssues++;
      if (t.leftVenue > 0) countVenue++;
      if (t.consumed > 0) countConsumed++;
    });

    // 1. Filter bookings
    var filtered = historyList.filter(function (e) {
      var t = S.tally(e);

      if (logsFilter === 'perfect') {
        var perf = t.pct === 100 && t.broken === 0 && t.leftVenue === 0 && t.missing === 0;
        if (!perf) return false;
      } else if (logsFilter === 'issues') {
        if (t.broken === 0 && t.leftVenue === 0 && t.missing === 0) return false;
      } else if (logsFilter === 'venue') {
        if (t.leftVenue === 0) return false;
      } else if (logsFilter === 'consumed') {
        if (t.consumed === 0) return false;
      }

      if (!query) return true;

      // Deep search matching gig name, venue, date, note, and gear lines
      var hay = (e.name + ' ' + (e.venue || '') + ' ' + (e.date || '') + ' ' + (e.note || '')).toLowerCase();
      if (hay.indexOf(query) > -1) return true;

      for (var i = 0; i < (e.lines || []).length; i++) {
        if ((e.lines[i].name || '').toLowerCase().indexOf(query) > -1) return true;
      }
      return false;
    });

    // 2. Sort bookings
    filtered.sort(function (a, b) {
      if (logsSort === 'date-asc') {
        return (a.date || '').localeCompare(b.date || '');
      }
      if (logsSort === 'pct-asc') {
        var diffPctAsc = S.tally(a).pct - S.tally(b).pct;
        if (diffPctAsc !== 0) return diffPctAsc;
        return (b.date || '').localeCompare(a.date || '');
      }
      if (logsSort === 'pct-desc') {
        var diffPctDesc = S.tally(b).pct - S.tally(a).pct;
        if (diffPctDesc !== 0) return diffPctDesc;
        return (b.date || '').localeCompare(a.date || '');
      }
      // default: date-desc
      return (b.date || '').localeCompare(a.date || '');
    });

    // 3. Paginate bookings
    var totalPages = Math.max(1, Math.ceil(filtered.length / logsPageSize));
    if (logsPage > totalPages) logsPage = totalPages;
    if (logsPage < 1) logsPage = 1;

    var startIdx = (logsPage - 1) * logsPageSize;
    var paginated = filtered.slice(startIdx, startIdx + logsPageSize);

    var hasActiveFilters = !!(query || logsFilter !== 'all' || logsSort !== 'date-desc');
    var resetBtn = hasActiveFilters
      ? '<button type="button" class="btn-reset-filters mr6" data-act="hist-logs-reset" title="Clear all filters">' + U.icon('refresh') + 'Reset</button>'
      : '';

    // Filter Chips Row
    var chipsHtml =
      '<div class="chips filter-bar mb8" style="padding-top:2px;margin-bottom:8px">' +
        '<button type="button" class="chip' + (logsFilter === 'all' ? ' on' : '') + '" data-act="hist-logs-filter" data-filter="all">All (' + countTotal + ')</button>' +
        '<button type="button" class="chip' + (logsFilter === 'perfect' ? ' on' : '') + '" data-act="hist-logs-filter" data-filter="perfect">' + U.icon('check', 'mr4') + '100% Intact (' + countPerfect + ')</button>' +
        '<button type="button" class="chip' + (logsFilter === 'issues' ? ' on' : '') + '" data-act="hist-logs-filter" data-filter="issues">' + U.icon('alertTriangle', 'mr4') + 'Discrepancies (' + countIssues + ')</button>' +
        '<button type="button" class="chip' + (logsFilter === 'venue' ? ' on' : '') + '" data-act="hist-logs-filter" data-filter="venue">' + U.icon('warehouse', 'mr4') + 'Venue Leftovers (' + countVenue + ')</button>' +
        (countConsumed > 0 ? '<button type="button" class="chip' + (logsFilter === 'consumed' ? ' on' : '') + '" data-act="hist-logs-filter" data-filter="consumed">Supplies Burnt (' + countConsumed + ')</button>' : '') +
      '</div>';

    // Top Mini Pager
    var topPagerHtml = (totalPages > 1) ? (
      '<div class="mini-pager" style="width:auto;margin-left:auto">' +
        '<button type="button" class="mini-pager-btn" data-act="hist-logs-prev"' + (logsPage <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' + U.icon('chevronLeft') + '</button>' +
        '<span class="mini-pager-info" style="padding:0 6px"><b>' + logsPage + '</b>/' + totalPages + '</span>' +
        '<button type="button" class="mini-pager-btn" data-act="hist-logs-next"' + (logsPage >= totalPages ? ' disabled' : '') + ' aria-label="Next page">' + U.icon('chevronRight') + '</button>' +
      '</div>'
    ) : '';

    // Summary count
    var countFrom = filtered.length ? (startIdx + 1) : 0;
    var countTo = Math.min(startIdx + logsPageSize, filtered.length);
    var countText = filtered.length ? (countFrom + '&ndash;' + countTo + ' of ' + filtered.length + ' bookings') : '0 bookings';

    // Custom Themed Dropdown
    var sortOptions = [
      { id: 'date-desc', label: 'Newest First' },
      { id: 'date-asc', label: 'Oldest First' },
      { id: 'pct-asc', label: 'Lowest Recovery %' },
      { id: 'pct-desc', label: 'Highest Recovery %' }
    ];

    var sortItemsHtml = sortOptions.map(function (opt) {
      var isSelected = (logsSort === opt.id);
      return '<button type="button" class="c-dropdown-item' + (isSelected ? ' on' : '') + '" data-act="hist-set-sort" data-sort="' + opt.id + '">' +
        '<span>' + opt.label + '</span>' +
        (isSelected ? U.icon('check', 'check-icon') : '') +
      '</button>';
    }).join('');

    var sortDropdownHtml =
      '<div class="c-dropdown hist-sort-dropdown" id="hist-sort-dd" style="position:relative;flex:0 0 auto;margin:0">' +
        '<button type="button" class="c-dropdown-btn hist-sort-btn' + (isSortMenuOpen ? ' active' : '') + '" data-act="hist-toggle-sort" aria-haspopup="true" aria-expanded="' + (isSortMenuOpen ? 'true' : 'false') + '" style="min-height:30px;height:30px;padding:3px 10px;font-size:11.5px;border-radius:var(--r-pill, 9999px);background:var(--sand-card);border:1.5px solid var(--line-strong);display:inline-flex;align-items:center;cursor:pointer">' +
          U.icon('sort', 'mr4') +
          '<span class="c-dropdown-label truncate" style="font-weight:700;color:var(--timber-ink);margin-right:6px">' + (SORT_LABELS[logsSort] || 'Sort') + '</span>' +
          '<span class="c-dropdown-chevron' + (isSortMenuOpen ? ' open' : '') + '">' + U.icon('chevronDown') + '</span>' +
        '</button>' +
        '<div class="c-dropdown-menu' + (isSortMenuOpen ? ' show' : '') + '" style="right:0;left:auto;min-width:168px;top:calc(100% + 5px);box-shadow:var(--shadow-md);border-radius:12px;background:#FFF;border:1.5px solid var(--line-strong);padding:4px">' +
          sortItemsHtml +
        '</div>' +
      '</div>';

    var controlsRow =
      '<div class="row row-between mb8" style="align-items:center;position:relative;z-index:15">' +
        '<span class="muted" style="font-size:11.5px">' + countText + '</span>' +
        '<div class="row" style="align-items:center">' +
          resetBtn +
          sortDropdownHtml +
          (topPagerHtml ? '<div class="ml6">' + topPagerHtml + '</div>' : '') +
        '</div>' +
      '</div>';

    // List Rows
    var rows = paginated.map(function (ev) {
      var t = S.tally(ev);
      var isPerfect = t.pct === 100 && t.broken === 0 && t.leftVenue === 0 && t.missing === 0;

      var incidentBadgeHtml = '';
      if (t.broken > 0) {
        incidentBadgeHtml += '<span class="incident-tag tag-broken">' + U.icon('trash') + t.broken + ' broken</span>';
      }
      if (t.leftVenue > 0) {
        incidentBadgeHtml += '<span class="incident-tag" style="background:#FFFBF0;color:#8A6805;border-color:rgba(212,155,66,0.4)">' + U.icon('warehouse') + t.leftVenue + ' at venue</span>';
      }
      if (t.missing > 0) {
        incidentBadgeHtml += '<span class="incident-tag tag-missing">' + U.icon('alertTriangle') + t.missing + ' missing</span>';
      }

      var recoveredCount = 0;
      (ev.incidents || []).forEach(function (inc) {
        if (inc.status === 'recovered') {
          recoveredCount += (inc.recoveredQty || inc.qty || 1);
        }
      });
      if (recoveredCount > 0) {
        incidentBadgeHtml += '<span class="incident-tag tag-ok" style="background:var(--success-tint, #E2F1E8);color:var(--success, #245A3E)">' + U.icon('check') + recoveredCount + ' recovered</span>';
      }

      if (t.consumed > 0) {
        incidentBadgeHtml += '<span class="tag tag-yellow" style="font-size:9.5px;margin:2px">' + t.consumed + ' used</span>';
      }
      if (t.foreign > 0) {
        incidentBadgeHtml += '<span class="tag tag-stamp" style="font-size:9.5px;margin:2px">' + t.foreign + ' foreign</span>';
      }

      return '<button type="button" class="item" data-act="open-history-detail" data-id="' + ev.id + '">' +
        '<span class="thumb" style="' + (isPerfect ? 'color:var(--foliage);background:var(--foliage-tint)' : 'color:var(--alert);background:var(--alert-tint)') + '">' +
          U.icon(isPerfect ? 'check' : 'calendar') +
        '</span>' +
        '<span class="grow truncate mr8">' +
          '<span class="item-name truncate">' + U.esc(ev.name) + '</span>' +
          '<span class="item-sub truncate">' +
            U.esc(ev.venue || 'No venue') + ' &middot; ' + U.esc(U.fmtDate(ev.date)) +
          '</span>' +
          '<span class="incident-badge-row">' +
            '<span class="incident-tag ' + (isPerfect ? 'tag-ok' : 'tag-broken') + '">' +
              t.pct + '% returned intact' +
            '</span>' +
            incidentBadgeHtml +
          '</span>' +
        '</span>' +
        '<span class="item-qty">' + U.icon('chevronRight') + '</span>' +
      '</button>';
    }).join('');

    // Bottom Pagination Bar
    var bottomPagerHtml = (filtered.length > 5) ? U.paginationBar({
      page: logsPage,
      totalPages: totalPages,
      pageSize: logsPageSize,
      prevAct: 'hist-logs-prev',
      nextAct: 'hist-logs-next',
      sizeAct: 'hist-logs-size',
      sizes: [5, 10, 20, 50]
    }) : '';

    return '<div class="search mb8">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="hist-q" type="search" placeholder="Search gigs by name, venue, or gear..." value="' + U.esc(q) + '">' +
      '</div>' +
      chipsHtml +
      controlsRow +
      (filtered.length
        ? '<div class="list">' + rows + '</div>' + bottomPagerHtml
        : U.empty('history', q ? 'No past events match' : 'No event history yet',
            q ? 'Try another keyword or tap Reset.' : 'When you finish and close an event in Catering mode, it will be safely filed here.'));
  }

  /* ==========================================================================
     TAB B: PURE SVG / CSS ANALYTICS DASHBOARD
     ========================================================================== */
  function renderAnalyticsTab() {
    var data = S.analyticsSummary();
    if (!data.totalGigs) {
      return U.empty('history', 'No Analytics Available Yet', 'Complete and close your first catering booking to generate recovery analytics.');
    }

    // 1. KPI 4-Grid
    var kpiGridHtml =
      '<div class="analytics-kpi-grid">' +
        '<div class="analytics-kpi-card">' +
          '<div class="analytics-kpi-num" style="color:var(--timber-ink)">' + data.totalGigs + '</div>' +
          '<div class="analytics-kpi-lbl">Total Gigs</div>' +
        '</div>' +
        '<div class="analytics-kpi-card">' +
          '<div class="analytics-kpi-num" style="color:var(--foliage)">' + data.overallReturnPct + '%</div>' +
          '<div class="analytics-kpi-lbl">Intact Return</div>' +
        '</div>' +
        '<div class="analytics-kpi-card">' +
          '<div class="analytics-kpi-num" style="color:var(--alert)">' + data.totalIncidents + '</div>' +
          '<div class="analytics-kpi-lbl">Discrepancies</div>' +
        '</div>' +
        '<div class="analytics-kpi-card">' +
          '<div class="analytics-kpi-num" style="color:var(--gold, #D49B42)">' + data.totalConsumed + '</div>' +
          '<div class="analytics-kpi-lbl">Supplies Used</div>' +
        '</div>' +
      '</div>';

    // 2. 6-Month Recovery Sparkline
    var sparklineHtml = '';
    if (data.trendData.length > 0) {
      var labelsHtml = data.trendData.map(function (pt) {
        return '<span>' + U.esc(pt.date || pt.name) + '</span>';
      }).join('');

      sparklineHtml =
        '<div class="sparkline-card">' +
          '<div class="row row-between mb4">' +
            '<span class="analytics-sec-title">' + U.icon('history') + 'Recovery Trend</span>' +
            '<strong style="font-size:12px;color:var(--foliage)">' + data.overallReturnPct + '% Avg</strong>' +
          '</div>' +
          '<div class="sparkline-svg-wrap">' +
            '<svg viewBox="0 0 260 60" preserveAspectRatio="none" class="sparkline-svg">' +
              '<line x1="10" y1="10" x2="250" y2="10" class="sparkline-grid-line" />' +
              '<line x1="10" y1="35" x2="250" y2="35" class="sparkline-grid-line" />' +
              '<polyline points="' + data.sparkPolyline + '" class="sparkline-path" />' +
            '</svg>' +
          '</div>' +
          '<div class="sparkline-labels-row">' + labelsHtml + '</div>' +
        '</div>';
    }

    // 3. Loss & Damage Breakdown Donut Chart
    var donutHtml = '';
    var totalInc = data.totalIncidents;
    if (totalInc > 0) {
      var bPct = data.brokenPct;
      var lvPct = data.leftVenuePct;
      var mPct = Math.max(0, 100 - bPct - lvPct);

      var offsetLV = -bPct;
      var offsetM = -(bPct + lvPct);

      var recoveredBanner = data.totalRecovered > 0 ? (
        '<div class="mt8 pt8" style="border-top:1px dashed var(--line);font-size:11.5px;color:var(--success, #245A3E);font-weight:700">' +
          U.icon('check', 'mr4') + data.totalRecovered + ' pieces recovered from venues & returned to shelf' +
        '</div>'
      ) : '';

      donutHtml =
        '<div class="donut-card">' +
          '<div class="analytics-sec-title mb8">' + U.icon('alertTriangle') + 'Loss & Discrepancy Breakdown</div>' +
          '<div class="donut-body-row">' +
            '<div class="donut-svg-wrap">' +
              '<svg viewBox="0 0 42 42" class="donut-svg">' +
                '<circle class="donut-bg-ring" cx="21" cy="21" r="15.91549430918954" />' +
                (bPct > 0 ? '<circle class="donut-broken-ring" cx="21" cy="21" r="15.91549430918954" stroke="var(--alert)" stroke-dasharray="' + bPct + ' ' + (100 - bPct) + '" stroke-dashoffset="0" />' : '') +
                (lvPct > 0 ? '<circle class="donut-missing-ring" cx="21" cy="21" r="15.91549430918954" stroke="#D49B42" stroke-dasharray="' + lvPct + ' ' + (100 - lvPct) + '" stroke-dashoffset="' + offsetLV + '" />' : '') +
                (mPct > 0 ? '<circle class="donut-missing-ring" cx="21" cy="21" r="15.91549430918954" stroke="#B03A2E" stroke-dasharray="' + mPct + ' ' + (100 - mPct) + '" stroke-dashoffset="' + offsetM + '" />' : '') +
              '</svg>' +
              '<div class="donut-center-info">' +
                '<div class="donut-center-num">' + totalInc + '</div>' +
                '<div class="donut-center-sub">Pieces</div>' +
              '</div>' +
            '</div>' +
            '<div class="donut-legend">' +
              '<div class="donut-legend-item">' +
                '<div class="row"><span class="donut-dot" style="background:var(--alert)"></span><span>Broken Scrap</span></div>' +
                '<strong>' + data.totalBroken + ' <span class="muted">(' + bPct + '%)</span></strong>' +
              '</div>' +
              '<div class="donut-legend-item">' +
                '<div class="row"><span class="donut-dot" style="background:#D49B42"></span><span>Left at Venue</span></div>' +
                '<strong>' + data.totalLeftVenue + ' <span class="muted">(' + lvPct + '%)</span></strong>' +
              '</div>' +
              '<div class="donut-legend-item">' +
                '<div class="row"><span class="donut-dot" style="background:#B03A2E"></span><span>Missing / Stolen</span></div>' +
                '<strong>' + data.totalMissing + ' <span class="muted">(' + mPct + '%)</span></strong>' +
              '</div>' +
            '</div>' +
          '</div>' +
          recoveredBanner +
        '</div>';
    } else {
      donutHtml =
        '<div class="donut-card" style="text-align:center;padding:14px 10px">' +
          '<div style="font-size:24px;color:var(--foliage);margin-bottom:4px">' + U.icon('check') + '</div>' +
          '<strong style="font-size:13px;color:var(--timber-ink)">Zero Equipment Casualties</strong>' +
          '<p class="muted mt2" style="font-size:11.5px">All durable catering equipment has returned 100% intact across all archived events.</p>' +
        '</div>';
    }

    // 4. Top Consumables Burn Rate Bar Chart
    var burnHtml = '';
    if (data.topConsumables.length > 0) {
      var maxBurn = 1;
      data.topConsumables.forEach(function (c) { if (c.count > maxBurn) maxBurn = c.count; });

      var burnBars = data.topConsumables.map(function (c) {
        var pctWidth = Math.max(8, Math.round((c.count / maxBurn) * 100));
        return '<div class="burn-item-row">' +
          '<div class="burn-label-row">' +
            '<span class="truncate" style="font-weight:600;max-width:70%">' + U.esc(c.name) + '</span>' +
            '<span><b>' + c.count + '</b> <span class="muted">' + U.esc(c.unit) + '</span></span>' +
          '</div>' +
          '<div class="burn-bar-track">' +
            '<div class="burn-bar-fill" style="width:' + pctWidth + '%"></div>' +
          '</div>' +
        '</div>';
      }).join('');

      burnHtml =
        '<div class="burn-card">' +
          '<div class="row row-between mb8">' +
            '<span class="analytics-sec-title">' + U.icon('sparkles') + 'Top Supplies Consumed</span>' +
            '<span class="muted" style="font-size:11px">' + data.totalConsumed + ' burnt</span>' +
          '</div>' +
          burnBars +
        '</div>';
    }

    // 5. Interactive Venue Incident Watchlist
    var venueHtml = '';
    if (data.venueWatchlist.length > 0) {
      var venueRows = data.venueWatchlist.map(function (v) {
        return '<button type="button" class="venue-watch-card' + (v.incidents >= 3 ? ' high-risk' : '') + '" data-act="inspect-venue" data-venue="' + U.esc(v.venue) + '" style="width:100%;text-align:left;cursor:pointer;border-style:solid">' +
          '<div class="venue-head-row">' +
            '<span class="venue-name-text" style="display:flex;align-items:center">' +
              U.icon('warehouse', 'mr6') + U.esc(v.venue) +
            '</span>' +
            '<span class="venue-risk-badge">' + v.incidents + ' incident' + (v.incidents === 1 ? '' : 's') + ' &rarr;</span>' +
          '</div>' +
          '<div class="venue-meta-row" style="flex-wrap:wrap;gap:6px">' +
            '<span>' + v.gigs + ' booking' + (v.gigs === 1 ? '' : 's') + '</span>' +
            (v.broken > 0 ? '<span style="color:var(--alert)">' + v.broken + ' broken</span>' : '') +
            (v.leftVenue > 0 ? '<span style="color:#8A6805">' + v.leftVenue + ' at venue</span>' : '') +
            (v.missing > 0 ? '<span style="color:#B03A2E">' + v.missing + ' lost</span>' : '') +
            (v.recovered > 0 ? '<span style="color:var(--success, #245A3E)">' + v.recovered + ' recovered</span>' : '') +
          '</div>' +
        '</button>';
      }).join('');

      venueHtml =
        '<div class="mb12">' +
          '<div class="row row-between mb6">' +
            '<div class="analytics-sec-title" style="margin:0">' + U.icon('warehouse') + 'Venue Incident Watchlist</div>' +
            '<span class="muted" style="font-size:11px">Tap venue to inspect</span>' +
          '</div>' +
          venueRows +
        '</div>';
    }

    return kpiGridHtml + sparklineHtml + donutHtml + burnHtml + venueHtml;
  }

  function render() {
    var segTabsHtml =
      '<div class="seg seg-animated tab-' + activeHistTab + '" id="hist-seg-tabs">' +
        '<div class="seg-glider"></div>' +
        '<button type="button" class="hist-tab-btn' + (activeHistTab === 'logs' ? ' on' : '') + '" data-act="switch-hist-tab" data-tab="logs">' +
          U.icon('calendar', 'mr4') + 'Event Logs' +
        '</button>' +
        '<button type="button" class="hist-tab-btn' + (activeHistTab === 'analytics' ? ' on' : '') + '" data-act="switch-hist-tab" data-tab="analytics">' +
          U.icon('history', 'mr4') + 'Analytics' +
        '</button>' +
      '</div>';

    var bodyHtml = (activeHistTab === 'analytics') ? renderAnalyticsTab() : renderLogsTab();
    return segTabsHtml + '<div class="hist-tab-viewport tab-pane-enter">' + bodyHtml + '</div>';
  }

  function onGlobalClick(e) {
    if (!isSortMenuOpen) return;
    var dd = document.getElementById('hist-sort-dd');
    if (!dd) return;
    if (!dd.contains(e.target)) {
      isSortMenuOpen = false;
      App.rerenderQuiet();
    }
  }

  function attachTabListeners() {
    var qInput = document.getElementById('hist-q');
    if (qInput) {
      qInput.addEventListener('input', function () {
        q = qInput.value;
        logsPage = 1;
        var pos = qInput.selectionStart;
        var viewport = document.querySelector('.hist-tab-viewport');
        if (viewport) {
          viewport.innerHTML = renderLogsTab();
          attachTabListeners();
          var reFocus = document.getElementById('hist-q');
          if (reFocus) {
            reFocus.focus();
            try { reFocus.setSelectionRange(pos, pos); } catch (e) {}
          }
        } else {
          App.rerenderQuiet();
        }
      });
    }

    document.removeEventListener('click', onGlobalClick, false);
    document.addEventListener('click', onGlobalClick, false);
  }

  function mounted() {
    attachTabListeners();
  }

  /* Plain Text Manifest Modal for Past Event */
  function openTextManifest(ev) {
    if (!ev) return;
    var rawText = S.generateEventManifestText(ev);

    var html =
      '<p class="muted mb8" style="font-size:12px">' +
        'Copy and paste this plain text summary into Notepad, WhatsApp, or SMS.' +
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

  /* ==========================================================================
     INTERACTIVE VENUE INCIDENT DRILL-DOWN MODAL
     ========================================================================== */
  function openVenueDetail(venueName) {
    if (!venueName) return;
    var historyList = S.history();
    var venueEvents = historyList.filter(function (e) {
      return (e.venue || 'Unspecified venue').trim().toLowerCase() === venueName.trim().toLowerCase();
    });

    if (!venueEvents.length) {
      U.toast('No event records found for ' + venueName);
      return;
    }

    var totalBookings = venueEvents.length;
    var totalDurableOut = 0, totalDurableBack = 0, totalBroken = 0, totalLeftVenue = 0, totalMissing = 0, totalRecovered = 0;
    var allIncidents = [];

    venueEvents.forEach(function (ev) {
      var t = S.tally(ev);
      totalDurableOut += t.durableOut;
      totalDurableBack += t.durableBack;
      totalBroken += t.broken;
      totalLeftVenue += t.leftVenue;
      totalMissing += t.missing;

      (ev.incidents || []).forEach(function (inc, idx) {
        if (inc.status === 'recovered') {
          totalRecovered += (inc.recoveredQty || inc.qty || 1);
        }
        allIncidents.push({
          eventId: ev.id,
          eventName: ev.name,
          eventDate: ev.date,
          idx: idx,
          incident: inc
        });
      });
    });

    var venueRecoveryPct = totalDurableOut > 0 ? Math.round((totalDurableBack / totalDurableOut) * 100) : 100;
    var totalIncidentsCount = totalBroken + totalLeftVenue + totalMissing;

    // Header Summary Card
    var summaryCardHtml =
      '<div class="card mb12" style="border-left:4px solid ' + (totalIncidentsCount > 0 ? 'var(--alert)' : 'var(--foliage)') + ';padding:12px">' +
        '<div class="row row-between mb4">' +
          '<div>' +
            '<h3 style="font-size:16px;font-weight:700;color:var(--timber-ink)">' + U.esc(venueName) + '</h3>' +
            '<span class="muted" style="font-size:11.5px">' + totalBookings + ' completed gig' + (totalBookings === 1 ? '' : 's') + '</span>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:22px;font-weight:700;color:' + (venueRecoveryPct === 100 ? 'var(--foliage)' : 'var(--inasal-orange)') + ';font-family:Iowan Old Style,serif">' + venueRecoveryPct + '%</div>' +
            '<span class="muted" style="font-size:10.5px">intact return</span>' +
          '</div>' +
        '</div>' +
        '<div class="row row-between mt8 pt8" style="border-top:1px solid var(--line);text-align:center;font-size:11px">' +
          '<div><b>' + totalBroken + '</b> <span class="muted">Broken</span></div>' +
          '<div><b style="color:#8A6805">' + totalLeftVenue + '</b> <span class="muted">At Venue</span></div>' +
          '<div><b style="color:#B03A2E">' + totalMissing + '</b> <span class="muted">Lost</span></div>' +
          '<div><b style="color:var(--success, #245A3E)">' + totalRecovered + '</b> <span class="muted">Recovered</span></div>' +
        '</div>' +
      '</div>';

    // Detailed Incident Timeline with 1-Tap Recovery Button
    var incidentsListHtml = '';
    if (allIncidents.length > 0) {
      incidentsListHtml =
        '<h4 class="section-title mb6 mt10" style="font-size:12.5px">' +
          U.icon('alertTriangle') + ' Casualties & Discrepancies Log (' + allIncidents.length + ')' +
        '</h4>' +
        '<div class="list mb12">' +
          allIncidents.map(function (item) {
            var inc = item.incident;
            var isBroken = inc.type === 'broken';
            var isLeftVenue = inc.type === 'left_venue';
            var isRecovered = inc.status === 'recovered';
            var isReplaced = inc.status === 'replaced';

            var color = isBroken ? 'var(--alert)' : (isLeftVenue ? '#8A6805' : '#B03A2E');
            var bg = isBroken ? 'var(--alert-tint)' : (isLeftVenue ? '#FFFBF0' : '#FFF9F8');
            var typeLabel = isBroken ? 'broken scrap' : (isLeftVenue ? 'left at venue' : 'missing');

            var actionBtnHtml = '';
            if (isRecovered) {
              actionBtnHtml = '<span class="tag tag-green mt4" style="font-size:9.5px">' + U.icon('check', 'mr4') + 'Found & restored to commissary</span>';
            } else if (isReplaced) {
              actionBtnHtml = '<span class="tag tag-yellow mt4" style="font-size:9.5px">' + U.icon('refresh', 'mr4') + 'Replaced with new gear</span>';
            } else if (isLeftVenue) {
              actionBtnHtml =
                '<div class="mt4">' +
                  '<button type="button" class="btn btn-primary btn-sm" data-act="venue-recover-incident" data-event-id="' + item.eventId + '" data-idx="' + item.idx + '" data-venue="' + U.esc(venueName) + '" style="min-height:28px;font-size:10.5px;padding:2px 10px;width:auto">' +
                    U.icon('plus', 'mr4') + 'Found it (+1 to stock)' +
                  '</button>' +
                '</div>';
            }

            var remarkHtml = inc.remark ? (
              '<div class="muted mt2" style="font-size:11px;font-style:italic">' +
                U.icon('edit', 'mr4') + 'Note: ' + U.esc(inc.remark) +
              '</div>'
            ) : '';

            return '<div class="card mb6" style="padding:9px 10px;background:' + bg + ';border-left:3.5px solid ' + color + '">' +
              '<div class="row row-between">' +
                '<span style="font-size:13px;font-weight:700;color:var(--timber-ink)">' + U.esc(inc.name) + '</span>' +
                '<span class="tag" style="background:#FFF;color:' + color + ';font-size:9.5px;font-weight:700">' +
                  '-' + inc.qty + ' ' + U.esc(inc.unit || 'pc') + ' ' + typeLabel +
                '</span>' +
              '</div>' +
              '<div class="muted mt2" style="font-size:11px">' +
                'From ' + U.esc(item.eventName) + ' (' + U.esc(U.fmtDate(item.eventDate)) + ')' +
              '</div>' +
              (inc.reason ? '<div class="mt2" style="font-size:11px;color:' + color + '">Reason: ' + U.esc(inc.reason) + '</div>' : '') +
              remarkHtml +
              actionBtnHtml +
            '</div>';
          }).join('') +
        '</div>';
    } else {
      incidentsListHtml =
        '<div class="card mb12" style="background:var(--success-tint, #E2F1E8);padding:10px;text-align:center">' +
          '<span style="font-size:12px;color:var(--success, #245A3E);font-weight:700">' +
            U.icon('check', 'mr4') + 'Clean Track Record! Zero gear incidents recorded at this venue.' +
          '</span>' +
        '</div>';
    }

    // Associated Bookings List
    var bookingsListHtml =
      '<h4 class="section-title mb6" style="font-size:12.5px">' +
        U.icon('calendar') + ' Past Bookings at this Venue (' + venueEvents.length + ')' +
      '</h4>' +
      '<div class="list mb12">' +
        venueEvents.map(function (ev) {
          var t = S.tally(ev);
          return '<button type="button" class="item" data-act="open-history-detail" data-id="' + ev.id + '" style="padding:8px 10px">' +
            '<span class="thumb" style="width:34px;height:34px;flex:0 0 34px">' + U.icon('calendar') + '</span>' +
            '<span class="grow truncate mr8">' +
              '<span class="item-name truncate" style="font-size:13px">' + U.esc(ev.name) + '</span>' +
              '<span class="item-sub">' + U.esc(U.fmtDate(ev.date)) + '</span>' +
            '</span>' +
            '<span class="tag ' + (t.pct === 100 ? 'tag-green' : 'tag-orange') + '" style="font-size:9.5px">' + t.pct + '% back</span>' +
          '</button>';
        }).join('') +
      '</div>';

    var html = summaryCardHtml + incidentsListHtml + bookingsListHtml +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-ghost" data-act="sheet-close">Close Venue Watch</button>' +
      '</div>';

    U.openSheet('Venue Watch: ' + venueName, html, onAct, 'forward');
  }

  /* ==========================================================================
     DETAILED PAST EVENT INSPECTOR WITH SEARCH, FILTERS & PAGINATION
     ========================================================================== */
  function openHistoryDetail(id) {
    var ev = S.event(id);
    if (!ev) return;

    if (detailState.eventId !== id) {
      detailState.eventId = id;
      detailState.q = '';
      detailState.filter = 'all';
      detailState.page = 1;
      detailState.pageSize = 10;
    }

    renderHistoryDetailSheet(ev);
  }

  function renderHistoryDetailSheet(ev) {
    var t = S.tally(ev);
    var incidents = ev.incidents || [];

    // Auto-generated Gear Incident Debrief block
    var incidentDebriefHtml = '';
    if (incidents.length > 0) {
      var incidentRows = incidents.map(function (inc, idx) {
        var isBroken = inc.type === 'broken';
        var isLeftVenue = inc.type === 'left_venue';
        var isRecovered = inc.status === 'recovered';
        var isReplaced = inc.status === 'replaced';

        var color = isBroken ? 'var(--alert)' : (isLeftVenue ? '#8A6805' : '#B03A2E');
        var bg = isBroken ? 'var(--alert-tint)' : (isLeftVenue ? '#FFFBF0' : '#FFF9F8');
        var iconName = isBroken ? 'trash' : (isLeftVenue ? 'warehouse' : 'alertTriangle');
        var typeLabel = isBroken ? 'broken' : (isLeftVenue ? 'at venue' : 'missing');

        var actionBtnsHtml = '';
        if (isRecovered) {
          actionBtnsHtml =
            '<div class="row mt4" style="font-size:10.5px;color:var(--foliage);font-weight:700">' +
              U.icon('check', 'mr4') + 'Found & restored ' + (inc.recoveredQty || inc.qty) + ' ' + U.esc(inc.unit || 'pc') + ' to Commissary' +
            '</div>';
        } else if (isReplaced) {
          actionBtnsHtml =
            '<div class="row mt4" style="font-size:10.5px;color:var(--timber-soft);font-weight:700">' +
              U.icon('refresh', 'mr4') + 'Marked as replaced with new stock' +
            '</div>';
        } else if (isLeftVenue) {
          actionBtnsHtml =
            '<div class="row mt6" style="margin:-2px">' +
              '<button type="button" class="btn btn-primary btn-sm m2" data-act="hist-recover-incident" data-event-id="' + ev.id + '" data-idx="' + idx + '" style="min-height:28px;font-size:10.5px;padding:2px 10px;width:auto">' +
                U.icon('plus', 'mr4') + 'Found it (+1 to stock)' +
              '</button>' +
              '<button type="button" class="btn btn-ghost btn-sm m2" data-act="hist-replace-incident" data-event-id="' + ev.id + '" data-idx="' + idx + '" style="min-height:28px;font-size:10.5px;padding:2px 8px;width:auto">' +
                'Mark Replaced' +
              '</button>' +
            '</div>';
        } else {
          actionBtnsHtml =
            '<div class="row mt4">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-act="hist-replace-incident" data-event-id="' + ev.id + '" data-idx="' + idx + '" style="min-height:26px;font-size:10px;padding:1px 8px;width:auto">' +
                'Mark Replaced' +
              '</button>' +
            '</div>';
        }

        var customRemarkDisplay = inc.remark ? (
          '<div class="mt4" style="font-size:11px;color:var(--timber-ink);font-style:italic;background:#FAF6F0;padding:4px 8px;border-radius:5px;border:1px solid var(--line-strong)">' +
            U.icon('edit', 'mr4') + '<b>Remark:</b> &ldquo;' + U.esc(inc.remark) + '&rdquo;' +
          '</div>'
        ) : '';

        return '<div class="debrief-incident-row" style="flex-direction:column;align-items:stretch;padding:8px 0;border-bottom:1px solid var(--line-soft, #EDE7DE)">' +
          '<div class="row row-between mb2">' +
            '<div style="min-width:0;flex:1 1 auto;margin-right:8px">' +
              '<div style="font-size:13px;font-weight:700;color:var(--timber-ink)">' + U.esc(inc.name) + '</div>' +
              '<div style="font-size:11px;color:' + color + ';margin-top:1px">' +
                U.icon(iconName, 'mr4') + 'Reason: ' + U.esc(inc.reason || (isBroken ? 'Damaged' : (isLeftVenue ? 'Left at venue' : 'Unaccounted'))) +
              '</div>' +
            '</div>' +
            '<span class="tag" style="background:' + bg + ';color:' + color + ';font-size:10.5px;font-weight:700;flex-shrink:0">' +
              '-' + inc.qty + ' ' + U.esc(inc.unit || 'pc') + ' ' + typeLabel +
            '</span>' +
          '</div>' +
          customRemarkDisplay +
          actionBtnsHtml +
        '</div>';
      }).join('');

      incidentDebriefHtml =
        '<div class="history-debrief-box" style="border-left:4px solid var(--alert);background:var(--sand-soft);padding:10px;border-radius:10px;margin-bottom:12px">' +
          '<div class="row row-between mb6">' +
            '<strong style="font-size:12.5px;color:var(--alert);text-transform:uppercase;letter-spacing:0.04em">' +
              U.icon('alertTriangle', 'mr4') + 'Gear Incident Debrief' +
            '</strong>' +
            '<span class="tag tag-red" style="font-size:9.5px">' + incidents.length + ' incident' + (incidents.length === 1 ? '' : 's') + '</span>' +
          '</div>' +
          incidentRows +
          '<div class="mt8 pt6" style="border-top:1px dashed var(--line);font-size:10.5px;color:var(--timber-soft)">' +
            '&bull; Broken pieces permanently scrapped from commissary.<br>' +
            '&bull; Left at venue gear can be marked <b>Found</b> anytime to restore stock.' +
          '</div>' +
        '</div>';
    } else {
      incidentDebriefHtml =
        '<div class="card mb12" style="background:var(--success-tint, #E2F1E8);border-color:rgba(36,90,62,0.3);padding:10px">' +
          '<span style="font-size:12.5px;color:var(--success, #245A3E);font-weight:700">' +
            U.icon('check', 'mr4') + '100% of durable equipment came home safe and intact' +
          '</span>' +
        '</div>';
    }

    // Filter and Paginate Items
    var query = (detailState.q || '').toLowerCase().trim();
    var filterType = detailState.filter || 'all';

    var filteredLines = (ev.lines || []).filter(function (l) {
      if (filterType === 'durable' && l.isConsumable) return false;
      if (filterType === 'consumable' && !l.isConsumable) return false;
      if (filterType === 'incidents') {
        var hasIncident = (!l.isConsumable && l.out > l.back) || (l.broken > 0) || (l.leftVenue > 0);
        if (!hasIncident) return false;
      }
      if (!query) return true;
      var hay = (l.name + ' ' + (l.brand || '') + ' ' + (l.customRemark || '')).toLowerCase();
      return hay.indexOf(query) > -1;
    });

    var limit = parseInt(detailState.pageSize, 10) || 10;
    var isAll = limit >= 999;
    var totalPages = isAll ? 1 : Math.max(1, Math.ceil(filteredLines.length / limit));
    if (detailState.page > totalPages) detailState.page = totalPages;
    if (detailState.page < 1) detailState.page = 1;

    var startIdx = isAll ? 0 : (detailState.page - 1) * limit;
    var paginatedLines = isAll ? filteredLines : filteredLines.slice(startIdx, startIdx + limit);

    // Filter Chips
    var filterChipsHtml =
      '<div class="chips filter-bar mb8" style="padding-top:2px;margin-bottom:8px">' +
        '<button type="button" class="chip' + (filterType === 'all' ? ' on' : '') + '" data-act="hist-detail-filter" data-type="all">All (' + ev.lines.length + ')</button>' +
        '<button type="button" class="chip' + (filterType === 'durable' ? ' on' : '') + '" data-act="hist-detail-filter" data-type="durable">Durable Gear</button>' +
        '<button type="button" class="chip' + (filterType === 'consumable' ? ' on' : '') + '" data-act="hist-detail-filter" data-type="consumable">Supplies</button>' +
        '<button type="button" class="chip' + (filterType === 'incidents' ? ' on' : '') + '" data-act="hist-detail-filter" data-type="incidents">Incidents</button>' +
      '</div>';

    // Search bar for event manifest
    var searchBoxHtml =
      '<div class="search mb8">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="hist-detail-search" type="search" placeholder="Search event gear..." value="' + U.esc(detailState.q) + '" style="font-size:13px;min-height:38px">' +
      '</div>';

    // Item Rows
    var linesListHtml = '';
    if (paginatedLines.length > 0) {
      linesListHtml = paginatedLines.map(function (l) {
        var isConsumable = !!l.isConsumable;
        var brk = l.broken || 0;
        var lv = l.leftVenue || 0;
        var mis = (l.missing !== undefined) ? l.missing : Math.max(0, l.out - l.back - brk - lv);
        var statusBadge = '';

        if (isConsumable) {
          var used = l.out - l.back;
          statusBadge = used === 0
            ? '<span class="tag tag-green" style="font-size:9.5px">Unused (' + l.out + ' back)</span>'
            : '<span class="tag tag-yellow" style="font-size:9.5px">' + used + ' used &middot; ' + l.back + ' back</span>';
        } else {
          if (l.out === l.back) {
            statusBadge = '<span class="tag tag-green" style="font-size:9.5px">All ' + l.out + ' intact</span>';
          } else {
            var details = [];
            if (l.back > 0) details.push(l.back + ' intact');
            if (brk > 0) details.push(brk + ' broken');
            if (lv > 0) details.push(lv + ' at venue');
            if (mis > 0) details.push(mis + ' missing');
            statusBadge = '<span class="tag tag-red" style="font-size:9.5px">' + details.join(', ') + '</span>';
          }
        }

        var lineRemarkHtml = l.customRemark ? (
          '<div class="muted mt2" style="font-size:10.5px;font-style:italic">' +
            U.icon('edit', 'mr4') + 'Note: ' + U.esc(l.customRemark) +
          '</div>'
        ) : '';

        return '<div class="item" style="padding:7px 0;border-left:none;border-right:none;border-top:none;border-radius:0">' +
          '<span class="grow truncate mr8">' +
            '<span class="item-name truncate" style="font-size:13px">' + U.esc(l.name) + '</span>' +
            '<span class="item-sub truncate">' +
              (l.brand ? U.esc(l.brand) + ' &middot; ' : '') + 'Staged: ' + l.out + ' ' + U.esc(l.unit) +
            '</span>' +
            lineRemarkHtml +
          '</span>' +
          statusBadge +
        '</div>';
      }).join('');
    } else {
      linesListHtml = '<p class="muted text-center py12" style="font-size:12px">No items match your filter.</p>';
    }

    // Pagination Controls
    var paginationControlsHtml = '';
    if (filteredLines.length > 0) {
      var catSizes = [5, 10, 25, 'All'];
      var sizePills = catSizes.map(function (sz) {
        var isSel = (detailState.pageSize === sz || (sz === 'All' && detailState.pageSize >= 999));
        var szVal = (sz === 'All') ? 999 : sz;
        return '<button type="button" class="size-pill' + (isSel ? ' on' : '') + '" data-act="hist-detail-size" data-size="' + szVal + '">' + sz + '</button>';
      }).join('');

      var pagerNav = (!isAll && totalPages > 1) ? (
        '<div class="mini-pager" style="margin-bottom:8px">' +
          '<button type="button" class="mini-pager-btn" data-act="hist-detail-prev" ' + (detailState.page <= 1 ? 'disabled' : '') + '>' + U.icon('chevronLeft') + '</button>' +
          '<span class="mini-pager-info">Page <b>' + detailState.page + '</b> of ' + totalPages + ' <span class="muted">(' + filteredLines.length + ' items)</span></span>' +
          '<button type="button" class="mini-pager-btn" data-act="hist-detail-next" ' + (detailState.page >= totalPages ? 'disabled' : '') + '>' + U.icon('chevronRight') + '</button>' +
        '</div>'
      ) : '';

      paginationControlsHtml =
        '<div class="pagination-bar" style="margin-top:8px;padding:8px 0">' +
          pagerNav +
          '<div class="pagination-size-wrap" style="margin-top:0">' +
            '<span class="pagination-size-label">Show per page:</span>' +
            '<div class="pagination-size-pills">' + sizePills + '</div>' +
          '</div>' +
        '</div>';
    }

    // Working Crew assigned
    var staffList = (ev.staffIds || []).map(function (sid) { return S.staffMember(sid); }).filter(Boolean);
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
        '<h3 style="font-size:13px;font-weight:700;color:var(--inasal-orange);margin-bottom:6px">' + U.icon('alertTriangle', 'mr4') + ' Foreign Pieces Logged (' + t.foreign + ')</h3>' +
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
            '<div class="muted" style="font-size:11px">intact</div>' +
          '</div>' +
        '</div>' +
        (ev.note ? '<div class="divider"></div><p style="font-size:12px;color:var(--timber-ink)"><strong>Event Notes:</strong> ' + U.esc(ev.note) + '</p>' : '') +
      '</div>' +

      incidentDebriefHtml +
      crewHtml +
      foreignHtml +

      '<div class="card mb12">' +
        '<div class="row row-between mb6">' +
          '<h3 style="font-size:13px;font-weight:700;margin:0">' + U.icon('truck', 'mr4') + ' Event Gear & Supplies</h3>' +
          '<span class="muted" style="font-size:11px">' + ev.lines.length + ' item types</span>' +
        '</div>' +
        searchBoxHtml +
        filterChipsHtml +
        '<div class="list">' + linesListHtml + '</div>' +
        paginationControlsHtml +
      '</div>' +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary btn-sm mb6" data-act="hist-export-manifest" data-id="' + ev.id + '">' +
          U.icon('layers', 'mr4') + ' Export text manifest' +
        '</button>' +
        '<div class="row mb6" style="margin:-2px">' +
          '<button type="button" class="btn btn-ghost grow btn-sm m2" data-act="save-gig-as-preset" data-id="' + ev.id + '">' +
            U.icon('plus', 'mr4') + ' Save preset' +
          '</button>' +
          '<button type="button" class="btn btn-danger grow btn-sm m2" data-act="del-history-event" data-id="' + ev.id + '">' +
            U.icon('trash', 'mr4') + ' Delete' +
          '</button>' +
        '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="sheet-close">Done</button>' +
      '</div>';

    U.openSheet('Event Details: ' + ev.name, html, onAct);

    // Attach search listener for instant filtering inside sheet
    var sInput = document.getElementById('hist-detail-search');
    if (sInput) {
      sInput.addEventListener('input', function () {
        detailState.q = sInput.value;
        detailState.page = 1;
        var pos = sInput.selectionStart;
        renderHistoryDetailSheet(ev);
        var ref = document.getElementById('hist-detail-search');
        if (ref) {
          ref.focus();
          try { ref.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }
  }

  function onAct(act, el) {
    var id = el ? el.getAttribute('data-id') : '';

    /* SLIDING MAGIC PILL TAB SWITCH WITH REFLOW-RESTARTED ENTRANCE */
    if (act === 'switch-hist-tab') {
      var nextTab = el.getAttribute('data-tab') || 'logs';
      if (nextTab === activeHistTab) return;
      activeHistTab = nextTab;
      isSortMenuOpen = false;

      var segContainer = document.getElementById('hist-seg-tabs');
      var viewport = document.querySelector('.hist-tab-viewport');

      if (segContainer && viewport) {
        // 1. Instantly trigger smooth CSS glider slide across the pill bar
        segContainer.className = 'seg seg-animated tab-' + nextTab;
        var btns = segContainer.querySelectorAll('.hist-tab-btn');
        for (var b = 0; b < btns.length; b++) {
          if (btns[b].getAttribute('data-tab') === nextTab) {
            btns[b].classList.add('on');
          } else {
            btns[b].classList.remove('on');
          }
        }

        // 2. Force browser reflow to restart tabPaneRise & cascading card stagger
        viewport.className = 'hist-tab-viewport';
        viewport.innerHTML = (activeHistTab === 'analytics') ? renderAnalyticsTab() : renderLogsTab();
        void viewport.offsetWidth;
        viewport.className = 'hist-tab-viewport tab-pane-enter';

        // 3. Attach listeners for the active tab (e.g. search input, sort dropdown)
        attachTabListeners();
      } else {
        App.rerenderQuiet();
      }
      return;
    }

    /* HISTORY LOGS FILTERS, SORT & PAGINATION */
    if (act === 'hist-toggle-sort') {
      isSortMenuOpen = !isSortMenuOpen;
      App.rerenderQuiet();
      return;
    }

    if (act === 'hist-set-sort') {
      var newSort = el.getAttribute('data-sort') || 'date-desc';
      logsSort = newSort;
      isSortMenuOpen = false;
      logsPage = 1;
      App.rerenderQuiet();
      return;
    }

    if (act === 'hist-logs-filter') {
      var nextFilter = el.getAttribute('data-filter') || 'all';
      if (nextFilter === logsFilter) return;
      logsFilter = nextFilter;
      isSortMenuOpen = false;
      logsPage = 1;
      App.rerenderQuiet();
      return;
    }

    if (act === 'hist-logs-reset') {
      q = '';
      logsFilter = 'all';
      logsSort = 'date-desc';
      isSortMenuOpen = false;
      logsPage = 1;
      App.rerenderQuiet();
      U.toast('History filters reset.');
      return;
    }

    if (act === 'hist-logs-prev') {
      if (logsPage > 1) {
        logsPage--;
        isSortMenuOpen = false;
        App.rerenderQuiet();
      }
      return;
    }

    if (act === 'hist-logs-next') {
      logsPage++;
      isSortMenuOpen = false;
      App.rerenderQuiet();
      return;
    }

    if (act === 'hist-logs-size') {
      logsPageSize = parseInt(el.getAttribute('data-size'), 10) || 10;
      isSortMenuOpen = false;
      logsPage = 1;
      App.rerenderQuiet();
      return;
    }

    if (act === 'open-history-detail') {
      isSortMenuOpen = false;
      openHistoryDetail(id);
      return;
    }

    /* INTERACTIVE VENUE DRILL-DOWN ACTION */
    if (act === 'inspect-venue') {
      var targetVenue = el.getAttribute('data-venue');
      if (targetVenue) openVenueDetail(targetVenue);
      return;
    }

    /* DETAIL MODAL PAGINATION & FILTERS */
    if (act === 'hist-detail-filter') {
      detailState.filter = el.getAttribute('data-type') || 'all';
      detailState.page = 1;
      var curEvF = S.event(detailState.eventId);
      if (curEvF) renderHistoryDetailSheet(curEvF);
      return;
    }

    if (act === 'hist-detail-prev') {
      if (detailState.page > 1) {
        detailState.page--;
        var curEvP = S.event(detailState.eventId);
        if (curEvP) renderHistoryDetailSheet(curEvP);
      }
      return;
    }

    if (act === 'hist-detail-next') {
      detailState.page++;
      var curEvN = S.event(detailState.eventId);
      if (curEvN) renderHistoryDetailSheet(curEvN);
      return;
    }

    if (act === 'hist-detail-size') {
      detailState.pageSize = parseInt(el.getAttribute('data-size'), 10) || 10;
      detailState.page = 1;
      var curEvS = S.event(detailState.eventId);
      if (curEvS) renderHistoryDetailSheet(curEvS);
      return;
    }

    /* RECOVERY & REPLACEMENT WORKFLOW BUTTONS */
    if (act === 'hist-recover-incident') {
      var eventIdR = el.getAttribute('data-event-id');
      var idxR = parseInt(el.getAttribute('data-idx'), 10);
      var recRes = S.recoverVenueItem(eventIdR, idxR, 1);
      if (recRes) {
        U.toast('Found! Added 1 "' + recRes.item.name + '" back to Commissary Shelf.');
        App.rerenderQuiet();
        openHistoryDetail(eventIdR);
      }
      return;
    }

    if (act === 'venue-recover-incident') {
      var eventIdVR = el.getAttribute('data-event-id');
      var idxVR = parseInt(el.getAttribute('data-idx'), 10);
      var venueNameVR = el.getAttribute('data-venue');
      var recResV = S.recoverVenueItem(eventIdVR, idxVR, 1);
      if (recResV) {
        U.toast('Found! Restored 1 "' + recResV.item.name + '" to Commissary Shelf.');
        App.rerenderQuiet();
        openVenueDetail(venueNameVR);
      }
      return;
    }

    if (act === 'hist-replace-incident') {
      var eventIdRep = el.getAttribute('data-event-id');
      var idxRep = parseInt(el.getAttribute('data-idx'), 10);
      var repRes = S.markIncidentReplaced(eventIdRep, idxRep);
      if (repRes) {
        U.toast('Marked "' + repRes.name + '" as replaced.');
        App.rerenderQuiet();
        openHistoryDetail(eventIdRep);
      }
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
      U.confirm('Delete event record', 'Permanently remove this booking from event history?', 'Delete', function () {
        S.removeEvent(id);
        U.closeSheet();
        App.rerenderQuiet();
        U.toast('Event record deleted.');
      });
      return;
    }
  }

  return {
    title: 'Event history',
    render: render,
    mounted: mounted,
    onAct: onAct,
    setTab: setTab,
    openHistoryDetail: openHistoryDetail,
    openVenueDetail: openVenueDetail
  };
})();