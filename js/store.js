/* ==========================================================================
   Loreto's Catering Tracker — Data Store (js/store.js)
   - 100% Strict ES5 (iOS 12 Mobile Safari / iPhone 5s compatible)
   - Zero emojis: Clean Feather/Lucide vector SVG iconography
   - 4-Way Shortage Breakdown (Intact, Broken, Left at Venue, Missing/Lost)
   - Manual Remarks & "Other" Reason Support stored permanently on incidents
   - Venue Recovery & Stock Replenishment: recoverVenueItem()
   - Replaced Gear Logging: markIncidentReplaced()
   - Structured Event Incidents Debrief on event closure
   - Item Incident History extractor for Shelf/Inventory timeline
   - Analytics Aggregator: 6-mo recovery sparkline, 3-way loss donut, venue watchlist
   - Foreign Item & Borrowed Pieces Management with Photo ID & Shelf Item Linking
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
      { id: uid('st-'), name: 'Loreto Fernandez', role: 'Head Chef / Owner', phone: '0412 000 001', notes: 'Lead operations', photoId: '', createdAt: now(), updatedAt: now() },
      { id: uid('st-'), name: 'Danilo Cruz', role: 'Kitchen & Van Lead', phone: '0412 000 002', notes: 'Counts van load-out', photoId: '', createdAt: now(), updatedAt: now() },
      { id: uid('st-'), name: 'Elena Ramos', role: 'Head Server', phone: '0412 000 003', notes: 'Buffet line coordinator', photoId: '', createdAt: now(), updatedAt: now() }
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
      if (!ev.incidents) ev.incidents = [];
      if (!ev.notOurs) ev.notOurs = [];
      if (ev.presetId === undefined) ev.presetId = '';

      ev.notOurs.forEach(function (n) {
        if (n.photoId === undefined) n.photoId = '';
        if (n.itemId === undefined) n.itemId = '';
        if (n.brand === undefined) n.brand = '';
      });

      ev.lines.forEach(function (l) {
        if (l.isConsumable === undefined) {
          var matchedItem = item(l.itemId);
          l.isConsumable = matchedItem ? !!matchedItem.isConsumable : false;
        } else {
          l.isConsumable = !!l.isConsumable;
        }
        if (l.back === undefined) l.back = 0;
        if (l.broken === undefined) l.broken = 0;
        if (l.brokenReason === undefined) l.brokenReason = '';
        if (l.missingReason === undefined) l.missingReason = '';
        if (l.customRemark === undefined) l.customRemark = '';

        var diff = Math.max(0, (l.out || 0) - (l.back || 0) - (l.broken || 0));
        if (l.leftVenue === undefined) {
          if (l.missingReason && l.missingReason.indexOf('venue') > -1) {
            l.leftVenue = diff;
            l.missing = 0;
          } else {
            l.leftVenue = 0;
            l.missing = diff;
          }
        }
        if (l.missing === undefined) {
          l.missing = Math.max(0, diff - (l.leftVenue || 0));
        }
        if (l.leftVenueReason === undefined) l.leftVenueReason = 'Left at venue';
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
          currentlyOut = Math.max(0, l.out - (ev.status === 'out' ? (l.back + (l.broken || 0)) : 0));
        }
      });
    }

    var hist = history();
    var eventsUsed = 0, totalLoadedEver = 0, totalMissingEver = 0, totalBrokenEver = 0, totalLeftVenueEver = 0, totalRecoveredEver = 0, totalConsumedEver = 0, lastUsedDate = '';
    hist.forEach(function (e) {
      var found = false;
      e.lines.forEach(function (l) {
        if (l.itemId === id) {
          found = true;
          totalLoadedEver += (l.out || 0);
          if (it.isConsumable || l.isConsumable) {
            totalConsumedEver += Math.max(0, (l.out || 0) - (l.back || 0));
          } else {
            totalBrokenEver += (l.broken || 0);
            totalLeftVenueEver += (l.leftVenue || 0);
            totalMissingEver += (l.missing !== undefined ? l.missing : Math.max(0, (l.out || 0) - (l.back || 0) - (l.broken || 0) - (l.leftVenue || 0)));
          }
        }
      });
      (e.incidents || []).forEach(function (inc) {
        if (inc.itemId === id && inc.status === 'recovered') {
          totalRecoveredEver += (inc.recoveredQty || inc.qty || 1);
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
      totalBrokenEver: totalBrokenEver,
      totalLeftVenueEver: totalLeftVenueEver,
      totalRecoveredEver: totalRecoveredEver,
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

  /* Extract Past Incident History for a specific item */
  function itemIncidents(itemId) {
    var incidents = [];
    var hist = history();
    hist.forEach(function (e) {
      (e.incidents || []).forEach(function (inc, idx) {
        if (inc.itemId === itemId) {
          incidents.push({
            eventId: e.id,
            incidentIndex: idx,
            date: e.date || '',
            eventName: e.name,
            venue: e.venue || 'No venue',
            type: inc.type,
            qty: inc.qty,
            unit: inc.unit || 'pc',
            reason: inc.reason || '',
            remark: inc.remark || '',
            status: inc.status || 'open'
          });
        }
      });
    });
    return incidents.sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
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
        broken: t.broken,
        leftVenue: t.leftVenue,
        consumed: t.consumed
      };
    });
  }

  /* Analytics Aggregator */
  function analyticsSummary() {
    var hist = history();
    var totalGigs = hist.length;
    var totalDurableOut = 0, totalDurableBack = 0, totalBroken = 0, totalMissing = 0, totalLeftVenue = 0, totalRecovered = 0, totalConsumed = 0;
    var venueStats = {};
    var consumableMap = {};

    hist.forEach(function (e) {
      var vName = (e.venue || 'Unspecified venue').trim();
      if (!venueStats[vName]) {
        venueStats[vName] = { venue: vName, gigs: 0, broken: 0, missing: 0, leftVenue: 0, recovered: 0, incidents: 0 };
      }
      venueStats[vName].gigs++;

      (e.lines || []).forEach(function (l) {
        var out = l.out || 0;
        var back = l.back || 0;
        if (l.isConsumable) {
          var used = Math.max(0, out - back);
          totalConsumed += used;
          if (!consumableMap[l.name]) {
            consumableMap[l.name] = { name: l.name, count: 0, unit: l.unit || 'pc' };
          }
          consumableMap[l.name].count += used;
        } else {
          totalDurableOut += out;
          totalDurableBack += back;
          var brk = l.broken || 0;
          var lv = l.leftVenue || 0;
          var mis = (l.missing !== undefined) ? l.missing : Math.max(0, out - back - brk - lv);

          totalBroken += brk;
          totalLeftVenue += lv;
          totalMissing += mis;

          if (brk > 0 || mis > 0 || lv > 0) {
            venueStats[vName].broken += brk;
            venueStats[vName].missing += mis;
            venueStats[vName].leftVenue += lv;
            venueStats[vName].incidents += (brk + mis + lv);
          }
        }
      });

      (e.incidents || []).forEach(function (inc) {
        if (inc.status === 'recovered') {
          var rQty = inc.recoveredQty || inc.qty || 1;
          totalRecovered += rQty;
          if (venueStats[vName]) {
            venueStats[vName].recovered += rQty;
          }
        }
      });
    });

    var overallPct = totalDurableOut > 0 ? Math.round((totalDurableBack / totalDurableOut) * 100) : 100;
    var totalIncidents = totalBroken + totalMissing + totalLeftVenue;
    
    var brokenPct = totalIncidents > 0 ? Math.round((totalBroken / totalIncidents) * 100) : 0;
    var missingPct = totalIncidents > 0 ? Math.round((totalMissing / totalIncidents) * 100) : 0;
    var leftVenuePct = totalIncidents > 0 ? Math.max(0, 100 - brokenPct - missingPct) : 0;

    var topConsumables = [];
    for (var k in consumableMap) {
      if (consumableMap.hasOwnProperty(k)) {
        topConsumables.push(consumableMap[k]);
      }
    }
    topConsumables.sort(function (a, b) { return b.count - a.count; });
    topConsumables = topConsumables.slice(0, 5);

    var venueList = [];
    for (var vn in venueStats) {
      if (venueStats.hasOwnProperty(vn)) {
        venueList.push(venueStats[vn]);
      }
    }
    venueList.sort(function (a, b) { return b.incidents - a.incidents; });
    var venueWatchlist = venueList.filter(function (v) { return v.incidents > 0; }).slice(0, 5);

    var trendData = overallRecoveryTrend();
    var sparkPoints = [];
    if (trendData.length > 0) {
      var w = 260, h = 60, pad = 10;
      var step = trendData.length > 1 ? (w - 2 * pad) / (trendData.length - 1) : 0;
      for (var idx = 0; idx < trendData.length; idx++) {
        var x = Math.round(pad + idx * step);
        var pct = Math.max(0, Math.min(100, trendData[idx].recoveryPct));
        var y = Math.round(h - pad - ((pct / 100) * (h - 2 * pad)));
        sparkPoints.push(x + ',' + y);
      }
    }

    return {
      totalGigs: totalGigs,
      overallReturnPct: overallPct,
      totalBroken: totalBroken,
      totalMissing: totalMissing,
      totalLeftVenue: totalLeftVenue,
      totalRecovered: totalRecovered,
      totalIncidents: totalIncidents,
      brokenPct: brokenPct,
      missingPct: missingPct,
      leftVenuePct: leftVenuePct,
      totalConsumed: totalConsumed,
      topConsumables: topConsumables,
      venueWatchlist: venueWatchlist,
      trendData: trendData,
      sparkPolyline: sparkPoints.join(' ')
    };
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
      data.id = data.id || uid('i-');
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
        outMap[l.itemId] = (outMap[l.itemId] || 0) + (l.out - (ev.status === 'out' ? (l.back + (l.broken || 0)) : 0));
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
      back: 0,
      broken: 0,
      brokenReason: '',
      missing: 0,
      missingReason: '',
      leftVenue: 0,
      leftVenueReason: '',
      customRemark: ''
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
      incidents: [],
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

  function setOut(ev, itemId, n) {
    if (!ev) return;
    var found = false;
    var targetQty = Math.max(0, n);
    ev.lines.forEach(function (l) {
      if (l.itemId === itemId) {
        found = true;
        l.out = targetQty;
        var accounted = l.back + (l.broken || 0) + (l.missing || 0) + (l.leftVenue || 0);
        if (accounted > l.out) {
          l.back = Math.min(l.back, l.out);
          l.broken = 0;
          l.missing = 0;
          l.leftVenue = 0;
        }
      }
    });

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
      if (l.itemId === itemId) {
        l.back = Math.max(0, Math.min(l.out, n));
        var remainingShortage = Math.max(0, l.out - l.back);
        var totalDiscrepancy = (l.broken || 0) + (l.missing || 0) + (l.leftVenue || 0);
        if (totalDiscrepancy > remainingShortage) {
          l.broken = Math.min(l.broken || 0, remainingShortage);
          var remAfterBroken = remainingShortage - l.broken;
          l.leftVenue = Math.min(l.leftVenue || 0, remAfterBroken);
          l.missing = Math.max(0, remAfterBroken - l.leftVenue);
        } else if (totalDiscrepancy < remainingShortage && !l.isConsumable) {
          l.missing = (l.missing || 0) + (remainingShortage - totalDiscrepancy);
        }
      }
    });
    save();
  }

  /* Record detailed packdown return with 4-way breakdown and custom remark */
  function setPackReturn(ev, itemId, backQty, brokenQty, missingQty, leftVenueQty, brokenReason, missingReason, leftVenueReason, customRemark) {
    if (!ev) return;
    ev.lines.forEach(function (l) {
      if (l.itemId === itemId) {
        var cleanBack = Math.max(0, Math.min(l.out, backQty));
        var unreturned = Math.max(0, l.out - cleanBack);

        if (l.isConsumable) {
          l.back = cleanBack;
          l.broken = 0;
          l.missing = 0;
          l.leftVenue = 0;
          l.customRemark = '';
        } else {
          var cleanBroken = Math.max(0, Math.min(unreturned, brokenQty || 0));
          var remAfterBroken = unreturned - cleanBroken;

          var cleanLeftVenue = Math.max(0, Math.min(remAfterBroken, leftVenueQty || 0));
          var remAfterVenue = remAfterBroken - cleanLeftVenue;

          var cleanMissing = (missingQty !== undefined) ? Math.max(0, Math.min(remAfterVenue, missingQty)) : remAfterVenue;
          var unallocated = remAfterVenue - cleanMissing;
          if (unallocated > 0) {
            cleanMissing += unallocated;
          }

          l.back = cleanBack;
          l.broken = cleanBroken;
          l.leftVenue = cleanLeftVenue;
          l.missing = cleanMissing;
          l.customRemark = (customRemark || '').trim();

          if (brokenReason === 'Other') {
            l.brokenReason = l.customRemark ? ('Other: ' + l.customRemark) : 'Other / Unspecified';
          } else {
            l.brokenReason = cleanBroken > 0 ? (brokenReason || 'Shattered / Dropped') : '';
          }

          if (leftVenueReason === 'Other') {
            l.leftVenueReason = l.customRemark ? ('Other: ' + l.customRemark) : 'Other / Unspecified';
          } else {
            l.leftVenueReason = cleanLeftVenue > 0 ? (leftVenueReason || 'Left at venue') : '';
          }

          if (missingReason === 'Other') {
            l.missingReason = l.customRemark ? ('Other: ' + l.customRemark) : 'Other / Unspecified';
          } else {
            l.missingReason = cleanMissing > 0 ? (missingReason || 'Lost / Unaccounted') : '';
          }
        }
      }
    });
    save();
  }

  /* Hybrid Deficit Splitter: bought increases stock, borrowed goes to notOurs */
  function splitDeficit(ev, itemId, boughtQty, borrowedQty, lenderNote) {
    if (!ev) return;
    var it = item(itemId);
    if (!it) return;

    boughtQty = Math.max(0, parseInt(boughtQty, 10) || 0);
    borrowedQty = Math.max(0, parseInt(borrowedQty, 10) || 0);

    if (boughtQty > 0) {
      it.qty = (it.qty || 0) + boughtQty;
      it.updatedAt = now();
    }

    if (borrowedQty > 0) {
      addNotOurs(ev, it.name, borrowedQty, lenderNote || ('Borrowed for ' + ev.name), it.photoId, it.id, it.brand);
    }

    save();
  }

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

        var preservedBack = 0, preservedBroken = 0, preservedMissing = 0, preservedLeftVenue = 0, preservedRemark = '';
        if (oldLinesMap[pl.itemId]) {
          preservedBack = Math.min(oldLinesMap[pl.itemId].back, targetQty);
          preservedBroken = Math.min(oldLinesMap[pl.itemId].broken || 0, targetQty - preservedBack);
          preservedLeftVenue = Math.min(oldLinesMap[pl.itemId].leftVenue || 0, targetQty - preservedBack - preservedBroken);
          preservedMissing = Math.min(oldLinesMap[pl.itemId].missing || 0, targetQty - preservedBack - preservedBroken - preservedLeftVenue);
          preservedRemark = oldLinesMap[pl.itemId].customRemark || '';
        }

        var l = lineFrom(it, targetQty);
        l.back = preservedBack;
        l.broken = preservedBroken;
        l.leftVenue = preservedLeftVenue;
        l.missing = preservedMissing;
        l.customRemark = preservedRemark;
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

  function addNotOurs(ev, label, qty, note, photoId, itemId, brand) {
    if (!ev) return;
    if (!ev.notOurs) ev.notOurs = [];
    var entry = {
      id: uid('n-'),
      label: (label || 'Unmarked item').trim(),
      qty: Math.max(1, parseInt(qty, 10) || 1),
      note: (note || '').trim(),
      photoId: photoId || '',
      itemId: itemId || '',
      brand: (brand || '').trim(),
      createdAt: now()
    };
    ev.notOurs.push(entry);
    save();
    return entry;
  }

  function updateNotOurs(ev, id, data) {
    if (!ev || !ev.notOurs) return null;
    var entry = null;
    for (var i = 0; i < ev.notOurs.length; i++) {
      if (ev.notOurs[i].id === id) {
        entry = ev.notOurs[i];
        break;
      }
    }
    if (!entry) return null;
    if (data.label !== undefined) entry.label = (data.label || 'Unmarked item').trim();
    if (data.qty !== undefined) entry.qty = Math.max(1, parseInt(data.qty, 10) || 1);
    if (data.note !== undefined) entry.note = (data.note || '').trim();
    if (data.photoId !== undefined) entry.photoId = data.photoId || '';
    if (data.itemId !== undefined) entry.itemId = data.itemId || '';
    if (data.brand !== undefined) entry.brand = (data.brand || '').trim();
    entry.updatedAt = now();
    save();
    return entry;
  }

  function removeNotOurs(ev, id) {
    if (!ev || !ev.notOurs) return;
    var target = null;
    ev.notOurs.forEach(function (n) { if (n.id === id) target = n; });
    if (target && target.photoId) {
      var it = target.itemId ? item(target.itemId) : null;
      if (!it || it.photoId !== target.photoId) {
        if (App.DB) {
          App.DB.del(target.photoId);
          App.DB.del(target.photoId + '-t');
        }
      }
    }
    ev.notOurs = ev.notOurs.filter(function (n) { return n.id !== id; });
    save();
  }

  function tally(ev) {
    var totalOut = 0, totalBack = 0;
    var durableOut = 0, durableBack = 0, durableBroken = 0, durableMissing = 0, durableLeftVenue = 0;
    var consumableOut = 0, consumableBack = 0;

    (ev.lines || []).forEach(function (l) {
      var out = l.out || 0;
      var back = l.back || 0;
      var brk = l.broken || 0;
      var lv = l.leftVenue || 0;
      var mis = (l.missing !== undefined) ? l.missing : Math.max(0, out - back - brk - lv);

      totalOut += out;
      totalBack += back;

      if (l.isConsumable) {
        consumableOut += out;
        consumableBack += back;
      } else {
        durableOut += out;
        durableBack += back;
        durableBroken += brk;
        durableLeftVenue += lv;
        durableMissing += mis;
      }
    });

    var foreign = 0;
    (ev.notOurs || []).forEach(function (n) { foreign += (n.qty || 0); });

    var totalUnreturned = Math.max(0, durableOut - durableBack);
    var consumedItems = Math.max(0, consumableOut - consumableBack);

    var pct = 100;
    if (durableOut > 0) {
      pct = Math.round((durableBack / durableOut) * 100);
    }

    return {
      out: totalOut,
      back: totalBack,
      broken: durableBroken,
      missing: durableMissing,
      leftVenue: durableLeftVenue,
      totalUnreturned: totalUnreturned,
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
    var incidents = [];

    ev.lines.forEach(function (l) {
      var it = item(l.itemId);
      if (l.isConsumable) {
        var used = Math.max(0, (l.out || 0) - (l.back || 0));
        if (used > 0 && deductConsumed && it) {
          it.qty = Math.max(0, (it.qty || 0) - used);
          it.updatedAt = now();
        }
      } else {
        var brk = l.broken || 0;
        var lv = l.leftVenue || 0;
        var mis = (l.missing !== undefined) ? l.missing : Math.max(0, (l.out || 0) - (l.back || 0) - brk - lv);
        var rmk = (l.customRemark || '').trim();

        if (brk > 0) {
          if (it) {
            it.qty = Math.max(0, (it.qty || 0) - brk);
            it.updatedAt = now();
          }
          var brkFinalReason = l.brokenReason || 'Shattered / Dropped';
          if (rmk && brkFinalReason.indexOf(rmk) === -1) {
            brkFinalReason += ' (' + rmk + ')';
          }
          incidents.push({
            id: uid('inc-'),
            itemId: l.itemId,
            name: l.name,
            brand: l.brand || '',
            unit: l.unit || 'pc',
            type: 'broken',
            qty: brk,
            reason: brkFinalReason,
            remark: rmk,
            status: 'scrapped',
            timestamp: now()
          });
        }

        if (lv > 0) {
          if (deductMissing && it) {
            it.qty = Math.max(0, (it.qty || 0) - lv);
            it.updatedAt = now();
          }
          var lvFinalReason = l.leftVenueReason || 'Left behind at venue';
          if (rmk && lvFinalReason.indexOf(rmk) === -1) {
            lvFinalReason += ' (' + rmk + ')';
          }
          incidents.push({
            id: uid('inc-'),
            itemId: l.itemId,
            name: l.name,
            brand: l.brand || '',
            unit: l.unit || 'pc',
            type: 'left_venue',
            qty: lv,
            reason: lvFinalReason,
            remark: rmk,
            status: 'pending_recovery',
            venue: ev.venue || 'Event Venue',
            timestamp: now()
          });
        }

        if (mis > 0) {
          if (deductMissing && it) {
            it.qty = Math.max(0, (it.qty || 0) - mis);
            it.updatedAt = now();
          }
          var misFinalReason = l.missingReason || 'Lost / Unaccounted';
          if (rmk && misFinalReason.indexOf(rmk) === -1) {
            misFinalReason += ' (' + rmk + ')';
          }
          incidents.push({
            id: uid('inc-'),
            itemId: l.itemId,
            name: l.name,
            brand: l.brand || '',
            unit: l.unit || 'pc',
            type: 'missing',
            qty: mis,
            reason: misFinalReason,
            remark: rmk,
            status: 'lost',
            timestamp: now()
          });
        }
      }
    });

    ev.status = 'closed';
    ev.closedAt = now();
    ev.deducted = !!deductMissing;
    ev.deductedConsumed = !!deductConsumed;
    ev.incidents = incidents;
    save();
    return tally(ev);
  }

  function recoverVenueItem(eventId, incidentIdx, recoveredQty) {
    var ev = event(eventId);
    if (!ev || !ev.incidents || !ev.incidents[incidentIdx]) return null;

    var inc = ev.incidents[incidentIdx];
    var qtyToAdd = Math.max(1, parseInt(recoveredQty, 10) || inc.qty || 1);

    var existingItem = item(inc.itemId);
    if (existingItem) {
      existingItem.qty = (existingItem.qty || 0) + qtyToAdd;
      existingItem.updatedAt = now();
    } else {
      var newItem = {
        id: inc.itemId || uid('i-'),
        name: inc.name,
        brand: inc.brand || '',
        categoryId: 'c-other',
        qty: qtyToAdd,
        unit: inc.unit || 'pc',
        isConsumable: false,
        lowStockThreshold: 2,
        tagLabel: 'Found',
        tagColor: 'green',
        tagStyle: 'tape',
        note: 'Restored from venue recovery (' + (ev.venue || ev.name) + ')',
        photoId: '',
        createdAt: now(),
        updatedAt: now()
      };
      s.items.push(newItem);
      existingItem = newItem;
    }

    inc.status = 'recovered';
    inc.recoveredAt = now();
    inc.recoveredQty = qtyToAdd;
    save();
    return { item: existingItem, incident: inc };
  }

  function markIncidentReplaced(eventId, incidentIdx) {
    var ev = event(eventId);
    if (!ev || !ev.incidents || !ev.incidents[incidentIdx]) return null;

    var inc = ev.incidents[incidentIdx];
    inc.status = 'replaced';
    inc.replacedAt = now();
    save();
    return inc;
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
    text += "Status: " + (ev.status === 'closed' ? 'Completed (' + t.pct + '% Gear Returned Intact)' : (ev.status === 'out' ? 'Out on Location' : 'Staging / Van Loading')) + "\n";
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
        var status = '';
        if (ev.status === 'staging') {
          status = "Staged: " + l.out + " " + l.unit;
        } else {
          var brk = l.broken || 0;
          var lv = l.leftVenue || 0;
          var mis = (l.missing !== undefined) ? l.missing : Math.max(0, l.out - l.back - brk - lv);
          if (l.out === l.back) {
            status = "[✓] All " + l.out + " " + l.unit + " returned intact";
          } else {
            var parts = [l.back + "/" + l.out + " back"];
            if (brk > 0) parts.push(brk + " BROKEN (" + (l.brokenReason || 'Damaged') + ")");
            if (lv > 0) parts.push(lv + " LEFT AT VENUE (" + (l.leftVenueReason || 'Venue') + ")");
            if (mis > 0) parts.push(mis + " MISSING/STOLEN (" + (l.missingReason || 'Lost') + ")");
            if (l.customRemark) parts.push("Note: " + l.customRemark);
            status = "[!] " + parts.join(', ');
          }
        }
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
        var brandStr = n.brand ? " [" + n.brand + "]" : "";
        text += "• " + n.label + brandStr + " (Qty: " + n.qty + ")" + (n.note ? " - Owner/Notes: " + n.note : "") + "\n";
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
    itemUsageTrend: itemUsageTrend, itemIncidents: itemIncidents,
    overallRecoveryTrend: overallRecoveryTrend, analyticsSummary: analyticsSummary,
    generateEventManifestText: generateEventManifestText,
    saveItem: saveItem, adjustStock: adjustStock, setStock: setStock, removeItem: removeItem,
    categories: categories, category: category, categoryName: categoryName,
    saveCategory: saveCategory, removeCategory: removeCategory, resetCategoriesToDefault: resetCategoriesToDefault,
    presets: presets, preset: preset, checkPresetAvailability: checkPresetAvailability,
    savePreset: savePreset, savePresetFromEvent: savePresetFromEvent, updatePresetFromEvent: updatePresetFromEvent, removePreset: removePreset,
    staff: staff, staffMember: staffMember, saveStaff: saveStaff, removeStaff: removeStaff,
    activeEvent: activeEvent, event: event, createEvent: createEvent,
    addLine: addLine, removeLine: removeLine, setOut: setOut, setBack: setBack,
    setPackReturn: setPackReturn, splitDeficit: splitDeficit,
    recoverVenueItem: recoverVenueItem, markIncidentReplaced: markIncidentReplaced,
    applyPresetToEvent: applyPresetToEvent, returnToStaging: returnToStaging,
    assignStaff: assignStaff, unassignStaff: unassignStaff,
    markLoaded: markLoaded, addNotOurs: addNotOurs, updateNotOurs: updateNotOurs, removeNotOurs: removeNotOurs,
    tally: tally, closeEvent: closeEvent, removeEvent: removeEvent, history: history,
    kpis: kpis, exportData: exportData, importData: importData, reset: reset
  };
})();