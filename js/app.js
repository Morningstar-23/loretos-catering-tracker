/* ==========================================================================
   Loreto's Catering Tracker — Application Controller & Router (js/app.js)
   - Optimized for iPhone 5s / iOS 12 Mobile Safari (320px viewport)
   - Dynamic Header Actions: #topbar-right renders view controls (left-aligned title)
   - Scroll-position preservation on rerenderQuiet (no snapping to top on stepper taps)
   - Preserves native SELECT & INPUT interactions without click blocking
   - Delegated change listener for sort dropdowns and calendar pickers
   ========================================================================== */
(function () {
  var ROUTES = ['dashboard', 'inventory', 'catering', 'history', 'settings'];
  var current = 'dashboard';
  var viewEl, titleEl, topbarRightEl;

  function route() {
    var h = (location.hash || '').replace('#/', '');
    return ROUTES.indexOf(h) > -1 ? h : 'dashboard';
  }

  function go(path) {
    var clean = path.replace(/^\//, '');
    if (location.hash === '#/' + clean) {
      render(true);
      return;
    }
    location.hash = '#/' + clean;
  }

  function render(animate) {
    current = route();
    var v = App.Views[current];
    if (!v) return;

    // Preserve scroll position on quiet rerenders (stepper clicks, quantity edits)
    var prevViewScroll = 0;
    var prevWinScrollX = 0;
    var prevWinScrollY = 0;

    if (animate === false) {
      prevViewScroll = viewEl ? viewEl.scrollTop : 0;
      prevWinScrollX = window.pageXOffset || (document.documentElement && document.documentElement.scrollLeft) || 0;
      prevWinScrollY = window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
    }

    /* CSS transition only on explicit route transitions */
    viewEl.className = '';
    if (animate !== false) {
      void viewEl.offsetWidth; // Force layout reflow
      viewEl.className = 'view-enter';
    }

    viewEl.innerHTML = v.render();

    // Restore scroll position if rerendering quietly; scroll to top only on navigation
    if (animate === false) {
      if (viewEl) viewEl.scrollTop = prevViewScroll;
      window.scrollTo(prevWinScrollX, prevWinScrollY);
    } else {
      if (viewEl) viewEl.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    if (titleEl) {
      titleEl.textContent = current === 'dashboard' ? App.Store.state().settings.business : v.title;
    }

    if (topbarRightEl) {
      topbarRightEl.innerHTML = (v.topbarRight ? v.topbarRight() : '');
    }

    var tabs = document.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabs.length; i++) {
      var tabTarget = tabs[i].getAttribute('data-tab');
      var on = tabTarget === current;
      tabs[i].className = 'tab' + (tabTarget === 'catering' ? ' tab-hero' : '') + (on ? ' on' : '');
    }

    if (v.mounted) v.mounted(viewEl);
  }

  function rerender() { render(false); }
  function rerenderQuiet() { render(false); }

  // Safe element traversal for iOS 12 Safari SVG elements where Element.closest may fail
  function findClosestAction(el) {
    while (el && el !== document.body && el !== document) {
      if (el.getAttribute && el.getAttribute('data-act')) return el;
      el = el.parentNode;
    }
    return null;
  }

  function onTap(e) {
    var el = e.target;

    // Never block native form controls so select dropdowns and dates open immediately
    if (el && (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      return;
    }

    var hit = findClosestAction(el);
    if (!hit) return;

    var act = hit.getAttribute('data-act');
    if (act === 'sheet-close') {
      e.preventDefault();
      App.UI.closeSheet();
      return;
    }

    // Allow standard telephone links to dial out
    if (hit.tagName === 'A' && hit.getAttribute('href') && hit.getAttribute('href').indexOf('#') !== 0) {
      return;
    }

    e.preventDefault();
    var inSheet = false;
    var cur = hit;
    while (cur && cur !== document.body) {
      if (cur.id === 'sheet') { inSheet = true; break; }
      cur = cur.parentNode;
    }

    var handler = inSheet && App.UI.sheetHandler() ? App.UI.sheetHandler() : App.Views[current].onAct;
    if (handler) handler(act, hit, e);
  }

  function onChange(e) {
    var hit = findClosestAction(e.target);
    if (!hit) return;
    var act = hit.getAttribute('data-act');

    var inSheet = false;
    var cur = hit;
    while (cur && cur !== document.body) {
      if (cur.id === 'sheet') { inSheet = true; break; }
      cur = cur.parentNode;
    }

    var handler = inSheet && App.UI.sheetHandler() ? App.UI.sheetHandler() : App.Views[current].onAct;
    if (handler) handler(act, hit, e);
  }

  function boot() {
    viewEl = document.getElementById('view');
    titleEl = document.getElementById('topbar-title');
    topbarRightEl = document.getElementById('topbar-right');
    App.UI.boot();
    App.Store.load();

    document.addEventListener('click', onTap, false);
    document.addEventListener('change', onChange, false);
    window.addEventListener('hashchange', function () { render(true); });

    if (!location.hash) location.hash = '#/dashboard';
    render(true);

    var splash = document.getElementById('splash');
    if (splash) {
      setTimeout(function () {
        splash.className = 'gone';
        setTimeout(function () {
          if (splash.parentNode) splash.parentNode.removeChild(splash);
        }, 480);
      }, 750);
    }
  }

  App.go = go;
  App.rerender = rerender;
  App.rerenderQuiet = rerenderQuiet;
  App.route = function () { return current; };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();