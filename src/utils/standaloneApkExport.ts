import { BonusSettings, CustomerCardEntry } from './ledgerLogic';

/**
 * Generates a 100% self-contained, zero-dependency offline mobile app file (.html)
 * with the clean 3-column table (Category/Customer Name, Card Count, Auto Date).
 */
export function buildStandaloneOfflineAppHtml(
  entries: CustomerCardEntry[],
  settings?: Partial<BonusSettings>
): string {
  const initialDataJson = JSON.stringify({ entries, settings: settings ?? {} }).replace(
    /</g,
    '\\u003c'
  );

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <meta name="theme-color" content="#0f172a" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <title>${settings?.networkName ? settings.networkName + ' — ' : ''}سجل كروت الواي فاي</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
      padding-bottom: 48px;
    }
    .header {
      background: #0f172a;
      color: #ffffff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 20;
    }
    .header h1 { font-size: 16px; font-weight: 700; }
    .container { max-width: 1100px; margin: 0 auto; padding: 16px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
    }
    .kpi-label { font-size: 12px; color: #64748b; }
    .kpi-val { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 2px; }
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }
    .btn {
      min-height: 38px;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #0f172a;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn.active { background: #0f172a; color: #fff; border-color: #0f172a; }
    .btn-teal { background: #0f766e; color: #fff; border-color: #0f766e; }
    .table-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 18px;
    }
    .table-header {
      background: #0f172a;
      color: #fff;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 700;
    }
    .table-header span.cat { color: #2dd4bf; }
    table { width: 100%; border-collapse: collapse; text-align: right; }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 12px;
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      border-left: 1px solid #e2e8f0;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      border-left: 1px solid #e2e8f0;
      font-size: 13px;
      vertical-align: middle;
    }
    input[type="text"], input[type="number"] {
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      width: 100%;
    }
    .count-box {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .count-box input {
      width: 70px;
      text-align: center;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .mini-btn {
      min-width: 32px;
      min-height: 32px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }
    .date-cell {
      font-family: monospace;
      font-size: 12px;
      color: #0f172a;
    }
    .date-empty { color: #94a3b8; font-style: italic; font-size: 11px; }
    .toast {
      background: #134e4a;
      color: #fff;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 12px;
      font-size: 12px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>سجل كروت الواي فاي</h1>
    <button class="btn btn-teal" onclick="exportCsv()">تصدير Excel (CSV)</button>
  </div>
  <div class="container">
    <div id="toast" class="toast"></div>
    <div id="kpi" class="kpi-grid"></div>
    <div class="filter-bar">
      <button class="btn active" id="f-all" onclick="setFilter('all')">جميع الفئات (200 · 300 · 500)</button>
      <button class="btn" id="f-200" onclick="setFilter(200)">فئة 200</button>
      <button class="btn" id="f-300" onclick="setFilter(300)">فئة 300</button>
      <button class="btn" id="f-500" onclick="setFilter(500)">فئة 500</button>
    </div>
    <div id="tables-root"></div>
  </div>
  <script>
    const STORAGE_KEY = 'wifi_cards_standalone_data_v1';
    const SEED = ${initialDataJson};
    let state = SEED;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = JSON.parse(saved);
    } catch (e) {}
    let currentFilter = 'all';

    function save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    function normalizeDigits(str) {
      const ar = '٠١٢٣٤٥٦٧٨٩';
      return String(str).replace(/[٠-٩]/g, d => String(ar.indexOf(d)));
    }

    function formatNow() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      let h = d.getHours();
      const min = String(d.getMinutes()).padStart(2, '0');
      const p = h >= 12 ? 'م' : 'ص';
      h = h % 12 || 12;
      return y + '/' + m + '/' + day + ' · ' + String(h).padStart(2, '0') + ':' + min + ' ' + p;
    }

    function showToast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.style.display = 'block';
      clearTimeout(window.__t);
      window.__t = setTimeout(() => { el.style.display = 'none'; }, 2600);
    }

    function setFilter(f) {
      currentFilter = f;
      ['all', 200, 300, 500].forEach(k => {
        const b = document.getElementById('f-' + k);
        if (b) b.className = 'btn' + (k === f ? ' active' : '');
      });
      render();
    }

    function updateName(id, val) {
      const item = state.entries.find(e => e.id === id);
      if (item) { item.customerName = val; save(); }
    }

    function updateCount(id, rawVal) {
      const item = state.entries.find(e => e.id === id);
      if (!item) return;
      const clean = normalizeDigits(rawVal).trim();
      if (clean === '') {
        item.cardCount = null;
        item.entryDate = '';
      } else {
        const num = Math.max(0, parseInt(clean, 10) || 0);
        item.cardCount = num;
        item.entryDate = formatNow();
        showToast('تم إدخال العدد (' + num + ') للعميل "' + item.customerName + '" وكتابة التاريخ تلقائياً: ' + item.entryDate);
      }
      save();
      render();
    }

    function deleteRow(id) {
      state.entries = state.entries.filter(e => e.id !== id);
      save();
      render();
    }

    function addRow(cat) {
      const nameInput = document.getElementById('new-name-' + cat);
      const countInput = document.getElementById('new-count-' + cat);
      const name = (nameInput.value || '').trim();
      if (!name) return;
      const rawCount = normalizeDigits(countInput.value || '').trim();
      const hasCount = rawCount !== '' && !isNaN(parseInt(rawCount, 10));
      const countVal = hasCount ? Math.max(0, parseInt(rawCount, 10)) : null;
      const autoDate = hasCount ? formatNow() : '';
      state.entries.unshift({
        id: 'row-' + Date.now(),
        category: cat,
        customerName: name,
        cardCount: countVal,
        entryDate: autoDate,
        bonusesClaimed: 0,
        history: []
      });
      save();
      if (hasCount) {
        showToast('تمت إضافة "' + name + '" وكتابة التاريخ تلقائياً: ' + autoDate);
      }
      render();
    }

    function exportCsv() {
      const cats = [200, 300, 500];
      const sections = cats.map(cat => {
        const list = state.entries.filter(e => e.category === cat);
        const total = list.reduce((s, e) => s + (e.cardCount || 0), 0);
        const lines = [
          '"جدول كروت فئة ' + cat + '",,,',
          ['م','اسم العميل (فئة ' + cat + ')','عدد الكروت','تاريخ إدخال العدد'].join(',')
        ];
        if (list.length === 0) {
          lines.push(',"لا يوجد عملاء في هذه الفئة",,');
        } else {
          list.forEach((e, idx) => {
            lines.push([
              idx + 1,
              '"' + (e.customerName || '').replace(/"/g, '""') + '"',
              e.cardCount === null ? '' : e.cardCount,
              '"' + (e.entryDate || '') + '"'
            ].join(','));
          });
        }
        lines.push(['"الإجمالي"','"' + list.length + ' عميل"',total,'"القيمة: ' + (total * cat).toLocaleString('en-US') + ' ريال"'].join(','));
        return lines.join('\\n');
      });
      const csv = '\\uFEFF' + sections.join('\\n\\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'سجل-كروت-الواي-فاي.csv';
      a.click();
    }

    function render() {
      const cats = [200, 300, 500];
      const byCat = { 200: 0, 300: 0, 500: 0 };
      let totalCards = 0;
      state.entries.forEach(e => {
        const c = e.cardCount || 0;
        byCat[e.category] = (byCat[e.category] || 0) + c;
        totalCards += c;
      });

      document.getElementById('kpi').innerHTML =
        '<div class="kpi-card"><div class="kpi-label">كروت فئة 200</div><div class="kpi-val">' + byCat[200] + '</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">كروت فئة 300</div><div class="kpi-val">' + byCat[300] + '</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">كروت فئة 500</div><div class="kpi-val">' + byCat[500] + '</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">إجمالي الكروت الكلي</div><div class="kpi-val" style="color:#0f766e">' + totalCards + '</div></div>';

      const visibleCats = currentFilter === 'all' ? cats : [currentFilter];
      let html = '';
      visibleCats.forEach(cat => {
        const list = state.entries.filter(e => e.category === cat);
        html += '<div class="table-card">' +
          '<div class="table-header"><div>جدول كروت فئة <span class="cat">' + cat + '</span> (' + list.length + ' عميل)</div><div>إجمالي الكروت: ' + byCat[cat] + '</div></div>' +
          '<table><thead><tr>' +
          '<th style="width:42%">العمود الأول: فئة (' + cat + ') / اسم العميل</th>' +
          '<th style="width:24%">العمود الثاني: عدد الكروت</th>' +
          '<th style="width:34%">العمود الثالث: التاريخ (تلقائي عند إدخال العدد)</th>' +
          '</tr></thead><tbody>';

        list.forEach(e => {
          html += '<tr>' +
            '<td><input type="text" value="' + (e.customerName || '').replace(/"/g, '&quot;') + '" onchange="updateName(\\'' + e.id + '\\', this.value)" />' +
            '<div style="font-size:11px;color:#64748b;margin-top:3px">فئة ' + cat + '</div></td>' +
            '<td><div class="count-box">' +
            '<input type="text" inputmode="numeric" placeholder="أدخل العدد" value="' + (e.cardCount === null ? '' : e.cardCount) + '" onchange="updateCount(\\'' + e.id + '\\', this.value)" />' +
            '</div></td>' +
            '<td><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap">' +
            (e.entryDate ? '<span class="date-cell">' + e.entryDate + '</span>' : '<span class="date-empty">يُكتب تلقائياً عند إدخال العدد</span>') +
            '<button class="mini-btn" style="color:#dc2626" onclick="deleteRow(\\'' + e.id + '\\')">×</button>' +
            '</div></td></tr>';
        });

        html += '<tr style="background:#f8fafc">' +
          '<td><input type="text" id="new-name-' + cat + '" placeholder="+ اسم عميل جديد في فئة ' + cat + '..." /></td>' +
          '<td><input type="text" inputmode="numeric" id="new-count-' + cat + '" placeholder="العدد (اختياري)" /></td>' +
          '<td><button class="btn active" onclick="addRow(' + cat + ')">+ إدراج بالجدول</button></td>' +
          '</tr></tbody></table></div>';
      });
      document.getElementById('tables-root').innerHTML = html;
    }

    render();
  </script>
</body>
</html>`;
}
