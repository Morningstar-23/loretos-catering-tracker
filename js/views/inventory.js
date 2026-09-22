/* views/inventory.js — gear list + CRUD for items and categories. */
window.App = window.App || {}; App.Views = App.Views || {};
App.Views.inventory = (function () {
  var U = App.UI, S = App.Store;
  var q = '', cat = '', pendingPhoto = null, editingId = null;

  function render() {
    var list = S.searchItems(q, cat);
    var cats = S.state().categories;
    var chips = '<button class="chip' + (cat ? '' : ' on') + '" data-act="cat" data-id="">All</button>' +
      cats.map(function (c) {
        return '<button class="chip' + (cat === c.id ? ' on' : '') + '" data-act="cat" data-id="' + c.id + '">' +
          c.emoji + ' ' + U.esc(c.name) + '</button>';
      }).join('') +
      '<button class="chip" data-act="manage-cats">\u2699\uFE0F Categories</button>';

    return '<div class="search">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 1-4.2 10.3l-3.1 3.1-1.4-1.4 3.1-3.1A6 6 0 0 1 10 4zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>' +
        '<input class="input" id="inv-q" type="search" placeholder="Search gear or tag" value="' + U.esc(q) + '">' +
      '</div>' +
      '<div class="chips">' + chips + '</div>' +
      (list.length
        ? '<div class="list">' + list.map(row).join('') + '</div>' +
          '<p class="muted mt12">' + list.length + ' of ' + S.items().length + ' kinds shown</p>'
        : U.empty('\uD83D\uDD0E', q || cat ? 'Nothing matches' : 'The shelf is empty',
            q || cat ? 'Try another word, or clear the filter.' : 'Add the first tray, burner or cooler.',
            '<button class="btn btn-primary" data-act="add-item">Add gear</button>')) +
      '<button class="fab" data-act="add-item" aria-label="Add gear">+</button>';
  }

  function row(i) {
    var c = S.category(i.categoryId);
    return '<button class="item" data-act="open-item" data-id="' + i.id + '">' +
      '<span class="thumb"' + (i.photoId ? ' data-photo="' + i.photoId + '-t"' : '') + '>' +
        (i.photoId ? '' : (c ? c.emoji : '\uD83D\uDCE6')) + '</span>' +
      '<span class="grow"><span class="item-name truncate">' + U.esc(i.name) + '</span>' +
        '<span class="item-sub truncate">' + U.esc(c ? c.name : 'Uncategorised') + ' \u00b7 ' + U.esc(i.unit) +
        (i.tagLabel ? ' &nbsp;' + U.tag(i.tagLabel, i.tagColor, i.tagStyle) : '') + '</span></span>' +
      '<span class="item-qty">' + i.qty + '</span></button>';
  }

  function mounted(root) {
    U.hydrateThumbs(root);
    var input = document.getElementById('inv-q');
    if (input) {
      input.addEventListener('input', function () {
        q = input.value;
        var pos = input.selectionStart;
        App.rerender();
        var again = document.getElementById('inv-q');
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} }
      });
    }
  }

  /* ---------- item editor ---------- */
  function openEditor(id) {
    var it = id ? S.item(id) : null;
    editingId = id || null;
    pendingPhoto = null;
    var cats = S.state().categories;
    var colorOpts = U.COLORS.map(function (c) {
      return '<option value="' + c.v + '"' + (it && it.tagColor === c.v ? ' selected' : '') + '>' + c.n + '</option>';
    }).join('');

    var html =
      '<div class="field"><label for="f-name">What is it</label>' +
        '<input class="input" id="f-name" value="' + U.esc(it ? it.name : '') + '" placeholder="Chafing dish + lid"></div>' +
      '<div class="row"><div class="grow" style="padding-right:8px"><div class="field"><label for="f-qty">How many we own</label>' +
        '<input class="input" id="f-qty" type="number" inputmode="numeric" min="0" value="' + (it ? it.qty : 1) + '"></div></div>' +
        '<div style="width:110px"><div class="field"><label for="f-unit">Counted in</label>' +
        '<input class="input" id="f-unit" value="' + U.esc(it ? it.unit : 'pc') + '" placeholder="pc"></div></div></div>' +
      '<div class="field"><label for="f-cat">Category</label><select class="input" id="f-cat">' +
        '<option value="">Uncategorised</option>' +
        cats.map(function (c) {
          return '<option value="' + c.id + '"' + (it && it.categoryId === c.id ? ' selected' : '') + '>' + c.emoji + ' ' + U.esc(c.name) + '</option>';
        }).join('') + '</select></div>' +
      '<div class="divider"></div>' +
      '<p class="muted mb8">How do we know it is ours? Write exactly what the staff will see on the piece.</p>' +
      '<div class="field"><label for="f-tag">Identification mark</label>' +
        '<input class="input" id="f-tag" value="' + U.esc(it ? it.tagLabel : '') + '" placeholder="Red tape on handle"></div>' +
      '<div class="row"><div class="grow" style="padding-right:8px"><div class="field"><label for="f-color">Mark colour</label>' +
        '<select class="input" id="f-color">' + colorOpts + '</select></div></div>' +
        '<div style="width:110px"><div class="field"><label for="f-style">Shown as</label>' +
        '<select class="input" id="f-style">' +
          '<option value="tape"' + (it && it.tagStyle === 'tape' ? ' selected' : '') + '>Tape</option>' +
          '<option value="stamp"' + (it && it.tagStyle === 'stamp' ? ' selected' : '') + '>Stamp</option>' +
        '</select></div></div></div>' +
      '<div class="field"><label>Photo</label>' +
        '<div class="photo-box" id="f-photo" data-act="pick-photo">' +
          '<span id="f-photo-hint" style="display:block;padding-top:62px">Tap to take or choose a photo</span></div>' +
        '<input class="hidden-file" type="file" id="f-file" accept="image/*">' +
        '<button class="btn btn-ghost btn-sm mt8" data-act="clear-photo">Remove photo</button></div>' +
      '<div class="field"><label for="f-note">Note</label>' +
        '<textarea class="input" id="f-note" placeholder="Lid dented, still fine">' + U.esc(it ? it.note : '') + '</textarea></div>' +
      '<button class="btn btn-primary" data-act="save-item">' + (it ? 'Save changes' : 'Add to the shelf') + '</button>' +
      (it ? '<button class="btn btn-danger" data-act="del-item">Delete this gear</button>' : '') +
      '<button class="btn btn-ghost" data-act="sheet-close">Cancel</button>';

    var body = U.openSheet(it ? it.name : 'New gear', html, onAct);

    if (it && it.photoId) {
      App.DB.get(it.photoId).then(function (v) {
        if (v) setPhotoPreview(v);
      });
    }
    var file = document.getElementById('f-file');
    if (file) file.addEventListener('change', onFile);
    return body;
  }

  function setPhotoPreview(dataUrl) {
    var box = document.getElementById('f-photo'), hint = document.getElementById('f-photo-hint');
    if (!box) return;
    box.style.backgroundImage = dataUrl ? 'url(' + dataUrl + ')' : '';
    if (hint) hint.style.display = dataUrl ? 'none' : 'block';
  }

  function onFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    U.toast('Squeezing the photo down\u2026');
    App.Image.compress(f).then(function (r) {
      pendingPhoto = r;
      setPhotoPreview(r.full);
      U.toast('Photo ready \u2014 ' + r.kb + ' KB');
    }).catch(function () { U.toast('That photo could not be read. Try another.'); });
    e.target.value = '';
  }

  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }

  function saveItem() {
    var name = val('f-name').trim();
    if (!name) { U.toast('Give it a name first.'); return; }
    var it = editingId ? S.item(editingId) : null;
    var data = {
      id: editingId || undefined,
      name: name,
      qty: Math.max(0, parseInt(val('f-qty'), 10) || 0),
      unit: val('f-unit').trim() || 'pc',
      categoryId: val('f-cat'),
      tagLabel: val('f-tag').trim(),
      tagColor: val('f-color'),
      tagStyle: val('f-style'),
      note: val('f-note').trim(),
      photoId: it ? it.photoId : ''
    };
    if (pendingPhoto === 'clear') {
      if (data.photoId) { App.DB.del(data.photoId); App.DB.del(data.photoId + '-t'); }
      data.photoId = '';
    } else if (pendingPhoto) {
      var pid = data.photoId || S.uid('ph-');
      data.photoId = pid;
      App.DB.set(pid, pendingPhoto.full);
      App.DB.set(pid + '-t', pendingPhoto.thumb);
    }
    S.saveItem(data);
    pendingPhoto = null;
    U.closeSheet();
    U.toast(editingId ? 'Saved.' : 'Added to the shelf.');
    App.rerender();
  }

  /* ---------- categories ---------- */
  function openCats() {
    var cats = S.state().categories;
    var html = cats.map(function (c) {
      var n = S.items().filter(function (i) { return i.categoryId === c.id; }).length;
      return '<div class="item" style="border-radius:0">' +
        '<span class="thumb">' + c.emoji + '</span>' +
        '<span class="grow"><span class="item-name">' + U.esc(c.name) + '</span>' +
        '<span class="item-sub">' + n + ' kinds</span></span>' +
        '<button class="step-btn" data-act="del-cat" data-id="' + c.id + '" aria-label="Delete">\u00d7</button></div>';
    }).join('');
    U.openSheet('Categories',
      '<div class="list mb8">' + (html || '<div class="empty"><p class="muted">No categories yet.</p></div>') + '</div>' +
      '<div class="row"><div style="width:64px;padding-right:8px">' +
        '<input class="input" id="c-emoji" value="\uD83C\uDF7D\uFE0F" maxlength="2"></div>' +
        '<div class="grow"><input class="input" id="c-name" placeholder="New category name"></div></div>' +
      '<button class="btn btn-primary mt12" data-act="add-cat">Add category</button>' +
      '<button class="btn btn-ghost" data-act="sheet-close">Done</button>', onAct);
  }

  /* ---------- actions ---------- */
  function onAct(act, el) {
    if (act === 'cat') { cat = el.getAttribute('data-id'); App.rerender(); }
    else if (act === 'add-item') openEditor(null);
    else if (act === 'open-item') openEditor(el.getAttribute('data-id'));
    else if (act === 'save-item') saveItem();
    else if (act === 'pick-photo') { var f = document.getElementById('f-file'); if (f) f.click(); }
    else if (act === 'clear-photo') { pendingPhoto = 'clear'; setPhotoPreview(''); }
    else if (act === 'del-item') {
      var id = editingId;
      U.confirm('Delete gear', 'This removes it from the shelf and from every preset. Past events keep their record.', 'Delete', function () {
        S.removeItem(id); U.toast('Deleted.'); App.rerender();
      });
    }
    else if (act === 'manage-cats') openCats();
    else if (act === 'add-cat') {
      var name = val('c-name').trim();
      if (!name) { U.toast('Name the category first.'); return; }
      S.saveCategory({ name: name, emoji: val('c-emoji') || '\uD83D\uDCE6' });
      openCats(); App.rerender();
    }
    else if (act === 'del-cat') {
      var cid = el.getAttribute('data-id');
      S.removeCategory(cid);
      if (cat === cid) cat = '';
      openCats(); App.rerender();
    }
  }

  return { title: 'Gear shelf', render: render, mounted: mounted, onAct: onAct, openEditor: openEditor };
})();
