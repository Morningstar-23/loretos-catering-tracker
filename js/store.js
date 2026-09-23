/* ==========================================================================
   Loreto's Catering Tracker — Data Store (js/store.js)
   - Replaced "in kitchen" with "in inventory" throughout
   - Added permanent "Others" category (icon: 'grid')
   - Low stock threshold configurable per item
   - Stock health filtering: All, Low stock, Empty stock, In stock
   - Safe in-transit load-out adjustments & returns clamping
   - Fixed setOut to insert fresh items when not already in ev.lines
   - Preset updating & saving from active loaded events
   - Plain text manifest generator for SMS / WhatsApp / Notepad
   - Visual trend & chart data aggregators
   ========================================================================== */
window.App = window.App || {};
App.Store = (function () {
  var KEY = 'lct.v1';
  var s = null, timer = null;

  function uid(p) {
    return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function now() { return new Date().toISOString(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function defaultCategories() {
    return [
      { id: 'c-cook', name: 'Cooking',   icon: 'flame' },
      { id: 'c-serve',name: 'Serving',   icon: 'plate' },
      { id: 'c-util', name: 'Utensils',  icon: 'utensils' },
      { id: 'c-furn', name: 'Furniture', icon: 'chair' },
      { id: 'c-trans',name: 'Transport', icon: 'truck' },
      { id: 'c-styl', name: 'Styling',   icon: 'sparkles' },
      { id: 'c-other',name: 'Others',    icon: 'grid' }
    ];
  }

  function seed() {
    var c = defaultCategories();

    function it(name, brand, cat, qty, unit, label, color, isConsumable, threshold) {
      var ts = now();
      return {
        id: uid('i-'),
        name: name,
        brand: brand || '',
        categoryId: cat,
        qty: qty,
        unit: unit || 'pc',
        isConsumable: !!isConsumable,
        lowStockThreshold: threshold || (isConsumable ? 6 : 2),
        tagLabel: label || '',
        tagColor: color || 'orange',
        tagStyle: 'tape',
        note: '',
        photoId: '',
        createdAt: ts,
        updatedAt: ts
      };
    }

    var items = [
      it('Kawa (big cast pot)', 'Local Foundry', 'c-cook', 2, 'pc', 'L stamp', 'orange', false, 1),
      it('Gas burner / kalan', 'Standard LP', 'c-cook', 4, 'pc', 'Red tape', 'red', false, 2),
      it('LPG tank 11kg', 'Shellane', 'c-cook', 2, 'tank', 'Green dot', 'green', false, 1),
      it('Rice cooker 20 cups', 'Rinnai', 'c-cook', 2, 'pc', 'Red tape', 'red', false, 1),
      it('Chafing dish + lid', 'Tramontina', 'c-serve', 8, 'set', 'L stamp', 'orange', false, 3),
      it('Sterno fuel can', 'Sterno Heat', 'c-serve', 24, 'can', '', 'orange', true, 8),
      it('Buffet tray, stainless', 'Focus', 'c-serve', 12, 'pc', 'Blue paint', 'blue', false, 4),
      it('Dinner plate, white', 'Royal Bone', 'c-serve', 120, 'pc', 'L on base', 'white', false, 20),
      it('Sandok / serving spoon', 'Eagle', 'c-util', 20, 'pc', 'Yellow tape', 'yellow', false, 5),
      it('Tongs, stainless', 'Eagle', 'c-util', 14, 'pc', 'Yellow tape', 'yellow', false, 4),
      it('Bilao, woven', 'Craftsman', 'c-styl', 10, 'pc', 'Green dot', 'green', false, 3),
      it('Table skirting, cream', 'LinenPro', 'c-styl', 6, 'roll', 'L stamp', 'orange', false, 2),
      it('Folding table 6ft', 'Lifetime', 'c-furn', 8, 'pc', 'Blue paint', 'blue', false, 2),
      it('Monoblock chair', 'Uratex', 'c-furn', 60, 'pc', 'L on leg', 'black', false, 10),
      it('Cooler / ice chest', 'Coleman 50L', 'c-trans', 3, 'pc', 'Red tape', 'red', false, 1),
      it('Water dispenser', 'Akari 20L', 'c-trans', 2, 'pc', 'Green dot', 'green', false, 1)
    ];

    var byName = {};
    items.forEach(function (i) { byName[i.name] = i.id; });

    var presets = [
      {
        id: uid('p-'),
        name: 'Standard 100 pax buffet',
        note: 'Complete heavy kit for church or hall banquets.',
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
      },
      {
        id: uid('p-'),
        name: 'Small handaan (40 pax)',
        note: 'House party kit, no heavy furniture included.',
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
      }
    ];

    var staff = [
      { id: uid('st-'), name: 'Loreto Fernandez', role: 'Head Chef / Owner', phone: '0917-555-0192', notes: 'Lead operations', photoId: '', createdAt: now(), updatedAt: now() },
      { id: uid('st-'), name: 'Danilo Cruz', role: 'Kitchen & Van Lead', phone: '0918-555-0144', notes: 'Counts van load-out', photoId: '', createdAt: now(), updatedAt: now() },
      { id: uid('st-'), name: 'Elena Ramos', role: 'Head Server', phone: '0920-555-0188', notes: 'Buffet line coordinator', photoId: '', createdAt: now(), updatedAt: now() }
    ];

    return {
      v: 2,
      categories: c,
      items: items,
      presets: presets,
      staff: staff,
      events: [],
      settings: { business: "Loreto's Kitchen", deductMissing: false, deductConsumed: true, lastBackup: '' }
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      s = raw ? JSON.parse(raw) : seed();
    } catch (e) {
      s = seed();
    }
    if (!s.items) s = seed();
    if (!s.categories || !s.categories.length) s.categories = defaultCategories();
    if (!s.staff) s.staff = [];
    if (!s.presets) s.presets = [];
    if (!s.events) s.events = [];
    if (!s.settings) s.settings = { business: "Loreto's Kitchen", deductMissing: false, deductConsumed: true, lastBackup: '' };

    var hasOthers = s.categories.some(function (c) {
      return c.id === 'c-other' || (c.name && c.name.toLowerCase() === 'others');
    });
    if (!hasOthers) {
      s.categories.push({ id: 'c-other', name: 'Others', icon: 'grid' });
      save();
    }

    s.categories.forEach(function (c) {
      var n = (c.name || '').toLowerCase();
      if (c.id === 'c-cook' || n.indexOf('cook') > -1) c.icon = 'flame';
      else if (c.id === 'c-serve' || n.indexOf('serv') > -1) c.icon = 'plate';
      else if (c.id === 'c-util' || n.indexOf('uten') > -1) c.icon = 'utensils';
      else if (c.id === 'c-furn' || n.indexOf('furn') > -1) c.icon = 'chair';
      else if (c.id === 'c-trans' || n.indexOf('trans') > -1) c.icon = 'truck';
      else if (c.id === 'c-styl' || n.indexOf('styl') > -1) c.icon = 'sparkles';
      else if (c.id === 'c-other' || n.indexOf('other') > -1) c.icon = 'grid';
      else if (!c.icon) c.icon = 'plate';
    });

    s.items.forEach(function (i) {
      if (i.brand === undefined) i.brand = '';
      if (i.isConsumable === undefined) {
        var n = (i.name || '').toLowerCase();
        i.isConsumable = (n.indexOf('sterno') > -1 || n.indexOf('fuel') > -1 || n.indexOf('napkin') > -1 || n.indexOf('charcoal') > -1);
      } else {
        i.isConsumable = !!i.isConsumable;
      }
      if (i.lowStockThreshold === undefined) {
        i.lowStockThreshold = i.isConsumable ? 6 : 2;
      }
      if (!i.createdAt) i.createdAt = now();
      if (!i.updatedAt) i.updatedAt = i.createdAt;
      if (!i.tagColor) i.tagColor = 'orange';
      if (!i.tagStyle) i.tagStyle = 'tape';
    });

    s.events.forEach(function (ev) {
      if (!ev.staffIds) ev.staffIds = [];
      if (!ev.lines) ev.lines = [];
      if (ev.presetId === undefined) ev.presetId = '';
      ev.lines.forEach(function (l) {
        if (l.isConsumable === undefined) {
          var matchedItem = item(l.itemId);
          l.isConsumable = matchedItem ? !!matchedItem.isConsumable : false;
        } else {
          l.isConsumable = !!l.isConsumable;
        }
        if (l.back === undefined) l.back = 0;
      });
    });

    return s;
  }

  function save() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 160);
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      if (App.UI) App.UI.toast('Storage full. Back up and clear old photos.');
    }
  }

  window.addEventListener('pagehide', flush);
  window.addEventListener('blur', flush);

  function items() { return s.items; }
  function item(id) {
    for (var i = 0; i < s.items.length; i++) {
      if (s.items[i].id === id) return s.items[i];
    }
    return null;
  }
  function category(id) {
    for (var i = 0; i < s.categories.length; i++) {
      if (s.categories[i].id === id) return s.categories[i];
    }
    return null;
  }
  function categoryName(id) {
    var c = category(id);
    return c ? c.name : 'Uncategorised';
  }

  function searchItems(q, catId, sortBy, stockFilter) {
    q = (q || '').toLowerCase().trim();
    var filtered = s.items.filter(function (i) {
      if (catId && i.categoryId !== catId) return false;

      var thresh = i.lowStockThreshold || 2;
      var curQty = i.qty || 0;
      if (stockFilter === 'low' && (curQty > thresh || curQty === 0)) return false;
      if (stockFilter === 'empty' && curQty !== 0) return false;
      if (stockFilter === 'instock' && curQty <= thresh) return false;

      if (!q) return true;
      var hay = (i.name + ' ' + (i.brand || '') + ' ' + (i.tagLabel || '') + ' ' + (i.isConsumable ? 'consumable supply ' : '') + categoryName(i.categoryId)).toLowerCase();
      return hay.indexOf(q) > -1;
    });

    sortBy = sortBy || 'alpha-asc';
    return filtered.sort(function (a, b) {
      if (sortBy === 'alpha-asc')  return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'alpha-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'date-desc')  return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (sortBy === 'date-asc')   return (a.createdAt || '').localeCompare(b.createdAt || '');
      if (sortBy === 'mod-desc')   return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      if (sortBy === 'qty-desc')   return (b.qty || 0) - (a.qty || 0);
      if (sortBy === 'qty-asc')    return (a.qty || 0) - (b.qty || 0);
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  function itemStats(id) {
    var it = item(id);
    if (!it) return null;

    var ev = activeEvent();
    var currentlyOut = 0;
    if (ev) {
      ev.lines.forEach(function (l) {
        if (l.itemId === id) {
          currentlyOut = Math.max(0, l.out - (ev.status === 'out' ? l.back : 0));
        }
      });
    }

    var hist = history();
    var eventsUsed = 0, totalLoadedEver = 0, totalMissingEver = 0, totalConsumedEver = 0, lastUsedDate = '';
    hist.forEach(function (e) {
      var found = false;
      e.lines.forEach(function (l) {
        if (l.itemId === id) {
          found = true;
          totalLoadedEver += (l.out || 0);
          var diff = Math.max(0, (l.out || 0) - (l.back || 0));
          if (diff > 0) {
            if (it.isConsumable || l.isConsumable) {
              totalConsumedEver += diff;
            } else {
              totalMissingEver += diff;
            }
          }
        }
      });
      if (found) {
        eventsUsed++;
        if (!lastUsedDate && e.date) lastUsedDate = e.date;
      }
    });

    var presetsCount = 0;
    s.presets.forEach(function (p) {
      p.lines.forEach(function (l) {
        if (l.itemId === id) presetsCount++;
      });
    });

    var inInventory = Math.max(0, (it.qty || 0) - currentlyOut);

    return {
      item: it,
      isConsumable: !!it.isConsumable,
      lowStockThreshold: it.lowStockThreshold || 2,
      owned: it.qty || 0,
      currentlyOut: currentlyOut,
      inInventory: inInventory,
      inKitchen: inInventory,
      isLowStock: (it.qty || 0) <= (it.lowStockThreshold || 2) && (it.qty || 0) > 0,
      isEmpty: (it.qty || 0) === 0,
      eventsUsed: eventsUsed,
      totalLoadedEver: totalLoadedEver,
      totalMissingEver: totalMissingEver,
      totalConsumedEver: totalConsumedEver,
      lastUsedDate: lastUsedDate,
      presetsCount: presetsCount,
      createdAt: it.createdAt || it.updatedAt || now(),
      updatedAt: it.updatedAt || now()
    };
  }

  function itemUsageTrend(itemId) {
    var hist = history().slice(0, 6).reverse();
    return hist.map(function (e) {
      var staged = 0, back = 0;
      e.lines.forEach(function (l) {
        if (l.itemId === itemId) {
          staged = l.out || 0;
          back = l.back || 0;
        }
      });
      return {
        date: e.date ? e.date.slice(5) : '',
        name: e.name || 'Gig',
        staged: staged,
        back: back,
        used: Math.max(0, staged - back)
      };
    });
  }

  function overallRecoveryTrend() {
    var hist = history().slice(0, 6).reverse();
    return hist.map(function (e) {
      var t = tally(e);
      return {
        date: e.date ? e.date.slice(5) : '',
        name: e.name || 'Gig',
        recoveryPct: t.pct,
        missing: t.missing,
        consumed: t.consumed
      };
    });
  }

  function saveItem(data) {
    var ex = data.id ? item(data.id) : null;
    var ts = data.updatedAt || now();
    if (ex) {
      for (var k in data) {
        if (data.hasOwnProperty(k)) ex[k] = data[k];
      }
      ex.isConsumable = !!data.isConsumable;
      if (data.lowStockThreshold !== undefined) {
        ex.lowStockThreshold = parseInt(data.lowStockThreshold, 10) || 0;
      }
      ex.tagStyle = 'tape';
      ex.updatedAt = ts;
    } else {
      data.id = uid('i-');
      data.createdAt = ts;
      data.updatedAt = ts;
      data.isConsumable = !!data.isConsumable;
      data.lowStockThreshold = parseInt(data.lowStockThreshold, 10) || (data.isConsumable ? 6 : 2);
      if (!data.brand) data.brand = '';
      if (!data.unit) data.unit = 'pc';
      if (!data.tagColor) data.tagColor = 'orange';
      data.tagStyle = 'tape';
      s.items.push(data);
      ex = data;
    }
    save();
    return ex;
  }

  function adjustStock(itemId, delta) {
    var it = item(itemId);
    if (!it) return null;
    it.qty = Math.max(0, (it.qty || 0) + delta);
    it.updatedAt = now();
    save();
    return it;
  }

  function setStock(itemId, qty, customDate) {
    var it = item(itemId);
    if (!it) return null;
    it.qty = Math.max(0, parseInt(qty, 10) || 0);
    it.updatedAt = customDate || now();
    save();
    return it;
  }

  function removeItem(id) {
    var it = item(id);
    if (it && it.photoId) {
      App.DB.del(it.photoId);
      App.DB.del(it.photoId + '-t');
    }
    s.items = s.items.filter(function (i) { return i.id !== id; });
    s.presets.forEach(function (p) {
      p.lines = p.lines.filter(function (l) { return l.itemId !== id; });
    });
    save();
  }

  function categories() { return s.categories; }
  function saveCategory(data) {
    if (data.id) {
      var c = category(data.id);
      if (c) {
        c.name = data.name;
        c.icon = data.icon || 'plate';
      }
    } else {
      data.id = uid('c-');
      if (!data.icon) data.icon = 'plate';
      s.categories.push(data);
    }
    save();
    return data;
  }

  function removeCategory(id) {
    s.categories = s.categories.filter(function (c) { return c.id !== id; });
    s.items.forEach(function (i) {
      if (i.categoryId === id) i.categoryId = '';
    });
    save();
  }

  function resetCategoriesToDefault() {
    s.categories = defaultCategories();
    save();
    return s.categories;
  }

  function presets() { return s.presets; }
  function preset(id) {
    for (var i = 0; i < s.presets.length; i++) {
      if (s.presets[i].id === id) return s.presets[i];
    }
    return null;
  }

  function checkPresetAvailability(presetId, ignoreActiveEventLines) {
    var p = preset(presetId);
    if (!p) return null;
    var lines = [], shortCount = 0, totalNeeded = 0, totalAvailable = 0;
    var ev = activeEvent();
    var outMap = {};

    if (ev && !ignoreActiveEventLines) {
      ev.lines.forEach(function (l) {
        outMap[l.itemId] = (outMap[l.itemId] || 0) + (l.out - (ev.status === 'out' ? l.back : 0));
      });
    }

    p.lines.forEach(function (l) {
      var it = item(l.itemId);
      var targetQty = l.qty || 0;
      var owned = it ? (it.qty || 0) : 0;
      var outNow = it ? (outMap[it.id] || 0) : 0;
      var inInventory = Math.max(0, owned - outNow);
      var isShort = inInventory < targetQty;
      var diff = isShort ? (targetQty - inInventory) : 0;
      if (isShort) shortCount++;
      totalNeeded += targetQty;
      totalAvailable += Math.min(targetQty, inInventory);

      lines.push({
        itemId: l.itemId,
        item: it,
        name: it ? it.name : 'Unknown gear',
        brand: it ? (it.brand || '') : '',
        unit: it ? it.unit : 'pc',
        isConsumable: !!(it && it.isConsumable),
        targetQty: targetQty,
        inInventory: inInventory,
        inKitchen: inInventory,
        owned: owned,
        isShort: isShort,
        shortBy: diff,
        clampedQty: Math.min(targetQty, inInventory)
      });
    });

    return {
      preset: p,
      available: shortCount === 0,
      shortCount: shortCount,
      totalNeeded: totalNeeded,
      totalAvailable: totalAvailable,
      lines: lines
    };
  }

  function savePreset(data) {
    var ex = data.id ? preset(data.id) : null;
    if (ex) {
      ex.name = data.name || ex.name;
      ex.note = (data.note !== undefined) ? data.note : (ex.note || '');
      if (data.lines) ex.lines = data.lines;
    } else {
      data.id = uid('p-');
      data.lines = data.lines || [];
      s.presets.push(data);
      ex = data;
    }
    save();
    return ex;
  }

  function savePresetFromEvent(ev, name, note) {
    var p = {
      id: uid('p-'),
      name: name || ev.name,
      note: note || ('Kit saved from ' + ev.name),
      lines: ev.lines.map(function (l) {
        return { itemId: l.itemId, qty: l.out };
      })
    };
    s.presets.push(p);
    if (ev) ev.presetId = p.id;
    save();
    return p;
  }

  function updatePresetFromEvent(ev, presetId) {
    if (!ev) return null;
    var pId = presetId || ev.presetId;
    var p = preset(pId);
    if (!p) return null;
    p.lines = ev.lines.map(function (l) {
      return { itemId: l.itemId, qty: l.out };
    });
    p.updatedAt = now();
    save();
    return p;
  }

  function removePreset(id) {
    s.presets = s.presets.filter(function (p) { return p.id !== id; });
    save();
  }

  function staff() {
    if (!s.staff) s.staff = [];
    return s.staff;
  }
  function staffMember(id) {
    var list = staff();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }
  function saveStaff(data) {
    if (!s.staff) s.staff = [];
    var ex = data.id ? staffMember(data.id) : null;
    var ts = now();
    if (ex) {
      for (var k in data) {
        if (data.hasOwnProperty(k)) ex[k] = data[k];
      }
      ex.updatedAt = ts;
    } else {
      data.id = uid('st-');
      data.createdAt = ts;
      data.updatedAt = ts;
      s.staff.push(data);
      ex = data;
    }
    save();
    return ex;
  }
  function removeStaff(id) {
    if (!s.staff) s.staff = [];
    s.staff = s.staff.filter(function (m) { return m.id !== id; });
    s.events.forEach(function (e) {
      if (e.staffIds) {
        e.staffIds = e.staffIds.filter(function (sid) { return sid !== id; });
      }
    });
    save();
  }

  function activeEvent() {
    for (var i = 0; i < s.events.length; i++) {
      if (s.events[i].status !== 'closed') return s.events[i];
    }
    return null;
  }
  function event(id) {
    for (var i = 0; i < s.events.length; i++) {
      if (s.events[i].id === id) return s.events[i];
    }
    return null;
  }

  function lineFrom(it, qty) {
    return {
      itemId: it.id,
      name: it.name,
      brand: it.brand || '',
      unit: it.unit || 'pc',
      isConsumable: !!it.isConsumable,
      tagLabel: it.tagLabel || '',
      tagColor: it.tagColor || 'orange',
      tagStyle: 'tape',
      out: qty,
      back: 0
    };
  }

  function createEvent(d) {
    var ev = {
      id: uid('e-'),
      name: d.name || 'Untitled event',
      venue: d.venue || '',
      date: d.date || new Date().toISOString().slice(0, 10),
      status: 'staging',
      lines: [],
      notOurs: [],
      staffIds: d.staffIds || [],
      note: d.note || '',
      presetId: d.presetId || '',
      createdAt: now(),
      loadedAt: '',
      closedAt: ''
    };
    if (d.presetId) {
      var p = preset(d.presetId);
      if (p) {
        p.lines.forEach(function (l) {
          var it = item(l.itemId);
          if (it) {
            var qty = d.clamp ? Math.min(l.qty, it.qty) : l.qty;
            if (qty > 0) ev.lines.push(lineFrom(it, qty));
          }
        });
      }
    }
    s.events.unshift(ev);
    save();
    return ev;
  }

  function addLine(ev, itemId, qty) {
    if (!ev) return;
    var ex = null;
    ev.lines.forEach(function (l) { if (l.itemId === itemId) ex = l; });
    if (ex) {
      ex.out += (qty || 1);
    } else {
      var it = item(itemId);
      if (!it) return;
      ev.lines.push(lineFrom(it, qty || 1));
    }
    save();
  }

  function removeLine(ev, itemId) {
    if (!ev) return;
    ev.lines = ev.lines.filter(function (l) { return l.itemId !== itemId; });
    save();
  }

  /* Adjust 'out' count safely — fixes bug where fresh items were not pushed into ev.lines */
  function setOut(ev, itemId, n) {
    if (!ev) return;
    var found = false;
    var targetQty = Math.max(0, n);
    ev.lines.forEach(function (l) {
      if (l.itemId === itemId) {
        found = true;
        l.out = targetQty;
        if (l.back > l.out) l.back = l.out;
      }
    });

    // If item was not yet in van and quantity > 0, insert it!
    if (!found && targetQty > 0) {
      var it = item(itemId);
      if (it) {
        ev.lines.push(lineFrom(it, targetQty));
      }
    }

    ev.lines = ev.lines.filter(function (l) { return l.out > 0; });
    save();
  }

  function setBack(ev, itemId, n) {
    if (!ev) return;
    ev.lines.forEach(function (l) {
      if (l.itemId === itemId) l.back = Math.max(0, Math.min(l.out, n));
    });
    save();
  }

  /* Preset Merging & Full Replacement on Active/Loaded Events */
  function applyPresetToEvent(ev, presetId, mode, clamp) {
    if (!ev) return;
    var pKit = preset(presetId);
    if (!pKit) return;

    if (mode === 'replace') {
      ev.presetId = presetId;
      var oldLinesMap = {};
      ev.lines.forEach(function (l) { oldLinesMap[l.itemId] = l; });

      var newLines = [];
      pKit.lines.forEach(function (pl) {
        var it = item(pl.itemId);
        if (!it) return;
        var targetQty = clamp ? Math.min(pl.qty, it.qty) : pl.qty;
        if (targetQty <= 0) return;

        var preservedBack = 0;
        if (oldLinesMap[pl.itemId]) {
          preservedBack = Math.min(oldLinesMap[pl.itemId].back, targetQty);
        }

        var l = lineFrom(it, targetQty);
        l.back = preservedBack;
        newLines.push(l);
      });
      ev.lines = newLines;
    } else {
      if (!ev.presetId) ev.presetId = presetId;
      pKit.lines.forEach(function (pl) {
        var it = item(pl.itemId);
        if (!it) return;
        var addQty = clamp ? Math.min(pl.qty, it.qty) : pl.qty;
        if (addQty > 0) addLine(ev, it.id, addQty);
      });
    }
    save();
  }

  function returnToStaging(ev) {
    if (!ev) return;
    ev.status = 'staging';
    save();
  }

  function markLoaded(ev) {
    if (!ev) return;
    ev.status = 'out';
    ev.loadedAt = now();
    save();
  }

  function assignStaff(ev, staffId) {
    if (!ev.staffIds) ev.staffIds = [];
    if (ev.staffIds.indexOf(staffId) === -1) {
      ev.staffIds.push(staffId);
      save();
    }
  }

  function unassignStaff(ev, staffId) {
    if (!ev.staffIds) return;
    ev.staffIds = ev.staffIds.filter(function (id) { return id !== staffId; });
    save();
  }

  function addNotOurs(ev, label, qty, note) {
    ev.notOurs.push({
      id: uid('n-'),
      label: label || 'Unmarked item',
      qty: qty || 1,
      note: note || ''
    });
    save();
  }

  function removeNotOurs(ev, id) {
    ev.notOurs = ev.notOurs.filter(function (n) { return n.id !== id; });
    save();
  }

  function tally(ev) {
    var totalOut = 0, totalBack = 0;
    var durableOut = 0, durableBack = 0;
    var consumableOut = 0, consumableBack = 0;

    (ev.lines || []).forEach(function (l) {
      var out = l.out || 0;
      var back = l.back || 0;
      totalOut += out;
      totalBack += back;

      if (l.isConsumable) {
        consumableOut += out;
        consumableBack += back;
      } else {
        durableOut += out;
        durableBack += back;
      }
    });

    var foreign = 0;
    (ev.notOurs || []).forEach(function (n) { foreign += (n.qty || 0); });

    var missingDurable = Math.max(0, durableOut - durableBack);
    var consumedItems = Math.max(0, consumableOut - consumableBack);

    var pct = 100;
    if (durableOut > 0) {
      pct = Math.round((durableBack / durableOut) * 100);
    }

    return {
      out: totalOut,
      back: totalBack,
      missing: missingDurable,
      consumed: consumedItems,
      durableOut: durableOut,
      durableBack: durableBack,
      consumableOut: consumableOut,
      consumableBack: consumableBack,
      foreign: foreign,
      pct: pct
    };
  }

  function closeEvent(ev, deductMissing, deductConsumed) {
    if (deductConsumed === undefined) deductConsumed = true;

    ev.lines.forEach(function (l) {
      var diff = Math.max(0, (l.out || 0) - (l.back || 0));
      if (diff > 0) {
        var it = item(l.itemId);
        if (it) {
          if (l.isConsumable && deductConsumed) {
            it.qty = Math.max(0, (it.qty || 0) - diff);
            it.updatedAt = now();
          } else if (!l.isConsumable && deductMissing) {
            it.qty = Math.max(0, (it.qty || 0) - diff);
            it.updatedAt = now();
          }
        }
      }
    });

    ev.status = 'closed';
    ev.closedAt = now();
    ev.deducted = !!deductMissing;
    ev.deductedConsumed = !!deductConsumed;
    save();
    return tally(ev);
  }

  function removeEvent(id) {
    s.events = s.events.filter(function (e) { return e.id !== id; });
    save();
  }

  function history() {
    return s.events.filter(function (e) { return e.status === 'closed'; });
  }

  function kpis() {
    var units = 0;
    s.items.forEach(function (i) { units += (i.qty || 0); });
    var ev = activeEvent(), t = ev ? tally(ev) : null;
    var last = history()[0];
    return {
      kinds: s.items.length,
      units: units,
      categories: s.categories.length,
      staffCount: staff().length,
      outNow: ev && ev.status === 'out' ? (t.durableOut - t.durableBack) : (ev ? t.durableOut : 0),
      active: ev,
      activeTally: t,
      lastRecovery: last ? tally(last).pct : null,
      events: history().length
    };
  }

  function generateEventManifestText(ev) {
    var t = tally(ev);
    var staffList = (ev.staffIds || []).map(function (sid) { return staffMember(sid); }).filter(Boolean);

    var text = "🥘 LORETO'S KITCHEN — CATERING EVENT MANIFEST\n";
    text += "=========================================\n";
    text += "Event: " + ev.name + "\n";
    text += "Venue: " + (ev.venue || 'No venue specified') + "\n";
    text += "Date: " + (ev.date || 'Today') + "\n";
    text += "Status: " + (ev.status === 'closed' ? 'Completed (' + t.pct + '% Gear Returned)' : (ev.status === 'out' ? 'Out on Location' : 'Staging / Van Loading')) + "\n";
    if (ev.note) text += "Instructions: " + ev.note + "\n";
    text += "\n";

    text += "👥 ASSIGNED CREW (" + staffList.length + ")\n";
    text += "-----------------------------------------\n";
    if (staffList.length) {
      staffList.forEach(function (m) {
        text += "• " + m.name + (m.role ? " (" + m.role + ")" : "") + (m.phone ? " - Ph: " + m.phone : "") + "\n";
      });
    } else {
      text += "No crew assigned.\n";
    }
    text += "\n";

    var durableLines = ev.lines.filter(function (l) { return !l.isConsumable; });
    var consumableLines = ev.lines.filter(function (l) { return !!l.isConsumable; });

    text += "🚚 REUSABLE EQUIPMENT (" + durableLines.length + " items)\n";
    text += "-----------------------------------------\n";
    if (durableLines.length) {
      durableLines.forEach(function (l) {
        var status = (ev.status === 'staging')
          ? "Staged: " + l.out + " " + l.unit
          : (l.out === l.back ? "[✓] All " + l.out + " " + l.unit + " returned" : "[!] " + (l.out - l.back) + " of " + l.out + " " + l.unit + " MISSING");
        text += "• " + l.name + (l.brand ? " [" + l.brand + "]" : "") + " — " + status + "\n";
      });
    } else {
      text += "No durable equipment loaded.\n";
    }
    text += "\n";

    text += "✨ CONSUMABLE SUPPLIES (" + consumableLines.length + " items)\n";
    text += "-----------------------------------------\n";
    if (consumableLines.length) {
      consumableLines.forEach(function (l) {
        var status = (ev.status === 'staging')
          ? "Loaded: " + l.out + " " + l.unit
          : (l.out - l.back) + " " + l.unit + " used (" + l.back + " returned)";
        text += "• " + l.name + " — " + status + "\n";
      });
    } else {
      text += "No consumable supplies loaded.\n";
    }
    text += "\n";

    if (ev.notOurs && ev.notOurs.length) {
      text += "⚠️ NOT OURS / FOREIGN PIECES IN VAN (" + ev.notOurs.length + " items)\n";
      text += "-----------------------------------------\n";
      ev.notOurs.forEach(function (n) {
        text += "• " + n.label + " (Qty: " + n.qty + ")" + (n.note ? " - Owner/Notes: " + n.note : "") + "\n";
      });
      text += "\n";
    }

    text += "=========================================\n";
    text += "Generated by Loreto's Catering Tracker (Adelaide SA)\n";

    return text;
  }

  function exportData() {
    return App.DB.keys().then(function (keys) {
      var photos = {}, chain = Promise.resolve();
      (keys || []).forEach(function (k) {
        chain = chain.then(function () {
          return App.DB.get(k).then(function (v) {
            if (v) photos[k] = v;
          });
        });
      });
      return chain.then(function () {
        return JSON.stringify({
          app: 'loretos-catering-tracker',
          v: 2,
          exportedAt: now(),
          data: s,
          photos: photos
        });
      });
    });
  }

  function importData(text) {
    var parsed = JSON.parse(text);
    var d = parsed.data || parsed;
    if (!d.items) throw new Error('This file is not a Loreto backup.');
    s = d;
    if (!s.staff) s.staff = [];
    if (!s.categories || !s.categories.length) s.categories = defaultCategories();
    flush();

    var chain = Promise.resolve();
    if (parsed.photos) {
      Object.keys(parsed.photos).forEach(function (k) {
        chain = chain.then(function () {
          return App.DB.set(k, parsed.photos[k]);
        });
      });
    }
    return chain;
  }

  function reset() {
    s = seed();
    flush();
    return App.DB.clear();
  }

  return {
    load: load, save: save, flush: flush, uid: uid, clone: clone, now: now,
    state: function () { return s; },
    items: items, item: item, itemStats: itemStats, searchItems: searchItems,
    itemUsageTrend: itemUsageTrend, overallRecoveryTrend: overallRecoveryTrend,
    generateEventManifestText: generateEventManifestText,
    saveItem: saveItem, adjustStock: adjustStock, setStock: setStock, removeItem: removeItem,
    categories: categories, category: category, categoryName: categoryName,
    saveCategory: saveCategory, removeCategory: removeCategory, resetCategoriesToDefault: resetCategoriesToDefault,
    presets: presets, preset: preset, checkPresetAvailability: checkPresetAvailability,
    savePreset: savePreset, savePresetFromEvent: savePresetFromEvent, updatePresetFromEvent: updatePresetFromEvent, removePreset: removePreset,
    staff: staff, staffMember: staffMember, saveStaff: saveStaff, removeStaff: removeStaff,
    activeEvent: activeEvent, event: event, createEvent: createEvent,
    addLine: addLine, removeLine: removeLine, setOut: setOut, setBack: setBack,
    applyPresetToEvent: applyPresetToEvent, returnToStaging: returnToStaging,
    assignStaff: assignStaff, unassignStaff: unassignStaff,
    markLoaded: markLoaded, addNotOurs: addNotOurs, removeNotOurs: removeNotOurs,
    tally: tally, closeEvent: closeEvent, removeEvent: removeEvent, history: history,
    kpis: kpis, exportData: exportData, importData: importData, reset: reset
  };
})();