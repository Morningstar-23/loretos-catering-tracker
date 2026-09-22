/* image.js — the picture compressor.
   A 4 MB iPhone photo becomes a ~60 KB JPEG data-URL plus a ~6 KB list thumb,
   so hundreds of gear photos still fit in IndexedDB on a 16 GB phone.
   Handles EXIF orientation because iOS 12 does NOT auto-rotate canvas draws. */
window.App = window.App || {};
App.Image = (function () {

  var FULL_MAX = 900;   // longest edge of the detail photo
  var THUMB_MAX = 128;  // longest edge of the list thumbnail
  var TARGET_KB = 70;   // shrink quality until the full photo fits under this
  var MIN_Q = 0.45;

  function readOrientation(file) {
    return new Promise(function (res) {
      var r = new FileReader();
      r.onerror = function () { res(1); };
      r.onload = function () {
        try {
          var v = new DataView(r.result);
          if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) { res(1); return; }
          var off = 2;
          while (off + 4 < v.byteLength) {
            var marker = v.getUint16(off); off += 2;
            if (marker === 0xFFE1) {
              if (v.getUint32(off + 2) !== 0x45786966) { res(1); return; }
              var tiff = off + 8;
              var little = v.getUint16(tiff) === 0x4949;
              var dirStart = tiff + v.getUint32(tiff + 4, little);
              var count = v.getUint16(dirStart, little);
              for (var i = 0; i < count; i++) {
                var entry = dirStart + 2 + i * 12;
                if (v.getUint16(entry, little) === 0x0112) {
                  res(v.getUint16(entry + 8, little) || 1); return;
                }
              }
              res(1); return;
            } else if ((marker & 0xFF00) !== 0xFF00) { res(1); return; }
            else { off += v.getUint16(off); }
          }
          res(1);
        } catch (e) { res(1); }
      };
      r.readAsArrayBuffer(file.slice(0, 131072));
    });
  }

  function loadImage(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onerror = function () { rej(new Error('read-failed')); };
      r.onload = function () {
        var img = new Image();
        img.onload = function () { res(img); };
        img.onerror = function () { rej(new Error('decode-failed')); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  function draw(img, max, orientation) {
    var swap = orientation >= 5 && orientation <= 8;
    var sw = swap ? img.height : img.width;
    var sh = swap ? img.width : img.height;
    var scale = Math.min(1, max / Math.max(sw, sh));
    var w = Math.max(1, Math.round(sw * scale));
    var h = Math.max(1, Math.round(sh * scale));

    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.fillStyle = '#FAF7F2';
    x.fillRect(0, 0, w, h);

    var dw = swap ? h : w, dh = swap ? w : h;
    switch (orientation) {
      case 2: x.translate(w, 0); x.scale(-1, 1); break;
      case 3: x.translate(w, h); x.rotate(Math.PI); break;
      case 4: x.translate(0, h); x.scale(1, -1); break;
      case 5: x.rotate(Math.PI / 2); x.scale(1, -1); break;
      case 6: x.rotate(Math.PI / 2); x.translate(0, -w); break;
      case 7: x.rotate(-Math.PI / 2); x.translate(-h, w); x.scale(1, -1); break;
      case 8: x.rotate(-Math.PI / 2); x.translate(-h, 0); break;
      default: break;
    }
    x.drawImage(img, 0, 0, dw, dh);
    return c;
  }

  function kb(dataUrl) { return Math.round(dataUrl.length * 0.75 / 1024); }

  /* compress(file) -> { full, thumb, kb } — both are image/jpeg data URLs */
  function compress(file) {
    if (!file || file.size === undefined) return Promise.reject(new Error('no-file'));
    return readOrientation(file).then(function (o) {
      return loadImage(file).then(function (img) {
        var full = draw(img, FULL_MAX, o);
        var q = 0.72, out = full.toDataURL('image/jpeg', q);
        while (kb(out) > TARGET_KB && q > MIN_Q) {
          q -= 0.09;
          out = full.toDataURL('image/jpeg', q);
        }
        var thumb = draw(img, THUMB_MAX, o).toDataURL('image/jpeg', 0.6);
        // let Safari reclaim the canvas memory right away on old devices
        full.width = full.height = 1;
        return { full: out, thumb: thumb, kb: kb(out) + kb(thumb) };
      });
    });
  }

  return { compress: compress, sizeKB: kb };
})();
