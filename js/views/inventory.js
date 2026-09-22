/* ==========================================================================
   Loreto's Catering Tracker — Views: Inventory (js/views/inventory.js)
   - Streamlined single-row category carousel (zero grey scrollbars)
   - Integrated Stock Filter & Sort dual dropdown bar
   - Quantity locked in Edit Mode (Identity & thresholds only)
   - Crash-proof item details view with guarded trend rendering
   - Uses restored original masking tape & rubber stamp tags
   ========================================================================== */
window.App = window.App || {};
App.Views = App.Views || {};

App.Views.inventory = (function () {
  var U = App.UI, S = App.Store;
  var q = '', cat = '', sortBy = 'alpha-asc', stockFilter = 'all';
  var pendingPhoto = null, editingId = null;
  var selectedTagColor = 'orange', selectedCategoryId = '', selectedTagStyle = 'tape';
  var selectedIsConsumable = false;

  function render() {
    var list = S.searchItems ? S.searchItems(q, cat, sortBy, stockFilter) : S.items();
    var cats = S.categories();

    var catChips = '<button type="button" class="chip' + (cat ? '' : ' on') + '" data-act="cat" data-id="">All (' + S.items().length + ')</button>' +
      cats.map(function (c) {
        var count = S.items().filter(function (i) { return i.categoryId === c.id; }).length;
        return '<button type="button" class="chip' + (cat === c.id ? ' on' : '') + '" data-act="cat" data-id="' + c.id + '">' +
          U.icon(c.icon || 'plate') + ' ' + U.esc(c.name) + ' (' + count + ')</button>';
      }).join('') +
      '<button type="button" class="chip" data-act="manage-cats">' + U.icon('settings') + ' Manage</button>';

    var sortOptions = [
      { id: 'alpha-asc',  label: 'Name (A \u2192 Z)' },
      { id: 'alpha-desc', label: 'Name (Z \u2192 A)' },
      { id: 'mod-desc',   label: 'Last Audited' },
      { id: 'date-desc',  label: 'Date Added' },
      { id: 'qty-desc',   label: 'Stock (High)' },
      { id: 'qty-asc',    label: 'Stock (Low)' }
    ].map(function (o) {
      return '<option value="' + o.id + '"' + (sortBy === o.id ? ' selected' : '') + '>' + o.label + '</option>';
    }).join('');

    var stockOptions = [
      { id: 'all',     label: 'All Stock' },
      { id: 'low',     label: 'Low Stock Only' },
      { id: 'empty',   label: 'Out of Stock Only' },
      { id: 'instock', label: 'In Stock Only' }
    ].map(function (sOpt) {
      return '<option value="' + sOpt.id + '"' + (stockFilter === sOpt.id ? ' selected' : '') + '>' + sOpt.label + '</option>';
    }).join('');

    return '<div class="search">' +
        U.icon('search', 'search-icon') +
        '<input class="input" id="inv-q" type="search" placeholder="Search gear, brand, or tag" value="' + U.esc(q) + '">' +
      '</div>' +

      '<div class="chips filter-bar">' + catChips + '</div>' +

      '<div class="row row-between mb8">' +
        '<div class="sort-wrap">' +
          '<select class="sort-select" id="inv-stock" data-act="change-stock">' + stockOptions + '</select>' +
        '</div>' +
        '<div class="sort-wrap">' +
          '<select class="sort-select" id="inv-sort" data-act="change-sort">' + sortOptions + '</select>' +
        '</div>' +
      '</div>' +

      '<div class="row row-between mb8" style="padding:0 2px">' +
        '<span class="muted" style="font-size:11.5px">' + list.length + ' of ' + S.items().length + ' items showing</span>' +
      '</div>' +

      (list.length
        ? '<div class="list">' + list.map(row).join('') + '</div>'
        : U.empty('search', q || cat || stockFilter !== 'all' ? 'No items match filter' : 'Inventory is empty',
            q || cat || stockFilter !== 'all' ? 'Try changing stock filter or tap "All".' : 'Add your first trays, burners, or tables.',
            '<button type="button" class="btn btn-primary" data-act="add-item">' + U.icon('plus', 'mr4') + ' Add first item</button>')) +

      '<button type="button" class="fab" data-act="add-item" aria-label="Add new gear">' +
        U.icon('plus') +
      '</button>';
  }

  function row(i) {
    var c = S.category(i.categoryId);
    var asOf = i.updatedAt ? U.fmtDate(i.updatedAt) : '';
    var catIcon = c ? (c.icon || 'plate') : 'plate';
    var brandLabel = i.brand ? i.brand : (i.tagLabel || 'Loreto');
    var isConsumable = !!i.isConsumable;
    var threshold = i.lowStockThreshold || 2;
    var curQty = i.qty || 0;

    var stockBadge = '';
    if (curQty === 0) {
      stockBadge = '<span class="tag tag-red ml4" style="font-size:9.5px">Out of stock</span>';
    } else if (curQty <= threshold) {
      stockBadge = '<span class="tag tag-yellow ml4" style="font-size:9.5px">Low (' + curQty + ')</span>';
    }

    return '<button type="button" class="item" data-act="open-stats" data-id="' + i.id + '">' +
      '<span class="thumb"' + (i.photoId ? ' data-photo="' + i.photoId + '-t"' : '') + '>' +
        (i.photoId ? '' : U.icon(catIcon)) + '</span>' +
      '<span class="grow truncate">' +
        '<span class="item-name truncate">' + U.esc(i.name) + '</span>' +
        '<span class="item-sub truncate">' +
          U.esc(c ? c.name : 'Uncategorised') + ' &middot; ' + U.esc(i.unit) +
        '</span>' +
        '<span class="row mt4" style="gap:4px">' +
          U.tag(brandLabel, i.tagColor, i.tagStyle) +
          (isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
          stockBadge +
          (asOf ? '<span class="muted ml4" style="font-size:10.5px">As of ' + asOf + '</span>' : '') +
        '</span>' +
      '</span>' +
      '<span class="item-qty" style="color:' + (curQty === 0 ? 'var(--alert)' : (curQty <= threshold ? 'var(--gold)' : 'var(--foliage)')) + '">' +
        curQty +
      '</span>' +
      '</button>';
  }

  function mounted(root) {
    U.hydrateThumbs(root);

    var input = document.getElementById('inv-q');
    if (input) {
      input.addEventListener('input', function () {
        q = input.value;
        var pos = input.selectionStart;
        App.rerenderQuiet();
        var again = document.getElementById('inv-q');
        if (again) {
          again.focus();
          try { again.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }

    var sortSel = document.getElementById('inv-sort');
    if (sortSel) {
      sortSel.addEventListener('change', function () {
        sortBy = sortSel.value;
        App.rerenderQuiet();
      });
    }

    var stockSel = document.getElementById('inv-stock');
    if (stockSel) {
      stockSel.addEventListener('change', function () {
        stockFilter = stockSel.value;
        App.rerenderQuiet();
      });
    }
  }

  /* Safe Item Dashboard Sheet with Fallback Protection */
  function openStats(id) {
    var stats = S.itemStats(id);
    if (!stats) return;
    var it = stats.item;
    var c = S.category(it.categoryId);
    var catIcon = c ? (c.icon || 'plate') : 'plate';
    var brandLabel = it.brand ? it.brand : (it.tagLabel || 'Loreto');
    var currentDateVal = it.updatedAt ? it.updatedAt.slice(0, 10) : U.today();
    var isConsumable = !!it.isConsumable;

    // Guarded trend data call to prevent crashing
    var trendData = (S.itemUsageTrend && typeof S.itemUsageTrend === 'function') ? S.itemUsageTrend(it.id) : [];

    var trendSvgHtml = '';
    if (trendData.length) {
      var maxDeployment = 1;
      trendData.forEach(function (d) { if (d.staged > maxDeployment) maxDeployment = d.staged; });

      var svgW = 280, svgH = 80;
      var padLeft = 24, padRight = 16, padTop = 16, padBottom = 22;
      var chartW = svgW - padLeft - padRight;
      var chartH = svgH - padTop - padBottom;
      var colWidth = Math.min(26, Math.floor(chartW / trendData.length) - 6);

      var barsContent = '';
      trendData.forEach(function (d, idx) {
        var xCenter = padLeft + (idx + 0.5) * (chartW / trendData.length);
        var barH = Math.max(4, Math.round((d.staged / maxDeployment) * chartH));
        var yTop = padTop + chartH - barH;
        var barColor = isConsumable ? 'var(--gold)' : 'var(--foliage)';

        barsContent +=
          '<text x="' + xCenter + '" y="' + (yTop - 3) + '" font-size="8.5" font-weight="700" fill="' + barColor + '" text-anchor="middle">' + d.staged + '</text>' +
          '<rect x="' + (xCenter - colWidth / 2) + '" y="' + yTop + '" width="' + colWidth + '" height="' + barH + '" rx="3" fill="' + barColor + '"/>' +
          '<text x="' + xCenter + '" y="' + (svgH - 5) + '" font-size="8.5" font-weight="500" fill="var(--ink-soft)" text-anchor="middle">' + U.esc(d.date) + '</text>';
      });

      trendSvgHtml =
        '<div class="card mb12">' +
          '<div class="row row-between mb4">' +
            '<strong style="font-size:12px;color:var(--foliage)">' + U.icon('history', 'mr4') + ' Deployment History</strong>' +
            '<span class="muted" style="font-size:11px">Past ' + trendData.length + ' gigs</span>' +
          '</div>' +
          '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" width="100%" height="' + svgH + '" style="display:block;margin:4px 0">' +
            '<line x1="' + padLeft + '" y1="' + (padTop + chartH) + '" x2="' + (svgW - padRight) + '" y2="' + (padTop + chartH) + '" stroke="var(--line-strong)" stroke-width="1"/>' +
            barsContent +
          '</svg>' +
          '<div class="row row-between mt2" style="font-size:10.5px;color:var(--ink-soft);border-top:1px solid var(--line);padding-top:4px">' +
            '<span>Total deployed: ' + stats.totalLoadedEver + ' ' + U.esc(it.unit) + '</span>' +
            '<span>' + stats.eventsUsed + ' gigs total</span>' +
          '</div>' +
        '</div>';
    }

    var inInv = stats.inInventory !== undefined ? stats.inInventory : (stats.inKitchen || it.qty || 0);
    var lowThresh = stats.lowStockThreshold || (it.lowStockThreshold || 2);

    var html =
      '<div class="card mb12">' +
        '<div class="row row-start">' +
          '<div class="thumb" id="dash-photo-box" data-act="dash-pick-photo" style="width:58px;height:58px;flex:0 0 58px;margin-right:12px;cursor:pointer;position:relative"' +
            (it.photoId ? ' data-photo="' + it.photoId + '"' : '') + '>' +
            (it.photoId ? '' : U.icon(catIcon)) +
            '<div style="position:absolute;bottom:0;right:0;background:rgba(27,56,43,0.85);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center">' +
              U.icon('camera') +
            '</div>' +
          '</div>' +
          '<div class="grow">' +
            '<h3 style="font-size:16px;font-weight:600;color:var(--foliage)">' + U.esc(it.name) + '</h3>' +
            '<p class="muted mt2" style="font-size:12px">' +
              U.esc(c ? c.name : 'Uncategorised') + ' &middot; in ' + U.esc(it.unit) + 's' +
            '</p>' +
            '<div class="row mt4" style="gap:4px">' +
              U.tag(brandLabel, it.tagColor, it.tagStyle) +
              (isConsumable ? '<span class="tag tag-yellow" style="font-size:9.5px">Supply</span>' : '') +
              (it.tagLabel && it.brand ? '<span class="muted ml4" style="font-size:11px">' + U.esc(it.tagLabel) + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<input class="hidden-file" type="file" id="dash-file" accept="image/*">' +
      '</div>' +

      /* Direct Stock Adjustment with Manual Calendar Date & Save Button */
      '<div class="card mb12">' +
        '<div class="row row-between">' +
          '<div>' +
            '<span style="font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase">Inventory Count</span>' +
            '<p class="muted" style="font-size:11.5px">Low-stock alert at: ' + lowThresh + ' ' + U.esc(it.unit) + '</p>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" class="step-btn" data-act="stat-delta" data-id="' + it.id + '" data-delta="-1">' + U.icon('minus') + '</button>' +
            '<input type="number" inputmode="numeric" pattern="[0-9]*" class="step-num" id="stat-stock-input" value="' + it.qty + '">' +
            '<button type="button" class="step-btn" data-act="stat-delta" data-id="' + it.id + '" data-delta="1">' + U.icon('plus') + '</button>' +
          '</div>' +
        '</div>' +

        '<div class="row row-between mt8" style="padding-top:6px;border-top:1px solid var(--line)">' +
          '<button type="button" class="btn btn-ghost btn-sm" style="width:23%" data-act="stat-delta" data-id="' + it.id + '" data-delta="-5">&minus;5</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" style="width:23%" data-act="stat-delta" data-id="' + it.id + '" data-delta="-1">&minus;1</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" style="width:23%" data-act="stat-delta" data-id="' + it.id + '" data-delta="1">+1</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" style="width:23%" data-act="stat-delta" data-id="' + it.id + '" data-delta="5">+5</button>' +
        '</div>' +

        '<div class="row row-between mt12" style="padding-top:10px;border-top:1px solid var(--line)">' +
          '<div class="grow mr8">' +
            '<label for="stat-asof" style="font-size:11.5px;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:3px">' +
              U.icon('calendar', 'chip-icon') + ' Audit Date (As of):' +
            '</label>' +
            '<input type="date" class="input" id="stat-asof" value="' + currentDateVal + '" style="min-height:36px;padding:4px 8px;font-size:13px">' +
          '</div>' +
          '<div style="padding-top:16px">' +
            '<button type="button" class="btn btn-primary btn-sm" data-act="save-stock-audit" data-id="' + it.id + '" style="min-height:36px;padding:4px 12px">' +
              'Save count' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* KPI Metrics */
      '<div class="kpi-grid mb12">' +
        '<div class="kpi"><div class="kpi-in">' +
          '<div class="kpi-n">' + inInv + '</div>' +
          '<div class="kpi-l">In inventory</div></div></div>' +
        '<div class="kpi"><div class="kpi-in' + (stats.currentlyOut > 0 ? ' kpi-hot' : '') + '">' +
          '<div class="kpi-n">' + stats.currentlyOut + '</div>' +
          '<div class="kpi-l">Loaded in van</div></div></div>' +
        '<div class="kpi"><div class="kpi-in">' +
          '<div class="kpi-n">' + stats.eventsUsed + '</div>' +
          '<div class="kpi-l">Gigs used on</div></div></div>' +
        '<div class="kpi"><div class="kpi-in' + (!isConsumable && stats.totalMissingEver > 0 ? ' kpi-hot' : '') + '">' +
          '<div class="kpi-n">' + (isConsumable ? (stats.totalConsumedEver || 0) : (stats.totalMissingEver || 0)) + '</div>' +
          '<div class="kpi-l">' + (isConsumable ? 'Total consumed' : 'Lost ever') + '</div></div></div>' +
      '</div>' +

      trendSvgHtml +

      /* Audit Trail */
      '<div class="card mb12">' +
        '<div class="row row-between mb4">' +
          '<span class="muted" style="font-size:12px">Last audited (As of):</span>' +
          '<strong style="font-size:12px">' + U.fmtDate(stats.updatedAt) + '</strong>' +
        '</div>' +
        '<div class="row row-between mb4">' +
          '<span class="muted" style="font-size:12px">Added to inventory:</span>' +
          '<span style="font-size:12px">' + U.fmtDate(stats.createdAt) + '</span>' +
        '</div>' +
        (stats.lastUsedDate ? '<div class="row row-between mb4"><span class="muted" style="font-size:12px">Last gig out:</span><span style="font-size:12px">' + U.fmtDate(stats.lastUsedDate) + '</span></div>' : '') +
        '<div class="row row-between">' +
          '<span class="muted" style="font-size:12px">Saved in presets:</span>' +
          '<span style="font-size:12px">' + stats.presetsCount + ' kits</span>' +
        '</div>' +
        (it.note ? '<div class="divider"></div><p style="font-size:12px;color:var(--ink-soft)"><strong style="color:var(--ink)">Notes:</strong> ' + U.esc(it.note) + '</p>' : '') +
      '</div>' +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary" data-act="edit-item" data-id="' + it.id + '">' + U.icon('edit', 'mr4') + ' Edit item setup</button>' +
        '<button type="button" class="btn btn-ghost mt8" data-act="sheet-close">Done</button>' +
      '</div>';

    var body = U.openSheet(it.name, html, onAct);
    U.hydrateThumbs(body);

    var dFile = document.getElementById('dash-file');
    if (dFile) {
      dFile.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        U.toast('Uploading gear photo\u2026');
        App.Image.compress(f).then(function (r) {
          var pid = it.photoId || S.uid('ph-');
          it.photoId = pid;
          App.DB.set(pid, r.full);
          App.DB.set(pid + '-t', r.thumb);
          S.saveItem(it);
          U.toast('Photo updated.');
          App.rerenderQuiet();
          openStats(it.id);
        });
      });
    }
  }

  /* Item Editor: Stock Count is NOT editable when editing (managed via audits only) */
  function openEditor(id) {
    var it = id ? S.item(id) : null;
    editingId = id || null;
    pendingPhoto = null;
    selectedTagColor = it ? (it.tagColor || 'orange') : 'orange';
    selectedCategoryId = it ? (it.categoryId || '') : '';
    selectedTagStyle = it ? (it.tagStyle || 'tape') : 'tape';
    selectedIsConsumable = it ? !!it.isConsumable : false;
    var cats = S.categories();

    var typeSelectorHtml =
      '<div class="row mb8" style="gap:8px" id="type-selector">' +
        '<button type="button" class="btn grow btn-sm ' + (!selectedIsConsumable ? 'btn-primary' : 'btn-ghost') + '" id="btn-type-durable" data-act="pick-item-type" data-type="durable" style="min-height:36px;font-size:12px">' +
          U.icon('truck', 'mr4') + ' Reusable Gear' +
        '</button>' +
        '<button type="button" class="btn grow btn-sm ' + (selectedIsConsumable ? 'btn-primary' : 'btn-ghost') + '" id="btn-type-consumable" data-act="pick-item-type" data-type="consumable" style="min-height:36px;font-size:12px">' +
          U.icon('sparkles', 'mr4') + ' Consumable' +
        '</button>' +
      '</div>' +
      '<p class="muted mb12" id="type-hint" style="font-size:11.5px">' +
        (selectedIsConsumable ? 'Supplies used up on location (fuel cans, skewers, napkins). Not flagged as lost.' : 'Durable gear (chafing dishes, pots, plates). Must return 100%.') +
      '</p>';

    var catGridHtml = '<div class="cat-grid" id="cat-selector">' +
      cats.map(function (c) {
        var isSel = (selectedCategoryId === c.id);
        return '<div class="cat-card">' +
          '<button type="button" class="cat-btn' + (isSel ? ' selected' : '') + '" data-act="pick-cat-card" data-cat="' + c.id + '">' +
            U.icon(c.icon || 'plate') +
            '<span>' + U.esc(c.name) + '</span>' +
          '</button>' +
        '</div>';
      }).join('') +
      '</div>';

    var stylePickerHtml =
      '<div class="style-picker" id="style-selector">' +
        '<button type="button" class="style-opt' + (selectedTagStyle === 'tape' ? ' selected' : '') + '" data-act="pick-style-opt" data-style="tape">' +
          '<span class="tag tag-orange">Masking Tape</span>' +
        '</button>' +
        '<button type="button" class="style-opt' + (selectedTagStyle === 'stamp' ? ' selected' : '') + '" data-act="pick-style-opt" data-style="stamp">' +
          '<span class="tag tag-stamp">Rubber Stamp</span>' +
        '</button>' +
      '</div>';

    var qtySectionHtml = it ? (
      '<div class="card mb12" style="background:var(--cream);border-color:var(--line)">' +
        '<div class="row row-between">' +
          '<div>' +
            '<span style="font-size:11.5px;font-weight:700;color:var(--ink-soft);text-transform:uppercase">Current Inventory Stock</span>' +
            '<div style="font-size:16px;font-weight:700;color:var(--foliage)">' + it.qty + ' ' + U.esc(it.unit) + '</div>' +
          '</div>' +
          '<span class="muted" style="font-size:11px;text-align:right">Counts are modified via audits in Item Details</span>' +
        '</div>' +
      '</div>'
    ) : (
      '<div class="field">' +
        '<label for="f-qty">Initial Inventory Stock *</label>' +
        '<input class="input" id="f-qty" type="number" inputmode="numeric" min="0" value="1">' +
      '</div>'
    );

    var html =
      '<div class="field">' +
        '<label>Item Nature</label>' +
        typeSelectorHtml +
      '</div>' +

      '<div class="field">' +
        '<label for="f-name">Item Name *</label>' +
        '<input class="input" id="f-name" value="' + U.esc(it ? it.name : '') + '" placeholder="e.g. Chafing dish + lid">' +
      '</div>' +

      '<div class="row">' +
        '<div class="grow mr8">' +
          '<div class="field">' +
            '<label for="f-brand">Brand / Model (Shows on mark tape) *</label>' +
            '<input class="input" id="f-brand" value="' + U.esc(it ? (it.brand || '') : '') + '" placeholder="e.g. Tramontina / Coleman">' +
          '</div>' +
        '</div>' +
        '<div style="width:96px">' +
          '<div class="field">' +
            '<label for="f-unit">Unit</label>' +
            '<input class="input" id="f-unit" value="' + U.esc(it ? it.unit : 'pc') + '" placeholder="pc / set">' +
          '</div>' +
        '</div>' +
      '</div>' +

      qtySectionHtml +

      '<div class="field">' +
        '<label for="f-threshold">Low Stock Alert Threshold</label>' +
        '<input class="input" id="f-threshold" type="number" inputmode="numeric" min="0" value="' + (it ? (it.lowStockThreshold !== undefined ? it.lowStockThreshold : 2) : 2) + '" placeholder="Alert when stock falls to this count">' +
        '<span class="muted" style="font-size:11px;display:block;margin-top:2px">Triggers low-stock warnings when inventory drops to or below this quantity.</span>' +
      '</div>' +

      '<div class="field">' +
        '<label>Category</label>' +
        catGridHtml +
        '<input type="hidden" id="f-cat" value="' + selectedCategoryId + '">' +
      '</div>' +

      '<div class="divider"></div>' +

      '<div class="field">' +
        '<label for="f-tag">Secondary Marking Note (Optional)</label>' +
        '<input class="input" id="f-tag" value="' + U.esc(it ? it.tagLabel : '') + '" placeholder="e.g. Red tape on handle / L on base">' +
      '</div>' +

      '<div class="field">' +
        '<label>Mark Tape Color</label>' +
        U.swatchPicker(selectedTagColor) +
      '</div>' +

      '<div class="field">' +
        '<label>Label Presentation Style</label>' +
        stylePickerHtml +
        '<input type="hidden" id="f-style" value="' + selectedTagStyle + '">' +
      '</div>' +

      '<div class="divider"></div>' +

      '<div class="field">' +
        '<label>Gear Photo</label>' +
        '<div class="photo-box" id="f-photo" data-act="pick-photo">' +
          '<div class="photo-box-content" id="f-photo-hint">' +
            U.icon('camera') +
            '<span>Tap to snap or upload gear photo</span>' +
          '</div>' +
        '</div>' +
        '<input class="hidden-file" type="file" id="f-file" accept="image/*">' +
        '<button type="button" class="btn btn-ghost btn-sm mt8" data-act="clear-photo">' + U.icon('trash', 'mr4') + ' Remove photo</button>' +
      '</div>' +

      '<div class="field">' +
        '<label for="f-note">Condition Notes</label>' +
        '<textarea class="input" id="f-note" placeholder="e.g. Minor dent on lid, handle tightened">' + U.esc(it ? it.note : '') + '</textarea>' +
      '</div>' +

      '<div class="sheet-sticky-footer">' +
        '<button type="button" class="btn btn-primary mb8" data-act="save-item">' +
          (it ? 'Save changes' : 'Add to inventory shelf') +
        '</button>' +
        '<div class="row" style="gap:6px">' +
          (it ? '<button type="button" class="btn btn-danger grow btn-sm" data-act="del-item">' + U.icon('trash', 'mr4') + 'Delete</button>' : '') +
          '<button type="button" class="btn btn-ghost grow btn-sm" data-act="sheet-close">Cancel</button>' +
        '</div>' +
      '</div>';

    var body = U.openSheet(it ? ('Edit: ' + it.name) : 'Add New Gear', html, onAct);

    var picker = document.getElementById('swatch-picker');
    if (picker) {
      picker.addEventListener('click', function (e) {
        var circle = e.target.closest('[data-color]');
        if (!circle) return;
        selectedTagColor = circle.getAttribute('data-color');
        var all = picker.querySelectorAll('.swatch-circle');
        for (var i = 0; i < all.length; i++) {
          all[i].className = all[i].className.replace(/\bselected\b/g, '').trim();
        }
        circle.className += ' selected';
      });
    }

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
    if (hint) hint.style.display = dataUrl ? 'none' : 'flex';
  }

  function onFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    U.toast('Compressing photo for offline storage\u2026');
    App.Image.compress(f).then(function (r) {
      pendingPhoto = r;
      setPhotoPreview(r.full);
      U.toast('Photo ready (' + r.kb + ' KB)');
    }).catch(function () {
      U.toast('Could not read photo. Try again.');
    });
    e.target.value = '';
  }

  function val(id) {
    var e = document.getElementById(id);
    return e ? e.value : '';
  }

  function saveItem() {
    var name = val('f-name').trim();
    if (!name) {
      U.toast('Please name the piece of gear.');
      return;
    }
    var it = editingId ? S.item(editingId) : null;
    var thresholdVal = parseInt(val('f-threshold'), 10);
    if (isNaN(thresholdVal)) thresholdVal = selectedIsConsumable ? 6 : 2;

    var qtyVal = it ? it.qty : Math.max(0, parseInt(val('f-qty'), 10) || 0);

    var data = {
      id: editingId || undefined,
      name: name,
      brand: val('f-brand').trim(),
      qty: qtyVal,
      unit: val('f-unit').trim() || 'pc',
      isConsumable: selectedIsConsumable,
      lowStockThreshold: thresholdVal,
      categoryId: val('f-cat') || selectedCategoryId,
      tagLabel: val('f-tag').trim(),
      tagColor: selectedTagColor || 'orange',
      tagStyle: val('f-style') || selectedTagStyle || 'tape',
      note: val('f-note').trim(),
      photoId: it ? it.photoId : '',
      updatedAt: S.now()
    };

    if (pendingPhoto === 'clear') {
      if (data.photoId) {
        App.DB.del(data.photoId);
        App.DB.del(data.photoId + '-t');
      }
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
    U.toast(editingId ? 'Item updated.' : 'Added to inventory.');
    App.rerenderQuiet();
  }

  function openCats() {
    var cats = S.categories();
    var html = cats.map(function (c) {
      var n = S.items().filter(function (i) { return i.categoryId === c.id; }).length;
      return '<div class="item">' +
        '<span class="thumb">' + U.icon(c.icon || 'plate') + '</span>' +
        '<span class="grow">' +
          '<span class="item-name">' + U.esc(c.name) + '</span>' +
          '<span class="item-sub">' + n + ' item' + (n === 1 ? '' : 's') + ' assigned</span>' +
        '</span>' +
        '<button type="button" class="step-btn" data-act="del-cat" data-id="' + c.id + '" aria-label="Delete category">' +
          U.icon('close') +
        '</button>' +
        '</div>';
    }).join('');

    U.openSheet('Category Management',
      '<div class="list mb12">' +
        (html || '<div class="empty"><p class="muted">No categories created yet.</p></div>') +
      '</div>' +

      '<div class="card mb12">' +
        '<label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:6px">Create New Category</label>' +
        '<div class="row">' +
          '<div style="width:105px;margin-right:8px">' +
            '<select class="input" id="c-icon">' +
              '<option value="flame">Cooking</option>' +
              '<option value="plate" selected>Serving</option>' +
              '<option value="utensils">Utensils</option>' +
              '<option value="chair">Furniture</option>' +
              '<option value="truck">Transport</option>' +
              '<option value="sparkles">Styling</option>' +
            '</select>' +
          '</div>' +
          '<div class="grow">' +
            '<input class="input" id="c-name" placeholder="Category name">' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-primary mt8" data-act="add-cat">' + U.icon('plus', 'mr4') + ' Add category</button>' +
      '</div>' +

      '<button type="button" class="btn btn-ghost btn-sm mb8" data-act="reset-cats">' +
        U.icon('refresh', 'mr4') + ' Reset to default categories' +
      '</button>' +
      '<button type="button" class="btn btn-ghost" data-act="sheet-close">Done</button>',
      onAct
    );
  }

  function onAct(act, el) {
    if (act === 'cat') {
      cat = el.getAttribute('data-id');
      App.rerenderQuiet();
    }
    else if (act === 'change-stock') {
      var sSel = document.getElementById('inv-stock');
      if (sSel) {
        stockFilter = sSel.value;
        App.rerenderQuiet();
      }
    }
    else if (act === 'change-sort') {
      var sel = document.getElementById('inv-sort');
      if (sel) {
        sortBy = sel.value;
        App.rerenderQuiet();
      }
    }
    else if (act === 'open-stats') {
      openStats(el.getAttribute('data-id'));
    }
    else if (act === 'dash-pick-photo') {
      var df = document.getElementById('dash-file');
      if (df) df.click();
    }
    else if (act === 'stat-delta') {
      var delta = parseInt(el.getAttribute('data-delta'), 10) || 0;
      var inp = document.getElementById('stat-stock-input');
      if (inp) {
        var cur = parseInt(inp.value, 10) || 0;
        inp.value = Math.max(0, cur + delta);
      }
    }
    else if (act === 'save-stock-audit') {
      var saveId = el.getAttribute('data-id');
      var stockVal = parseInt((document.getElementById('stat-stock-input') || {}).value, 10);
      var asOfInput = (document.getElementById('stat-asof') || {}).value;
      var auditTs = asOfInput ? (new Date(asOfInput).toISOString()) : S.now();

      var it = S.item(saveId);
      if (it) {
        it.qty = Math.max(0, isNaN(stockVal) ? it.qty : stockVal);
        it.updatedAt = auditTs;
        S.save();
        U.toast('Stock count & audit date saved.');
        App.rerenderQuiet();
        openStats(saveId);
      }
    }
    else if (act === 'pick-item-type') {
      selectedIsConsumable = (el.getAttribute('data-type') === 'consumable');
      var btnDurable = document.getElementById('btn-type-durable');
      var btnConsumable = document.getElementById('btn-type-consumable');
      var hint = document.getElementById('type-hint');

      if (btnDurable && btnConsumable) {
        btnDurable.className = 'btn grow btn-sm ' + (!selectedIsConsumable ? 'btn-primary' : 'btn-ghost');
        btnConsumable.className = 'btn grow btn-sm ' + (selectedIsConsumable ? 'btn-primary' : 'btn-ghost');
      }
      if (hint) {
        hint.textContent = selectedIsConsumable
          ? 'Supplies used up on location (fuel cans, skewers, napkins). Not flagged as lost.'
          : 'Durable gear (chafing dishes, pots, plates). Must return 100%.';
      }
    }
    else if (act === 'pick-cat-card') {
      var chosenCat = el.getAttribute('data-cat');
      selectedCategoryId = chosenCat;
      var catHidden = document.getElementById('f-cat');
      if (catHidden) catHidden.value = chosenCat;

      var allCatBtns = document.querySelectorAll('#cat-selector .cat-btn');
      for (var i = 0; i < allCatBtns.length; i++) {
        allCatBtns[i].className = 'cat-btn' + (allCatBtns[i].getAttribute('data-cat') === chosenCat ? ' selected' : '');
      }
    }
    else if (act === 'pick-style-opt') {
      var chosenStyle = el.getAttribute('data-style');
      selectedTagStyle = chosenStyle;
      var styleHidden = document.getElementById('f-style');
      if (styleHidden) styleHidden.value = chosenStyle;

      var allStyles = document.querySelectorAll('#style-selector .style-opt');
      for (var j = 0; j < allStyles.length; j++) {
        allStyles[j].className = 'style-opt' + (allStyles[j].getAttribute('data-style') === chosenStyle ? ' selected' : '');
      }
    }
    else if (act === 'add-item') {
      openEditor(null);
    }
    else if (act === 'edit-item') {
      openEditor(el.getAttribute('data-id'));
    }
    else if (act === 'save-item') {
      saveItem();
    }
    else if (act === 'pick-photo') {
      var f = document.getElementById('f-file');
      if (f) f.click();
    }
    else if (act === 'clear-photo') {
      pendingPhoto = 'clear';
      setPhotoPreview('');
      U.toast('Photo removed.');
    }
    else if (act === 'del-item') {
      var delId = editingId;
      U.confirm('Delete item', 'Remove this item from inventory and all presets? Past completed event ledgers are preserved.', 'Delete', function () {
        S.removeItem(delId);
        U.closeSheet();
        U.toast('Item deleted.');
        App.rerenderQuiet();
      });
    }
    else if (act === 'manage-cats') {
      openCats();
    }
    else if (act === 'add-cat') {
      var cname = val('c-name').trim();
      if (!cname) {
        U.toast('Name the category first.');
        return;
      }
      S.saveCategory({
        name: cname,
        icon: val('c-icon') || 'plate'
      });
      openCats();
      App.rerenderQuiet();
      U.toast('Category added.');
    }
    else if (act === 'del-cat') {
      var cid = el.getAttribute('data-id');
      U.confirm('Delete category', 'Items in this category will become Uncategorised.', 'Delete', function () {
        S.removeCategory(cid);
        if (cat === cid) cat = '';
        openCats();
        App.rerenderQuiet();
        U.toast('Category removed.');
      });
    }
    else if (act === 'reset-cats') {
      U.confirm('Reset categories', 'This resets the category list back to defaults.', 'Reset', function () {
        S.resetCategoriesToDefault();
        cat = '';
        openCats();
        App.rerenderQuiet();
        U.toast('Categories restored to default.');
      });
    }
  }

  return {
    title: 'Gear shelf',
    render: render,
    mounted: mounted,
    onAct: onAct,
    openEditor: openEditor,
    openStats: openStats
  };
})();