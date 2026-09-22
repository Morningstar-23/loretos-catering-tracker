/* store.js — all app data in one localStorage key, written through a
   debounced save so tapping a stepper 30 times doesn't stall the 5s. */
window.App = window.App || {};
App.Store = (function () {
  var KEY = 'lct.v1';
  var s = null, timer = null;

  function uid(p) {
    return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function now() { return new Date().toISOString(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- seed ---------- */
  function seed() {
    var c = [
      { id: 'c-cook', name: 'Cooking', emoji: '\uD83D\uDD25' },
      { id: 'c-serve', name: 'Serving', emoji: '\uD83C\uDF7D\uFE0F' },
      { id: 'c-util', name: 'Utensils', emoji: '\uD83E\uDD44' },
      { id: 'c-furn', name: 'Furniture', emoji: '\uD83E\uDE91' },
      { id: 'c-trans', name: 'Transport', emoji: '\uD83E\uDDCA' },
      { id: 'c-styl', name: 'Styling', emoji: '\uD83C\uDF3F' }
    ];
    function it(name, cat, qty, unit, label, color) {
      return {
        id: uid('i-'), name: name, categoryId: cat, qty: qty, unit: unit || 'pc',
        tagLabel: label || '', tagColor: color || 'orange', tagStyle: 'tape',
        note: '', photoId: '', createdAt: now(), updatedAt: now()
      };
    }
    var items = [
      it('Kawa (big cast pot)', 'c-cook', 2, 'pc', 'L stamp', 'orange'),
      it('Gas burner / kalan', 'c-cook', 4, 'pc', 'Red tape', 'red'),
      it('LPG tank 11kg', 'c-cook', 2, 'tank', 'Green dot', 'green'),
      it('Rice cooker 20 cups', 'c-cook', 2, 'pc', 'Red tape', 'red'),
      it('Chafing dish + lid', 'c-serve', 8, 'set', 'L stamp', 'orange'),
      it('Sterno fuel can', 'c-serve', 24, 'can', '', 'orange'),
      it('Buffet tray, stainless', 'c-serve', 12, 'pc', 'Blue paint', 'blue'),
      it('Dinner plate, white', 'c-serve', 120, 'pc', 'L on base', 'white'),
      it('Sandok / serving spoon', 'c-util', 20, 'pc', 'Yellow tape', 'yellow'),
      it('Tongs, stainless', 'c-util', 14, 'pc', 'Yellow tape', 'yellow'),
      it('Bilao, woven', 'c-styl', 10, 'pc', 'Green dot', 'green'),
      it('Table skirting, cream', 'c-styl', 6, 'roll', 'L stamp', 'orange'),
      it('Folding table 6ft', 'c-furn', 8, 'pc', 'Blue paint', 'blue'),
      it('Monoblock chair', 'c-furn', 60, 'pc', 'L on leg', 'black'),
      it('Cooler / ice chest', 'c-trans', 3, 'pc', 'Red tape', 'red'),
      it('Water dispenser', 'c-trans', 2, 'pc', 'Green dot', 'green')
    ];
    var byName = {};
    items.forEach(function (i) { byName[i.name] = i.id; });
    var presets = [{
      id: uid('p-'), name: 'Standard 100 pax buffet', note: 'Van load for a church-hall reception.',
      lines: [
        { itemId: byName['Kawa (big cast pot)'], qty: 2 },
        { itemId: byName['Gas burner / kalan'], qty: 3 },
        { itemId: byName['LPG tank 11kg'], qty: 2 },
        { itemId: byName['Chafing dish + lid'], qty: 6 },
        { itemId: byName['Sterno fuel can'], qty: 12 },
        { itemId: byName['Buffet tray, stainless'], qty: 8 },
        { itemId: byName['Dinner plate, white'], qty: 100 },
        { itemId: byName['Sandok / serving spoon'], qty: 12 },
        { itemId: byName['Tongs, stainless'], qty: 8 },
        { itemId: byName['Table skirting, cream'], qty: 4 },
        { itemId: byName['Folding table 6ft'], qty: 5 },
        { itemId: byName['Cooler / ice chest'], qty: 2 }
      ]
    }, {
      id: uid('p-'), name: 'Small handaan (40 pax)', note: 'House party, no furniture needed.',
      lines: [
        { itemId: byName['Kawa (big cast pot)'], qty: 1 },
        { itemId: byName['Gas burner / kalan'], qty: 2 },
        { itemId: byName['LPG tank 11kg'], qty: 1 },
        { itemId: byName['Chafing dish + lid'], qty: 3 },
        { itemId: byName['Sterno fuel can'], qty: 6 },
        { itemId: byName['Dinner plate, white'], qty: 40 },
        { itemId: byName['Bilao, woven'], qty: 4 },
        { itemId: byName['Sandok / serving spoon'], qty: 6 }
      ]
    }];
    return {
      v: 1, categories: c, items: items, presets: presets, events: [],
      settings: { business: "Loreto's Kitchen", deductMissing: false, lastBackup: '' }
    };
  }

  /* ---------- lifecycle ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      s = raw ? JSON.parse(raw) : seed();
    } catch (e) { s = seed(); }
    if (!s.items) s = seed();
    if (!s.settings) s.settings = { business: "Loreto's Kitchen", deductMissing: false, lastBackup: '' };
    if (!s.events) s.events = [];
    if (!s.presets) s.presets = [];
    return s;
  }
  function save() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 160);
  }
  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { if (App.UI) App.UI.toast('Phone storage is full. Export a backup, then remove old photos.'); }
  }
  window.addEventListener('pagehide', flush);
  window.addEventListener('blur', flush);

  /* ---------- lookups ---------- */
  function items() { return s.items; }
  function item(id) {
    for (var i = 0; i < s.items.length; i++) if (s.items[i].id === id) return s.items[i];
    return null;
  }
  function category(id) {
    for (var i = 0; i < s.categories.length; i++) if (s.categories[i].id === id) return s.categories[i];
    return null;
  }
  function categoryName(id) { var c = category(id); return c ? c.name : 'Uncategorised'; }

  function searchItems(q, catId) {
    q = (q || '').toLowerCase();
    return s.items.filter(function (i) {
      if (catId && i.categoryId !== catId) return false;
      if (!q) return true;
      return (i.name + ' ' + i.tagLabel + ' ' + categoryName(i.categoryId)).toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  /* ---------- writes ---------- */
  function saveItem(data) {
    var ex = data.id ? item(data.id) : null;
    if (ex) {
      for (var k in data) if (data.hasOwnProperty(k)) ex[k] = data[k];
      ex.updatedAt = now();
    } else {
      data.id = uid('i-'); data.createdAt = now(); data.updatedAt = now();
      if (!data.unit) data.unit = 'pc';
      s.items.push(data);
      ex = data;
    }
    save(); return ex;
  }
  function removeItem(id) {
    var it = item(id);
    if (it && it.photoId) { App.DB.del(it.photoId); App.DB.del(it.photoId + '-t'); }
    s.items = s.items.filter(function (i) { return i.id !== id; });
    s.presets.forEach(function (p) { p.lines = p.lines.filter(function (l) { return l.itemId !== id; }); });
    save();
  }
  function saveCategory(data) {
    if (data.id) {
      var c = category(data.id);
      if (c) { c.name = data.name; c.emoji = data.emoji; }
    } else {
      data.id = uid('c-'); s.categories.push(data);
    }
    save(); return data;
  }
  function removeCategory(id) {
    s.categories = s.categories.filter(function (c) { return c.id !== id; });
    s.items.forEach(function (i) { if (i.categoryId === id) i.categoryId = ''; });
    save();
  }

  /* ---------- events ---------- */
  function activeEvent() {
    for (var i = 0; i < s.events.length; i++) if (s.events[i].status !== 'closed') return s.events[i];
    return null;
  }
  function event(id) {
    for (var i = 0; i < s.events.length; i++) if (s.events[i].id === id) return s.events[i];
    return null;
  }
  function lineFrom(it, qty) {
    return {
      itemId: it.id, name: it.name, unit: it.unit,
      tagLabel: it.tagLabel, tagColor: it.tagColor, tagStyle: it.tagStyle,
      out: qty, back: 0
    };
  }
  function createEvent(d) {
    var ev = {
      id: uid('e-'), name: d.name || 'Untitled event', venue: d.venue || '',
      date: d.date || new Date().toISOString().slice(0, 10),
      status: 'staging', lines: [], notOurs: [], note: d.note || '',
      createdAt: now(), loadedAt: '', closedAt: ''
    };
    if (d.presetId) {
      var p = null;
      s.presets.forEach(function (x) { if (x.id === d.presetId) p = x; });
      if (p) p.lines.forEach(function (l) {
        var it = item(l.itemId);
        if (it) ev.lines.push(lineFrom(it, l.qty));
      });
    }
    s.events.unshift(ev); save(); return ev;
  }
  function addLine(ev, itemId, qty) {
    var ex = null;
    ev.lines.forEach(function (l) { if (l.itemId === itemId) ex = l; });
    if (ex) { ex.out += (qty || 1); }
    else {
      var it = item(itemId);
      if (!it) return;
      ev.lines.push(lineFrom(it, qty || 1));
    }
    save();
  }
  function setOut(ev, itemId, n) {
    ev.lines.forEach(function (l) { if (l.itemId === itemId) l.out = Math.max(0, n); });
    ev.lines = ev.lines.filter(function (l) { return l.out > 0; });
    save();
  }
  function setBack(ev, itemId, n) {
    ev.lines.forEach(function (l) {
      if (l.itemId === itemId) l.back = Math.max(0, Math.min(l.out, n));
    });
    save();
  }
  function markLoaded(ev) { ev.status = 'out'; ev.loadedAt = now(); save(); }
  function addNotOurs(ev, label, qty, note) {
    ev.notOurs.push({ id: uid('n-'), label: label || 'Unmarked item', qty: qty || 1, note: note || '' });
    save();
  }
  function removeNotOurs(ev, id) {
    ev.notOurs = ev.notOurs.filter(function (n) { return n.id !== id; });
    save();
  }
  function tally(ev) {
    var out = 0, back = 0;
    ev.lines.forEach(function (l) { out += l.out; back += l.back; });
    var foreign = 0;
    ev.notOurs.forEach(function (n) { foreign += n.qty; });
    return { out: out, back: back, missing: out - back, foreign: foreign,
             pct: out ? Math.round(back / out * 100) : 0 };
  }
  function closeEvent(ev, deductMissing) {
    if (deductMissing) {
      ev.lines.forEach(function (l) {
        var short = l.out - l.back;
        if (short > 0) {
          var it = item(l.itemId);
          if (it) { it.qty = Math.max(0, it.qty - short); it.updatedAt = now(); }
        }
      });
    }
    ev.status = 'closed'; ev.closedAt = now(); ev.deducted = !!deductMissing;
    save(); return tally(ev);
  }
  function removeEvent(id) {
    s.events = s.events.filter(function (e) { return e.id !== id; });
    save();
  }
  function history() {
    return s.events.filter(function (e) { return e.status === 'closed'; });
  }
  function savePresetFromEvent(ev, name) {
    var p = { id: uid('p-'), name: name || ev.name, note: 'Saved from ' + ev.name,
      lines: ev.lines.map(function (l) { return { itemId: l.itemId, qty: l.out }; }) };
    s.presets.push(p); save(); return p;
  }
  function removePreset(id) {
    s.presets = s.presets.filter(function (p) { return p.id !== id; });
    save();
  }

  /* ---------- kpis ---------- */
  function kpis() {
    var units = 0;
    s.items.forEach(function (i) { units += (i.qty || 0); });
    var ev = activeEvent(), t = ev ? tally(ev) : null;
    var last = history()[0];
    return {
      kinds: s.items.length,
      units: units,
      categories: s.categories.length,
      outNow: ev && ev.status === 'out' ? t.out - t.back : (ev ? t.out : 0),
      active: ev,
      activeTally: t,
      lastRecovery: last ? tally(last).pct : null,
      events: history().length
    };
  }

  /* ---------- backup ---------- */
  function exportData() {
    return App.DB.keys().then(function (keys) {
      var photos = {}, chain = Promise.resolve();
      (keys || []).forEach(function (k) {
        chain = chain.then(function () {
          return App.DB.get(k).then(function (v) { if (v) photos[k] = v; });
        });
      });
      return chain.then(function () {
        return JSON.stringify({ app: 'loretos-catering-tracker', v: 1,
          exportedAt: now(), data: s, photos: photos });
      });
    });
  }
  function importData(text) {
    var parsed = JSON.parse(text);
    var d = parsed.data || parsed;
    if (!d.items) throw new Error('This file is not a Loreto backup.');
    s = d; flush();
    var chain = Promise.resolve();
    if (parsed.photos) {
      Object.keys(parsed.photos).forEach(function (k) {
        chain = chain.then(function () { return App.DB.set(k, parsed.photos[k]); });
      });
    }
    return chain;
  }
  function reset() { s = seed(); flush(); return App.DB.clear(); }

  return {
    load: load, save: save, flush: flush, uid: uid, clone: clone,
    state: function () { return s; },
    items: items, item: item, searchItems: searchItems,
    category: category, categoryName: categoryName,
    saveItem: saveItem, removeItem: removeItem,
    saveCategory: saveCategory, removeCategory: removeCategory,
    activeEvent: activeEvent, event: event, createEvent: createEvent,
    addLine: addLine, setOut: setOut, setBack: setBack, markLoaded: markLoaded,
    addNotOurs: addNotOurs, removeNotOurs: removeNotOurs,
    tally: tally, closeEvent: closeEvent, removeEvent: removeEvent, history: history,
    savePresetFromEvent: savePresetFromEvent, removePreset: removePreset,
    kpis: kpis, exportData: exportData, importData: importData, reset: reset
  };
})();
