/* views/settings.js — backup, restore, housekeeping. */
window.App = window.App || {}; App.Views = App.Views || {};
App.Views.settings = (function () {
  var U = App.UI, S = App.Store;

  function bytes() {
    try {
      var raw = localStorage.getItem('lct.v1') || '';
      return Math.round(raw.length / 1024);
    } catch (e) { return 0; }
  }

  function render() {
    var st = S.state().settings;
    return '<div class="card">' +
        '<div class="field"><label for="s-biz">Business name</label>' +
        '<input class="input" id="s-biz" value="' + U.esc(st.business) + '"></div>' +
        '<button class="btn btn-ghost btn-sm" data-act="save-biz">Save name</button>' +
      '</div>' +

      '<h2 class="section-title">Backups</h2>' +
      '<div class="card">' +
        '<p class="muted">Everything lives on this phone only. Make a backup before an iOS update, or when handing the phone to someone else.</p>' +
        '<button class="btn btn-primary mt12" data-act="export">Export a backup</button>' +
        '<button class="btn btn-ghost" data-act="import">Restore from a backup</button>' +
        (st.lastBackup ? '<p class="muted mt12">Last export: ' + U.esc(U.fmtDate(st.lastBackup)) + '</p>' : '') +
      '</div>' +

      '<h2 class="section-title">Storage</h2>' +
      '<div class="card">' +
        '<div class="row row-between"><span class="muted">Gear, events and presets</span><strong>' + bytes() + ' KB</strong></div>' +
        '<div class="divider"></div>' +
        '<p class="muted">Photos sit in a separate store. Clearing them keeps all your counts and only drops the pictures.</p>' +
        '<button class="btn btn-ghost btn-sm mt12" data-act="clear-photos">Clear all photos</button>' +
        '<button class="btn btn-danger btn-sm mt8" data-act="reset">Reset to sample data</button>' +
      '</div>' +

      '<h2 class="section-title">Put it on the home screen</h2>' +
      '<div class="card"><p class="muted">In Safari, tap the share button, then <strong>Add to Home Screen</strong>. It opens full screen and keeps working with the phone in airplane mode.</p></div>' +

      '<p class="muted mt12" style="text-align:center">Loreto\u2019s Catering Tracker \u00b7 works offline \u00b7 v1</p>';
  }

  function exportFlow() {
    U.toast('Packing the backup\u2026');
    S.exportData().then(function (json) {
      S.state().settings.lastBackup = new Date().toISOString();
      S.flush();
      var name = 'loretos-backup-' + U.today() + '.json';
      var url = '';
      try {
        url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      } catch (e) { url = 'data:application/json;charset=utf-8,' + encodeURIComponent(json); }
      U.openSheet('Backup ready',
        '<p class="muted mb8">' + Math.round(json.length / 1024) + ' KB. On a Mac or PC the button saves a file. On an iPhone, open it and use the share sheet, or copy the text below into Notes or an email to yourself.</p>' +
        '<a class="btn btn-primary" href="' + url + '" download="' + name + '" target="_blank" rel="noopener">Save ' + name + '</a>' +
        '<button class="btn btn-ghost" data-act="select-json">Select the text to copy</button>' +
        '<textarea class="input mt12" id="json-out" style="min-height:130px;font-size:12px">' + U.esc(json) + '</textarea>' +
        '<button class="btn btn-ghost mt12" data-act="sheet-close">Done</button>', onAct);
      App.rerenderQuiet();
    });
  }

  function importFlow() {
    U.openSheet('Restore a backup',
      '<p class="muted mb8">This replaces everything currently on the phone. Export first if you are not sure.</p>' +
      '<button class="btn btn-ghost" data-act="pick-json">Choose a backup file</button>' +
      '<input class="hidden-file" type="file" id="json-file" accept="application/json,.json">' +
      '<p class="muted mt12">Or paste the backup text:</p>' +
      '<textarea class="input" id="json-in" placeholder="{ &quot;app&quot;: &quot;loretos-catering-tracker&quot; ... }"></textarea>' +
      '<button class="btn btn-primary mt12" data-act="do-import">Restore</button>' +
      '<button class="btn btn-ghost" data-act="sheet-close">Cancel</button>', onAct);
    var f = document.getElementById('json-file');
    if (f) f.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var r = new FileReader();
      r.onload = function () {
        var ta = document.getElementById('json-in');
        if (ta) ta.value = r.result;
        U.toast('File loaded. Tap Restore.');
      };
      r.readAsText(file);
    });
  }

  function onAct(act) {
    if (act === 'save-biz') {
      var v = (document.getElementById('s-biz') || {}).value || '';
      S.state().settings.business = v.trim() || "Loreto's Kitchen";
      S.flush(); U.toast('Saved.'); App.rerender();
    }
    else if (act === 'export') exportFlow();
    else if (act === 'import') importFlow();
    else if (act === 'select-json') {
      var ta = document.getElementById('json-out');
      if (ta) { ta.focus(); ta.setSelectionRange(0, ta.value.length); U.toast('Now tap Copy.'); }
    }
    else if (act === 'pick-json') { var f = document.getElementById('json-file'); if (f) f.click(); }
    else if (act === 'do-import') {
      var text = (document.getElementById('json-in') || {}).value || '';
      if (!text.trim()) { U.toast('Paste the backup text or choose a file.'); return; }
      try {
        S.importData(text).then(function () {
          U.closeSheet(); App.go('/dashboard'); App.rerender(); U.toast('Backup restored.');
        });
      } catch (e) { U.toast('That text is not a valid backup.'); }
    }
    else if (act === 'clear-photos') {
      U.confirm('Clear photos', 'Counts and names stay. Every picture is removed from the phone.', 'Clear photos', function () {
        App.DB.clear().then(function () {
          S.items().forEach(function (i) { i.photoId = ''; });
          S.flush(); App.rerender(); U.toast('Photos cleared.');
        });
      });
    }
    else if (act === 'reset') {
      U.confirm('Reset everything', 'All gear, events and photos on this phone are replaced with the sample set.', 'Reset', function () {
        S.reset().then(function () { App.go('/dashboard'); App.rerender(); U.toast('Reset to sample data.'); });
      });
    }
  }

  function mounted() { }

  return { title: 'Setup', render: render, mounted: mounted, onAct: onAct };
})();
