/* ==========================================================================
   Loreto's Catering Tracker — Views: Settings (js/views/settings.js)
   - Master Configuration Hub: Categories, Kit Presets, Staff Directory
   - Dedicated Staff Directory Sheet with Live Search & Role Filters
   - Staff Profile Modal with Photo Upload, Call Action, & Gig History
   - Offline JSON backup export & restore with IndexedDB photos
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.settings = (function () {
  var U = App.UI, S = App.Store;
  var staffSearchQuery = '', staffRoleFilter = 'all';

  function render() {
    var st = S.state();
    var set = st.settings || {};
    var staffList = S.staff();
    var cats = S.categories();
    var presetsList = S.presets();

    return '<div class="banner mb12">' +
        '<h3>Master Settings & Directory</h3>' +
        '<p class="muted mt4" style="font-size:12px">Loreto\'s Kitchen &middot; Adelaide SA Catering Operations</p>' +
      '</div>' +

      /* 1. Staff & Crew Directory Quick-Access */
      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<div>' +
            '<h3 style="font-size:13.5px;font-weight:700;color:var(--timber-ink)">' + U.icon('users', 'mr4') + ' Staff & Crew Directory</h3>' +
            '<p class="muted mt2" style="font-size:11.5px">' + staffList.length + ' active crew members</p>' +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="open-staff-directory" style="width:auto;padding:0 12px;min-height:34px">' +
            'Open directory &rarr;' +
          '</button>' +
        '</div>' +
      '</div>' +

      /* 2. Gear Kit Presets Quick-Access */
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

      /* 4. Event & Inventory Automation */
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

      /* 5. Offline Data & Backup */
      '<h2 class="section-title mt16">' + U.icon('layers') + ' Offline Data & Storage</h2>' +
      '<div class="card mb12">' +
        '<p class="muted mb12" style="font-size:12px">Create offline JSON backups of all gear, kit presets, past event history, and crew contacts. Store safely on your phone or drive.</p>' +
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

      /* 6. Factory Reset */
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

  /* Dedicated Slide-In Staff Directory with Search and Role Filtering */
  function openStaffDirectorySheet() {
    var allStaff = S.staff();
    var qLower = staffSearchQuery.toLowerCase().trim();

    var filtered = allStaff.filter(function (m) {
      if (staffRoleFilter !== 'all') {
        var role = (m.role || '').toLowerCase();
        if (role.indexOf(staffRoleFilter) === -1) return false;
      }
      if (!qLower) return true;
      var hay = (m.name + ' ' + (m.role || '') + ' ' + (m.phone || '')).toLowerCase();
      return hay.indexOf(qLower) > -1;
    });

    var roleChips = [
      { id: 'all',    label: 'All Roles' },
      { id: 'chef',   label: 'Chefs / Kitchen' },
      { id: 'server', label: 'Servers' },
      { id: 'driver', label: 'Drivers' },
      { id: 'lead',   label: 'Leads' }
    ].map(function (rc) {
      return '<button type="button" class="chip' + (staffRoleFilter === rc.id ? ' on' : '') + '" data-act="filter-staff-role" data-id="' + rc.id + '">' +
        rc.label +
      '</button>';
    }).join('');

    var staffRowsHtml = filtered.map(function (m) {
      return '<button type="button" class="item" data-act="open-staff-profile" data-id="' + m.id + '">' +
        '<span class="thumb staff-thumb"' + (m.photoId ? ' data-photo="' + m.photoId + '-t"' : '') + '>' +
          (m.photoId ? '' : U.icon('user')) +
        '</span>' +
        '<span class="grow truncate mr8">' +
          '<span class="item-name truncate">' + U.esc(m.name) + '</span>' +
          '<span class="item-sub truncate">' +
            U.esc(m.role || 'Catering Staff') + (m.phone ? ' &middot; ' + U.esc(m.phone) : '') +
          '</span>' +
        '</span>' +
        '<span class="item-qty">' + U.icon('chevronRight') + '</span>' +
      '</button>';
    }).join('');

    var html =
      '<div class="search">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="st-dir-search" type="search" placeholder="Search staff by name, role, or phone" value="' + U.esc(staffSearchQuery) + '">' +
      '</div>' +

      '<div class="chips filter-bar">' + roleChips + '</div>' +

      '<div class="row row-between mb8">' +
        '<span class="muted" style="font-size:11.5px">' + filtered.length + ' of ' + allStaff.length + ' crew members</span>' +
        '<button type="button" class="muted" data-act="new-staff" style="font-size:12px;font-weight:700;color:var(--inasal-orange)">+ Add new staff</button>' +
      '</div>' +

      '<div class="list list-stagger mb12">' +
        (staffRowsHtml || '<div class="empty"><p class="muted">No staff members match filter.</p></div>') +
      '</div>' +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary mb8" data-act="new-staff">' +
          U.icon('plus', 'mr4') + ' Add new staff member' +
        '</button>' +
        '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>' +
      '</div>';

    var body = U.openSheet('Staff Directory', html, onAct);
    U.hydrateThumbs(body);

    var sInput = document.getElementById('st-dir-search');
    if (sInput) {
      sInput.addEventListener('input', function () {
        staffSearchQuery = sInput.value;
        openStaffDirectorySheet();
        var reFocus = document.getElementById('st-dir-search');
        if (reFocus) reFocus.focus();
      });
    }
  }

  /* Staff Profile Modal with Photo Upload, Direct Call, and Deployment History */
  function openStaffProfile(id) {
    var m = S.staffMember(id);
    if (!m) return;

    var allEvents = S.events ? S.events() : S.state().events || [];
    var eventsWorked = allEvents.filter(function (e) {
      return (e.staffIds || []).indexOf(m.id) > -1;
    });

    var recentGigsHtml = eventsWorked.slice(0, 4).map(function (ev) {
      return '<div class="row row-between" style="padding:6px 0;border-bottom:1px solid var(--line);font-size:12px">' +
        '<div class="truncate mr8">' +
          '<strong style="color:var(--timber-ink)">' + U.esc(ev.name) + '</strong>' +
          '<div class="muted" style="font-size:11px">' + U.esc(ev.venue || 'No venue') + '</div>' +
        '</div>' +
        '<span class="muted" style="font-size:11px;flex-shrink:0">' + U.fmtDate(ev.date) + '</span>' +
      '</div>';
    }).join('');

    var html =
      '<div class="card mb12" style="text-align:center;padding:16px 12px">' +
        '<div class="staff-avatar-large" id="staff-profile-avatar" data-act="staff-pick-photo" style="cursor:pointer"' +
          (m.photoId ? ' data-photo="' + m.photoId + '"' : '') + '>' +
          (m.photoId ? '' : U.icon('user')) +
          '<div style="position:absolute;bottom:0;right:0;background:rgba(33,29,26,0.85);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center">' +
            U.icon('camera') +
          '</div>' +
        '</div>' +
        '<h3 style="font-size:17px;font-weight:700;color:var(--timber-ink)">' + U.esc(m.name) + '</h3>' +
        '<span class="tag tag-orange mt4" style="font-size:10.5px">' + U.esc(m.role || 'Catering Staff') + '</span>' +
        '<input class="hidden-file" type="file" id="staff-avatar-file" accept="image/*">' +
      '</div>' +

      (m.phone ? (
        '<div class="mb12">' +
          '<a class="btn btn-primary" href="tel:' + U.esc(m.phone) + '" style="min-height:44px">' +
            U.icon('phone', 'mr4') + ' Call ' + U.esc(m.phone) +
          '</a>' +
        '</div>'
      ) : '') +

      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<strong style="font-size:12.5px;color:var(--timber-ink)">' + U.icon('history', 'mr4') + ' Catering Gigs Worked</strong>' +
          '<span class="section-badge" style="background:var(--sand-soft);color:var(--timber-ink)">' + eventsWorked.length + ' events</span>' +
        '</div>' +
        (recentGigsHtml || '<p class="muted mt4" style="font-size:11.5px">No events logged with this staff member yet.</p>') +
      '</div>' +

      (m.notes ? (
        '<div class="card mb12">' +
          '<strong style="font-size:12px;color:var(--timber-ink);display:block;margin-bottom:4px">Availability & License Notes:</strong>' +
          '<p style="font-size:12px;color:var(--timber-ink)">' + U.esc(m.notes) + '</p>' +
        '</div>'
      ) : '') +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary mb8" data-act="edit-staff" data-id="' + m.id + '">' +
          U.icon('edit', 'mr4') + ' Edit staff details' +
        '</button>' +
        '<div class="row" style="gap:6px">' +
          '<button type="button" class="btn btn-danger grow btn-sm" data-act="del-staff" data-id="' + m.id + '">' +
            U.icon('trash', 'mr4') + ' Remove staff' +
          '</button>' +
          '<button type="button" class="btn btn-ghost grow btn-sm" data-act="open-staff-directory">Back to directory</button>' +
        '</div>' +
      '</div>';

    var body = U.openSheet('Staff Profile', html, onAct);
    U.hydrateThumbs(body);

    var fInput = document.getElementById('staff-avatar-file');
    if (fInput) {
      fInput.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        U.toast('Saving profile photo...');
        App.Image.compress(f).then(function (r) {
          var pid = m.photoId || S.uid('ph-staff-');
          m.photoId = pid;
          App.DB.set(pid, r.full);
          App.DB.set(pid + '-t', r.thumb);
          S.saveStaff(m);
          U.toast('Profile photo updated.');
          App.rerenderQuiet();
          openStaffProfile(m.id);
        });
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
        '<button type="button" class="btn btn-ghost mt8" data-act="open-staff-directory">Back to directory</button>' +
      '</div>';

    U.openSheet(m ? 'Edit Crew Member' : 'New Crew Member', html, onAct);
  }

  function onAct(act, el) {
    var id = el ? el.getAttribute('data-id') : '';

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

    if (act === 'open-staff-directory') {
      openStaffDirectorySheet();
      return;
    }

    if (act === 'filter-staff-role') {
      staffRoleFilter = id;
      openStaffDirectorySheet();
      return;
    }

    if (act === 'open-staff-profile') {
      openStaffProfile(id);
      return;
    }

    if (act === 'staff-pick-photo') {
      var fi = document.getElementById('staff-avatar-file');
      if (fi) fi.click();
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

      U.toast('Staff member saved.');
      openStaffDirectorySheet();
      App.rerenderQuiet();
      return;
    }

    if (act === 'del-staff') {
      U.confirm('Delete crew member', 'Remove this staff member from your directory?', 'Delete', function () {
        S.removeStaff(id);
        U.toast('Crew member removed.');
        openStaffDirectorySheet();
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
      var fileInput = document.getElementById('import-file');
      if (fileInput) fileInput.click();
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
    onAct: onAct,
    openStaffDirectorySheet: openStaffDirectorySheet,
    openStaffProfile: openStaffProfile
  };
})();