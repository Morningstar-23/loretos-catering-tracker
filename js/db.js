/* db.js — 1.2 KB IndexedDB key/value store for photos.
   Values are JPEG data-URL strings (Safari 12 has flaky Blob-in-IDB support). */
window.App = window.App || {};
App.DB = (function () {
  var NAME = 'lct-photos', STORE = 'kv', dbp = null;
  var mem = {}; // in-session cache so lists don't re-hit IDB while scrolling

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('no-idb')); return; }
      var r = indexedDB.open(NAME, 1);
      r.onupgradeneeded = function () {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, mode), s = t.objectStore(STORE), req = fn(s);
        t.oncomplete = function () { res(req && req.result); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }

  return {
    get: function (key) {
      if (!key) return Promise.resolve(null);
      if (mem[key]) return Promise.resolve(mem[key]);
      return tx('readonly', function (s) { return s.get(key); })
        .then(function (v) { if (v) mem[key] = v; return v || null; })
        .catch(function () { return null; });
    },
    set: function (key, val) {
      mem[key] = val;
      return tx('readwrite', function (s) { return s.put(val, key); }).catch(function () { return null; });
    },
    del: function (key) {
      delete mem[key];
      return tx('readwrite', function (s) { return s.delete(key); }).catch(function () { return null; });
    },
    keys: function () {
      return tx('readonly', function (s) { return s.getAllKeys ? s.getAllKeys() : { result: [] }; })
        .then(function (k) { return k || []; }).catch(function () { return []; });
    },
    clear: function () {
      mem = {};
      return tx('readwrite', function (s) { return s.clear(); }).catch(function () { return null; });
    }
  };
})();
