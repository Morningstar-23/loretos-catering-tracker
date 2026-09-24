/* ==========================================================================
   Loreto's Catering Tracker — File 4: Controller (js/views/catering/catering.js)
   - Zero emojis: Clean Lucide/Feather vector SVG iconography
   - Zero-flash quantity adjustments: view animations isolated strictly to mode switches
   - Synchronous in-memory thumbnail caching: stops images from reloading on qty changes
   - Persistent Horizontal Scroll for Category Chips (Never resets position on select)
   - Dynamic "Reset filters" button for active category, search, or warnings
   - Save manual van load-out as a preset and link it directly to active event
   - Responsive header badge: switches between Active Kit and Manual Load
   - Bidirectional Swipe-to-Delete: Swipe left to reveal, swipe right/tap to close
   - Dedicated Stock Warning / Shortage Filter for staging van load-out
   - Adjustable E-Commerce Grid: 2, 3, or 4 columns per row
   - Independent Per-Category Accordion Pagination (in-place browsing)
   - Optimized for iPhone 5s (iOS 12 / 320px)
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.catering = (function () {
  var U = App.UI, S = App.Store;
  var Modals = App.Views.Catering.Modals;
  var Kits = App.Views.Catering.Kits;
  var Views = App.Views.Catering.Views;
  var Nav = App.Views.Catering.Nav;

  var tab = 'load';
  var lastRenderedTab = null;
  var onlyShort = false;
  var onlyWarnings = false;

  /* Page Controls */
  var loadQ = '';
  var loadCat = '';
  var loadSort = 'cat';
  var viewMode = 'cards';
  var gridCols = 2;
  var openAccordions = {};
  var catPages = {};
  var chipsScrollLeft = 0;
  var viewModeSwitchAnim = false; // Flag: only animate when toggling Cards/Compact/Grid

  /* In-memory photo cache to eliminate asynchronous image popping during re-renders */
  var photoCache = {};

  var page = 1;
  var pageSize = 10;
  var totalPages = 1;
  var lastGliderState = null;
  var lastViewModeGliderState = null;

  /* Scrolls up just enough to place the top of the items list in view */
  function scrollToListTop() {
    setTimeout(function () {
      var anchor = document.getElementById('catering-list-anchor');
      var view = document.getElementById('view');
      if (anchor && view) {
        var offset = anchor.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop;
        view.scrollTop = Math.max(0, offset - 6);
      }
    }, 10);
  }

  /* Instantaneous thumbnail hydration (synchronous from memory if previously fetched) */
  function hydrateThumbsFast(root) {
    var doc = root || document;
    var thumbNodes = doc.querySelectorAll('[data-photo]');
    for (var i = 0; i < thumbNodes.length; i++) {
      var node = thumbNodes[i];
      var key = node.getAttribute('data-photo');
      if (!key) continue;

      if (photoCache[key]) {
        node.style.backgroundImage = 'url(' + photoCache[key] + ')';
        node.style.backgroundSize = 'cover';
        node.style.backgroundPosition = 'center';
      } else if (App.DB) {
        (function (n, k) {
          App.DB.get(k).then(function (blobUrl) {
            if (blobUrl) {
              photoCache[k] = blobUrl;
              n.style.backgroundImage = 'url(' + blobUrl + ')';
              n.style.backgroundSize = 'cover';
              n.style.backgroundPosition = 'center';
            }
          });
        })(node, key);
      }
    }
  }

  function updateGlider(root) {
    var doc = root || document;

    // 1. Tab Bar Glider (.seg-animated)
    var segContainer = doc.querySelector('.seg-animated');
    if (segContainer) {
      var segGlider = segContainer.querySelector('.seg-glider');
      var segActive = segContainer.querySelector('button.on');
      if (segGlider && segActive) {
        var sTargetX = segActive.offsetLeft;
        var sTargetW = segActive.offsetWidth;

        if (lastGliderState && (lastGliderState.x !== sTargetX || lastGliderState.w !== sTargetW)) {
          segGlider.style.transition = 'none';
          segGlider.style.transform = 'translate3d(' + lastGliderState.x + 'px, 0, 0)';
          segGlider.style.width = lastGliderState.w + 'px';
          void segGlider.offsetWidth;

          requestAnimationFrame(function () {
            segGlider.style.transition = 'transform 0.28s cubic-bezier(0.34, 1.45, 0.64, 1), width 0.24s cubic-bezier(0.34, 1.45, 0.64, 1)';
            segGlider.style.transform = 'translate3d(' + sTargetX + 'px, 0, 0)';
            segGlider.style.width = sTargetW + 'px';
          });
        } else {
          segGlider.style.transition = 'none';
          segGlider.style.transform = 'translate3d(' + sTargetX + 'px, 0, 0)';
          segGlider.style.width = sTargetW + 'px';
        }

        lastGliderState = { x: sTargetX, w: sTargetW };
      }
    }

    // 2. View Mode Toggle Glider (.view-mode-animated)
    var viewContainer = doc.querySelector('.view-mode-animated');
    if (viewContainer) {
      var viewGlider = viewContainer.querySelector('.view-mode-glider');
      var viewActive = viewContainer.querySelector('.view-mode-btn.on, button.on');
      if (viewGlider && viewActive) {
        var vTargetX = viewActive.offsetLeft;
        var vTargetW = viewActive.offsetWidth || 32;

        if (typeof vTargetX !== 'number' || isNaN(vTargetX)) {
          var modeAttr = viewActive.getAttribute('data-mode') || viewMode;
          vTargetX = (modeAttr === 'grid') ? 66 : (modeAttr === 'compact' ? 34 : 2);
        }

        if (lastViewModeGliderState && (lastViewModeGliderState.x !== vTargetX || lastViewModeGliderState.w !== vTargetW)) {
          viewGlider.style.transition = 'none';
          viewGlider.style.transform = 'translate3d(' + lastViewModeGliderState.x + 'px, 0, 0)';
          viewGlider.style.width = lastViewModeGliderState.w + 'px';
          void viewGlider.offsetWidth;

          requestAnimationFrame(function () {
            viewGlider.style.transition = 'transform 0.26s cubic-bezier(0.34, 1.45, 0.64, 1), width 0.22s cubic-bezier(0.34, 1.45, 0.64, 1)';
            viewGlider.style.transform = 'translate3d(' + vTargetX + 'px, 0, 0)';
            viewGlider.style.width = vTargetW + 'px';
          });
        } else {
          viewGlider.style.transition = 'none';
          viewGlider.style.transform = 'translate3d(' + vTargetX + 'px, 0, 0)';
          viewGlider.style.width = vTargetW + 'px';
        }

        lastViewModeGliderState = { x: vTargetX, w: vTargetW };
      }
    }
  }

  /* Inline "‹ 1 / 3 ›" pager that lives in the list header (same data-acts as before) */
  function miniPager(opts) {
    if ((opts.totalPages || 1) <= 1) return '';
    return '<div class="mini-pager">' +
      '<button type="button" class="mini-pager-btn" data-act="' + opts.prevAct + '"' + (opts.page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' + U.icon('chevronLeft') + '</button>' +
      '<span class="mini-pager-info"><b>' + opts.page + '</b> / ' + opts.totalPages + '</span>' +
      '<button type="button" class="mini-pager-btn" data-act="' + opts.nextAct + '"' + (opts.page >= opts.totalPages ? ' disabled' : '') + ' aria-label="Next page">' + U.icon('chevronRight') + '</button>' +
    '</div>';
  }

  function chipsHtml() {
    return '<button type="button" class="chip' + (loadCat ? '' : ' on') + '" data-act="filter-load-cat" data-id="">All</button>' +
      S.categories().map(function (c) {
        return '<button type="button" class="chip' + (loadCat === c.id ? ' on' : '') + '" data-act="filter-load-cat" data-id="' + c.id + '">' +
          U.icon(c.icon || 'plate') + U.esc(c.name) +
        '</button>';
      }).join('');
  }

  /* search + view switch on one row, category chips, then "N item types · Reset · pager" */
  function listControls(placeholder, filteredCount, hasActiveFilters) {
    var resetBtn = hasActiveFilters
      ? '<button type="button" class="btn-reset-filters" data-act="reset-all-filters" title="Clear all filters">' + U.icon('refresh') + 'Reset</button>'
      : '';
    var pager = (viewMode !== 'compact')
      ? miniPager({ page: page, totalPages: totalPages, prevAct: 'top-prev-page', nextAct: 'top-next-page' })
      : '';

    return '<div class="cat-toolbar">' +
        '<div class="search">' + U.icon('search', 'search-icon') + '<input class="input" id="catering-search" type="search" placeholder="' + placeholder + '" value="' + U.esc(loadQ) + '"></div>' +
        U.viewModeToggle(viewMode, 'set-view-mode', gridCols, 'set-grid-cols') +
      '</div>' +
      '<div class="chips filter-bar" id="catering-cat-chips">' + chipsHtml() + '</div>' +
      '<div class="cat-list-head">' +
        '<span class="cat-list-count truncate">' + filteredCount + ' item type' + (filteredCount === 1 ? '' : 's') + '</span>' +
        resetBtn + pager +
      '</div>' +
      '<div id="catering-list-anchor"></div>';
  }

  function getActiveShortages(ev) {
    if (!ev || !ev.lines) return [];
    var list = [];
    for (var i = 0; i < ev.lines.length; i++) {
      var l = ev.lines[i];
      var it = S.item(l.itemId);
      var owned = it ? (it.qty || 0) : 0;
      if (l.out > owned) {
        list.push({ line: l, item: it, staged: l.out, owned: owned, shortBy: l.out - owned });
      }
    }
    return list;
  }

  function isEventPresetModified(ev) {
    if (!ev || !ev.presetId) return false;
    var p = S.preset(ev.presetId);
    if (!p) return false;
    if (p.lines.length !== ev.lines.length) return true;
    var pMap = {};
    p.lines.forEach(function (l) { pMap[l.itemId] = l.qty; });
    for (var i = 0; i < ev.lines.length; i++) {
      if (pMap[ev.lines[i].itemId] !== ev.lines[i].out) return true;
    }
    return false;
  }

  function getFilteredLines(lines) {
    var q = (loadQ || '').toLowerCase().trim();
    return lines.filter(function (l) {
      if (onlyWarnings) {
        var itOwned = S.item(l.itemId);
        var ownedQty = itOwned ? (itOwned.qty || 0) : 0;
        if (l.out <= ownedQty) return false;
      }
      if (loadCat) {
        var it = S.item(l.itemId);
        if (!it || it.categoryId !== loadCat) return false;
      }
      if (!q) return true;
      return (l.name + ' ' + (l.brand || '') + ' ' + (l.tagLabel || '')).toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) {
      if (onlyWarnings) {
        var itA1 = S.item(a.itemId), itB1 = S.item(b.itemId);
        var diffA = a.out - (itA1 ? itA1.qty || 0 : 0);
        var diffB = b.out - (itB1 ? itB1.qty || 0 : 0);
        if (diffA !== diffB) return diffB - diffA;
      }
      if (loadSort === 'alpha-asc') return (a.name || '').localeCompare(b.name || '');
      if (loadSort === 'qty-desc') return (b.out || 0) - (a.out || 0);
      var itA = S.item(a.itemId), itB = S.item(b.itemId);
      var catA = itA ? itA.categoryId : '', catB = itB ? itB.categoryId : '';
      if (catA !== catB) return catA.localeCompare(catB);
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  function getFilteredBackLines(lines) {
    var q = (loadQ || '').toLowerCase().trim();
    return lines.filter(function (l) {
      if (onlyShort && (l.isConsumable || l.back >= l.out)) return false;
      if (loadCat) {
        var it = S.item(l.itemId);
        if (!it || it.categoryId !== loadCat) return false;
      }
      if (!q) return true;
      return (l.name + ' ' + (l.brand || '') + ' ' + (l.tagLabel || '')).toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) {
      var shortA = (!a.isConsumable && a.back < a.out) ? 1 : 0;
      var shortB = (!b.isConsumable && b.back < b.out) ? 1 : 0;
      if (shortA !== shortB) return shortB - shortA;
      var itA = S.item(a.itemId), itB = S.item(b.itemId);
      var catA = itA ? itA.categoryId : '', catB = itB ? itB.categoryId : '';
      if (catA !== catB) return catA.localeCompare(catB);
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  function loadTab(ev) {
    var isStaging = ev.status === 'staging';
    var isOut = ev.status === 'out';
    var p = ev.presetId ? S.preset(ev.presetId) : null;
    var isModified = isEventPresetModified(ev);
    var shortages = getActiveShortages(ev);
    var hasVanLines = ev.lines && ev.lines.length > 0;

    if (shortages.length === 0 && onlyWarnings) {
      onlyWarnings = false;
    }

    var kitName = p
      ? U.esc(p.name)
      : (hasVanLines ? 'Save as Kit (' + ev.lines.length + ')' : 'Select Kit Preset');
    var kitCap = p
      ? (isModified ? 'Customized' : 'Active kit')
      : (hasVanLines ? 'Manual load' : 'Presets');
    var presetAction = (p || hasVanLines) ? 'open-preset-options' : 'open-kit-picker';

    /* Kit selector (looks like a select) + the one primary action */
    var actionRow = '<div class="cat-actions">' +
      '<button type="button" class="cat-kit" data-act="' + presetAction + '">' +
        '<span class="cat-kit-ico">' + U.icon('layers') + '</span>' +
        '<span class="cat-kit-body"><span class="cat-kit-cap' + (isModified ? ' is-edited' : '') + '">' + kitCap + '</span><span class="cat-kit-name">' + kitName + '</span></span>' +
        U.icon('chevronDown', 'cat-kit-chev') +
      '</button>' +
      '<button type="button" class="cat-add" data-act="open-checklist">' + U.icon('plus') + '<span>Add items</span></button>' +
    '</div>';

    var liveNotice = isOut
      ? '<div class="live-edit-banner cat-live"><h4>' + U.icon('truck') + ' Live in-field load-out</h4><p>Adjust counts or add items. Returns sync automatically.</p></div>'
      : '';

    /* ONE stock-alert strip (replaces the old banner + separate "Only warnings" chip) */
    var n = shortages.length;
    var alertStrip = n > 0 ? (
      '<div class="cat-alert' + (onlyWarnings ? ' on' : '') + '">' +
        '<div class="cat-alert-msg" data-act="toggle-load-warnings">' + U.icon('alertTriangle') +
          '<span>' + (onlyWarnings ? 'Showing ' + n + ' over stock' : n + ' over stock') + '</span>' +
        '</div>' +
        '<button type="button" class="cat-alert-btn ghost" data-act="toggle-load-warnings">' + (onlyWarnings ? 'Show all' : 'Filter') + '</button>' +
        '<button type="button" class="cat-alert-btn solid" data-act="auto-clamp-stock">Cap stock</button>' +
      '</div>'
    ) : '';

    if (!ev.lines.length) {
      return liveNotice + actionRow + U.empty('truck', 'Nothing loaded yet', 'Search gear, load a kit preset, or stage all stock.',
        '<button type="button" class="btn btn-ghost cat-empty-btn" data-act="stage-all-inventory">' + U.icon('package', 'mr6') + ' Stage all stock</button>'
      );
    }

    var filtered = getFilteredLines(ev.lines);
    totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    var startIdx = (page - 1) * pageSize;
    var paginatedLines = filtered.slice(startIdx, Math.min(startIdx + pageSize, filtered.length));

    var hasActiveFilters = !!(loadCat || (loadQ && loadQ.trim()) || onlyWarnings);
    var controls = listControls('Search gear', filtered.length, hasActiveFilters);

    var rawContent = !filtered.length ? '<div class="empty mb12"><p class="muted">' + (onlyWarnings ? 'No items exceeding stock match this filter.' : 'No matching items.') + '</p></div>'
      : (viewMode === 'compact' ? Views.renderCompactView(filtered, isOut, ev.presetId, openAccordions, catPages)
      : (viewMode === 'grid' ? Views.renderGridView(paginatedLines, ev.presetId, gridCols)
      : '<div class="list">' + Views.renderCardsView(paginatedLines, isOut, ev.presetId) + '</div>'));

    /* Only apply the entrance animation when explicitly switching view modes */
    var animWrapClass = viewModeSwitchAnim ? ' view-content-enter' : '';
    viewModeSwitchAnim = false;
    var content = '<div class="catering-view-wrap' + animWrapClass + '">' + rawContent + '</div>';

    var pagination = (viewMode !== 'compact' && filtered.length > 0)
      ? U.paginationBar({ page: page, totalPages: totalPages, pageSize: pageSize, prevAct: 'cat-prev-page', nextAct: 'cat-next-page', sizeAct: 'cat-change-page-size' })
      : '';

    var bottomActions = isStaging ? (
      '<div class="cat-cta">' +
        '<button type="button" class="btn btn-primary cat-cta-main" data-act="mark-loaded">' + U.icon('check', 'mr6') + ' Van is loaded &mdash; Lock it in</button>' +
        '<div class="cat-tools">' +
          '<button type="button" class="cat-tool" data-act="stage-all-inventory">' + U.icon('package') + '<span>Stage all stock</span></button>' +
          '<button type="button" class="cat-tool is-danger" data-act="clear-all-lines">' + U.icon('trash') + '<span>Empty van</span></button>' +
          '<button type="button" class="cat-tool" data-act="export-manifest-text">' + U.icon('share') + '<span>Export</span></button>' +
        '</div>' +
        '<button type="button" class="cat-cancel" data-act="cancel-event">Cancel this event</button>' +
      '</div>'
    ) : (
      '<div class="cat-cta">' +
        '<button type="button" class="btn btn-primary cat-cta-main" data-act="goto-packdown">' + U.icon('check', 'mr6') + ' Continue pack down</button>' +
        '<div class="cat-tools">' +
          '<button type="button" class="cat-tool" data-act="export-manifest-text">' + U.icon('share') + '<span>Export text</span></button>' +
          '<button type="button" class="cat-tool" data-act="revert-to-staging">' + U.icon('refresh') + '<span>Re-stage van</span></button>' +
        '</div>' +
      '</div>'
    );

    return liveNotice + alertStrip + actionRow + controls + content + pagination + bottomActions;
  }

  function backTab(ev) {
    if (!ev.lines.length) return U.empty('plate', 'Nothing was loaded', 'This event went out empty.');

    var filtered = getFilteredBackLines(ev.lines);
    totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    var startIdx = (page - 1) * pageSize;
    var paginatedLines = filtered.slice(startIdx, Math.min(startIdx + pageSize, filtered.length));

    var hasActiveFilters = !!(loadCat || (loadQ && loadQ.trim()) || onlyShort);

    var quickBar = '<div class="cat-quick2">' +
      '<button type="button" class="cat-qchip' + (onlyShort ? ' on' : '') + '" data-act="toggle-short">' + U.icon('alertTriangle') + '<span>Only missing</span></button>' +
      '<button type="button" class="cat-qchip" data-act="all-back-gear">' + U.icon('check') + '<span>Mark all gear back</span></button>' +
    '</div>';

    var onsite = '<div class="cat-onsite">' +
      '<span>Need extra gear on site?</span>' +
      '<button type="button" class="cat-onsite-btn" data-act="open-checklist">' + U.icon('plus') + 'Add items</button>' +
    '</div>';

    var controls = listControls('Search gear', filtered.length, hasActiveFilters);

    var rawContent = !filtered.length ? '<div class="empty mb12"><p class="muted">' + (onlyShort ? 'All equipment returned!' : 'No items match filter.') + '</p></div>'
      : (viewMode === 'compact' ? Views.renderPackCompactView(filtered, openAccordions, catPages)
      : (viewMode === 'grid' ? Views.renderPackGridView(paginatedLines, gridCols)
      : '<div class="list">' + Views.renderPackCardsView(paginatedLines) + '</div>'));

    var animWrapClass = viewModeSwitchAnim ? ' view-content-enter' : '';
    viewModeSwitchAnim = false;
    var content = '<div class="catering-view-wrap' + animWrapClass + '">' + rawContent + '</div>';

    var pagination = (viewMode !== 'compact' && filtered.length > 0)
      ? U.paginationBar({ page: page, totalPages: totalPages, pageSize: pageSize, prevAct: 'cat-prev-page', nextAct: 'cat-next-page', sizeAct: 'cat-change-page-size' })
      : '';

    return quickBar + onsite + controls + content + pagination +
      '<div class="cat-cta">' +
        '<button type="button" class="btn btn-primary cat-cta-main" data-act="close-event">' + U.icon('check', 'mr6') + ' Finish this event</button>' +
        '<button type="button" class="btn btn-ghost cat-ghost" data-act="export-manifest-text">' + U.icon('share', 'mr6') + ' Export to text</button>' +
      '</div>';
  }

  function render() {
    var ev = S.activeEvent();
    if (!ev) return Views.startScreen();
    if (ev.status === 'staging' && tab === 'back') tab = 'load';

    var body = (tab === 'back') ? backTab(ev) : (tab === 'foreign') ? Views.foreignTab(ev) : (tab === 'crew') ? Views.crewTab(ev) : loadTab(ev);
    var animClass = (lastRenderedTab !== tab) ? ' tab-pane-enter list-stagger' : '';
    lastRenderedTab = tab;

    return Views.head(ev, tab) + '<div class="catering-tab-pane' + animClass + '">' + body + '</div>';
  }

  /* Robust Bidirectional Swipe Engine */
  function attachSwipeListeners(root) {
    var swipeRows = (root || document).querySelectorAll('.swipe-row-outer');
    for (var i = 0; i < swipeRows.length; i++) {
      (function (row) {
        var content = row.querySelector('.swipe-row-content');
        if (!content) return;
        var startX = 0;
        var startY = 0;
        var baseOffset = 0;
        var currentDeltaX = 0;
        var isSwiping = false;
        var isVerticalScroll = false;

        row.addEventListener('touchstart', function (e) {
          if (!e.touches || !e.touches[0]) return;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          baseOffset = content.classList.contains('swiped') ? -76 : 0;
          currentDeltaX = baseOffset;
          isSwiping = false;
          isVerticalScroll = false;

          if (baseOffset === 0) {
            var openRows = (root || document).querySelectorAll('.swipe-row-content.swiped');
            for (var k = 0; k < openRows.length; k++) {
              if (openRows[k] !== content) {
                openRows[k].classList.remove('swiped');
                openRows[k].style.transform = '';
              }
            }
          }
        }, { passive: true });

        row.addEventListener('touchmove', function (e) {
          if (!e.touches || !e.touches[0]) return;
          if (isVerticalScroll) return;

          var diffX = e.touches[0].clientX - startX;
          var diffY = e.touches[0].clientY - startY;

          if (!isSwiping) {
            if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 8) {
              isVerticalScroll = true;
              return;
            }
            if (Math.abs(diffX) > 10) {
              isSwiping = true;
            }
          }

          if (isSwiping) {
            var targetX = baseOffset + diffX;
            currentDeltaX = Math.max(-85, Math.min(0, targetX));
            content.style.transition = 'none';
            content.style.transform = 'translate3d(' + currentDeltaX + 'px, 0, 0)';
          }
        }, { passive: true });

        row.addEventListener('touchend', function (e) {
          if (isVerticalScroll) return;

          if (isSwiping) {
            content.style.transition = 'transform 0.22s var(--ease-out)';
            content.style.transform = '';

            if (baseOffset === 0) {
              if (currentDeltaX < -35) {
                content.classList.add('swiped');
              } else {
                content.classList.remove('swiped');
              }
            } else {
              if (currentDeltaX > -45) {
                content.classList.remove('swiped');
              } else {
                content.classList.add('swiped');
              }
            }
            isSwiping = false;
          } else {
            if (baseOffset === -76) {
              var target = e.target;
              var isInteractive = false;
              var cur = target;
              while (cur && cur !== row) {
                if (cur.tagName === 'BUTTON' || cur.tagName === 'INPUT' || (cur.dataset && cur.dataset.act)) {
                  isInteractive = true;
                  break;
                }
                cur = cur.parentNode;
              }
              if (!isInteractive) {
                content.style.transition = 'transform 0.22s var(--ease-out)';
                content.classList.remove('swiped');
                content.style.transform = '';
              }
            }
          }
        }, { passive: true });
      })(swipeRows[i]);
    }
  }

  function mounted(root) {
    hydrateThumbsFast(root || document);
    updateGlider(root || document);
    attachSwipeListeners(root || document);

    // 1. Maintain Category Carousel Scroll Position
    var cChips = document.getElementById('catering-cat-chips') || (root && root.querySelector ? root.querySelector('.chips.filter-bar') : null);
    if (cChips) {
      if (chipsScrollLeft > 0) {
        cChips.scrollLeft = chipsScrollLeft;
        requestAnimationFrame(function () {
          if (cChips) cChips.scrollLeft = chipsScrollLeft;
        });
      }
      cChips.addEventListener('scroll', function () {
        chipsScrollLeft = cChips.scrollLeft;
      }, { passive: true });
    }

    // 2. Search Input Listener
    var cSearch = document.getElementById('catering-search');
    if (cSearch) {
      cSearch.addEventListener('input', function () {
        loadQ = cSearch.value;
        page = 1;
        catPages = {};
        var pos = cSearch.selectionStart;
        App.rerenderQuiet();
        var reFocus = document.getElementById('catering-search');
        if (reFocus) {
          reFocus.focus();
          try { reFocus.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }
  }

  function onAct(act, el) {
    var ev = S.activeEvent();
    var id = el ? el.getAttribute('data-id') : '';

    /* 1. Modal Back Button & Navigation Interceptor */
    if (act === 'modal-back') {
      if (Nav) Nav.back();
      return;
    }
    if (act === 'sheet-close') {
      if (Nav) Nav.clear();
      U.closeSheet();
      return;
    }

    /* 2. Explicit Root-Level Sheet Clear & Delegate to Modals / Kits */
    if (
      act === 'open-checklist' ||
      act === 'open-kit-picker' ||
      act === 'open-preset-options' ||
      act === 'export-manifest-text' ||
      act === 'open-staff-picker' ||
      act === 'manage-presets' ||
      act === 'new-preset' ||
      act === 'new-blank'
    ) {
      if (!U.isSheetOpen() && Nav) {
        Nav.clear();
      }
    }

    if (Modals && Modals.handleAction(act, el, id, ev)) return;
    if (Kits && Kits.handleAction(act, el, id, ev)) return;

    /* 3. Controls & View Toggles */
    if (act === 'set-view-mode') {
      var nextMode = el ? el.getAttribute('data-mode') : 'cards';
      if (!nextMode || nextMode === viewMode) return;
      viewMode = nextMode;
      viewModeSwitchAnim = true; // Animate only on mode switch
      App.rerenderQuiet();
      return;
    }
    if (act === 'set-grid-cols') {
      gridCols = parseInt(el.getAttribute('data-cols'), 10) || 2;
      App.rerenderQuiet();
      return;
    }
    if (act === 'toggle-cat-acc') {
      var acc = document.getElementById('cat-acc-' + id);
      if (acc) {
        openAccordions[id] = !acc.classList.contains('open');
        acc.classList.toggle('open', openAccordions[id]);
      }
      return;
    }

    /* 4. Independent Per-Category Accordion Pagination */
    if (act === 'cat-acc-prev-page') {
      var prevCat = el.getAttribute('data-cat') || id;
      catPages[prevCat] = Math.max(1, (catPages[prevCat] || 1) - 1);
      App.rerenderQuiet();
      return;
    }
    if (act === 'cat-acc-next-page') {
      var nextCat = el.getAttribute('data-cat') || id;
      catPages[nextCat] = (catPages[nextCat] || 1) + 1;
      App.rerenderQuiet();
      return;
    }

    /* 5. Filter Controls */
    if (act === 'filter-load-cat') {
      var chipsEl = el ? el.closest('.chips') : document.getElementById('catering-cat-chips');
      if (chipsEl) {
        chipsScrollLeft = chipsEl.scrollLeft;
      }
      if (!id) {
        chipsScrollLeft = 0;
      }
      loadCat = id;
      page = 1;
      catPages = {};
      App.rerenderQuiet();
      return;
    }

    if (act === 'reset-all-filters') {
      loadQ = '';
      loadCat = '';
      onlyWarnings = false;
      onlyShort = false;
      chipsScrollLeft = 0;
      page = 1;
      catPages = {};
      App.rerenderQuiet();
      U.toast('Filters cleared.');
      return;
    }

    if (act === 'toggle-load-warnings') {
      onlyWarnings = !onlyWarnings;
      page = 1;
      catPages = {};
      App.rerenderQuiet();
      return;
    }

    /* 6. Top Pagination */
    if (act === 'top-prev-page') {
      if (page > 1) {
        page--;
        App.rerenderQuiet();
      }
      return;
    }
    if (act === 'top-next-page') {
      if (page < totalPages) {
        page++;
        App.rerenderQuiet();
      }
      return;
    }

    /* 7. Bottom Pagination */
    if (act === 'cat-prev-page') {
      if (page > 1) {
        page--;
        App.rerenderQuiet();
        scrollToListTop();
      }
      return;
    }
    if (act === 'cat-next-page') {
      if (page < totalPages) {
        page++;
        App.rerenderQuiet();
        scrollToListTop();
      }
      return;
    }
    if (act === 'cat-change-page-size') {
      pageSize = parseInt(el.getAttribute('data-size'), 10) || pageSize;
      page = 1;
      App.rerenderQuiet();
      scrollToListTop();
      return;
    }

    /* 8. Kit Presets Load & Switch */
    if (act === 'select-initial-preset') {
      var pLoad = S.preset(id);
      if (!pLoad) return;
      S.applyPresetToEvent(ev, id, 'replace', false);
      if (Nav) Nav.clear();
      U.closeSheet();
      tab = 'load';
      page = 1;
      catPages = {};
      onlyWarnings = false;
      chipsScrollLeft = 0;
      App.rerenderQuiet();
      U.toast('Kit "' + pLoad.name + '" loaded.');
      return;
    }
    if (act === 'confirm-switch-preset') {
      var pTgt = S.preset(id);
      if (!pTgt) return;
      U.confirm('Switch Kit?', 'Switching kits replaces current van items.', 'Switch', function () {
        S.applyPresetToEvent(ev, id, 'replace', false);
        if (Nav) Nav.clear();
        U.closeSheet();
        tab = 'load';
        page = 1;
        catPages = {};
        onlyWarnings = false;
        chipsScrollLeft = 0;
        App.rerenderQuiet();
        U.toast('Switched to "' + pTgt.name + '".');
      });
      return;
    }
    if (act === 'revert-preset-changes') {
      U.confirm('Revert kit?', 'Discard customizations and restore template?', 'Revert', function () {
        S.applyPresetToEvent(ev, ev.presetId, 'replace', false);
        if (Nav) Nav.clear();
        U.closeSheet();
        tab = 'load';
        page = 1;
        catPages = {};
        onlyWarnings = false;
        chipsScrollLeft = 0;
        App.rerenderQuiet();
        U.toast('Reverted to original kit.');
      });
      return;
    }
    if (act === 'update-current-preset') {
      var upKit = S.updatePresetFromEvent(ev, id || ev.presetId);
      if (Nav) Nav.clear();
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('Kit "' + (upKit ? upKit.name : 'preset') + '" updated.');
      return;
    }
    if (act === 'confirm-save-new-preset') {
      var newName = ((document.getElementById('new-p-name') || {}).value || '').trim();
      var newNote = ((document.getElementById('new-p-note') || {}).value || '').trim();
      if (!newName) { U.toast('Name the kit.'); return; }
      var cKit = S.savePresetFromEvent(ev, newName, newNote);
      if (cKit && ev) {
        ev.presetId = cKit.id;
        S.save();
      }
      if (Nav) Nav.clear();
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('Kit "' + cKit.name + '" saved and linked to van.');
      return;
    }

    /* 9. Inventory Stock Actions */
    if (act === 'stage-all-inventory') {
      U.confirm('Stage all inventory?', 'Load all available items into event?', 'Stage all', function () {
        S.items().forEach(function (it) { if (it.qty > 0) S.setOut(ev, it.id, it.qty); });
        tab = 'load';
        page = 1;
        catPages = {};
        onlyWarnings = false;
        chipsScrollLeft = 0;
        App.rerenderQuiet();
        U.toast('All commissary stock staged into van.');
      });
      return;
    }
    if (act === 'clear-all-lines') {
      U.confirm('Empty van load?', 'Remove all ' + ev.lines.length + ' item types from this event load-out?', 'Empty van', function () {
        ev.lines = [];
        ev.presetId = '';
        S.save();
        page = 1;
        catPages = {};
        onlyWarnings = false;
        chipsScrollLeft = 0;
        App.rerenderQuiet();
        U.toast('All items removed from van.');
      });
      return;
    }
    if (act === 'new-event-all-stock') {
      var nEv = S.createEvent({ name: 'Full Stock ' + U.fmtDate(U.today()), date: U.today() });
      S.items().forEach(function (it) { if (it.qty > 0) S.setOut(nEv, it.id, it.qty); });
      tab = 'load';
      page = 1;
      catPages = {};
      onlyWarnings = false;
      chipsScrollLeft = 0;
      App.rerenderQuiet();
      U.toast('Full inventory staged.');
      return;
    }
    if (act === 'auto-clamp-stock') {
      ev.lines.forEach(function (l) {
        var it = S.item(l.itemId);
        var owned = it ? (it.qty || 0) : 0;
        if (l.out > owned) { l.out = owned; if (l.back > l.out) l.back = l.out; }
      });
      ev.lines = ev.lines.filter(function (l) { return l.out > 0; });
      onlyWarnings = false;
      S.save();
      App.rerenderQuiet();
      U.toast('Counts capped to commissary stock.');
      return;
    }

    /* 10. Event Navigation & Line Updates */
    if (act === 'goto-packdown') {
      if (Nav) Nav.clear();
      tab = 'back';
      page = 1;
      catPages = {};
      chipsScrollLeft = 0;
      App.rerenderQuiet();
      return;
    }
    if (act === 'revert-to-staging') {
      U.confirm('Re-stage van?', 'Move booking back to staging?', 'Re-stage', function () {
        S.returnToStaging(ev);
        if (Nav) Nav.clear();
        tab = 'load';
        page = 1;
        catPages = {};
        onlyWarnings = false;
        chipsScrollLeft = 0;
        App.rerenderQuiet();
        U.toast('Returned to staging.');
      });
      return;
    }
    if (act === 'create-event') {
      var nameVal = ((document.getElementById('e-name') || {}).value || '').trim();
      var created = S.createEvent({
        name: nameVal || 'Event ' + U.fmtDate(U.today()),
        venue: (document.getElementById('e-venue') || {}).value || '',
        date: (document.getElementById('e-date') || {}).value || U.today(),
        note: (document.getElementById('e-note') || {}).value || '',
        presetId: el.getAttribute('data-preset') || '',
        clamp: !!el.getAttribute('data-clamp')
      });
      tab = 'load';
      page = 1;
      catPages = {};
      onlyWarnings = false;
      chipsScrollLeft = 0;
      if (Nav) Nav.clear();
      U.closeSheet();
      App.rerenderQuiet();
      U.toast(created.lines.length ? 'Kit loaded into van.' : 'Event started.');
      return;
    }
    if (act === 'save-event') {
      ev.name = ((document.getElementById('e-name') || {}).value || ev.name).trim();
      ev.venue = (document.getElementById('e-venue') || {}).value || '';
      ev.date = (document.getElementById('e-date') || {}).value || ev.date;
      ev.note = (document.getElementById('e-note') || {}).value || '';
      S.save();
      if (Nav) Nav.clear();
      U.closeSheet();
      App.rerenderQuiet();
      U.toast('Event saved.');
      return;
    }
    if (act === 'tab') {
      if (Nav) Nav.clear();
      tab = id;
      page = 1;
      catPages = {};
      onlyWarnings = false;
      chipsScrollLeft = 0;
      App.rerenderQuiet();
      return;
    }

    if (act === 'out-plus' || act === 'out-minus') {
      var oLine = null;
      ev.lines.forEach(function (l) { if (l.itemId === id) oLine = l; });
      if (!oLine) return;
      S.setOut(ev, id, Math.max(0, oLine.out + (act === 'out-plus' ? 1 : -1)));
      App.rerenderQuiet();
      return;
    }
    if (act === 'out-input') { S.setOut(ev, id, parseInt(el.value, 10) || 0); App.rerenderQuiet(); return; }
    if (act === 'remove-line') { S.removeLine(ev, id); App.rerenderQuiet(); U.toast('Item removed.'); return; }
    if (act === 'back-plus' || act === 'back-minus' || act === 'all-back') {
      var bLine = null;
      ev.lines.forEach(function (l) { if (l.itemId === id) bLine = l; });
      if (!bLine) return;
      S.setBack(ev, id, (act === 'all-back') ? bLine.out : (bLine.back + (act === 'back-plus' ? 1 : -1)));
      App.rerenderQuiet();
      return;
    }
    if (act === 'consumable-all-used') { S.setBack(ev, id, 0); App.rerenderQuiet(); return; }
    if (act === 'back-input') { S.setBack(ev, id, parseInt(el.value, 10) || 0); App.rerenderQuiet(); return; }
    if (act === 'toggle-short') { onlyShort = !onlyShort; page = 1; catPages = {}; App.rerenderQuiet(); return; }
    if (act === 'all-back-gear') {
      U.confirm('Mark gear back', 'Mark all non-consumable gear returned?', 'Confirm', function () {
        ev.lines.forEach(function (l) { if (!l.isConsumable) l.back = l.out; });
        S.save();
        App.rerenderQuiet();
        U.toast('All durable gear marked back.');
      });
      return;
    }
    if (act === 'mark-loaded') {
      if (!ev.lines.length) { U.toast('Stage gear before locking.'); return; }
      S.markLoaded(ev);
      if (Nav) Nav.clear();
      tab = 'back';
      page = 1;
      catPages = {};
      onlyWarnings = false;
      chipsScrollLeft = 0;
      App.rerenderQuiet();
      U.toast('Van locked and departed.');
      return;
    }
    if (act === 'cancel-event') {
      U.confirm('Cancel event', 'Discard the active load-out completely?', 'Cancel event', function () {
        S.removeEvent(ev.id);
        if (Nav) Nav.clear();
        page = 1;
        catPages = {};
        onlyWarnings = false;
        chipsScrollLeft = 0;
        App.rerenderQuiet();
        U.toast('Event cancelled.');
      });
      return;
    }

    /* 11. Close Event */
    if (act === 'close-event') {
      if (Nav) Nav.clear();
      var t = S.tally(ev);
      var missing = ev.lines.filter(function (l) { return !l.isConsumable && l.out > l.back; });
      var used = ev.lines.filter(function (l) { return l.isConsumable && l.out > l.back; });

      var html = '<div class="card mb12"><div class="row row-between">' +
        '<div><div class="kpi-n" style="color:var(--foliage)">' + t.pct + '%</div><div class="kpi-l">gear returned</div></div>' +
        '<div><div class="kpi-n" style="color:' + (t.missing ? 'var(--alert)' : 'var(--timber-ink)') + '">' + t.missing + '</div><div class="kpi-l">missing</div></div>' +
        '<div><div class="kpi-n" style="color:var(--timber-soft)">' + t.consumed + '</div><div class="kpi-l">supplies used</div></div>' +
      '</div></div>' +
      (missing.length ? '<label class="row mb8" style="font-size:13px"><input type="checkbox" id="deduct-missing" style="margin-right:8px"><span>Write off missing durable gear</span></label>' : '') +
      (used.length ? '<label class="row mb8" style="font-size:13px"><input type="checkbox" id="deduct-consumed" checked style="margin-right:8px"><span>Deduct consumed supplies</span></label>' : '') +
      '<button type="button" class="btn btn-primary" data-act="confirm-close">Finish and file event</button>' +
      '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Not yet</button>';

      U.openSheet('Finish ' + ev.name, html, onAct);
      return;
    }
    if (act === 'confirm-close') {
      var dChk = document.getElementById('deduct-missing');
      var cChk = document.getElementById('deduct-consumed');
      var res = S.closeEvent(ev, !!(dChk && dChk.checked), cChk ? cChk.checked : true);
      if (Nav) Nav.clear();
      U.closeSheet();
      tab = 'load';
      page = 1;
      catPages = {};
      onlyWarnings = false;
      chipsScrollLeft = 0;
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
    isEventPresetModified: isEventPresetModified,
    openGearChecklist: function () { if (Nav) Nav.clear(); return Kits.openGearChecklist(false); },
    openPresetEditor: function (id) { if (Nav) Nav.clear(); return Kits.openPresetEditor(id, false); },
    openPresetManagerSheet: function () { if (Nav) Nav.clear(); return Kits.openPresetManagerSheet(false); },
    viewItemPhoto: function (id) { return Modals.viewItemPhoto(id); },
    openQtyModal: function (id, r) { if (Nav) Nav.clear(); return Modals.openQtyModal(id, r, false); },
    openPackReturnModal: function (id) { if (Nav) Nav.clear(); return Modals.openPackReturnModal(id, false); },
    openPresetOptionsSheet: function (ev) { if (Nav) Nav.clear(); return Kits.openPresetOptionsSheet(ev, false); },
    openKitPickerSheet: function (ev, s) { if (Nav) Nav.clear(); return Kits.openKitPickerSheet(ev, s, false); }
  };
})();