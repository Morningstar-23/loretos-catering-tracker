/* ==========================================================================
   Loreto's Catering Tracker — Views: Settings (js/views/settings.js)
   - Master Configuration Hub: Business, Categories, Kit Presets, Staff
   - Global inventory threshold defaults & event automation rules
   - Staff directory with tap-to-call links
   - Offline JSON backup export & restore with IndexedDB photos
   - Wording standardized to "inventory"
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.settings = (function () {
  var U = App.UI, S = App.Store;

  function render() {
    var st = S.state();
    var set = st.settings || {};
    var staffList = S.staff();
    var cats = S.categories();
    var presetsList = S.presets();

    var staffHtml = staffList.map(function (m) {
      return '<div class="item">' +
        '<span class="thumb">' + U.icon('user') + '</span>' +
        '<span class="grow truncate mr8">' +
          '<span class="item-name truncate">' + U.esc(m.name) + '</span>' +
          '<span class="item-sub truncate">' + U.esc(m.role || 'Catering Staff') + (m.phone ? ' &middot; ' + U.esc(m.phone) : '') + '</span>' +
        '</span>' +
        (m.phone ? '<a class="btn btn-ghost btn-sm mr8" href="tel:' + U.esc(m.phone) + '" style="min-height:34px;padding:4px 8px;font-size:12px;width:auto">' +
          U.icon('phone', 'mr4') + ' Call</a>' : '') +
        '<button type="button" class="btn btn-ghost btn-sm mr8" data-act="edit-staff" data-id="' + m.id + '" style="min-height:34px;padding:4px 8px;width:auto">' +
          U.icon('edit') +
        '</button>' +
        '<button type="button" class="step-btn" data-act="del-staff" data-id="' + m.id + '" aria-label="Delete">' +
          U.icon('close') +
        '</button>' +
      '</div>';
    }).join('');

    return '<div class="banner mb12">' +
        '<h3>Master Settings & Directory</h3>' +
        '<p class="muted mt4" style="font-size:12px">Loreto\'s Kitchen &middot; Adelaide SA Catering Operations</p>' +
      '</div>' +

      /* 1. Business Profile */
      '<div class="card mb12">' +
        '<div class="field">' +
          '<label for="st-biz">Catering Business Name</label>' +
          '<input class="input" id="st-biz" value="' + U.esc(set.business || "Loreto's Kitchen") + '">' +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="save-biz" style="width:auto;padding:0 14px;min-height:36px">' +
          'Save business name' +
        '</button>' +
      '</div>' +

      /* 2. Event & Inventory Automation */
      '<div class="card mb12">' +
        '<h3 style="font-size:13.5px;font-weight:700;margin-bottom:8px;color:var(--timber-ink)">' + U.icon('settings', 'mr4') + ' Event Automation Rules</h3>' +
        '<label class="row mb8" style="font-size:12px;align-items:flex-start">' +
          '<input type="checkbox" id="pref-consumed" ' + (set.deductConsumed !== false ? 'checked' : '') + ' style="width:18px;height:18px;margin-right:8px;margin-top:2px">' +
          '<span>Always deduct used supplies (Sterno cans, paper goods) from inventory upon closing an event.</span>' +
        '</label>' +
        '<label class="row mb8" style="font-size:12px;align-items:flex-start">' +
          '<input type="checkbox" id="pref-missing" ' + (set.deductMissing ? 'checked' : '') + ' style="width:18px;height:18px;margin-right:8px;margin-top:2px">' +
          '<span>Prompt to write off missing durable equipment automatically upon event closure.</span>' +
        '</label>' +
        '<button type="button" class="btn btn-ghost btn-sm mt4" data-act="save-prefs" style="width:auto;padding:0 14px;min-height:34px">' +
          'Save automation rules' +
        '</button>' +
      '</div>' +

      /* 3. Category Management Quick-Access */
      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<div>' +
            '<h3 style="font-size:13.5px;font-weight:700;color:var(--timber-ink)">' + U.icon('plate', 'mr4') + ' Category Management</h3>' +
            '<p class="muted mt2" style="font-size:11.5px">' + cats.length + ' active categories</p>' +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="manage-cats" style="width:auto;padding:0 12px;min-height:34px">' +
            'Configure &rarr;' +
          '</button>' +
        '</div>' +
      '</div>' +

      /* 4. Gear Kit Presets Quick-Access */
      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<div>' +
            '<h3 style="font-size:13.5px;font-weight:700;color:var(--timber-ink)">' + U.icon('layers', 'mr4') + ' Gear Kit Presets</h3>' +
            '<p class="muted mt2" style="font-size:11.5px">' + presetsList.length + ' saved kits</p>' +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="manage-presets" style="width:auto;padding:0 12px;min-height:34px">' +
            'Manage kits &rarr;' +
          '</button>' +
        '</div>' +
      '</div>' +

      /* 5. Staff & Crew Directory */
      '<div class="row row-between mb8 mt16">' +
        '<h2 class="section-title" style="margin:0">' + U.icon('users') + ' Staff Directory (' + staffList.length + ')</h2>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="new-staff" style="width:auto;padding:0 10px;min-height:32px;font-size:12px">' +
          U.icon('plus', 'mr4') + ' Add staff' +
        '</button>' +
      '</div>' +
      '<div class="list mb12">' +
        (staffHtml || '<div class="empty"><p class="muted">No staff members in directory yet.</p></div>') +
      '</div>' +

      /* 6. Offline Data & Backup */
      '<h2 class="section-title mt16">' + U.icon('layers') + ' Offline Data & Storage</h2>' +
      '<div class="card mb12">' +
        '<p class="muted mb12" style="font-size:12px">Create offline JSON backups of all gear, kit presets, past event ledgers, and crew contacts. Store safely on your phone or drive.</p>' +
        '<div class="row" style="gap:8px">' +
          '<button type="button" class="btn btn-primary grow btn-sm" data-act="export-backup" style="min-height:38px;font-size:12px">' +
            'Export Backup' +
          '</button>' +
          '<button type="button" class="btn btn-ghost grow btn-sm" data-act="pick-import" style="min-height:38px;font-size:12px">' +
            'Restore File' +
          '</button>' +
        '</div>' +
        '<input type="file" id="import-file" class="hidden-file" accept=".json">' +
      '</div>' +

      /* 7. Factory Reset */
      '<div class="card mb12" style="border-color:rgba(214,57,32,0.3)">' +
        '<h3 style="font-size:13.5px;color:var(--alert);font-weight:700;margin-bottom:4px">Reset to Loreto\'s Defaults</h3>' +
        '<p class="muted mb8" style="font-size:11.5px">Restores initial Adelaide kitchen inventory (kawas, burners, chafing dishes, Sterno cans) and clears booking history.</p>' +
        '<button type="button" class="btn btn-danger btn-sm" data-act="reset-factory" style="width:auto;min-height:34px;padding:0 12px;font-size:12px">' +
          'Reset Database' +
        '</button>' +
      '</div>' +

      '<p class="muted mt16" style="text-align:center;font-size:11px">Loreto\'s Catering Tracker &middot; Adelaide SA &middot; v2.0</p>';
  }

  function mounted() {
    var fi = document.getElementById('import-file');
    if (fi) {
      fi.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (evt) {
          try {
            U.toast('Restoring data and offline images...');
            S.importData(evt.target.result).then(function () {
              U.toast('Backup successfully restored.');
              App.rerenderQuiet();
            }).catch(function (err) {
              U.toast('Restore failed: ' + (err.message || 'Invalid file'));
            });
          } catch (err) {
            U.toast('Invalid JSON backup file.');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  function openStaffEditor(id) {
    var m = id ? S.staffMember(id) : null;

    var html =
      '<div class="field">' +
        '<label for="st-name">Full Name *</label>' +
        '<input class="input" id="st-name" value="' + U.esc(m ? m.name : '') + '" placeholder="e.g. Maria Santos">' +
      '</div>' +
      '<div class="field">' +
        '<label for="st-role">Role / Responsibilities</label>' +
        '<input class="input" id="st-role" value="' + U.esc(m ? m.role : '') + '" placeholder="e.g. Kitchen Lead / Van Driver / Head Server">' +
      '</div>' +
      '<div class="field">' +
        '<label for="st-phone">Phone Number (Tap-to-call)</label>' +
        '<input class="input" id="st-phone" type="tel" value="' + U.esc(m ? m.phone : '') + '" placeholder="0412 000 000">' +
      '</div>' +
      '<div class="field">' +
        '<label for="st-note">Notes</label>' +
        '<textarea class="input" id="st-note" placeholder="Shift availability or license">' + U.esc(m ? (m.notes || '') : '') + '</textarea>' +
      '</div>' +
      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="save-staff-editor" data-id="' + (m ? m.id : '') + '">' +
          (m ? 'Save changes' : 'Add crew member') +
        '</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Cancel</button>' +
      '</div>';

    U.openSheet(m ? 'Edit Crew Member' : 'New Crew Member', html, onAct);
  }

  function onAct(act, el) {
    var id = el ? el.getAttribute('data-id') : '';

    if (act === 'save-biz') {
      var name = ((document.getElementById('st-biz') || {}).value || '').trim();
      if (!name) { U.toast('Enter business name.'); return; }
      var st = S.state();
      st.settings = st.settings || {};
      st.settings.business = name;
      S.save();
      U.toast('Business name saved.');
      App.rerenderQuiet();
      return;
    }

    if (act === 'save-prefs') {
      var dConsumed = document.getElementById('pref-consumed');
      var dMissing = document.getElementById('pref-missing');
      var st = S.state();
      st.settings = st.settings || {};
      st.settings.deductConsumed = !!(dConsumed && dConsumed.checked);
      st.settings.deductMissing = !!(dMissing && dMissing.checked);
      S.save();
      U.toast('Event automation rules saved.');
      return;
    }

    if (act === 'manage-cats') {
      App.Views.inventory.openCats ? App.Views.inventory.openCats() : App.go('inventory');
      return;
    }

    if (act === 'manage-presets') {
      App.go('catering');
      return;
    }

    if (act === 'new-staff') {
      openStaffEditor(null);
      return;
    }

    if (act === 'edit-staff') {
      openStaffEditor(id);
      return;
    }

    if (act === 'save-staff-editor') {
      var sName = ((document.getElementById('st-name') || {}).value || '').trim();
      if (!sName) { U.toast('Please provide a name.'); return; }

      S.saveStaff({
        id: id || undefined,
        name: sName,
        role: ((document.getElementById('st-role') || {}).value || '').trim(),
        phone: ((document.getElementById('st-phone') || {}).value || '').trim(),
        notes: ((document.getElementById('st-note') || {}).value || '').trim()
      });

      U.closeSheet();
      U.toast('Staff member saved.');
      App.rerenderQuiet();
      return;
    }

    if (act === 'del-staff') {
      U.confirm('Delete crew member', 'Remove this staff member from your directory?', 'Delete', function () {
        S.removeStaff(id);
        U.toast('Crew member removed.');
        App.rerenderQuiet();
      });
      return;
    }

    if (act === 'export-backup') {
      U.toast('Generating backup package...');
      S.exportData().then(function (jsonStr) {
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'loretos-kitchen-backup-' + U.today() + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        U.toast('Backup file downloaded.');
      }).catch(function () {
        U.toast('Could not create backup file.');
      });
      return;
    }

    if (act === 'pick-import') {
      var fi = document.getElementById('import-file');
      if (fi) fi.click();
      return;
    }

    if (act === 'reset-factory') {
      U.confirm('Reset everything to defaults', 'This will wipe all active bookings, custom kit presets, and inventory adjustments, restoring Loreto\'s default inventory.', 'Reset All', function () {
        S.reset().then(function () {
          U.toast('Database restored to factory defaults.');
          App.rerenderQuiet();
        });
      });
      return;
    }
  }

  return {
    title: 'Kitchen settings',
    render: render,
    mounted: mounted,
    onAct: onAct
  };
})();