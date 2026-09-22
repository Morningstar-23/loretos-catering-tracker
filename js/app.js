/* app.js — router, one delegated tap handler, boot. */
(function () {
  var ROUTES = ['dashboard', 'inventory', 'catering', 'history', 'settings'];
  var current = 'dashboard';
  var viewEl, titleEl;

  function route() {
    var h = (location.hash || '').replace('#/', '');
    return ROUTES.indexOf(h) > -1 ? h : 'dashboard';
  }

  function go(path) {
    if (location.hash === '#' + path) { render(true); return; }
    location.hash = '#' + path;
  }

  function render(animate) {
    current = route();
    var v = App.Views[current];
    viewEl.innerHTML = v.render();
    viewEl.className = animate === false ? '' : 'view-enter';
    viewEl.scrollTop = 0;
    window.scrollTo(0, 0);
    titleEl.textContent = current === 'dashboard' ? App.Store.state().settings.business : v.title;
    var tabs = document.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-tab') === current;
      tabs[i].className = 'tab' + (tabs[i].getAttribute('data-tab') === 'catering' ? ' tab-hero' : '') + (on ? ' on' : '');
    }
    if (v.mounted) v.mounted(viewEl);
  }

  function rerender() { render(false); }
  function rerenderQuiet() { render(false); }

  function onTap(e) {
    var el = e.target;
    while (el && el !== document.body && !el.getAttribute) el = el.parentNode;
    var hit = el && el.closest ? el.closest('[data-act]') : null;
    if (!hit) return;
    var act = hit.getAttribute('data-act');
    if (act === 'sheet-close') { e.preventDefault(); App.UI.closeSheet(); return; }
    if (hit.tagName === 'A' && hit.getAttribute('href')) return; // let real links work
    e.preventDefault();
    var inSheet = !!(hit.closest && hit.closest('#sheet'));
    var handler = inSheet && App.UI.sheetHandler() ? App.UI.sheetHandler() : App.Views[current].onAct;
    if (handler) handler(act, hit, e);
  }

  function boot() {
    viewEl = document.getElementById('view');
    titleEl = document.getElementById('topbar-title');
    App.UI.boot();
    App.Store.load();

    document.addEventListener('click', onTap, false);
    window.addEventListener('hashchange', function () { render(true); });

    if (!location.hash) location.hash = '#/dashboard';
    render(true);

    var splash = document.getElementById('splash');
    setTimeout(function () {
      splash.className = 'gone';
      setTimeout(function () { splash.parentNode.removeChild(splash); }, 520);
    }, 900);

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { });
      });
    }
  }

  App.go = go;
  App.rerender = rerender;
  App.rerenderQuiet = rerenderQuiet;
  App.route = function () { return current; };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
