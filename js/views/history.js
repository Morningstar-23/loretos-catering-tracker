/* ==========================================================================
   Loreto's Catering Tracker — Views: Event History & Analytics (js/views/history.js)
   - 100% Strict ES5 (iOS 12 Mobile Safari / iPhone 5s 320px viewport)
   - Zero emojis: Clean Feather/Lucide vector SVG iconography
   - Dual-View Navigation: Animated Magic Pill Glider (Event Logs vs. Analytics)
   - Gear Incident Debrief: Broken scrap & venue leftovers breakdown
   - Pure SVG/CSS Analytics Dashboard (Zero external charting libraries):
       1. KPI 4-Grid (Total Gigs, Intact Recovery %, Losses, Consumables)
       2. 6-Month Recovery Sparkline (Pure SVG Polyline)
       3. Loss & Damage Breakdown Donut Chart (Pure SVG Stroke Ring)
       4. Top Consumables Burn Rate (CSS Horizontal Flex Bars)
       5. Venue Incident Watchlist
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.history = (function () {
  var U = App.UI, S = App.Store;
  var q = '';
  var activeHistTab = 'logs'; // 'logs' | 'analytics'
  var lastGliderState = null;

  function updateGlider(root) {
    var doc = root || document;
    var segContainer = (doc && doc.querySelector) 
      ? doc.querySelector('#hist-seg-tabs') 
      : document.getElementById('hist-seg-tabs');
    if (!segContainer) return;

    var glider = segContainer.querySelector('.seg-glider');
    var activeBtn = segContainer.querySelector('button.on');
    if (!glider || !activeBtn) return;

    var targetX = activeBtn.offsetLeft;
    var targetW = activeBtn.offsetWidth;

    if (lastGliderState && (lastGliderState.x !== targetX || lastGliderState.w !== targetW)) {
      glider.style.transition = 'none';
      glider.style.transform = 'translate3d(' + lastGliderState.x + 'px, 0, 0)';
      glider.style.width = lastGliderState.w + 'px';
      void glider.offsetWidth;

      requestAnimationFrame(function () {
        glider.style.transition = 'transform 0.26s cubic-bezier(0.34, 1.45, 0.64, 1), width 0.22s cubic-bezier(0.34, 1.45, 0.64, 1)';
        glider.style.transform = 'translate3d(' + targetX + 'px, 0, 0)';
        glider.style.width = targetW + 'px';
      });
    } else {
      glider.style.transition = 'none';
      glider.style.transform = 'translate3d(' + targetX + 'px, 0, 0)';
      glider.style.width = targetW + 'px';
    }

    lastGliderState = { x: targetX, w: targetW };
  }

  /* ==========================================================================
     TAB A: HISTORICAL EVENT LOGS
     ========================================================================== */
  function renderLogsTab() {
    var historyList = S.history();
    var query = q.toLowerCase().trim();

    var filtered = historyList.filter(function (e) {
      if (!query) return true;
      var hay = (e.name + ' ' + (e.venue || '') + ' ' + (e.date || '')).toLowerCase();
      return hay.indexOf(query) > -1;
    });

    var rows = filtered.map(function (ev) {
      var t = S.tally(ev);
      var isPerfect = t.pct === 100 && t.broken === 0;

      var incidentBadgeHtml = '';
      if (t.broken > 0) {
        incidentBadgeHtml += '<span class="incident-tag tag-broken">' + U.icon('trash') + t.broken + ' broken</span>';
      }
      if (t.missing > 0) {
        incidentBadgeHtml += '<span class="incident-tag tag-missing">' + U.icon('alertTriangle') + t.missing + ' missing</span>';
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

    return '<div class="search mb8">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="hist-q" type="search" placeholder="Search past events by name or venue" value="' + U.esc(q) + '">' +
      '</div>' +

      '<div class="row row-between mb8">' +
        '<span class="muted" style="font-size:11.5px">' + filtered.length + ' of ' + historyList.length + ' completed bookings</span>' +
        (historyList.length ? '<span class="muted" style="font-size:11.5px;color:var(--foliage);font-weight:700">Archived</span>' : '') +
      '</div>' +

      (filtered.length
        ? '<div class="list">' + rows + '</div>'
        : U.empty('history', q ? 'No past events match' : 'No event history yet',
            q ? 'Try another keyword.' : 'When you finish and close an event in Catering mode, it will be safely filed here.'));
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
          '<div class="analytics-kpi-lbl">Lost / Broken</div>' +
        '</div>' +
        '<div class="analytics-kpi-card">' +
          '<div class="analytics-kpi-num" style="color:var(--gold, #D49B42)">' + data.totalConsumed + '</div>' +
          '<div class="analytics-kpi-lbl">Supplies Burnt</div>' +
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
            '<span class="analytics-sec-title">' + U.icon('history') + '6-Month Recovery Rate</span>' +
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
      var brokenDash = data.brokenPct;
      var missingDash = 100 - brokenDash;

      donutHtml =
        '<div class="donut-card">' +
          '<div class="analytics-sec-title mb8">' + U.icon('alertTriangle') + 'Loss & Damage Breakdown</div>' +
          '<div class="donut-body-row">' +
            '<div class="donut-svg-wrap">' +
              '<svg viewBox="0 0 42 42" class="donut-svg">' +
                '<circle class="donut-bg-ring" cx="21" cy="21" r="15.91549430918954" />' +
                '<circle class="donut-broken-ring" cx="21" cy="21" r="15.91549430918954" stroke-dasharray="' + brokenDash + ' ' + (100 - brokenDash) + '" stroke-dashoffset="0" />' +
                '<circle class="donut-missing-ring" cx="21" cy="21" r="15.91549430918954" stroke-dasharray="' + missingDash + ' ' + (100 - missingDash) + '" stroke-dashoffset="-' + brokenDash + '" />' +
              '</svg>' +
              '<div class="donut-center-info">' +
                '<div class="donut-center-num">' + totalInc + '</div>' +
                '<div class="donut-center-sub">Pieces</div>' +
              '</div>' +
            '</div>' +
            '<div class="donut-legend">' +
              '<div class="donut-legend-item">' +
                '<div class="row"><span class="donut-dot dot-broken"></span><span>Broken Scrap</span></div>' +
                '<strong>' + data.totalBroken + ' <span class="muted">(' + data.brokenPct + '%)</span></strong>' +
              '</div>' +
              '<div class="donut-legend-item">' +
                '<div class="row"><span class="donut-dot dot-missing"></span><span>Left at Venue</span></div>' +
                '<strong>' + data.totalMissing + ' <span class="muted">(' + data.missingPct + '%)</span></strong>' +
              '</div>' +
            '</div>' +
          '</div>' +
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

    // 5. Venue Incident Watchlist
    var venueHtml = '';
    if (data.venueWatchlist.length > 0) {
      var venueRows = data.venueWatchlist.map(function (v) {
        return '<div class="venue-watch-card' + (v.incidents >= 3 ? ' high-risk' : '') + '">' +
          '<div class="venue-head-row">' +
            '<span class="venue-name-text">' + U.esc(v.venue) + '</span>' +
            '<span class="venue-risk-badge">' + v.incidents + ' lost/broken</span>' +
          '</div>' +
          '<div class="venue-meta-row">' +
            '<span>' + v.gigs + ' booking' + (v.gigs === 1 ? '' : 's') + '</span>' +
            (v.broken > 0 ? '<span style="color:var(--alert)">' + v.broken + ' broken</span>' : '') +
            (v.missing > 0 ? '<span style="color:#8A6805">' + v.missing + ' missing</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');

      venueHtml =
        '<div class="mb12">' +
          '<div class="analytics-sec-title mb6">' + U.icon('warehouse') + 'Venue Incident Watchlist</div>' +
          venueRows +
        '</div>';
    }

    return kpiGridHtml + sparklineHtml + donutHtml + burnHtml + venueHtml;
  }

  function render() {
    var segTabsHtml =
      '<div class="seg seg-animated" id="hist-seg-tabs">' +
        '<div class="seg-glider"></div>' +
        '<button type="button" class="hist-tab-btn' + (activeHistTab === 'logs' ? ' on' : '') + '" data-act="switch-hist-tab" data-tab="logs">' +
          U.icon('calendar', 'mr4') + 'Event Logs' +
        '</button>' +
        '<button type="button" class="hist-tab-btn' + (activeHistTab === 'analytics' ? ' on' : '') + '" data-act="switch-hist-tab" data-tab="analytics">' +
          U.icon('history', 'mr4') + 'Analytics' +
        '</button>' +
      '</div>';

    var bodyHtml = (activeHistTab === 'analytics') ? renderAnalyticsTab() : renderLogsTab();
    return segTabsHtml + '<div class="hist-tab-viewport">' + bodyHtml + '</div>';
  }

  function mounted(root) {
    updateGlider(root || document);

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

  /* Detailed Past Event Inspector with Incident Debrief */
  function openHistoryDetail(id) {
    var ev = S.event(id);
    if (!ev) return;
    var t = S.tally(ev);

    // Auto-generated Gear Incident Debrief block
    var incidents = ev.incidents || [];
    var incidentDebriefHtml = '';

    if (incidents.length > 0) {
      var incidentRows = incidents.map(function (inc) {
        var isBroken = inc.type === 'broken';
        var color = isBroken ? 'var(--alert)' : '#8A6805';
        var bg = isBroken ? 'var(--alert-tint)' : '#FFF2DC';
        var iconName = isBroken ? 'trash' : 'alertTriangle';

        return '<div class="debrief-incident-row">' +
          '<div style="min-width:0;flex:1 1 auto;margin-right:8px">' +
            '<div style="font-size:13px;font-weight:700;color:var(--timber-ink)">' + U.esc(inc.name) + '</div>' +
            '<div style="font-size:11px;color:' + color + ';margin-top:1px">' +
              U.icon(iconName, 'mr4') + 'Reason: ' + U.esc(inc.reason || (isBroken ? 'Damaged' : 'Venue leftover')) +
            '</div>' +
          '</div>' +
          '<span class="tag" style="background:' + bg + ';color:' + color + ';font-size:10.5px;font-weight:700;flex-shrink:0">' +
            '-' + inc.qty + ' ' + U.esc(inc.unit || 'pc') + ' ' + (isBroken ? 'broken' : 'missing') +
          '</span>' +
        '</div>';
      }).join('');

      incidentDebriefHtml =
        '<div class="history-debrief-box" style="border-left:4px solid var(--alert)">' +
          '<div class="row row-between mb6">' +
            '<strong style="font-size:12.5px;color:var(--alert);text-transform:uppercase;letter-spacing:0.04em">' +
              U.icon('alertTriangle', 'mr4') + 'Gear Incident Debrief' +
            '</strong>' +
            '<span class="tag tag-red" style="font-size:9.5px">' + incidents.length + ' incident' + (incidents.length === 1 ? '' : 's') + '</span>' +
          '</div>' +
          incidentRows +
          '<div class="mt6 pt6" style="border-top:1px dashed var(--line);font-size:11px;color:var(--timber-soft)">' +
            '&bull; Broken pieces permanently scrapped from commissary.<br>' +
            '&bull; Missing gear ' + (ev.deducted ? 'written off from stock.' : 'not deducted.') +
          '</div>' +
        '</div>';
    } else {
      incidentDebriefHtml =
        '<div class="card mb12" style="background:var(--success-tint);border-color:rgba(36,90,62,0.3);padding:10px">' +
          '<span style="font-size:12.5px;color:var(--success);font-weight:700">' +
            U.icon('check', 'mr4') + '100% of durable equipment came home safe and intact' +
          '</span>' +
        '</div>';
    }

    // Consumed supplies section
    var consumedSupplies = ev.lines.filter(function (l) { return l.isConsumable && l.out > l.back; });
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
          (ev.deductedConsumed !== false ? 'Deducted from commissary stock' : 'Not deducted') +
        '</span>' +
      '</div>'
    ) : '';

    // Complete load-out rows
    var allLinesHtml = ev.lines.map(function (l) {
      var isConsumable = !!l.isConsumable;
      var brk = l.broken || 0;
      var mis = Math.max(0, l.out - l.back - brk);
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
          if (mis > 0) details.push(mis + ' missing');
          statusBadge = '<span class="tag tag-red" style="font-size:9.5px">' + details.join(', ') + '</span>';
        }
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
            '<div class="muted" style="font-size:11px">intact</div>' +
          '</div>' +
        '</div>' +
        (ev.note ? '<div class="divider"></div><p style="font-size:12px;color:var(--timber-ink)"><strong>Event Notes:</strong> ' + U.esc(ev.note) + '</p>' : '') +
      '</div>' +

      incidentDebriefHtml +
      suppliesHtml +
      crewHtml +
      foreignHtml +

      '<div class="card mb12">' +
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:6px">' + U.icon('truck', 'mr4') + ' Complete Gear & Supply Summary</h3>' +
        '<div class="list">' + allLinesHtml + '</div>' +
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
  }

  function onAct(act, el) {
    var id = el ? el.getAttribute('data-id') : '';

    if (act === 'switch-hist-tab') {
      var nextTab = el.getAttribute('data-tab') || 'logs';
      if (nextTab === activeHistTab) return;
      activeHistTab = nextTab;
      App.rerenderQuiet();
      updateGlider();
      return;
    }

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
    openHistoryDetail: openHistoryDetail
  };
})();