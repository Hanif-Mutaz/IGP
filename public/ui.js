// ============================================================
// UI — Navigation, Toast, Modal, Core Renders
// ============================================================

// ---- GLOBAL DATE UTIL (shared across all render functions) ----
const _BULAN_MAP = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11 };
function parseTglShortGlobal(s) {
  if (!s) return null;
  const p = s.split(' ');
  if (p.length < 3) return null;
  const m = _BULAN_MAP[p[1]];
  if (m === undefined) return null;
  return new Date(parseInt(p[2]), m, parseInt(p[0]));
}

// ---- SEARCHABLE SELECT WIDGET ----------------------------------------
// Membungkus <select> biasa dengan dropdown pencarian custom
// Panggil: makeSearchableSelect(selectEl)
function makeSearchableSelect(selectEl) {
  if (!selectEl || selectEl.dataset.searchable === '1') return;
  selectEl.dataset.searchable = '1';
  selectEl.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:100%';

  const display = document.createElement('div');
  display.className = 'input';
  display.style.cssText = 'cursor:pointer;display:flex;justify-content:space-between;align-items:center;user-select:none';
  const getSelectedText = () => {
    const opt = selectEl.options[selectEl.selectedIndex];
    return opt ? opt.text : '— Pilih —';
  };
  display.innerHTML = `<span class="ss-label">${getSelectedText()}</span><span style="color:var(--text4);font-size:11px">▾</span>`;

  const dropdown = document.createElement('div');
  dropdown.style.cssText = 'display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;background:var(--bg2);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);max-height:260px;overflow:hidden;margin-top:2px';

  const searchInput = document.createElement('input');
  searchInput.className = 'input';
  searchInput.placeholder = 'Cari...';
  searchInput.style.cssText = 'border-radius:6px 6px 0 0;border-bottom:1px solid var(--border);width:100%;font-size:12px';

  const optList = document.createElement('div');
  optList.style.cssText = 'overflow-y:auto;max-height:210px';

  dropdown.appendChild(searchInput);
  dropdown.appendChild(optList);

  function renderOpts(filter) {
    const q = (filter || '').toLowerCase();
    optList.innerHTML = '';
    Array.from(selectEl.options).forEach(opt => {
      if (q && !opt.text.toLowerCase().includes(q)) return;
      const item = document.createElement('div');
      item.textContent = opt.text;
      item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:13px;color:var(--text2)';
      if (opt.value === selectEl.value) item.style.background = 'var(--bg5)';
      item.addEventListener('mouseenter', () => item.style.background = 'var(--bg5)');
      item.addEventListener('mouseleave', () => item.style.background = opt.value === selectEl.value ? 'var(--bg5)' : '');
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        display.querySelector('.ss-label').textContent = opt.text;
        dropdown.style.display = 'none';
        searchInput.value = '';
        renderOpts('');
      });
      optList.appendChild(item);
    });
    if (!optList.children.length) {
      optList.innerHTML = '<div style="padding:8px 12px;font-size:12px;color:var(--text4)">Tidak ada hasil</div>';
    }
  }

  display.addEventListener('click', () => {
    const open = dropdown.style.display !== 'none';
    dropdown.style.display = open ? 'none' : 'block';
    if (!open) { searchInput.value = ''; renderOpts(''); setTimeout(() => searchInput.focus(), 50); }
  });

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) dropdown.style.display = 'none';
  }, true);

  searchInput.addEventListener('input', () => renderOpts(searchInput.value));

  // Sync label ketika select berubah dari luar
  const origOnChange = selectEl.onchange;
  const obs = new MutationObserver(() => {
    display.querySelector('.ss-label').textContent = getSelectedText();
    renderOpts(searchInput.value);
  });
  obs.observe(selectEl, { attributes: true, childList: true, subtree: true });

  renderOpts('');
  wrapper.appendChild(display);
  wrapper.appendChild(dropdown);
  selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
}

// ---- LIST SEARCH FILTER -----------------------------------------------
// Tambah search box di atas list item (konsumen, PO, entitas)
function addListSearch(containerId, listSelector, getTextFn) {
  const cont = document.getElementById(containerId);
  if (!cont || cont.querySelector('.list-search-box')) return;
  const box = document.createElement('input');
  box.className = 'input list-search-box';
  box.placeholder = '🔍 Cari...';
  box.style.cssText = 'width:100%;margin-bottom:8px;font-size:12px';
  box.addEventListener('input', () => {
    const q = box.value.toLowerCase();
    cont.querySelectorAll(listSelector).forEach(item => {
      const txt = getTextFn ? getTextFn(item) : item.textContent;
      item.style.display = (!q || txt.toLowerCase().includes(q)) ? '' : 'none';
    });
  });
  cont.insertBefore(box, cont.firstChild);
}


// ---- NAVIGATION ----
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', inventory: 'Inventory', konsumen: 'Konsumen',
    transaksi: 'Transaksi (PO)', 'buat-po': 'Buat PO baru',
    entitas: 'Entitas', laporan: 'Laporan', settings: 'Settings'
  };
  const navMap = {
    dashboard: 'dashboard', inventory: 'inventory', konsumen: 'konsumen',
    transaksi: 'transaksi', 'buat-po': 'transaksi', entitas: 'entitas',
    laporan: 'laporan', settings: 'settings'
  };

  document.getElementById('page-title').textContent = titles[page] || page;
  document.getElementById('page-breadcrumb').textContent = page === 'buat-po' ? '/ Transaksi (PO)' : '';

  const navTarget = navMap[page] || page;
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.dataset.page === navTarget) n.classList.add('active');
  });

  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = '';
  if (page === 'inventory') {
    actions.innerHTML = `
      <button class="btn" onclick="openModal('modal-retur')">Catat retur</button>
      <button class="btn btn-danger" style="background:#1a1200;border-color:#412402;color:#FAC775" onclick="openLossModal()">&#9888; Catat Loss</button>
      <button class="btn" onclick="openBuatBundle()">📦 Buat Bundle</button>
      <button class="btn btn-primary" onclick="openModal('modal-barang-masuk')">+ Barang masuk</button>`;
  } else if (page === 'buat-po') {
    actions.innerHTML = `<button class="btn" onclick="navigate('transaksi')">← Kembali</button>`;
  } else if (page === 'konsumen') {
    actions.innerHTML = `<button class="btn btn-primary" onclick="openModal('modal-konsumen')">+ Tambah Konsumen</button>`;
  } else if (page === 'trip') {
    actions.innerHTML = `<button class="btn btn-primary" onclick="openTripModal()">+ Catat Trip</button>`;
  }

  // Sync logo sidebar setiap navigasi
  if (typeof syncSidebarLogo === 'function') syncSidebarLogo();

  if (page === 'dashboard') renderDashboard();
  if (page === 'inventory') renderInventory();
  if (page === 'konsumen') { renderKonsumenList(); if (DB.selectedKonsumen) renderKonsumenDetail(DB.selectedKonsumen); }
  if (page === 'transaksi') { renderPOList(); renderPODetail(DB.selectedPO); }
  if (page === 'entitas') {
    if (!DB.currentEntitasTab) DB.currentEntitasTab = 'Sales';
    // Sync active tab UI
    document.querySelectorAll('[data-ent-tab]').forEach(t => {
      t.classList.toggle('active', t.dataset.entTab === DB.currentEntitasTab);
    });
    renderEntitasList(); renderEntitasDetail(DB.selectedEntitas);
  }
  if (page === 'trip') renderTripPage();
  if (page === 'laporan') renderLaporan();
  if (page === 'buat-po') initBuatPO();
  if (page === 'settings') renderSettings();
}

// ============================================================
// DASHBOARD — dihitung real-time dari DB
// ============================================================
function renderDashboard() {
  if (!DB.poList) DB.poList = [];
  if (!DB.entitas) DB.entitas = [];
  if (!DB.konsumen) DB.konsumen = [];
  if (!DB.tripList) DB.tripList = [];
  if (!DB.returList) DB.returList = [];
  if (!DB.riwayatMasuk) DB.riwayatMasuk = [];
  if (!DB.inventory) DB.inventory = [];
  if (!DB.settings) DB.settings = {};

  const container = document.getElementById('dashboard-container');
  if (!container) return;

  const today = new Date();
  const tglStr = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const bulanIni = today.getMonth();
  const tahunIni = today.getFullYear();

  // ── Data dasar ─────────────────────────────────────────────
  const poAktif = DB.poList.filter(p => p.status !== 'lunas' && p.status !== 'retur');
  // Hitung outstanding dari cicilan aktual (bukan p.sisa yang bisa stale)
  const totalOutstanding = poAktif.reduce((s, p) =>
    s + (p.cicilan || []).filter(c => c.status !== 'batal' && c.status !== 'lunas')
      .reduce((a, c) => a + (c.tagihan - (c.terbayar || 0)), 0), 0);
  const totalNilai = DB.poList.reduce((s, p) => s + p.total, 0);
  const totalTerbayar = DB.poList.reduce((s, p) =>
    s + (p.cicilan || []).filter(c => c.status === 'lunas').reduce((a, c) => a + c.tagihan, 0), 0);

  // Stok
  const stokGood = DB.inventory.filter(i => i.kondisi === 'good').reduce((s, i) => s + i.stok, 0);
  const stokReject = DB.inventory.filter(i => i.kondisi === 'reject').reduce((s, i) => s + i.stok, 0);
  const itemKritis = DB.inventory.filter(i => i.stok < 20 && i.kondisi === 'good').length;

  // Barang hilang & kembali bulan ini (dari lossLog semua PO)
  let unitHilangBulan = 0, unitKembaliBulan = 0, unitKembaliRejectBulan = 0;
  DB.poList.forEach(p => {
    (p.lossLog || []).forEach(l => {
      const parts = (l.tanggal || '').split(' ');
      if (parts.length >= 3 && parseInt(parts[2]) === tahunIni && (_BULAN_MAP[parts[1]] ?? -1) === bulanIni) {
        (l.items || []).forEach(item => {
          unitHilangBulan += item.netLoss || 0;
          // Support field baru (kembaliTotal) dan field lama (kembali) 
          const kembaliQty = item.kembaliTotal ?? item.kembali ?? 0;
          unitKembaliBulan += kembaliQty;
          const isReject = item.kembaliReject > 0 || (item.kondisiKembali || '') === 'reject';
          if (isReject) unitKembaliRejectBulan += item.kembaliReject ?? kembaliQty;
        });
      }
    });
  });
  // Retur bundle bulan ini
  const returBulanIni = (DB.returList || []).filter(r => {
    const parts = (r.tanggal || '').split(' ');
    return parts.length >= 3 && parseInt(parts[2]) === tahunIni && (_BULAN_MAP[parts[1]] ?? -1) === bulanIni;
  });
  const returBundleBulan = returBulanIni.reduce((s, r) => s + (r.jumlah || 0), 0);

  // Komisi karyawan: hanya yang BELUM dicairkan (outstanding)
  const komisiKaryawan = DB.entitas.reduce((s, e) => s + Math.max(0, (e.komisiKotor || 0) - (e.komisiDibayar || 0)), 0);
  // Komisi konsumen: total yang harus dibayar ke semua konsumen saat lunas (belum dicairkan)
  const komisiKonsumen = DB.konsumen.reduce((s, k) => s + Math.max(0, (k.komisiKotor || 0) - (k.komisiDibayar || 0)), 0);
  // Pengeluaran operasional karyawan (loss, souvenir, operasional trip, dll)
  const totalPengeluaranOps = DB.entitas.reduce((s, e) => s + (e.pengeluaran || 0), 0);
  // Margin perusahaan = uang masuk - total komisi kotor - pengeluaran operasional
  const totalKomisiKotorAll = DB.entitas.reduce((s, e) => s + (e.komisiKotor || 0), 0)
    + DB.konsumen.reduce((s, k) => s + (k.komisiKotor || 0), 0);
  const totalKomisiKeluar = komisiKaryawan + komisiKonsumen; // outstanding untuk dashboard card
  const marginPerusahaan = totalTerbayar - totalKomisiKotorAll - totalPengeluaranOps;
  const komisiBersih = marginPerusahaan;

  // ── Cicilan jatuh tempo ────────────────────────────────────
  const cicilanTelat = [], cicilanHariIni = [], cicilanMendatang = [];
  DB.poList.filter(p => p.status !== 'lunas' && p.status !== 'retur').forEach(p => {
    (p.cicilan || []).forEach(c => {
      if (c.status === 'lunas' || c.status === 'batal') return;
      const tgl = parseTglShortGlobal(c.jatuh);
      if (!tgl) return;
      const diff = Math.round((tgl - today) / 86400000);
      if (diff < 0) cicilanTelat.push({ ...c, poId: p.id, konsumen: p.konsumen, diff });
      else if (diff === 0) cicilanHariIni.push({ ...c, poId: p.id, konsumen: p.konsumen, diff });
      else if (diff <= 7) cicilanMendatang.push({ ...c, poId: p.id, konsumen: p.konsumen, diff });
    });
  });
  const allUpcoming = [...cicilanTelat, ...cicilanHariIni, ...cicilanMendatang]
    .sort((a, b) => a.diff - b.diff).slice(0, 8);

  // ── Chart penjualan: 8 minggu terakhir + 12 bulan ─────────
  const weekData = [];
  for (let w = 7; w >= 0; w--) {
    const wStart = new Date(today); wStart.setDate(today.getDate() - w * 7 - today.getDay());
    const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
    const label = `${wStart.getDate()}/${wStart.getMonth() + 1}`;
    let bundle = 0, masuk = 0;
    DB.poList.forEach(p => {
      const tgl = parseTglShortGlobal(p.tanggal);
      if (!tgl || tgl < wStart || tgl > wEnd) return;
      bundle += p.bundle;
      masuk += p.cicilan.filter(c => c.status === 'lunas').reduce((a, c) => a + c.tagihan, 0);
    });
    weekData.push({ label, bundle, masuk });
  }

  // Per bulan: 12 bulan terakhir
  const bNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthData = [];
  for (let m = 11; m >= 0; m--) {
    const tgt = new Date(tahunIni, bulanIni - m, 1);
    const bIdx = tgt.getMonth(); const yr = tgt.getFullYear();
    const label = bNames[bIdx] + "'" + String(yr).slice(2);
    let bundle = 0, masuk = 0;
    DB.poList.forEach(p => {
      const d = p.tanggal ? p.tanggal.split(' ') : null;
      if (d && d.length >= 3 && parseInt(d[2]) === yr && (_BULAN_MAP[d[1]] ?? -1) === bIdx) {
        bundle += p.bundle;
      }
      (p.cicilan || []).forEach(c => {
        if (c.status !== 'lunas') return;
        const dc = c.tglBayar ? c.tglBayar.split('-') : (c.jatuh ? c.jatuh.split(' ') : null);
        if (!dc) return;
        // Support both ISO date (tglBayar: YYYY-MM-DD) and short format (jatuh: DD Mon YYYY)
        let cYr, cBln;
        if (dc.length === 3 && dc[0].length === 4) { cYr = parseInt(dc[0]); cBln = parseInt(dc[1]) - 1; }
        else if (dc.length === 3) { cYr = parseInt(dc[2]); cBln = _BULAN_MAP[dc[1]] ?? -1; }
        else return;
        if (cYr === yr && cBln === bIdx) masuk += c.tagihan;
      });
    });
    monthData.push({ label, bundle, masuk });
  }

  // ── Notifikasi ─────────────────────────────────────────────
  const notifItems = [];
  cicilanTelat.forEach(c => notifItems.push({ type: 'error', text: `<strong>${c.konsumen}</strong> — ${c.poId} termin ${c.n} telat ${Math.abs(c.diff)} hari · ${fmtRpFull(c.tagihan)}` }));
  cicilanHariIni.forEach(c => notifItems.push({ type: 'warn', text: `<strong>${c.konsumen}</strong> — ${c.poId} termin ${c.n} jatuh tempo hari ini · ${fmtRpFull(c.tagihan)}` }));
  cicilanMendatang.slice(0, 2).forEach(c => notifItems.push({ type: 'info', text: `<strong>${c.konsumen}</strong> — ${c.poId} termin ${c.n} H-${c.diff} · ${fmtRpFull(c.tagihan)}` }));
  DB.inventory.filter(i => i.stok < 20 && i.kondisi === 'good').forEach(i =>
    notifItems.push({ type: 'error', text: `<strong>Stok ${i.nama}</strong> menipis — sisa ${i.stok} unit` }));
  const notifHtml = notifItems.length
    ? notifItems.map(n => {
      const dot = n.type === 'error' ? '#E24B4A' : n.type === 'warn' ? '#FAC775' : '#5F5E5A';
      return `<div class="notif-row"><div class="notif-dot2" style="background:${dot}"></div><div class="notif-text">${n.text}</div></div>`;
    }).join('')
    : '<div style="color:var(--text4);font-size:13px;padding:10px 0">Tidak ada notifikasi aktif ✓</div>';

  // ── Cicilan jatuh tempo rows ───────────────────────────────
  const upcomingRows = allUpcoming.length ? allUpcoming.map((c, idx) => {
    const last = idx === allUpcoming.length - 1;
    const badge = c.diff < 0 ? `<span class="badge badge-late">H+${Math.abs(c.diff)} telat</span>`
      : c.diff === 0 ? `<span class="badge badge-late">Hari H</span>`
        : `<span class="badge badge-warn">H-${c.diff}</span>`;
    return `<div style="${last ? '' : 'border-bottom:0.5px solid var(--border2);'}padding:9px 0;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="selectPO('${c.poId}');navigate('transaksi')">
      <div>
        <div style="font-size:13px;color:var(--text2)">${c.konsumen}</div>
        <div style="font-size:11px;color:var(--text4)"><span style="color:#AFA9EC;text-decoration:underline dotted">${c.poId}</span> · Termin ${c.n} · ${fmtRpFull(c.tagihan)}</div>
      </div>${badge}
    </div>`;
  }).join('') : '<div style="color:var(--text4);font-size:13px;padding:12px 0">Tidak ada cicilan dalam 7 hari ke depan 🎉</div>';

  const collectionPct = totalNilai > 0 ? Math.round((totalTerbayar / totalNilai) * 100) : 0;
  const outstandingPct = totalNilai > 0 ? Math.round((totalOutstanding / totalNilai) * 100) : 0;

  container.innerHTML = `
    <div style="font-size:12px;color:var(--text4);margin-bottom:16px">${tglStr}</div>

    <!-- ROW 1: 6 stat cards utama -->
    <div class="stat-grid-4" style="margin-bottom:10px">
      <div class="stat-card">
        <div class="stat-label">Outstanding</div>
        <div class="stat-val" style="color:#F09595">${fmtRp(totalOutstanding)}</div>
        <div class="stat-sub">${poAktif.length} PO aktif</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Margin perusahaan</div>
        <div class="stat-val" style="color:${komisiBersih >= 0 ? '#5DCAA5' : '#F09595'}">${fmtRp(Math.abs(komisiBersih))}</div>
        <div class="stat-sub">${komisiBersih < 0 ? 'defisit ' : ''} masuk ${fmtRp(totalTerbayar)} &minus; komisi ${fmtRp(totalKomisiKotorAll)} &minus; ops ${fmtRp(totalPengeluaranOps)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Stok barang (good)</div>
        <div class="stat-val">${stokGood} unit</div>
        <div class="stat-sub" style="color:${itemKritis > 0 ? '#F09595' : '#5F5E5A'}">${itemKritis > 0 ? itemKritis + ' item kritis' : 'Semua aman'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Stok not good</div>
        <div class="stat-val" style="color:${stokReject > 0 ? '#FAC775' : 'var(--text4)'}">${stokReject} unit</div>
        <div class="stat-sub">${unitKembaliRejectBulan > 0 ? unitKembaliRejectBulan + ' dari loss bulan ini' : DB.inventory.filter(i => i.kondisi === 'reject').length + ' jenis barang'}</div>
      </div>
    </div>
    <div class="stat-grid-4" style="margin-bottom:14px">
      <div class="stat-card">
        <div class="stat-label">PO aktif</div>
        <div class="stat-val">${poAktif.length}</div>
        <div class="stat-sub">${DB.poList.filter(p => p.status === 'lunas').length} sudah lunas</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cicilan jatuh tempo</div>
        <div class="stat-val" style="color:${cicilanTelat.length > 0 ? '#F09595' : cicilanHariIni.length > 0 ? '#FAC775' : 'var(--text)'}">
          ${cicilanHariIni.length + cicilanMendatang.length}
        </div>
        <div class="stat-sub" style="color:${cicilanTelat.length > 0 ? '#E24B4A' : '#5F5E5A'}">${cicilanTelat.length > 0 ? cicilanTelat.length + ' sudah telat' : 'Dalam 7 hari'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Komisi outstanding</div>
        <div class="stat-val" style="color:#FAC775">${fmtRp(totalKomisiKeluar)}</div>
        <div class="stat-sub">belum dibayar ke entitas &amp; konsumen</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total nilai PO</div>
        <div class="stat-val">${fmtRp(totalNilai)}</div>
        <div class="stat-sub">${DB.poList.length} PO total</div>
      </div>
    </div>
    <div class="stat-grid-4" style="margin-bottom:14px">
      <div class="stat-card">
        <div class="stat-label">Barang hilang (bulan ini)</div>
        <div class="stat-val" style="color:${unitHilangBulan > 0 ? '#F09595' : 'var(--text4)'}">${unitHilangBulan} unit</div>
        <div class="stat-sub">net loss permanen</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Barang kembali (bulan ini)</div>
        <div class="stat-val" style="color:${unitKembaliBulan > 0 ? '#5DCAA5' : 'var(--text4)'}">${unitKembaliBulan} unit</div>
        <div class="stat-sub">recovery dari loss</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Retur bundle (bulan ini)</div>
        <div class="stat-val" style="color:${returBundleBulan > 0 ? '#FAC775' : 'var(--text4)'}">${returBundleBulan} bundle</div>
        <div class="stat-sub">${returBulanIni.length} PO diretur</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cicilan kurang bayar</div>
        <div class="stat-val" style="color:#FAC775">${DB.poList.reduce((s, p) => s + (p.cicilan || []).filter(c => c.status === 'kurang').length, 0)}</div>
        <div class="stat-sub">termin belum penuh</div>
      </div>
    </div>

    <!-- ROW 2: Chart penjualan -->
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="card-title" style="margin-bottom:0">Tracking Penjualan</div>
        <div style="display:flex;gap:6px">
          <button class="btn active" id="chart-btn-minggu" onclick="dashChartMode('minggu')" style="padding:3px 12px;font-size:11px">Per Pekan</button>
          <button class="btn" id="chart-btn-bulan" onclick="dashChartMode('bulan')" style="padding:3px 12px;font-size:11px">Per Bulan</button>
        </div>
      </div>
      <div id="dash-chart-wrap" style="width:100%;overflow-x:auto">
        <div id="dash-chart" style="min-width:600px;height:160px;display:flex;align-items:flex-end;gap:4px;padding-bottom:20px;position:relative"></div>
      </div>
      <div style="display:flex;gap:16px;margin-top:4px;font-size:11px;color:var(--text4)">
        <span><span style="display:inline-block;width:10px;height:10px;background:#1D9E75;border-radius:2px;margin-right:4px"></span>Bundle terjual</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#5B90C8;border-radius:2px;margin-right:4px"></span>Uang masuk</span>
      </div>
    </div>

    <!-- ROW 3: Cicilan jatuh tempo -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Cicilan jatuh tempo (7 hari)</div>
      ${upcomingRows}
    </div>

    <!-- ROW 4: Notifikasi -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Notifikasi aktif (${notifItems.length})</div>
      ${notifHtml}
    </div>

    <!-- ROW 5: Collection Rate - paling bawah -->
    <div class="card">
      <div class="card-title">Collection Rate</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text4);margin-bottom:5px">
              <span>Terbayar dari total PO</span>
              <span style="color:#5DCAA5;font-weight:500">${collectionPct}% &middot; ${fmtRp(totalTerbayar)}</span>
            </div>
            <div style="height:8px;background:var(--bg4);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${collectionPct}%;background:#1D9E75;border-radius:4px;transition:width .4s"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text4);margin-bottom:5px">
              <span>Sisa outstanding</span>
              <span style="color:${totalOutstanding > 0 ? '#F09595' : '#5DCAA5'};font-weight:500">${outstandingPct}% &middot; ${fmtRp(totalOutstanding)}</span>
            </div>
            <div style="height:8px;background:var(--bg4);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${outstandingPct}%;background:#A32D2D;border-radius:4px;transition:width .4s"></div>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start">
          <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:var(--text4);margin-bottom:4px">Total nilai PO</div>
            <div style="font-size:15px;font-weight:600;color:var(--text)">${fmtRp(totalNilai)}</div>
          </div>
          <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:var(--text4);margin-bottom:4px">Sudah terbayar</div>
            <div style="font-size:15px;font-weight:600;color:#5DCAA5">${fmtRp(totalTerbayar)}</div>
          </div>
          <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:var(--text4);margin-bottom:4px">Cicilan terlambat</div>
            <div style="font-size:15px;font-weight:600;color:${cicilanTelat.length > 0 ? '#F09595' : 'var(--text4)'}">
              ${cicilanTelat.length} termin
            </div>
          </div>
          <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:var(--text4);margin-bottom:4px">Kurang bayar</div>
            <div style="font-size:15px;font-weight:600;color:#FAC775">
              ${DB.poList.reduce((s, p) => s + (p.cicilan || []).filter(c => c.status === 'kurang').length, 0)} termin
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // ── Render chart ────────────────────────────────────────────
  window._dashWeekData = weekData;
  window._dashMonthData = monthData;
  dashChartMode('minggu');
}

function dashChartMode(mode) {
  const data = mode === 'minggu' ? window._dashWeekData : window._dashMonthData;
  if (!data) return;

  // Toggle button active
  const btnM = document.getElementById('chart-btn-minggu');
  const btnB = document.getElementById('chart-btn-bulan');
  if (btnM) btnM.classList.toggle('active', mode === 'minggu');
  if (btnB) btnB.classList.toggle('active', mode === 'bulan');

  const chart = document.getElementById('dash-chart');
  if (!chart) return;

  const maxBundle = Math.max(...data.map(d => d.bundle), 1);
  const maxMasuk = Math.max(...data.map(d => d.masuk), 1);
  const maxH = 130; // px

  chart.innerHTML = data.map((d, i) => {
    const hBundle = d.bundle > 0 ? Math.max(Math.round((d.bundle / maxBundle) * maxH), 4) : 0;
    const hMasuk = d.masuk > 0 ? Math.max(Math.round((d.masuk / maxMasuk) * maxH), 4) : 0;
    const isLast = i === data.length - 1;
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:${mode === 'bulan' ? '52' : '44'}px">
        <div style="font-size:9px;color:var(--text4);margin-bottom:2px;white-space:nowrap">
          ${d.bundle > 0 ? d.bundle + 'b' : ''}
        </div>
        <div style="display:flex;gap:2px;align-items:flex-end;height:${maxH}px">
          <div style="width:10px;height:${hBundle}px;background:${isLast ? '#1D9E75' : '#0F6E56'};border-radius:2px 2px 0 0;transition:height .3s" title="${d.bundle} bundle"></div>
          <div style="width:10px;height:${hMasuk}px;background:${isLast ? '#5B90C8' : '#2a5a8a'};border-radius:2px 2px 0 0;transition:height .3s" title="${fmtRpFull(d.masuk)}"></div>
        </div>
        <div style="font-size:9px;color:var(--text4);margin-top:4px;white-space:nowrap">${d.label}</div>
      </div>`;
  }).join('');
}


function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = type === 'error' ? '#A32D2D' : type === 'warn' ? '#854F0B' : '#1D9E75';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ---- MODAL ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; el.dataset.dirty = '0'; }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // Cek apakah ada input/textarea/select yang sudah diisi
  const isDirty = el.dataset.dirty === '1' || Array.from(el.querySelectorAll('input,textarea,select')).some(inp => {
    if (inp.type === 'hidden') return false;
    if (inp.readOnly) return false;
    return inp.value && inp.value.trim() !== '' && inp.defaultValue !== inp.value;
  });
  if (isDirty) {
    if (!confirm('Data yang sudah diisi akan hilang. Tutup modal?')) return;
  }
  el.style.display = 'none';
  el.dataset.dirty = '0';
}

// Tandai modal dirty saat ada perubahan input
document.addEventListener('input', e => {
  const modal = e.target.closest('.modal-overlay');
  if (modal) modal.dataset.dirty = '1';
});
document.addEventListener('change', e => {
  const modal = e.target.closest('.modal-overlay');
  if (modal) modal.dataset.dirty = '1';
});

// ============================================================
// INVENTORY
// ============================================================
function renderInventory() {
  const tab = document.querySelector('[data-inv-tab].tab.active')?.dataset.invTab || 'semua';
  const search = (document.getElementById('inv-search')?.value || '').toLowerCase();
  const kondisi = document.getElementById('inv-kondisi')?.value || '';
  const kategori = document.getElementById('inv-kategori')?.value || '';

  const mainWrap = document.getElementById('inv-tbody')?.closest('.tbl-wrap');
  const filterBar = document.getElementById('inv-filter-bar');
  const riwayatSec = document.getElementById('inv-riwayat-section');
  const returSec = document.getElementById('inv-retur-section');
  const bundleSec = document.getElementById('inv-bundle-section');

  // Sembunyikan semua section dulu
  if (mainWrap) mainWrap.style.display = 'none';
  if (filterBar) filterBar.style.display = 'none';
  if (riwayatSec) riwayatSec.style.display = 'none';
  if (returSec) returSec.style.display = 'none';
  if (bundleSec) bundleSec.style.display = 'none';

  if (tab === 'riwayat') {
    if (riwayatSec) riwayatSec.style.display = 'block';
    renderRiwayatMasuk(); return;
  }
  if (tab === 'retur') {
    if (returSec) returSec.style.display = 'block';
    renderRetur(); return;
  }
  if (tab === 'bundle') {
    if (bundleSec) bundleSec.style.display = 'block';
    renderBundleList(); return;
  }

  if (mainWrap) mainWrap.style.display = 'block';
  if (filterBar) filterBar.style.display = 'flex';

  // Sembunyikan filter kategori ketika tab sudah spesifik
  const kategoriFilter = document.getElementById('inv-kategori')?.parentElement?.parentElement || document.getElementById('inv-kategori');
  const invKategoriEl = document.getElementById('inv-kategori');
  if (invKategoriEl) {
    invKategoriEl.style.display = (tab === 'jual' || tab === 'sovenir' || tab === 'reward') ? 'none' : '';
  }

  let data = DB.inventory.filter(item => {
    if (tab === 'jual' && item.kategori !== 'jual') return false;
    if (tab === 'sovenir' && item.kategori !== 'sovenir') return false;
    if (tab === 'reward' && item.kategori !== 'reward') return false;
    if (kondisi && item.kondisi !== kondisi) return false;
    if (kategori && item.kategori !== kategori) return false;
    if (search && !item.nama.toLowerCase().includes(search)) return false;
    return true;
  });

  const tb = document.getElementById('inv-tbody');
  if (!data.length) { tb.innerHTML = '<tr><td colspan="8" class="empty">Tidak ada data</td></tr>'; return; }

  tb.innerHTML = data.map(item => {
    const isKritis = item.stok < 20;
    const isWarn = item.stok >= 20 && item.stok < 30;
    const stokColor = item.kondisi === 'reject' ? '#888780' : (isKritis ? '#F09595' : (isWarn ? '#FAC775' : '#5DCAA5'));
    const kondBadge = item.kondisi === 'reject'
      ? '<span class="badge badge-reject">Reject</span>'
      : (isKritis ? '<span class="badge badge-warn">Kritis</span>' : '<span class="badge badge-good">Good</span>');
    const katBadge = item.kategori === 'sovenir'
      ? '<span class="badge badge-sovenir">Sovenir</span>'
      : item.kategori === 'reward'
        ? '<span class="badge" style="background:#2a1a05;color:#FAC775;border-color:#8B6914">🎁 Reward</span>'
        : '<span class="badge badge-active">Barang jual</span>';
    const hargaStr = item.harga ? `<span style="color:#5DCAA5">${fmtRpFull(item.harga)}</span>` : '<span style="color:var(--border)">—</span>';
    return `<tr>
      <td><strong style="color:var(--text)">${item.nama}</strong></td>
      <td>${katBadge}</td>
      <td>${kondBadge}</td>
      <td style="color:${stokColor};font-weight:500">${item.stok}</td>
      <td>${item.min || '—'}</td>
      <td>${hargaStr}</td>
      <td style="color:var(--text4)">${item.terakhir}</td>
      <td>
        <button class="btn" style="padding:4px 10px;font-size:12px;margin-right:4px" onclick="openEditBarang(${item.id})">Edit</button>
        <button class="btn btn-danger" style="padding:4px 10px;font-size:12px" onclick="hapusInventory(${item.id})">Hapus</button>
      </td>
    </tr>`;
  }).join('');

  // update stat stok
  const totalGood = DB.inventory.filter(i => i.kondisi === 'good').reduce((s, i) => s + i.stok, 0);
  const totalReject = DB.inventory.filter(i => i.kondisi === 'reject').reduce((s, i) => s + i.stok, 0);
  const totalMasuk = (DB.riwayatMasuk || []).reduce((s, r) => s + r.jumlah, 0);
  const totalRetur = (DB.returList || []).reduce((s, r) => s + r.jumlah, 0);
  const sg = document.getElementById('inv-stat-good');
  if (sg) sg.querySelector('.stat-val').textContent = `${totalGood} unit`;
  const sr = document.getElementById('inv-stat-reject');
  if (sr) sr.querySelector('.stat-val').textContent = `${totalReject} unit`;
  const sm = document.getElementById('inv-stat-masuk');
  if (sm) sm.querySelector('.stat-val').textContent = `${totalMasuk} unit`;
  const sret = document.getElementById('inv-stat-retur');
  if (sret) sret.querySelector('.stat-val').textContent = `${totalRetur} unit`;
}

function renderRiwayatMasuk() {
  const tb = document.getElementById('inv-riwayat-tbody');
  if (!(DB.riwayatMasuk || []).length) { tb.innerHTML = '<tr><td colspan="7" class="empty">Belum ada riwayat masuk</td></tr>'; return; }
  tb.innerHTML = (DB.riwayatMasuk || []).map(r => `<tr>
    <td>${r.tanggal}</td><td>${r.nama}</td>
    <td>${r.kondisi === 'good' ? '<span class="badge badge-good">Good</span>' : '<span class="badge badge-reject">Reject</span>'}</td>
    <td>+${r.jumlah}</td><td>${r.supplier}</td><td style="color:var(--text4)">${r.catatan || '—'}</td>
    <td><button class="btn btn-danger" style="padding:3px 8px;font-size:11px" onclick="hapusRiwayatMasuk(${r.id})">Hapus</button></td>
  </tr>`).join('');
}

function renderRetur() {
  const tb = document.getElementById('inv-retur-tbody');
  if (!(DB.returList || []).length) { tb.innerHTML = '<tr><td colspan="7" class="empty">Belum ada retur</td></tr>'; return; }
  tb.innerHTML = (DB.returList || []).map(r => {
    // Kondisi bisa string lama ("good"/"reject") atau kondisiLog baru ("Nama: 2G/1R")
    const isLegacy = r.kondisi === 'good' || r.kondisi === 'reject';
    let kondisiHtml;
    if (isLegacy) {
      kondisiHtml = r.kondisi === 'good'
        ? '<span class="badge badge-good">Good</span>'
        : '<span class="badge badge-reject">Reject</span>';
    } else {
      // Format baru: hitung total good dan reject dari unitDetail
      const ud = r.unitDetail || [];
      const totalGood = ud.reduce((s, u) => s + (u.good || 0), 0);
      const totalReject = ud.reduce((s, u) => s + (u.reject || 0), 0);
      kondisiHtml = `${totalGood > 0 ? `<span class="badge badge-good" style="margin-right:3px">${totalGood} Good</span>` : ''}${totalReject > 0 ? `<span class="badge badge-reject">${totalReject} NG/Reject</span>` : ''}`;
      if (!kondisiHtml) kondisiHtml = `<span style="font-size:11px;color:var(--text4)">${r.kondisi || 'mixed'}</span>`;
    }
    const tipeBadge = r.isFullRetur === false
      ? '<span style="font-size:10px;color:#FAC775;background:#2a1e00;padding:1px 6px;border-radius:4px;border:0.5px solid #3a2d00">Sebagian</span>'
      : '';
    return `<tr>
    <td>${r.tanggal}</td><td style="color:#AFA9EC">${r.po}</td><td>${r.konsumen}</td>
    <td>${kondisiHtml}</td>
    <td>${r.jumlah} bundle ${tipeBadge}</td><td style="color:var(--text4)">${r.alasan}</td>
    <td><button class="btn btn-danger" style="padding:3px 8px;font-size:11px" onclick="hapusRetur(${r.id})">Hapus</button></td>
  </tr>`;
  }).join('');
}

// ============================================================
// BUNDLE LIST
// ============================================================
function renderBundleList() {
  const el = document.getElementById('inv-bundle-list');
  if (!el) return;
  const bundles = DB.bundleDef || [];
  if (!bundles.length) {
    el.innerHTML = `<div class="empty" style="padding:32px">
      Belum ada bundle. Klik "+ Buat Bundle" untuk membuat bundle/set barang.
    </div>`;
    return;
  }
  el.innerHTML = bundles.map(b => {
    // Hitung stok bundle berdasarkan komponen paling sedikit
    const stokBundle = hitungStokBundle(b);
    const aktifBadge = b.aktif !== false
      ? '<span class="badge badge-good">Aktif</span>'
      : '<span class="badge badge-pending">Nonaktif</span>';
    const komponenHtml = (b.komponen || []).map(k => {
      const inv = DB.inventory.find(i => i.id == k.invId || i.nama === k.nama);
      const nama = inv ? inv.nama : k.nama || '(barang dihapus)';
      const stokInv = inv ? inv.stok : 0;
      const cukup = stokInv >= k.qty ? 'color:#5DCAA5' : 'color:#F09595';
      return `<span style="font-size:11px;background:var(--bg2);border:0.5px solid var(--border);border-radius:6px;padding:2px 8px;${cukup}">
        ${nama} ×${k.qty} <span style="color:var(--text4)">(stok:${stokInv})</span>
      </span>`;
    }).join('');
    return `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--text)">${b.nama}</div>
          ${b.desc ? `<div style="font-size:11px;color:var(--text4);margin-top:2px">${b.desc}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px">
          ${aktifBadge}
          <div style="font-size:13px;color:#5DCAA5;font-weight:500;margin-top:4px">${b.harga ? fmtRpFull(b.harga) : '—'}</div>
          <div style="font-size:11px;color:var(--text4)">Stok bundle: <strong style="color:${stokBundle > 0 ? '#5DCAA5' : '#F09595'}">${stokBundle} unit</strong></div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">${komponenHtml || '<span style="font-size:11px;color:var(--text4)">Belum ada komponen</span>'}</div>
      <div style="display:flex;gap:6px">
        <button class="btn" style="font-size:12px;padding:4px 10px" onclick="openEditBundle(${b.id})">Edit</button>
        <button class="btn btn-danger" style="font-size:12px;padding:4px 10px" onclick="hapusBundle(${b.id})">Hapus</button>
      </div>
    </div>`;
  }).join('');
}

function hitungStokBundle(b) {
  if (!b.komponen || !b.komponen.length) return 0;
  let min = Infinity;
  b.komponen.forEach(k => {
    const inv = DB.inventory.find(i => i.id == k.invId || i.nama === k.nama);
    const stok = inv ? inv.stok : 0;
    const bisa = k.qty > 0 ? Math.floor(stok / k.qty) : 0;
    if (bisa < min) min = bisa;
  });
  return min === Infinity ? 0 : min;
}

// ============================================================
// KONSUMEN
// ============================================================
function renderKonsumenList() {
  if (!DB.poList) DB.poList = [];
  if (!DB.entitas) DB.entitas = [];
  if (!DB.konsumen) DB.konsumen = [];
  if (!DB.tripList) DB.tripList = [];
  if (!DB.returList) DB.returList = [];
  if (!DB.riwayatMasuk) DB.riwayatMasuk = [];
  if (!DB.inventory) DB.inventory = [];
  if (!DB.settings) DB.settings = {};

  const search = (document.getElementById('konsumen-search')?.value || '').toLowerCase();
  const filtered = DB.konsumen.filter(k =>
    k.nama.toLowerCase().includes(search) || k.telp.includes(search)
  );
  const el = document.getElementById('konsumen-count');
  if (el) el.textContent = `Konsumen (${DB.konsumen.length})`;

  const list = document.getElementById('konsumen-list');
  if (!filtered.length) { list.innerHTML = '<div class="empty">Tidak ditemukan</div>'; return; }

  list.innerHTML = filtered.map(k => {
    // Hitung sisa real-time dari PO aktual
    const sisaRT = DB.poList
      .filter(p => k.po.includes(p.id) && p.status !== 'retur')
      .reduce((s, p) => s + (p.sisa || 0), 0);
    const tagihanHtml = k.po.length === 0
      ? `<div style="font-size:12px;font-weight:500;color:var(--text4)">—</div><div style="font-size:10px;color:var(--text4)">belum ada PO</div>`
      : sisaRT > 0
        ? `<div style="font-size:12px;font-weight:500;color:#FAC775">${fmtRp(sisaRT)}</div><div style="font-size:10px;color:var(--text4)">sisa tagihan</div>`
        : `<div style="font-size:12px;font-weight:500;color:#5DCAA5">Lunas</div><div style="font-size:10px;color:var(--text4)">${k.po.length} PO</div>`;
    const active = k.id === DB.selectedKonsumen ? 'active' : '';
    const nonaktifBadge = !k.aktif ? '<span style="font-size:10px;color:#F09595;margin-left:4px">(Nonaktif)</span>' : '';
    return `<div class="list-item ${active}" onclick="selectKonsumen(${k.id})">
      <div class="avatar-sm" style="background:${k.warna};color:${k.warnaTxt}">${k.inisial}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text2)">${k.nama}${nonaktifBadge}</div>
        <div style="font-size:11px;color:var(--text4)">${k.telp} · ${k.kota.split(',')[0]}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">${tagihanHtml}</div>
    </div>`;
  }).join('');
}

function selectKonsumen(id) {
  DB.selectedKonsumen = id;
  renderKonsumenList();
  renderKonsumenDetail(id);
}

function renderKonsumenDetail(id) {
  const k = DB.konsumen.find(x => x.id === id);
  if (!k) return;

  const aktifLabel = k.aktif ? 'Nonaktifkan' : 'Aktifkan';
  const aktifClass = k.aktif ? 'btn-danger' : 'btn-success';

  document.getElementById('konsumen-detail-header').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <div class="avatar-sm" style="background:${k.warna};color:${k.warnaTxt};width:40px;height:40px;font-size:14px">${k.inisial}</div>
      <div>
        <div style="font-size:15px;font-weight:500">${k.nama}</div>
        <div style="font-size:12px;color:var(--text4)">Konsumen sejak ${k.since}${!k.aktif ? ' · <span style="color:#F09595">Nonaktif</span>' : ''}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" style="font-size:12px;padding:5px 12px" onclick="openEditKonsumen(${k.id})">Edit</button>
      <button class="btn ${aktifClass}" style="font-size:12px;padding:5px 12px" onclick="toggleAktifKonsumen(${k.id})">${aktifLabel}</button>
      <button class="btn btn-danger" style="font-size:12px;padding:5px 12px" onclick="hapusKonsumen(${k.id})">Hapus</button>
    </div>`;

  const poTerkait = DB.poList.filter(p => k.po.includes(p.id));
  const poLunasKons = poTerkait.filter(p => p.status === 'lunas');
  const bundleLunas = poLunasKons.reduce((s, p) => s + p.bundle, 0);
  const komisiKons = bundleLunas * (DB.settings.komisi_koor || 15000);
  const bundleBerjalan = poTerkait.filter(p => p.status !== 'lunas' && p.status !== 'retur').reduce((s, p) => s + p.bundle, 0);
  const komisiPending = bundleBerjalan * (DB.settings.komisi_koor || 15000);

  // Hitung sisa real-time dari data PO aktual (bukan k.tagihan yg bisa stale)
  const sisaRealtime = poTerkait
    .filter(p => p.status !== 'retur')
    .reduce((s, p) => s + (p.sisa || 0), 0);

  const totalSisa = sisaRealtime > 0
    ? `<span class="badge badge-late">${fmtRp(sisaRealtime)} belum lunas</span>`
    : '<span class="badge badge-good">Semua lunas</span>';

  const poHtml = poTerkait.map(p => {
    const terbayar = p.cicilan.filter(c => c.status === 'lunas').length;
    const _cicilanAktif = p.cicilan.filter(c => c.status !== 'batal');
    const pct = _cicilanAktif.length > 0 ? Math.round((terbayar / _cicilanAktif.length) * 100) : 0;
    const sisaAmt = p.cicilan
      .filter(c => c.status !== 'lunas' && c.status !== 'batal')
      .reduce((s, c) => s + (c.tagihan - (c.terbayar || 0)), 0);
    const stBadge = p.status === 'telat'
      ? '<span class="badge badge-late" style="margin-top:4px">Cicilan telat</span>'
      : p.status === 'lunas'
        ? '<span class="badge badge-good" style="margin-top:4px">Lunas</span>'
        : '<span class="badge badge-active" style="margin-top:4px">Berjalan</span>';
    const barColor = p.status === 'telat' ? '#E24B4A' : p.status === 'lunas' ? '#0F6E56' : '#1D9E75';
    const sisaTxt = sisaAmt > 0
      ? `<div style="font-size:10px;color:var(--text4);margin-top:3px">${fmtRp(sisaAmt)} sisa</div>`
      : `<div style="font-size:10px;color:#5DCAA5;margin-top:3px">Lunas</div>`;
    return `<div style="padding:9px 0;border-bottom:0.5px solid var(--border2);display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:13px;color:#AFA9EC;font-weight:500">${p.id}</div>
        <div style="font-size:11px;color:var(--text4);margin-top:2px">${p.bundle} bundle · Sales: ${p.sales.split(' ')[0]}${p.sesi ? ' · Sesi ' + p.sesi : ''}${p.lokasi ? ' · ' + p.lokasi : ''} · ${p.tanggal}</div>
        ${stBadge}
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;color:var(--text2)">${terbayar}/${p.cicilan.length} termin</div>
        <div class="progress-bar" style="width:80px;margin-top:4px"><div class="progress-fill" style="width:${pct}%;background:${barColor}"></div></div>
        ${sisaTxt}
      </div>
    </div>`;
  }).join('');

  document.getElementById('konsumen-detail-body').innerHTML = `
    <div class="card">
      <div class="card-title">Informasi kontak</div>
      <div class="grid2">
        <div><div class="label">Nama lengkap</div><div style="font-size:13px;color:var(--text2)">${k.nama}</div></div>
        <div><div class="label">No. telepon</div><div style="font-size:13px;color:var(--text2)">${k.telp}</div></div>
        <div style="margin-top:10px"><div class="label">Kota</div><div style="font-size:13px;color:var(--text2)">${k.kota}</div></div>
        <div style="margin-top:10px"><div class="label">Alamat</div><div style="font-size:13px;color:var(--text2)">${k.alamat}</div></div>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="card-title" style="margin-bottom:0">Riwayat PO (${poTerkait.length})</div>${totalSisa}
      </div>
      ${poHtml || '<div style="color:var(--text4);font-size:13px;padding:8px 0">Belum ada PO</div>'}
    </div>
    <div class="card">
      <div class="card-title">🎁 Reward Koordinator</div>
      ${(() => {
      const rewardCfg = DB.settings.rewardConfig || [];
      // Grade = bundle dari PO yang SUDAH LUNAS saja (real-time)
      const gradeLunas = poLunasKons.reduce((s, p) => s + (p.bundle || 0), 0);
      const gradePending = poTerkait.filter(p => p.status !== 'lunas' && p.status !== 'retur').reduce((s, p) => s + (p.bundle || 0), 0);
      const gradeTotal = gradeLunas + gradePending; // kalau semua lunas
      // Reward saat ini berdasarkan bundle LUNAS saja
      const rwCfg = rewardCfg.find(r => gradeLunas >= (r.gradeMin || 0) && (r.gradeMax === null || r.gradeMax === undefined || gradeLunas <= r.gradeMax));
      // Reward potensial kalau semua PO lunas
      const rwPotensial = rewardCfg.find(r => gradeTotal >= (r.gradeMin || 0) && (r.gradeMax === null || r.gradeMax === undefined || gradeTotal <= r.gradeMax));
      const invItem = rwCfg?.invNama ? DB.inventory.find(i => i.nama === rwCfg.invNama) : null;
      const stokInfo = invItem ? `<span style="font-size:10px;color:var(--text4)">(stok: ${invItem.stok})</span>` : '';
      // Sudah cair = ada riwayatCair dengan reward di periode ini
      const sudahCair = (k.riwayatCair || []).some(r => r.reward);
      // Reward bisa diambil hanya kalau tidak ada PO berjalan
      const adaPOBerjalan = gradePending > 0;
      const grade = gradeLunas;
      return `
        <div class="stat-grid-3" style="margin-bottom:12px">
          <div class="stat-card"><div class="stat-label">Grade saat ini</div><div class="stat-val" style="color:#FAC775;font-size:20px">${gradeLunas}</div><div class="stat-sub">bundle lunas</div></div>
          <div class="stat-card"><div class="stat-label">Reward sekarang</div><div class="stat-val" style="font-size:13px">${rwCfg ? `<span style="color:#FAC775">🎁 ${rwCfg.reward}</span><br>${stokInfo}` : '<span style="color:var(--text4);font-size:12px">Belum memenuhi syarat</span>'}</div></div>
          <div class="stat-card"><div class="stat-label">Bundle berjalan</div><div class="stat-val" style="color:#FAC775">${gradePending}</div><div class="stat-sub">${rwPotensial && rwPotensial !== rwCfg ? 'Potensi: 🎁' + rwPotensial.reward : gradePending > 0 ? 'Menunggu lunas' : ''}</div></div>
        </div>
        ${rewardCfg.length === 0 ? '<div style="font-size:12px;color:#FAC775;background:#2a1a0a;border:1px dashed #8B6914;border-radius:6px;padding:8px 12px;margin-bottom:10px">⚠️ Belum ada konfigurasi reward. Buka Settings → Reward Koordinator.</div>' : ''}
        <div style="font-size:11px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Riwayat PO per grade</div>
        ${poTerkait.length ? `<table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr>
            <th style="padding:5px 8px;color:var(--text4);text-align:left;border-bottom:0.5px solid var(--border)">PO</th>
            <th style="padding:5px 8px;color:var(--text4);text-align:left;border-bottom:0.5px solid var(--border)">Tanggal</th>
            <th style="padding:5px 8px;color:var(--text4);text-align:center;border-bottom:0.5px solid var(--border)">Bundle</th>
            <th style="padding:5px 8px;color:var(--text4);text-align:left;border-bottom:0.5px solid var(--border)">Status</th>
          </tr></thead>
          <tbody>${poTerkait.map(po => {
        const isLunas = po.status === 'lunas';
        const isRetur = po.status === 'retur';
        const stBadge = isRetur
          ? '<span style="font-size:10px;color:#F09595;background:#3a1000;padding:1px 6px;border-radius:4px">Retur</span>'
          : isLunas ? '<span style="font-size:10px;color:#5DCAA5;background:#0a1a10;padding:1px 6px;border-radius:4px">Lunas ✓</span>'
            : '<span style="font-size:10px;color:#FAC775;background:#1a1200;padding:1px 6px;border-radius:4px">Berjalan</span>';
        return `<tr>
              <td style="padding:7px 8px;border-bottom:0.5px solid var(--border2)">
                <a href="#" onclick="selectPO('${po.id}');navigate('transaksi')" style="color:#AFA9EC;text-decoration:underline dotted">${po.id}</a>
              </td>
              <td style="padding:7px 8px;border-bottom:0.5px solid var(--border2);color:var(--text4)">${po.tanggal}</td>
              <td style="padding:7px 8px;border-bottom:0.5px solid var(--border2);text-align:center">${po.bundle}</td>
              <td style="padding:7px 8px;border-bottom:0.5px solid var(--border2)">${stBadge}</td>
            </tr>`;
      }).join('')}</tbody>
        </table>` : '<div style="font-size:12px;color:var(--text4);padding:8px 0">Belum ada PO.</div>'}
        <div style="margin-top:14px;padding-top:12px;border-top:0.5px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              ${sudahCair
          ? `<div style="font-size:12px;color:#5DCAA5">✓ Reward sudah dicairkan</div>
                   <div style="font-size:11px;color:var(--text4);margin-top:3px">${(k.riwayatCair || []).filter(r => r.reward).map(rc => `${rc.tanggal}: ${rc.reward} (grade ${rc.grade}, ${rc.periode})`).join('<br>')}</div>`
          : rwCfg
            ? adaPOBerjalan
              ? `<div style="font-size:12px;color:#FAC775">Reward tersedia: <strong>${rwCfg.reward}</strong> \u2014 <span style="color:var(--text4)">tunggu ${gradePending} bundle berjalan lunas</span></div>`
              : `<div style="font-size:12px;color:#FAC775">Reward tersedia: <strong>${rwCfg.reward}</strong></div>`
            : `<div style="font-size:12px;color:var(--text4)">Grade ${gradeLunas} belum memenuhi syarat reward manapun${rwPotensial ? ` (potensi: 🎁${rwPotensial.reward} jika ${gradePending} bundle berjalan lunas)` : ''}</div>`}
            </div>
            ${rwCfg && !sudahCair && !adaPOBerjalan
          ? `<button class="btn" style="font-size:12px;padding:5px 14px;background:#2a1a05;border-color:#8B6914;color:#FAC775"
                  onclick="cairkanRewardKonsumen(${k.id})">🎁 Cairkan Reward</button>`
          : adaPOBerjalan && rwCfg && !sudahCair
            ? `<span style="font-size:11px;color:var(--text4)">⏳ Tunggu semua PO lunas dulu</span>`
            : ''}
          </div>
        </div>`;
    })()}
      ${(k.kreditSaldo || 0) > 0 ? `
      <div style="margin-top:10px;padding:8px 12px;background:#0a1a10;border-radius:6px;border:0.5px solid #1a3020">
        <div style="font-size:12px;font-weight:500;color:#5DCAA5;margin-bottom:4px">💰 Kredit konsumen: ${fmtRpFull(k.kreditSaldo)}</div>
        <div style="font-size:11px;color:var(--text4)">Berasal dari kelebihan bayar.</div>
        ${(k.kreditLog || []).slice(0, 3).map(l => `<div style="font-size:11px;color:var(--text4);margin-top:3px">${l.tanggal}: ${l.jumlah > 0 ? '+' : ''}${fmtRpFull(l.jumlah)} — ${l.ket}</div>`).join('')}
      </div>` : ''}
    </div>`;
}

// ============================================================
// PO / TRANSAKSI
// ============================================================
function renderPOList() {
  if (!DB.poList) DB.poList = [];
  if (!DB.entitas) DB.entitas = [];
  if (!DB.konsumen) DB.konsumen = [];
  if (!DB.tripList) DB.tripList = [];
  if (!DB.returList) DB.returList = [];
  if (!DB.riwayatMasuk) DB.riwayatMasuk = [];
  if (!DB.inventory) DB.inventory = [];
  if (!DB.settings) DB.settings = {};

  // Auto-update status telat berdasarkan jatuh tempo cicilan (PO + cicilan level)
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const bulanMap = _BULAN_MAP;
  let statusChanged = false;
  DB.poList.forEach(p => {
    if (p.status !== 'berjalan' && p.status !== 'telat') return;
    let adaLewat = false;
    p.cicilan.forEach(c => {
      if (c.status === 'lunas' || c.status === 'batal') return;
      const parts = (c.jatuh || '').split(' ');
      if (parts.length < 3) return;
      const bln = bulanMap[parts[1]];
      if (bln === undefined) return;
      const tgl = new Date(parseInt(parts[2]), bln, parseInt(parts[0])).getTime();
      const isLewat = tgl < todayMs;
      // Set cicilan-level telat (belum atau kurang yang sudah lewat jatuh tempo)
      if (isLewat && c.status !== 'telat') { c.status = 'telat'; statusChanged = true; }
      // Revert: kalau sudah ditandai telat tapi ternyata belum lewat (misal jatuh tempo diubah)
      // Kembalikan ke 'kurang' kalau ada pembayaran sebagian, 'belum' kalau belum bayar sama sekali
      else if (!isLewat && c.status === 'telat') {
        c.status = (c.terbayar && c.terbayar > 0) ? 'kurang' : 'belum';
        statusChanged = true;
      }
      if (isLewat) adaLewat = true;
    });
    const newStatus = adaLewat ? 'telat' : 'berjalan';
    if (p.status !== newStatus) { p.status = newStatus; statusChanged = true; }
  });
  // Simpan ke DB hanya jika ada perubahan, bukan setiap render
  if (statusChanged) saveDB();

  const search = (document.getElementById('po-search')?.value || '').toLowerCase();
  const status = document.getElementById('po-status')?.value || '';
  const filtered = DB.poList.filter(p => {
    if (status && p.status !== status) return false;
    if (search && !p.id.toLowerCase().includes(search) && !p.konsumen.toLowerCase().includes(search)) return false;
    return true;
  });
  const el = document.getElementById('po-count');
  if (el) el.textContent = `PO (${DB.poList.length})`;
  // Sort: telat → berjalan → lunas/retur
  const _statusOrd = { telat: 0, berjalan: 1, lunas: 2, retur: 3 };
  filtered.sort((a, b) => (_statusOrd[a.status] ?? 1) - (_statusOrd[b.status] ?? 1));
  const list = document.getElementById('po-list');
  if (!filtered.length) { list.innerHTML = '<div class="empty">Tidak ditemukan</div>'; return; }
  list.innerHTML = filtered.map(p => {
    const _sisaList = p.cicilan.filter(x => x.status !== 'batal' && x.status !== 'lunas').reduce((s, x) => s + (x.tagihan - (x.terbayar || 0)), 0);
    // Badge dan val keduanya dari kalkulasi real-time, bukan p.status yang bisa stale
    const isRetur = p.status === 'retur';
    const isTelat = !isRetur && p.cicilan.some(c => c.status === 'telat');
    const isLunas = !isRetur && _sisaList === 0 && p.cicilan.filter(c => c.status !== 'batal').length > 0;
    const stBadge = isRetur
      ? '<span class="badge" style="background:#3a1000;color:#F09595;border-color:#5a1500">Retur</span>'
      : isTelat ? '<span class="badge badge-late">Telat</span>'
        : isLunas ? '<span class="badge badge-good">Lunas</span>'
          : '<span class="badge badge-active">Berjalan</span>';
    const val = isRetur ? '' : _sisaList > 0 ? fmtRp(_sisaList) : 'Lunas';
    const active = p.id === DB.selectedPO ? 'active' : '';
    return `<div class="list-item ${active}" onclick="selectPO('${p.id}')">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:#AFA9EC">${p.id}</div>
        <div style="font-size:11px;color:var(--text4);margin-top:2px">${p.konsumen} · ${p.bundle} bundle</div>
      </div>
      <div style="text-align:right;flex-shrink:0">${stBadge}<div style="font-size:10px;color:var(--text4);margin-top:3px">${val}</div></div>
    </div>`;
  }).join('');
}

function selectPO(id) {
  DB.selectedPO = id;
  renderPOList();
  renderPODetail(id);
}

function renderPODetail(id) {
  const p = DB.poList.find(x => x.id === id);
  if (!p) {
    document.getElementById('po-detail-header').innerHTML = '';
    document.getElementById('po-detail-body').innerHTML = '<div class="empty">Pilih PO dari daftar</div>';
    return;
  }
  const stBadge = p.status === 'telat'
    ? '<span class="badge badge-late">Cicilan telat</span>'
    : p.status === 'lunas'
      ? '<span class="badge badge-good">Lunas</span>'
      : '<span class="badge badge-active">Berjalan</span>';

  document.getElementById('po-detail-header').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:15px;font-weight:500">${p.id}</span>${stBadge}
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" style="font-size:12px;padding:5px 12px" onclick="cetakPO('${p.id}')">Cetak PO</button>
      <button class="btn" style="font-size:12px;padding:5px 12px;background:#0e2a1a;border-color:#1a6e40;color:#5DCAA5" onclick="openEditBundlePO('${p.id}')">&#9998; Edit Bundle</button>
      <button class="btn btn-danger" style="font-size:12px;padding:5px 12px" onclick="openReturFromPO('${p.id}')">Proses retur</button>
      <button class="btn btn-danger" style="font-size:12px;padding:5px 12px;background:#1a1200;border-color:#412402;color:#FAC775" onclick="openLossFromPO('${p.id}')">&#9888; Catat Loss</button>
      ${p.status === 'lunas' || p.status === 'retur' ? `<button class="btn btn-danger" style="font-size:12px;padding:5px 12px;opacity:.8" onclick="hapusPO('${p.id}')">Hapus</button>` : ''}
    </div>`;

  const terbayar = p.cicilan.filter(c => c.status === 'lunas').length;
  const terbayarAmt = p.cicilan.filter(c => c.status === 'lunas').reduce((s, c) => s + c.tagihan, 0);
  const _aktifCount = p.cicilan.filter(c => c.status !== 'batal').length;
  const pct = _aktifCount > 0 ? Math.round((terbayar / _aktifCount) * 100) : 0;
  // Hitung ulang sisa dari cicilan aktif (bukan dari p.sisa yang bisa stale)
  const _sisaReal = p.cicilan
    .filter(x => x.status !== 'batal' && x.status !== 'lunas')
    .reduce((s, x) => s + (x.tagihan - (x.terbayar || 0)), 0);
  const totalBundle = p.bundle;
  const komisiSales = totalBundle * DB.settings.komisi_sales;
  const split60 = Math.round(komisiSales * DB.settings.split_komisi_pct1 / 100);
  const split40 = komisiSales - split60;

  // ── Pengeluaran Sales terkait PO ini ──
  const _salesEnt = DB.entitas.find(e => e.peran === 'Sales' && e.nama === p.sales);
  const _pengPO = (_salesEnt?.pengeluaranList || []).filter(x => x.poId === p.id || (x.ket || '').includes(p.id));
  const _loss = _pengPO.filter(x => x.tipe === 'loss');
  const _souv = _pengPO.filter(x => x.tipe === 'souvenir' || x.jenis === 'Souvenir');
  const _lain = _pengPO.filter(x => x.tipe !== 'loss' && x.jenis !== 'Souvenir' && x.tipe !== 'souvenir');
  const _tLoss = _loss.reduce((s, x) => s + x.jml, 0);
  const _tSouv = _souv.reduce((s, x) => s + x.jml, 0);
  const _tLain = _lain.reduce((s, x) => s + x.jml, 0);
  const _tMinus = _tLoss + _tSouv + _tLain;
  const _kBersih = komisiSales - _tMinus;

  // ── Riwayat loss untuk PO ini ──
  const _lossLog = p.lossLog || [];
  const lossHistHtml = _lossLog.length ? `
    <div class="card" style="border-color:#412402">
      <div class="card-title" style="color:#FAC775;margin-bottom:10px">&#9888; Riwayat Kasus Loss (${_lossLog.length} kasus)</div>
      ${_lossLog.map(l => `
        <div style="background:var(--bg);border:0.5px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <span style="color:var(--text2);font-weight:500;font-size:13px">${l.keterangan || 'Konsumen kabur'}</span>
              <span style="color:var(--text4);font-size:11px;margin-left:8px">${l.tanggal}</span>
            </div>
            <span style="font-size:10px;background:#2a1000;color:#FAC775;padding:2px 8px;border-radius:4px">${l.bundleDikurangi} bundle dikurangi</span>
          </div>
          ${(l.items || []).map(item => {
    const kembaliTotal = item.kembaliTotal ?? item.kembali ?? 0;
    const kembaliGood = item.kembaliGood ?? (item.kondisiKembali !== 'reject' ? kembaliTotal : 0);
    const kembaliReject = item.kembaliReject ?? (item.kondisiKembali === 'reject' ? kembaliTotal : 0);
    const kembaliLabel = kembaliTotal > 0
      ? (kembaliGood > 0 && kembaliReject > 0
        ? `${kembaliGood}G + ${kembaliReject}R`
        : kembaliReject > 0 ? `${kembaliReject} <span style="font-size:10px;color:#FAC775">(reject)</span>`
          : `${kembaliGood}`)
      : '0';
    return `
            <div style="display:grid;grid-template-columns:1fr 72px 72px 72px 96px;gap:4px;font-size:12px;padding:5px 0;border-bottom:0.5px solid var(--border2)">
              <span style="color:var(--text2)">${item.nama}</span>
              <span style="color:var(--text4)">hilang <strong style="color:#F09595">${item.hilang ?? item.netLoss ?? 0}</strong></span>
              <span style="color:var(--text4)">kembali <strong style="color:#5DCAA5">${kembaliLabel}</strong></span>
              <span style="color:var(--text4)">net <strong style="color:#FAC775">${item.netLoss ?? 0}</strong></span>
              <span style="color:#F09595;text-align:right;font-weight:500">${fmtRpFull(item.subtotal)}</span>
            </div>`;
  }).join('')}
          ${!l.items ? `<div style="font-size:12px;color:var(--text4)">${l.unitHilang || 0} unit hilang, ${l.unitKembali || 0} kembali</div>` : ''}
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px">
            <span style="color:var(--text4)">Beban ganti rugi Sales</span>
            <strong style="color:#F09595">${fmtRpFull(l.totalBeban || l.bebanSales || 0)}</strong>
          </div>
        </div>`).join('')}
    </div>` : '';

  // ── Kalkulasi komisi bersih Sales per PO ──
  const minusSalesHtml = (_tMinus > 0 || _lossLog.length > 0) ? `
    <div class="card" style="${_tMinus > 0 ? 'border-color:#3a1f1f' : ''}">
      <div class="card-title" style="margin-bottom:10px">Kalkulasi Komisi Sales &#8212; PO ini</div>
      <div style="font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border2)">
          <span style="color:var(--text4)">${p.bundle} bundle &#215; ${fmtRp(DB.settings.komisi_sales)}/bundle</span>
          <span style="color:#5DCAA5;font-weight:500">+ ${fmtRpFull(komisiSales)}</span>
        </div>
        ${_loss.map(x => `
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:0.5px solid var(--border2)">
          <span style="color:var(--text4)">&#9888; ${x.ket || x.jenis}</span>
          <span style="color:#F09595">&#8722; ${fmtRpFull(x.jml)}</span>
        </div>`).join('')}
        ${_souv.map(x => `
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:0.5px solid var(--border2)">
          <span style="color:var(--text4)">&#127873; ${x.ket || x.jenis}</span>
          <span style="color:#FAC775">&#8722; ${fmtRpFull(x.jml)}</span>
        </div>`).join('')}
        ${_lain.map(x => `
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:0.5px solid var(--border2)">
          <span style="color:var(--text4)">${x.jenis}${x.ket ? ' &#8212; ' + x.ket : ''}</span>
          <span style="color:#F09595">&#8722; ${fmtRpFull(x.jml)}</span>
        </div>`).join('')}
        ${_tMinus > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-top:0.5px solid var(--border);margin-top:4px">
          <span style="color:var(--text4)">Total pengurangan</span>
          <span style="color:#F09595;font-weight:500">&#8722; ${fmtRpFull(_tMinus)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);border-radius:8px;padding:10px 12px;margin-top:4px">
          <span style="color:var(--text2);font-weight:600">Komisi bersih Sales</span>
          <span style="font-weight:700;font-size:15px;color:${_kBersih >= 0 ? '#5DCAA5' : '#F09595'}">${_kBersih < 0 ? '&#8722;&nbsp;' : ''}${fmtRpFull(Math.abs(_kBersih))}</span>
        </div>` : ''}
      </div>
    </div>` : '';

  const cicilanRows = p.cicilan.filter(c => c.status !== 'batal').map(c => {
    const isKurang = c.status === 'kurang';
    const rowBg = c.status === 'telat' ? 'background:#1a1210' : isKurang ? 'background:#1a1800' : '';
    const opacity = c.status === 'lunas' ? 'opacity:.6' : '';
    const stBadgeC = c.status === 'lunas'
      ? '<span class="badge badge-good">Lunas</span>'
      : c.status === 'telat'
        ? '<span class="badge badge-late">Telat</span>'
        : isKurang
          ? `<span class="badge" style="background:#2a1e00;color:#FAC775;border:0.5px solid #4a3000">Kurang &#8722; ${fmtRpFull(c.sisaTagihan || (c.tagihan - (c.terbayar || 0)))}</span>`
          : '<span class="badge badge-pending">Belum</span>';
    const jatuhColor = c.status === 'telat' ? 'color:#F09595;' : '';
    const btnBayar = (c.status !== 'lunas' && c.status !== 'batal')
      ? `<button class="btn btn-primary" style="padding:3px 8px;font-size:11px" onclick="openCatatBayar('${p.id}',${c.n})">${isKurang ? 'Lunasi sisa' : 'Bayar'}</button>`
      : '';
    const btnEdit = (c.status === 'lunas' || c.status === 'kurang')
      ? `<button class="btn" style="padding:3px 8px;font-size:11px;border-color:#3a2d00;color:#FAC775" onclick="openEditBayar('${p.id}',${c.n})" title="Edit pembayaran termin ini">&#9998; Edit</button>`
      : '';
    const btnCetak = `<button class="btn" style="padding:3px 8px;font-size:11px" onclick="cetakKwitansi(${c.n},'${p.id}')">&#128424; Kwitansi</button>`;
    const collDisplay = c.collector
      ? `<div style="font-size:10px;color:var(--text4);margin-top:2px">&#128100; ${c.collector}</div>` : '';
    return `<tr style="${rowBg};${opacity}">
      <td style="padding:9px 10px;font-size:13px;border-bottom:0.5px solid var(--border2)">${c.n}</td>
      <td style="padding:9px 10px;font-size:13px;${jatuhColor}border-bottom:0.5px solid var(--border2)">
        <span id="jatuh-disp-${p.id}-${c.n}">${c.jatuh}</span>
        <button onclick="editJatuhTermin('${p.id}',${c.n})" style="font-size:9px;padding:1px 5px;margin-left:4px;border-radius:3px;border:0.5px solid var(--border);background:var(--bg3);color:var(--text4);cursor:pointer" title="Edit tanggal jatuh tempo">\u270f</button>
      </td>
      <td style="padding:9px 10px;font-size:13px;border-bottom:0.5px solid var(--border2)">${fmtRpFull(c.tagihan)}${c.terbayar && c.terbayar < c.tagihan ? '<div style="font-size:10px;color:#FAC775">terbayar ' + fmtRpFull(c.terbayar) + '</div>' : ''}</td>
      <td style="padding:9px 10px;border-bottom:0.5px solid var(--border2)">${stBadgeC}${collDisplay}</td>
      <td style="padding:9px 10px;border-bottom:0.5px solid var(--border2);display:flex;gap:5px;align-items:center">
        ${btnBayar}${btnEdit}${btnCetak}
      </td>
    </tr>`;
  }).join('');

  document.getElementById('po-detail-body').innerHTML = `
    <div class="card">
      <div class="card-title">Informasi PO</div>
      <div class="grid2">
        <div><div class="label">Konsumen</div><div style="font-size:13px;color:var(--text2)">${p.konsumen}</div></div>
        <div><div class="label">Tanggal PO</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="font-size:13px;color:var(--text2)" id="po-tgl-disp-${p.id}">${p.tanggal}</div>
            <button onclick="editTanggalPO('${p.id}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:0.5px solid var(--border);background:var(--bg3);color:var(--text4);cursor:pointer">✏</button>
          </div>
        </div>
        <div style="margin-top:10px"><div class="label">Total tagihan</div><div style="font-size:14px;color:var(--text);font-weight:500">${fmtRpFull(p.total)}</div></div>
        <div style="margin-top:10px"><div class="label">Sisa outstanding</div><div style="font-size:14px;color:${_sisaReal > 0 ? '#F09595' : '#5DCAA5'};font-weight:500">${_sisaReal > 0 ? fmtRpFull(_sisaReal) : 'Lunas'}</div></div>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="card-title" style="margin-bottom:0">Jadwal cicilan</div>
        <button class="btn btn-success" style="font-size:12px;padding:5px 12px" onclick="openCatatBayarNext('${p.id}')">+ Catat bayar</button>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text4);margin-bottom:8px">
        <span>Progress pembayaran</span><span>${terbayar}/${p.cicilan.length} &middot; ${fmtRp(terbayarAmt)} terbayar</span>
      </div>
      <div style="height:6px;background:var(--bg5);border-radius:3px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${pct}%;background:#1D9E75;border-radius:3px"></div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left;border-bottom:0.5px solid var(--border)">Termin</th>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left;border-bottom:0.5px solid var(--border)">Jatuh tempo</th>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left;border-bottom:0.5px solid var(--border)">Tagihan</th>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left;border-bottom:0.5px solid var(--border)">Status</th>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left;border-bottom:0.5px solid var(--border)">Aksi</th>
        </tr></thead>
        <tbody>${cicilanRows}</tbody>
      </table>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-title">Split komisi sales</div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border2);font-size:13px">
          <span style="color:#5DCAA5">${DB.settings.split_komisi_pct1}% (termin 1–${p.splitN1 || DB.settings.split_termin1})</span>
          <span style="color:#5DCAA5">${fmtRpFull(split60)}</span>
        </div>
        <div style="font-size:11px;padding:4px 0 8px;display:flex;justify-content:space-between">
          <span style="color:var(--text4)">Cair setelah termin ${p.splitN1 || DB.settings.split_termin1} lunas</span>
          ${p.komisiSalesSplit1Cair ? '<span style="color:#5DCAA5;font-weight:500">✓ Sudah cair</span>' : '<span style="color:#FAC775">⏳ Belum cair</span>'}
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px">
          <span style="color:#FAC775">${DB.settings.split_komisi_pct2}% (termin ${(p.splitN1 || DB.settings.split_termin1) + 1}–${p.cicilan.filter(c => c.status !== "batal").length})</span>
          <span style="color:#FAC775">${fmtRpFull(split40)}</span>
        </div>
        <div style="font-size:11px;padding:4px 0;display:flex;justify-content:space-between">
          <span style="color:var(--text4)">Cair setelah semua termin lunas</span>
          ${p.komisiSalesSplit2Cair ? '<span style="color:#5DCAA5;font-weight:500">✓ Sudah cair</span>' : '<span style="color:#FAC775">⏳ Belum cair</span>'}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Entitas terlibat</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:0.5px solid var(--border2)">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar-sm" style="background:#1e1d2e;color:#AFA9EC;width:28px;height:28px;font-size:11px">${p.sales.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
            <div><div style="font-size:13px;color:var(--text2)">${p.sales}</div><div style="font-size:11px;color:var(--text4)">Sales</div></div>
          </div>
          <span style="font-size:12px;color:#5DCAA5">${fmtRp(DB.settings.komisi_sales)}/bundle</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:0.5px solid var(--border2)">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar-sm" style="background:#1a2d1e;color:#5DCAA5;width:28px;height:28px;font-size:11px">${p.nego.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
            <div><div style="font-size:13px;color:var(--text2)">${p.nego}</div><div style="font-size:11px;color:var(--text4)">Nego</div></div>
          </div>
          <span style="font-size:12px;color:#5DCAA5">${fmtRp(DB.settings.komisi_nego)}/bundle</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar-sm" style="background:#291a14;color:#F0997B;width:28px;height:28px;font-size:11px">${p.coll.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
            <div><div style="font-size:13px;color:var(--text2)">${p.coll}</div><div style="font-size:11px;color:var(--text4)">Collector</div></div>
          </div>
          <span style="font-size:12px;color:#5DCAA5">${fmtRp(DB.settings.komisi_coll)}/cicilan</span>
        </div>
      </div>
    </div>
    ${minusSalesHtml}
    ${p.souvenir && p.souvenir.length ? `
    <div class="card" style="border-color:#2a1e00">
      <div class="card-title" style="color:#FAC775">Souvenir (ditanggung Sales: ${p.sales})</div>
      ${p.souvenir.map(s => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:0.5px solid #2a2000;font-size:13px">
        <span style="color:var(--text2)">${s.nama} <span style="color:var(--text4);font-size:11px">× ${s.qty}</span></span>
        <span style="color:#FAC775">${fmtRpFull((s.harga || 0) * (s.qty || 1))}</span>
      </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:7px 0 0;font-size:13px;font-weight:600">
        <span style="color:var(--text4)">Total souvenir</span>
        <span style="color:#FAC775">${fmtRpFull(p.totalSouvenir || 0)}</span>
      </div>
    </div>` : ''}
    ${lossHistHtml}`;
}

// ============================================================
// ENTITAS
// ============================================================
function setEntitasTab(peran) {
  DB.currentEntitasTab = peran;
  document.querySelectorAll('[data-ent-tab]').forEach(t => {
    t.classList.toggle('active', t.dataset.entTab === peran);
  });
  // Auto-select entitas pertama dari tab yang dipilih
  const first = DB.entitas.find(e => e.peran === peran);
  if (first) {
    DB.selectedEntitas = first.id;
  }
  renderEntitasList();
  renderEntitasDetail(DB.selectedEntitas);
}

function renderEntitasList() {
  const searchQ = (document.getElementById('entitas-search')?.value || '').toLowerCase();
  const filtered = DB.entitas.filter(e => {
    if (e.peran !== DB.currentEntitasTab) return false;
    if (searchQ && !e.nama.toLowerCase().includes(searchQ)) return false;
    return true;
  });
  const list = document.getElementById('entitas-list');
  // Hapus hanya item lama, jaga search input tetap ada
  list.querySelectorAll('.list-item, .empty-ent').forEach(el => el.remove());
  if (!filtered.length) {
    const emp = document.createElement('div');
    emp.className = 'empty empty-ent';
    emp.textContent = 'Tidak ada data';
    list.appendChild(emp);
    return;
  }
  const frag = document.createDocumentFragment();
  filtered.forEach(e => {
    const active = e.id === DB.selectedEntitas ? 'active' : '';
    const sub = e.peran === 'Collector'
      ? `${Math.round((e.komisiKotor || 0) / (e.komisiRate || DB.settings.komisi_coll || 1500))} kwitansi · ${fmtRp(e.komisiKotor)}`
      : `${e.bundle || 0} bundle · bersih ${fmtRp((e.komisiKotor || 0) - (e.pengeluaran || 0))}`;
    const nonaktif = !e.aktifStatus ? '<span style="font-size:10px;color:#F09595"> (Nonaktif)</span>' : '';
    const div = document.createElement('div');
    div.className = 'list-item ' + active;
    div.setAttribute('onclick', 'selectEntitas(' + e.id + ')');
    div.innerHTML = '<div class="avatar-sm" style="background:' + e.warna + ';color:' + e.warnaTxt + '">' + e.inisial + '</div><div><div style="font-size:13px;font-weight:500;color:var(--text2)">' + e.nama + nonaktif + '</div><div style="font-size:11px;color:var(--text4)">' + sub + '</div></div>';
    frag.appendChild(div);
  });
  list.appendChild(frag);
}

function selectEntitas(id) {
  DB.selectedEntitas = id;
  renderEntitasList();
  renderEntitasDetail(id);
}

function renderEntitasDetail(id, periodeFilter) {
  const e = DB.entitas.find(x => x.id === id);
  if (!e) return;

  // State filter periode per entitas
  if (!DB._entitasPeriode) DB._entitasPeriode = {};
  if (periodeFilter !== undefined) DB._entitasPeriode[id] = periodeFilter;
  const periode = DB._entitasPeriode[id] || 'semua';

  // Riwayat PO terfilter
  const riwFiltered = (e.riwayatPO || []).filter(r => {
    if (periode === 'semua') return true;
    const poId = r.poId || r.po;
    const po = DB.poList.find(p => p.id === poId);
    return po && po.tanggal && po.tanggal.includes(periode);
  });

  // Komisi & pengeluaran berdasarkan periode
  const komisiPeriode = riwFiltered.reduce((s, r) => s + (r.komisiNominal || 0), 0);
  const pengeluaranPeriode = periode === 'semua'
    ? e.pengeluaran
    : (e.pengeluaranList || []).filter(p => p.tgl && p.tgl.includes(periode)).reduce((s, p) => s + p.jml, 0);
  const bersih = komisiPeriode - pengeluaranPeriode;
  const totalPeng = e.pengeluaranList.reduce((s, p) => s + p.jml, 0);

  // Opsi periode dari riwayat PO
  const bulanSet = new Set((e.riwayatPO || []).map(r => {
    const poId = r.poId || r.po;
    const po = DB.poList.find(p => p.id === poId);
    if (!po || !po.tanggal) return null;
    const parts = po.tanggal.split(' ');
    return parts.length >= 2 ? parts.slice(-2).join(' ') : null;
  }).filter(Boolean));
  const periodeOpts = ['semua', ...bulanSet].map(b =>
    `<option value="${b}" ${b === periode ? 'selected' : ''}>${b === 'semua' ? 'Semua periode' : b}</option>`
  ).join('');

  const pengHtml = e.pengeluaranList.length
    ? e.pengeluaranList.map(p => {
      const isLoss = p.tipe === 'loss';
      const isSouvenir = p.tipe === 'souvenir' || p.jenis === 'Souvenir' || p.jenis === 'Sovenir';
      const isOps = p.tipe === 'operasional';
      const iconLabel = isLoss ? '&#9888; Ganti rugi loss' : isSouvenir ? '&#127873; Souvenir' : isOps ? '&#128663; Operasional' : p.jenis;
      const amtColor = isLoss ? '#F09595' : isSouvenir ? '#FAC775' : isOps ? '#9DC4FA' : '#F09595';
      const rowBg = isLoss ? 'background:#1a1000;' : isSouvenir ? 'background:#1a1800;' : isOps ? 'background:#0e1a2a;' : '';
      const poTag = p.poId ? `<span style="font-size:10px;background:var(--bg5);color:var(--text4);padding:1px 6px;border-radius:4px;margin-left:6px">${p.poId}</span>` : '';
      return `
        <div style="${rowBg}display:flex;justify-content:space-between;padding:8px 10px;border-bottom:0.5px solid var(--border2);align-items:flex-start;border-radius:6px;margin-bottom:2px">
          <div>
            <div style="font-size:12px;color:var(--text2);font-weight:500">${iconLabel}${poTag}</div>
            <div style="font-size:11px;color:var(--text4);margin-top:2px">${p.ket || ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:12px">
            <span style="color:${amtColor};font-weight:500">&#8722; ${fmtRpFull(p.jml)}</span>
            <button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="hapusPengeluaran(${e.id},${p.id})">&times;</button>
          </div>
        </div>`;
    }).join('')
    : '<div style="color:var(--text4);font-size:13px;padding:8px 0">Belum ada pengeluaran</div>';

  const riwHtml = riwFiltered.length
    ? `<table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);border-bottom:0.5px solid var(--border);text-align:left">PO</th>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);border-bottom:0.5px solid var(--border);text-align:left">Konsumen</th>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);border-bottom:0.5px solid var(--border);text-align:left">Bundle</th>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);border-bottom:0.5px solid var(--border);text-align:left">Status PO</th>
          <th style="padding:7px 10px;font-size:11px;color:var(--text4);border-bottom:0.5px solid var(--border);text-align:left">Komisi</th>
        </tr></thead>
        <tbody>${riwFiltered.map(r => {
      // Support both field formats: r.po (lama) dan r.poId (baru)
      const poId = r.poId || r.po;
      const po = DB.poList.find(p => p.id === poId);
      const konsumenNama = r.konsumen || r.konsumenNama || po?.konsumen || '—';
      const bundle = r.bundle || po?.bundle || '—';
      const statusBadge = !po ? '<span class="badge" style="background:#2a1000;color:#F0997B">Dihapus</span>'
        : po.status === 'lunas' ? '<span class="badge badge-good">Lunas</span>'
          : po.status === 'retur' ? '<span class="badge" style="background:#3a1000;color:#F09595">Retur</span>'
            : po.status === 'telat' ? '<span class="badge badge-late">Telat</span>'
              : '<span class="badge badge-active">Berjalan</span>';
      const komisiNominal = r.komisiNominal || (bundle > 0 ? bundle * (e.komisiRate || 0) : 0);
      const splitBadge = r.split === 'Lunas' || po?.status === 'lunas'
        ? `<span style="font-size:11px;color:#5DCAA5">${fmtRpFull(komisiNominal)}</span>`
        : `<span style="font-size:11px;color:#FAC775">${fmtRpFull(komisiNominal)} (belum cair)</span>`;
      return `<tr>
            <td style="padding:8px 10px;color:#AFA9EC;border-bottom:0.5px solid var(--border2)">
              <a href="#" onclick="selectPO('${poId}');navigate('transaksi')" style="color:#AFA9EC;text-decoration:underline dotted">${poId || '—'}</a>
            </td>
            <td style="padding:8px 10px;border-bottom:0.5px solid var(--border2)">${konsumenNama}</td>
            <td style="padding:8px 10px;border-bottom:0.5px solid var(--border2)">${bundle}</td>
            <td style="padding:8px 10px;border-bottom:0.5px solid var(--border2)">${statusBadge}</td>
            <td style="padding:8px 10px;border-bottom:0.5px solid var(--border2)">${splitBadge}</td>
          </tr>`;
    }).join('')}</tbody>
      </table>`
    : '<div style="color:var(--text4);font-size:13px;padding:8px 0">Belum ada riwayat PO</div>';

  const rateLabel = e.peran === 'Collector' ? 'per cicilan' : 'per bundle';
  const periodeLabel = periode === 'semua' ? 'Semua periode' : periode;

  const komisiTercairkan = e.komisiDibayar || 0;
  const komisiOutstanding = (e.komisiKotor || 0) - komisiTercairkan;
  const komisiPending = e.komisiPending || 0;

  // Cek apakah Sales/Nego sudah ada split milestone yang eligible
  let cairkanDisabled = false;
  let cairkanTooltip = 'Tandai komisi sudah dibayarkan';
  if ((e.peran === 'Sales' || e.peran === 'Nego') && komisiOutstanding > 0) {
    const field = e.peran === 'Sales' ? 'sales' : 'nego';
    const myPOs = (DB.poList || []).filter(p => p[field] === e.nama);
    const adaSplitCair = myPOs.some(p => p.komisiSalesSplit1Cair || p.komisiSalesSplit2Cair);
    if (!adaSplitCair) {
      cairkanDisabled = true;
      cairkanTooltip = 'Belum bisa cairkan — belum ada termin yang memenuhi syarat split komisi (60% setelah termin 1–N lunas)';
    }
  }
  const totalPengeluaran = (e.pengeluaranList || []).reduce((s, p) => s + (p.jml || 0), 0);
  const sudahDipotong = e.pengeluaranDipotong || 0;
  const sisaPengeluaran = Math.max(0, totalPengeluaran - sudahDipotong);
  const cairBersih = Math.max(0, komisiOutstanding - sisaPengeluaran);
  const isNetMinus = (e.komisiKotor || 0) - totalPengeluaran < 0;

  const cairkanBtn = komisiOutstanding > 0
    ? `<button class="btn btn-success" style="font-size:12px;padding:5px 12px${cairkanDisabled ? ';opacity:.5;cursor:not-allowed' : ''}"
        onclick="${cairkanDisabled ? `toast('${cairkanTooltip}','warn')` : `cairkanKomisi(${e.id})`}"
        title="${cairkanTooltip}">✓ Cairkan ${fmtRpFull(komisiOutstanding)}${isNetMinus ? ` <span style="font-size:10px;color:#F09595;opacity:.9">(hutang ${fmtRpFull(Math.abs((e.komisiKotor || 0) - totalPengeluaran))})</span>` : ''}</button>`
    : isNetMinus
      ? `<span style="font-size:11px;color:#F09595;padding:5px 10px;background:#1a0a0a;border-radius:6px;border:0.5px solid #501313">⚠ Hutang ${fmtRpFull(Math.abs((e.komisiKotor || 0) - totalPengeluaran))}</span>`
      : '<span style="font-size:11px;color:#5DCAA5;padding:5px 8px;background:#0a1a10;border-radius:6px;border:0.5px solid #1a3020">✓ Komisi lunas</span>';

  document.getElementById('entitas-detail-header').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <div class="avatar-sm" style="background:${e.warna};color:${e.warnaTxt};width:40px;height:40px;font-size:14px">${e.inisial}</div>
      <div><div style="font-size:15px;font-weight:500">${e.nama}</div><div style="font-size:12px;color:var(--text4)">${e.peran}${e.nik ? ' · NIK: ' + e.nik : ''}${e.telp ? ' · ' + e.telp : ''} · Aktif sejak ${e.aktif}</div></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <select class="select" style="font-size:12px;padding:4px 8px;height:30px" onchange="renderEntitasDetail(${e.id},this.value)">${periodeOpts}</select>
      <button class="btn btn-primary" style="font-size:12px;padding:5px 12px" onclick="openEditKomisi(${e.id})">Edit komisi</button>
      <button class="btn btn-primary" style="font-size:12px;padding:5px 12px" onclick="openPengeluaran(${e.id})">+ Pengeluaran</button>
      ${cairkanBtn}
      <button class="btn btn-success" style="font-size:12px;padding:5px 12px;background:#0e2a1a;border-color:#1a6e40" onclick="cetakKwitansiKomisi(${e.id})">&#x1F9FE; Kwitansi</button>
      <button class="btn btn-danger" style="font-size:12px;padding:5px 12px" onclick="hapusEntitas(${e.id})">Hapus</button>
    </div>`;

  document.getElementById('entitas-detail-body').innerHTML = `
    <div class="stat-grid-3">
      <div class="stat-card"><div class="stat-label">Komisi kotor${periode !== 'semua' ? ` (${periodeLabel})` : ''}</div><div class="stat-val" style="color:#5DCAA5">${fmtRp(komisiPeriode)}</div></div>
      <div class="stat-card">
        <div class="stat-label" id="label-bersih-${e.id}" style="color:var(--text4)">
          ${(() => { const _b = komisiPeriode - pengeluaranPeriode; const _sd = e.pengeluaranDipotong || 0; const _tp = (e.pengeluaranList || []).reduce((s, p) => s + (p.jml || 0), 0); return (_b < 0 && _tp > _sd) ? '\u26a0\ufe0f Kasbon / Hutang' : 'Komisi bersih'; })()}
        </div>
        <div class="stat-val" style="color:${(komisiPeriode - pengeluaranPeriode) < 0 ? '#F09595' : '#5DCAA5'}">${fmtRp(komisiPeriode - pengeluaranPeriode)}</div>
        ${(() => { const _b = komisiPeriode - pengeluaranPeriode; const _sd = e.pengeluaranDipotong || 0; const _tp = (e.pengeluaranList || []).reduce((s, p) => s + (p.jml || 0), 0); return (_b < 0 && _tp > _sd) ? '<div style="font-size:10px;color:#F09595;margin-top:3px">Akan dipotong saat cairkan</div>' : ''; })()}
      </div>
      <div class="stat-card"><div class="stat-label">Belum dicairkan</div><div class="stat-val" style="color:${komisiOutstanding > 0 ? '#FAC775' : (komisiOutstanding < 0 ? '#F09595' : '#5DCAA5')}">${komisiOutstanding !== 0 ? fmtRp(komisiOutstanding) : '—'}</div></div>
    </div>
    ${komisiPending > 0 ? `<div style="margin-top:8px;padding:8px 12px;background:#0a1500;border-radius:6px;border:0.5px solid #2a3000;font-size:12px;color:var(--text4)">⏳ Menunggu PO lunas: <strong style="color:#FAC775">${fmtRpFull(komisiPending)}</strong> — akan cair otomatis saat PO terkait lunas</div>` : ''}
    ${(e.riwayatCair || []).length ? `
    <div style="margin-top:10px;padding:10px 12px;background:var(--bg2);border-radius:8px;border:0.5px solid var(--border)">
      <div style="font-size:11px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Riwayat pencairan komisi</div>
      ${(e.riwayatCair || []).map((rc, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px 0;border-bottom:0.5px solid var(--border2)">
          <div>
            <div style="color:var(--text4)">${rc.tanggal}</div>
            ${rc.keterangan ? `<div style="font-size:10px;color:var(--text4);margin-top:1px">${rc.keterangan}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="color:#5DCAA5;font-weight:500">${fmtRpFull(rc.jumlah)}</span>
            <button class="btn" style="font-size:10px;padding:2px 8px" onclick="cetakKwitansiKomisi(${e.id}, ${i})">\ud83e\uddfe Kwitansi</button>
          </div>
        </div>`).join('')}
    </div>` : ''}
    <div class="card">
      <div class="card-title">Konfigurasi komisi</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:0.5px solid var(--border2)">
        <span style="font-size:13px;color:var(--text4)">Rate komisi ${rateLabel}</span>
        <span style="font-size:14px;font-weight:500;color:#5DCAA5">${fmtRpFull(e.komisiRate)}</span>
      </div>
      ${e.peran === 'Sales' ? `<div style="padding:10px 0">
        <div style="font-size:11px;color:var(--text4);margin-bottom:8px">Split pembayaran komisi</div>
        <div style="display:flex;height:7px;border-radius:4px;overflow:hidden;margin-bottom:6px">
          <div style="width:${DB.settings.split_komisi_pct1}%;background:#1D9E75"></div>
          <div style="width:${DB.settings.split_komisi_pct2}%;background:#854F0B"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span style="color:#5DCAA5">${DB.settings.split_komisi_pct1}% setelah termin 1–${DB.settings.split_termin1}</span>
          <span style="color:#FAC775">${DB.settings.split_komisi_pct2}% setelah termin berikutnya</span>
        </div>
      </div>` : ''}
    </div>
    ${e.peran === 'Sales' ? `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="card-title" style="margin-bottom:0">Pengeluaran</div>
        <span style="font-size:12px;color:#F09595">Total: ${fmtRpFull(totalPeng)}</span>
      </div>
      ${pengHtml}
    </div>` : ''}
    <div class="card"><div class="card-title">Riwayat PO terlibat</div>${riwHtml}</div>`;
}

// ============================================================
// SETTINGS
// ============================================================
function renderSettings() {
  const s = DB.settings;

  // Notifikasi hMinus rows
  let hMinusRows = s.notif.hMinus.map((hm, idx) => `
    <div class="srow" id="hminus-row-${idx}">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="slabel">H-</span>
        <input class="input" type="number" value="${hm.hari}" min="1"
          style="width:60px;padding:4px 8px"
          onchange="updateHMinus(${idx},'hari',this.value)" />
        <span class="slabel">sebelum jatuh tempo</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="toggle ${hm.aktif ? 'on' : 'off'}" onclick="updateHMinus(${idx},'aktif')"></div>
        ${s.notif.hMinus.length > 1 ? `<button class="btn btn-danger" style="padding:3px 8px;font-size:11px" onclick="removeHMinus(${idx})">×</button>` : ''}
      </div>
    </div>`).join('');

  const settingsHtml = `
    <div class="settings-grid">
      <!-- Cicilan -->
      <div class="card">
        <div class="card-title">Cicilan default</div>
        <div class="srow">
          <span class="slabel">Jumlah cicilan default</span>
          <input class="input" type="number" value="${s.n_cicilan}" min="1" max="24"
            style="width:80px;text-align:right"
            onchange="updateSetting('n_cicilan',this.value,'num')" />
        </div>
        <div class="srow">
          <span class="slabel">Interval cicilan</span>
          <select class="select" style="width:120px"
            onchange="updateSetting('interval',this.value)">
            <option ${s.interval === 'Mingguan' ? 'selected' : ''}>Mingguan</option>
            <option ${s.interval === 'Bulanan' ? 'selected' : ''}>Bulanan</option>
          </select>
        </div>
        <div class="srow">
          <span class="slabel">Split Sales – %1 (termin 1–N)</span>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="input" type="number" value="${s.split_komisi_pct1}" min="1" max="99"
              style="width:60px;text-align:right"
              onchange="updateSetting('split_komisi_pct1',this.value,'pct')" />
            <span style="color:var(--text4);font-size:12px">%</span>
          </div>
        </div>
        <div class="srow" style="color:var(--text4);font-size:11px">
          Sisa ${100 - s.split_komisi_pct1}% cair otomatis setelah semua termin lunas. Pembagian termin menyesuaikan jumlah cicilan PO.
        </div>
        <div class="srow" style="flex-direction:column;align-items:flex-start;gap:8px">
          <span class="slabel">Template preset cicilan</span>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${DB.presets.map((p, i) => `<span class="badge badge-active">${p.nama}: ${p.vals.join('-')}</span>`).join('')}
            <span style="font-size:11px;color:#AFA9EC;cursor:pointer" onclick="toast('Fitur tambah preset segera hadir')">+ Tambah preset</span>
          </div>
        </div>
        <div style="margin-top:12px;text-align:right">
          <button class="btn btn-success" style="padding:6px 18px;font-size:12px" onclick="saveSettingsCicilan()">✓ Simpan</button>
        </div>
      </div>

      <!-- Notifikasi -->
      <div class="card">
        <div class="card-title">Notifikasi</div>
        <div class="srow">
          <span class="slabel">Hari H (jatuh tempo)</span>
          <div class="toggle ${s.notif.hh ? 'on' : 'off'}" onclick="toggleNotif('hh',this)"></div>
        </div>
        ${hMinusRows}
        <div style="padding:6px 0">
          <button class="btn btn-primary" style="font-size:11px;padding:4px 10px" onclick="addHMinus()">+ Tambah H-</button>
        </div>
        <div class="srow">
          <span class="slabel">Cicilan telat</span>
          <div class="toggle ${s.notif.telat ? 'on' : 'off'}" onclick="toggleNotif('telat',this)"></div>
        </div>
        <div class="srow">
          <span class="slabel">Stok menipis</span>
          <div class="toggle ${s.notif.stok ? 'on' : 'off'}" onclick="toggleNotif('stok',this)"></div>
        </div>
        <div class="srow">
          <span class="slabel">Hutang komisi Sales</span>
          <div class="toggle ${s.notif.hutang ? 'on' : 'off'}" onclick="toggleNotif('hutang',this)"></div>
        </div>
        <div style="margin-top:12px;text-align:right">
          <button class="btn btn-success" style="padding:6px 18px;font-size:12px" onclick="saveDB();toast('Notifikasi disimpan ✓','success')">✓ Simpan</button>
        </div>
      </div>

      <!-- Rate Komisi -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="card-title" style="margin-bottom:0">Rate komisi entitas</div>
          <button class="btn" style="font-size:11px;padding:3px 10px" onclick="resetKomisiDefault()">Reset ke default</button>
        </div>
        ${s.komisi_sales < 1000 ? `<div style="background:#2a0e0e;border:1px solid #501313;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#F09595">\u26a0\ufe0f Komisi Sales (${fmtRpFull(s.komisi_sales)}) terlihat terlalu kecil. Cek kembali atau klik "Reset ke default".</div>` : ''}
        <div class="srow">
          <span class="slabel">Sales (per bundle)</span>
          <input class="input" value="${fmtRpFull(s.komisi_sales)}"
            style="width:150px;text-align:right"
            onblur="updateSettingRp('komisi_sales',this.value,this)" />
        </div>
        <div class="srow">
          <span class="slabel">Nego (per bundle)</span>
          <input class="input" value="${fmtRpFull(s.komisi_nego)}"
            style="width:150px;text-align:right"
            onblur="updateSettingRp('komisi_nego',this.value,this)" />
        </div>
        <div class="srow">
          <span class="slabel">Konsumen (legacy fallback rate/bundle)</span>
          <input class="input" value="${fmtRpFull(s.komisi_koor)}"
            style="width:150px;text-align:right"
            onblur="updateSettingRp('komisi_koor',this.value,this)" />
        </div>
        <div class="srow">
          <span class="slabel">Collector (per kwitansi)</span>
          <input class="input" value="${fmtRpFull(s.komisi_coll)}"
            style="width:150px;text-align:right"
            onblur="updateSettingRp('komisi_coll',this.value,this)" />
        </div>
        <div class="srow">
          <span class="slabel">Kepala Cabang (per bundle)</span>
          <input class="input" value="${fmtRpFull(s.komisi_kc || 5000)}"
            style="width:150px;text-align:right"
            onblur="updateSettingRp('komisi_kc',this.value,this)" />
        </div>
        <div style="margin-top:12px">
          <div style="font-size:11px;color:var(--accent2);margin-bottom:6px">⚠ Rate baru hanya berlaku untuk PO baru.</div>
          <div style="text-align:right"><button class="btn btn-success" style="padding:6px 18px;font-size:12px" onclick="saveDB();toast('Rate komisi disimpan ✓','success')">✓ Simpan</button></div>
        </div>
      </div>

      <!-- Reward Config Koordinator -->
      <div class="card" style="margin-top:14px">
        <div class="card-title" style="margin-bottom:4px">&#127873; Reward Koordinator (Grade-based)</div>
        <div style="font-size:11px;color:var(--text4);margin-bottom:12px">
          Grade = total bundle lunas per konsumen dalam periode. Reward diambil dari inventory secara otomatis saat dicairkan.
        </div>
        <div id="reward-config-rows" style="margin-bottom:10px">
          ${(s.rewardConfig || []).map(r => `
            <div class="reward-cfg-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
              <input class="input rc-min" type="number" value="${r.gradeMin || 0}" min="0" style="width:90px;font-size:12px" placeholder="Grade min">
              <span style="font-size:11px;color:var(--text4)">-</span>
              <input class="input rc-max" type="number" value="${r.gradeMax ?? ''}" min="0" style="width:140px;font-size:12px" placeholder="maks (kosong=tak terbatas)">
              <input class="input rc-reward" type="text" value="${r.reward || ''}" style="width:150px;font-size:12px" placeholder="Nama reward" list="inv-rlist">
              <datalist id="inv-rlist">${(DB.inventory || []).map(i => `<option value="${i.nama}">`).join('')}</datalist>
              <input class="input rc-inv" type="text" value="${r.invNama || ''}" style="width:150px;font-size:12px" placeholder="Nama di inventory" list="inv-rlist2">
              <datalist id="inv-rlist2">${(DB.inventory || []).map(i => `<option value="${i.nama}">`).join('')}</datalist>
              <input class="input rc-ket" type="text" value="${r.keterangan || ''}" style="width:130px;font-size:12px" placeholder="Keterangan (opsional)">
              <button class="btn btn-danger" style="padding:3px 8px;font-size:12px" onclick="this.closest('.reward-cfg-row').remove()">x</button>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" style="font-size:12px" onclick="addRewardConfigRow()">+ Tambah Rule</button>
          <button class="btn btn-success" style="font-size:12px;border-color:#1a6e40" onclick="saveRewardConfig()">Simpan Konfigurasi Reward</button>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--text4)">
          <strong>Kolom:</strong> Grade Min | Grade Max | Nama Reward | Nama di Inventory (untuk kurangi stok) | Keterangan
        </div>
      </div>



      <!-- Stok minimum dihapus dari settings -- notif otomatis jika stok < 20 -->
    </div>`;

  // ── Profil Perusahaan ──
  const prs = (DB.settings.perusahaan) || {};
  const logoSrc = DB.settings.logo || '';
  const logoPreviewHtml = logoSrc
    ? `<img src="${logoSrc}" style="height:52px;max-width:160px;object-fit:contain;border-radius:4px;border:0.5px solid var(--border)" />`
    : `<div style="width:90px;height:52px;background:var(--bg2);border:1.5px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text4)">No logo</div>`;

  const profileHtml = `
    <div class="card" style="margin-top:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div class="card-title" style="margin-bottom:0">Profil Perusahaan <span style="font-size:10px;color:var(--text4);font-weight:normal;text-transform:none">— digunakan di header cetak kwitansi &amp; PO</span></div>
        <button class="btn btn-success" style="padding:6px 18px;font-size:12px;font-weight:500;flex-shrink:0" onclick="updatePerusahaan(true)">&#10003; Simpan</button>
      </div>

      <!-- Logo upload -->
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:0.5px solid var(--border2);margin-bottom:14px">
        <div id="logo-preview-wrap">${logoPreviewHtml}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:4px">Logo Perusahaan</div>
          <div style="font-size:11px;color:var(--text4);margin-bottom:8px">Akan tampil di pojok kiri header saat cetak PO &amp; kwitansi. Format PNG/JPG, maks 200KB.</div>
          <div style="display:flex;gap:8px;align-items:center">
            <label style="cursor:pointer">
              <span class="btn" style="font-size:12px;padding:5px 12px;display:inline-block">📁 Pilih logo</span>
              <input type="file" id="logo-file-input" accept="image/png,image/jpeg,image/gif,image/svg+xml" style="display:none" onchange="uploadLogo(this)" />
            </label>
            ${logoSrc ? `<button class="btn btn-danger" style="font-size:12px;padding:5px 10px" onclick="hapusLogo()">× Hapus logo</button>` : ''}
          </div>
        </div>
      </div>

      <div class="grid2">
        <div class="srow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="slabel">Nama Perusahaan</span>
          <input class="input" style="width:100%" id="prs-nama" value="${prs.nama || ''}" placeholder="INTERGAS PERDANA" onblur="updatePerusahaan()" />
        </div>
        <div class="srow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="slabel">Alamat</span>
          <input class="input" style="width:100%" id="prs-alamat" value="${prs.alamat || ''}" placeholder="Jl. Villa Taman Kartini Blok B5" onblur="updatePerusahaan()" />
        </div>
        <div class="srow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="slabel">Kota</span>
          <input class="input" style="width:100%" id="prs-kota" value="${prs.kota || ''}" placeholder="Bekasi Timur" onblur="updatePerusahaan()" />
        </div>
        <div class="srow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="slabel">No Telp 1</span>
          <input class="input" style="width:100%" id="prs-telp" value="${prs.telp || ''}" placeholder="081211132939" onblur="updatePerusahaan()" />
        </div>
        <div class="srow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="slabel">No Telp 2 (opsional)</span>
          <input class="input" style="width:100%" id="prs-telp2" value="${prs.telp2 || ''}" placeholder="089898083388" onblur="updatePerusahaan()" />
        </div>
        <div class="srow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="slabel">NPWP (opsional)</span>
          <input class="input" style="width:100%" id="prs-npwp" value="${prs.npwp || ''}" placeholder="00.000.000.0-000.000" onblur="updatePerusahaan()" />
        </div>
      </div>
      <div style="margin-top:12px;padding:10px 12px;background:var(--bg2);border-radius:8px;border:0.5px solid var(--border)">
        <div style="font-size:11px;color:var(--text4);margin-bottom:8px">Preview header cetak:</div>
        <div style="display:flex;align-items:center;gap:12px;padding-bottom:6px;border-bottom:2px solid #555;margin-bottom:4px">
          ${logoSrc ? `<img src="${logoSrc}" style="height:40px;max-width:100px;object-fit:contain" />` : ''}
          <div style="font-family:'Courier New',monospace;font-size:12px;color:var(--text2);line-height:1.8">
            <strong style="font-size:13px;color:var(--text)">${(prs.nama || 'NAMA PERUSAHAAN').toUpperCase()}</strong><br>
            ${prs.alamat || 'Alamat perusahaan'}${prs.kota ? ', ' + prs.kota : ''}<br>
            NO TELP : ${[prs.telp, prs.telp2].filter(Boolean).join(' / ') || '—'}
          </div>
        </div>
        <div style="font-size:10px;color:var(--text4);padding-top:2px;border-bottom:1px solid #333">
          <hr style="border:none;border-top:1px solid #444;margin:2px 0">
        </div>
      </div>
    </div>`;

  const container = document.getElementById('settings-container');
  const dangerHtml = `
    <div class="card" style="margin-top:20px;border-color:#501313">
      <div class="card-title" style="color:#F09595">&#9888; Zona Bahaya</div>
      <div style="font-size:12px;color:var(--text4);margin-bottom:14px">
        Aksi di bawah ini bersifat <strong style="color:#F09595">permanen dan tidak bisa dibatalkan</strong>.
        Pastikan sudah backup data sebelum melanjutkan.
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-danger" style="font-size:13px;padding:8px 18px"
          onclick="resetSemuaData()">
          🗑️ Reset semua data (hapus semua PO, konsumen, entitas, inventory)
        </button>
        <button class="btn" style="font-size:13px;padding:8px 18px;background:#0e2a1a;border-color:#1a6e40;color:#5DCAA5"
          onclick="if(confirm('Recalculate semua data komisi entitas dari PO? Data komisi akan dihitung ulang dari nol.')) recalcAllKomisi()">
          🔧 Repair Komisi Entitas
        </button>
      </div>
    </div>`;

  if (container) container.innerHTML = settingsHtml + profileHtml + dangerHtml;
}

// ============================================================
// LAPORAN
// ============================================================
function onLaporanFilterChange() {
  renderLaporan();
}

// ── Init filter laporan ke bulan & tahun sekarang ─────────────
function initLaporanFilter() {
  const now = new Date();
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const bulanNow = BULAN[now.getMonth()];
  const tahunNow = String(now.getFullYear());

  const selTahun = document.getElementById('laporan-tahun');
  if (selTahun) {
    const existing = Array.from(selTahun.options).map(o => o.value);
    if (!existing.includes(tahunNow)) {
      const opt = document.createElement('option');
      opt.value = tahunNow;
      opt.textContent = tahunNow;
      selTahun.insertBefore(opt, selTahun.options[1]);
    }
    selTahun.value = tahunNow;
  }

  const selBulan = document.getElementById('laporan-bulan');
  if (selBulan) selBulan.value = bulanNow;
}

function getLaporanFilter() {
  const bulan = document.getElementById('laporan-bulan')?.value || 'semua';
  const tahun = document.getElementById('laporan-tahun')?.value || 'semua';
  return { bulan, tahun };
}

function poMatchFilter(po, bulan, tahun) {
  // po.tanggal format: "19 Apr 2026"
  // bulan value dari select: 'Jan','Feb',... atau 'semua'
  // tahun value dari select: '2026','2025',... atau 'semua'
  const parts = (po.tanggal || '').split(' ');
  if (tahun !== 'semua') {
    if (!parts[2] || parts[2] !== tahun) return false;
  }
  if (bulan !== 'semua') {
    if (!parts[1] || parts[1] !== bulan) return false;
  }
  return true;
}

// ── Update label tombol export sesuai tab & sub-tab aktif ────
function updateExportLabel(tab) {
  const excelBtn = document.getElementById('btn-export-entitas-excel');
  if (!excelBtn) return;
  const elTab = document.querySelector('[data-el-tab].active')?.dataset.elTab;
  const SUB_LABEL = {
    sales: 'Sales', nego: 'Nego', collector: 'Collector',
    koordinator: 'Konsumen', kc: 'Kepala Cabang', supir: 'Supir'
  };
  const TAB_LABEL = {
    global: 'Laporan Global', barang: 'Barang', penjualan: 'Penjualan',
    entitas: (tab === 'entitas' && elTab) ? (SUB_LABEL[elTab] || 'Entitas') : 'Entitas',
    konsumen: 'Konsumen', tahunan: 'Tahunan'
  };
  const label = TAB_LABEL[tab] || tab;
  excelBtn.innerHTML = `&#x1F4CA; Export Excel — ${label}`;
}

function renderLaporan() {
  const tab = document.querySelector('[data-laporan-tab].tab.active')?.dataset.laporanTab || 'global';
  renderLaporanTab(tab);
  updateExportLabel(tab);
}

function setLaporanTab(tab) {
  document.querySelectorAll('[data-laporan-tab]').forEach(t => t.classList.toggle('active', t.dataset.laporanTab === tab));
  renderLaporanTab(tab);
  updateExportLabel(tab);
}

function renderLaporanTab(tab) {
  const { bulan, tahun } = getLaporanFilter();
  const container = document.getElementById('laporan-content');
  if (!container) return;

  // Guard: pastikan semua array DB tersedia
  if (!DB.poList) DB.poList = [];
  if (!DB.entitas) DB.entitas = [];
  if (!DB.konsumen) DB.konsumen = [];
  if (!DB.tripList) DB.tripList = [];
  if (!DB.returList) DB.returList = [];
  if (!DB.riwayatMasuk) DB.riwayatMasuk = [];
  if (!DB.settings) DB.settings = {};
  if (!DB.inventory) DB.inventory = [];

  // ── Helpers filter ───────────────────────────────────────────
  const bMap = _BULAN_MAP;
  const parseTglShort = parseTglShortGlobal;

  function cicilanDiBulan(cicilan) {
    return cicilan.filter(c => {
      if (c.status !== 'lunas') return false;
      const d = parseTglShort(c.jatuh);
      if (!d) return false;
      if (tahun !== 'semua' && String(d.getFullYear()) !== tahun) return false;
      if (bulan !== 'semua' && bMap[bulan] !== d.getMonth()) return false;
      return true;
    });
  }

  function poDiBulan() {
    return DB.poList.filter(p => poMatchFilter(p, bulan, tahun));
  }

  // ── Kalkulasi uang masuk real (cicilan lunas) ──────────────────
  const uangMasuk = DB.poList.reduce((s, p) => {
    return s + cicilanDiBulan(p.cicilan).reduce((ss, c) => ss + c.tagihan, 0);
  }, 0);

  // ── Kalkulasi uang keluar (pengeluaran entitas) ──────────────
  const uangKeluar = DB.entitas.reduce((s, e) => {
    // Filter pengeluaran per periode (jika tersedia poId, link ke tanggal PO)
    const pengFiltered = (e.pengeluaranList || []).filter(p => {
      if (bulan === 'semua' && tahun === 'semua') return true;
      if (p.poId) {
        const po = DB.poList.find(x => x.id === p.poId);
        if (po) return poMatchFilter(po, bulan, tahun);
      }
      if (p.tripId) {
        const trip = (DB.tripList || []).find(t => t.id === p.tripId);
        if (trip) {
          const parts = (trip.tanggal || '').split(' ');
          const fakePO = { tanggal: trip.tanggal };
          return poMatchFilter(fakePO, bulan, tahun);
        }
      }
      // Pengeluaran tanpa referensi: tampilkan di semua filter
      return true;
    });
    return s + pengFiltered.reduce((ss, p) => ss + p.jml, 0);
  }, 0);

  // ── Outstanding konsumen (sisa aktif real-time) ──────────────────
  const outstandingKonsumen = DB.poList
    .filter(p => p.status !== 'retur')
    .reduce((s, p) => s + (p.sisa || 0), 0);

  // ── Net ──────────────────────────────────────────────────────
  const net = uangMasuk - uangKeluar;

  // ── Cicilan terlambat ────────────────────────────────────────
  const overdueCount = DB.poList.reduce((s, p) =>
    s + p.cicilan.filter(c => c.status === 'telat').length, 0);

  // ── PO bulan ini ─────────────────────────────────────────────
  const poFiltered = poDiBulan();
  const totalBundle = poFiltered.reduce((s, p) => s + p.bundle, 0);

  // ── Cicilan per minggu (4 minggu) ─────────────────────────────
  const minggu = ['Mg 1', 'Mg 2', 'Mg 3', 'Mg 4'];
  const chartData = [0, 1, 2, 3].map(w => {
    const masukW = DB.poList.reduce((s, p) => {
      return s + p.cicilan.filter(c => {
        if (c.status !== 'lunas') return false;
        const d = parseTglShort(c.jatuh);
        if (!d) return false;
        if (bulan !== 'semua' && d.getMonth() !== bMap[bulan]) return false;
        const dom = d.getDate();
        return dom >= w * 7 + 1 && dom <= (w + 1) * 7;
      }).reduce((ss, c) => ss + c.tagihan, 0);
    }, 0);
    return { mg: minggu[w], i: masukW };
  });

  if (tab === 'global') {
    const rasioCollection = outstandingKonsumen > 0
      ? Math.round((uangMasuk / (uangMasuk + outstandingKonsumen)) * 100) : 100;
    const avgMinggu = chartData.reduce((s, d) => s + d.i, 0) / 4;

    container.innerHTML = `
      <div class="stat-grid-4" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">Total uang masuk</div><div class="stat-val" style="color:#5DCAA5">${fmtRp(uangMasuk)}</div><div class="stat-sub">(cicilan lunas)</div></div>
        <div class="stat-card"><div class="stat-label">Total uang keluar</div><div class="stat-val" style="color:#F09595">${fmtRp(uangKeluar)}</div><div class="stat-sub">(pengeluaran entitas)</div></div>
        <div class="stat-card"><div class="stat-label">Outstanding konsumen</div><div class="stat-val" style="color:#FAC775">${fmtRp(outstandingKonsumen)}</div><div class="stat-sub">(sisa belum lunas)</div></div>
        <div class="stat-card"><div class="stat-label">Net cashflow</div><div class="stat-val" style="color:${net >= 0 ? '#5DCAA5' : '#F09595'}">${fmtRp(net)}</div></div>
      </div>
      <div class="stat-grid-4" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">Cicilan terlambat</div><div class="stat-val" style="color:#F09595">${overdueCount}</div></div>
        <div class="stat-card"><div class="stat-label">Rata-rata/minggu</div><div class="stat-val">${fmtRp(avgMinggu)}</div></div>
        <div class="stat-card"><div class="stat-label">Collection ratio</div><div class="stat-val" style="color:#AFA9EC">${rasioCollection}%</div></div>
        <div class="stat-card"><div class="stat-label">PO periode ini</div><div class="stat-val">${poFiltered.length} PO</div></div>
      </div>
      <div class="grid2">
        <div class="card">
          <div class="card-title">Pemasukan per minggu</div>
          <div class="bar-chart" id="laporan-chart"></div>
          <div style="display:flex;gap:16px;margin-top:8px;font-size:11px">
            <span style="color:#1D9E75">■ Uang masuk (cicilan lunas)</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Ringkasan arus kas</div>
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border2)">
            <span style="color:var(--text4)">Total uang masuk</span><strong style="color:#5DCAA5">${fmtRpFull(uangMasuk)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border2)">
            <span style="color:var(--text4)">Total pengeluaran</span><strong style="color:#F09595">− ${fmtRpFull(uangKeluar)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border2)">
            <span style="color:var(--text4)">Net cashflow</span><strong style="color:${net >= 0 ? '#5DCAA5' : '#F09595'}">${fmtRpFull(net)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:7px 0">
            <span style="color:var(--text4)">Outstanding belum tertagih</span><strong style="color:#FAC775">${fmtRpFull(outstandingKonsumen)}</strong>
          </div>
        </div>
      </div>

      <!-- Outstanding Global -->
      <div class="section-head" style="margin:16px 0 10px">Outstanding</div>
      <div class="stat-grid-3" style="margin-bottom:14px">
        <div class="stat-card">
          <div class="stat-label">Total outstanding</div>
          <div class="stat-val" style="color:#F09595">${fmtRp(outstandingKonsumen)}</div>
          <div class="stat-sub">${DB.poList.filter(p => p.sisa > 0 && p.status !== 'retur').length} PO aktif</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cicilan kurang bayar</div>
          <div class="stat-val" style="color:#FAC775">${DB.poList.reduce((s, p) => s + (p.cicilan || []).filter(c => c.status === 'kurang').length, 0)}</div>
          <div class="stat-sub">termin dengan sisa tagihan</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">PO terlambat</div>
          <div class="stat-val" style="color:#F09595">${DB.poList.filter(p => p.status === 'telat').length}</div>
          <div class="stat-sub">melewati jatuh tempo</div>
        </div>
      </div>

      <!-- Outstanding per Sales -->
      <div class="card">
        <div class="card-title">Outstanding per Sales</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:0.5px solid var(--border)">
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">Sales</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">PO aktif</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">Outstanding</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">Telat</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">Kurang bayar</th>
          </tr></thead>
          <tbody>
            ${DB.entitas.filter(e => e.peran === 'Sales').map(e => {
      const poSales = DB.poList.filter(p => p.sales === e.nama && p.status !== 'retur' && p.sisa > 0);
      const outstanding = poSales.reduce((s, p) => s + (p.sisa || 0), 0);
      const telat = poSales.filter(p => p.status === 'telat').length;
      const kurang = poSales.reduce((s, p) => s + p.cicilan.filter(c => c.status === 'kurang').length, 0);
      if (!poSales.length) return '';
      return `<tr style="border-bottom:0.5px solid var(--border2)">
                <td style="padding:9px 10px;font-size:13px;color:var(--text2);font-weight:500">${e.nama}</td>
                <td style="padding:9px 10px;font-size:13px;text-align:right">${poSales.length}</td>
                <td style="padding:9px 10px;font-size:13px;text-align:right;color:#F09595;font-weight:500">${fmtRpFull(outstanding)}</td>
                <td style="padding:9px 10px;font-size:13px;text-align:right;color:${telat > 0 ? '#F09595' : 'var(--text4)'}">${telat}</td>
                <td style="padding:9px 10px;font-size:13px;text-align:right;color:${kurang > 0 ? '#FAC775' : 'var(--text4)'}">${kurang}</td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Detail PO Outstanding -->
      <div class="card" style="margin-top:14px">
        <div class="card-title">Detail PO Outstanding</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:0.5px solid var(--border)">
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">PO</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">Konsumen</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">Sales</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">Sisa</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:center">Status</th>
          </tr></thead>
          <tbody>
            ${DB.poList
        .filter(p => p.sisa > 0 && p.status !== 'retur')
        .sort((a, b) => (b.sisa || 0) - (a.sisa || 0))
        .map(p => {
          const stBadge = p.status === 'telat'
            ? '<span class="badge badge-late">Telat</span>'
            : p.cicilan.some(c => c.status === 'kurang')
              ? '<span class="badge" style="background:#2a1e00;color:#FAC775;border:0.5px solid #4a3000">Kurang</span>'
              : '<span class="badge badge-pending">Berjalan</span>';
          return `<tr style="border-bottom:0.5px solid var(--border2)">
                  <td style="padding:8px 10px;font-size:12px;color:var(--accent2);font-weight:500">${p.id}</td>
                  <td style="padding:8px 10px;font-size:12px;color:var(--text2)">${p.konsumen}</td>
                  <td style="padding:8px 10px;font-size:12px;color:var(--text4)">${p.sales}</td>
                  <td style="padding:8px 10px;font-size:13px;text-align:right;color:#F09595;font-weight:500">${fmtRpFull(p.sisa)}</td>
                  <td style="padding:8px 10px;text-align:center">${stBadge}</td>
                </tr>`;
        }).join('')}
          </tbody>
        </table>
      </div>`;

    setTimeout(() => {
      const chart = document.getElementById('laporan-chart');
      if (!chart) return;
      const maxI = Math.max(...chartData.map(d => d.i), 1);
      chart.innerHTML = chartData.map(d => {
        const hi = Math.max(Math.round((d.i / maxI) * 100), d.i > 0 ? 4 : 0);
        return `<div class="bar-col">
          <div class="bar-val">${fmtRp(d.i).replace('Rp ', '')}</div>
          <div class="bar" style="height:${hi}px;background:#0F6E56"></div>
          <div class="bar-label">${d.mg}</div>
        </div>`;
      }).join('');
    }, 50);
  }

  else if (tab === 'barang') {
    const masukGood = (DB.riwayatMasuk || []).filter(r => r.kondisi === 'good').reduce((s, r) => s + r.jumlah, 0);
    const masukReject = (DB.riwayatMasuk || []).filter(r => r.kondisi === 'reject').reduce((s, r) => s + r.jumlah, 0);
    const keluarTotal = DB.poList.reduce((s, p) => s + p.bundle, 0);
    const returGood = (DB.returList || []).reduce((s, r) => {
      if (r.kondisi === 'good') return s + r.jumlah;
      if (r.unitDetail) return s + r.unitDetail.reduce((a, u) => a + (u.good || 0), 0);
      return s;
    }, 0);
    const returReject = (DB.returList || []).reduce((s, r) => {
      if (r.kondisi === 'reject') return s + r.jumlah;
      if (r.unitDetail) return s + r.unitDetail.reduce((a, u) => a + (u.reject || 0), 0);
      return s;
    }, 0);
    container.innerHTML = `
      <div class="stat-grid-4" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">Masuk dari supplier (good)</div><div class="stat-val" style="color:#5DCAA5">${masukGood} unit</div></div>
        <div class="stat-card"><div class="stat-label">Masuk dari supplier (reject)</div><div class="stat-val" style="color:#F09595">${masukReject} unit</div></div>
        <div class="stat-card"><div class="stat-label">Keluar ke konsumen</div><div class="stat-val">${keluarTotal} bundle</div></div>
        <div class="stat-card"><div class="stat-label">Retur (good/reject)</div><div class="stat-val">${returGood}/${returReject}</div></div>
      </div>
      <div class="section-head">Riwayat Barang Masuk dari Supplier</div>
      <div class="tbl-wrap">
        <table><thead><tr>
          <th>Tanggal</th><th>Nama barang</th><th>Kondisi</th><th>Jumlah</th><th>Supplier</th><th>Catatan</th>
        </tr></thead>
        <tbody>${(DB.riwayatMasuk || []).map(r => `<tr>
          <td>${r.tanggal}</td><td>${r.nama}</td>
          <td>${r.kondisi === 'good' ? '<span class="badge badge-good">Good</span>' : '<span class="badge badge-reject">Reject</span>'}</td>
          <td>+${r.jumlah}</td><td>${r.supplier}</td><td style="color:var(--text4)">${r.catatan || '—'}</td>
        </tr>`).join('')}</tbody></table>
      </div>
      <div class="section-head">Retur dari Konsumen / Sales</div>
      <div class="tbl-wrap">
        <table><thead><tr>
          <th>Tanggal</th><th>PO</th><th>Konsumen</th><th>Kondisi</th><th>Jumlah</th><th>Alasan</th>
        </tr></thead>
        <tbody>${(DB.returList || []).map(r => `<tr>
          <td>${r.tanggal}</td><td style="color:#AFA9EC">${r.po}</td><td>${r.konsumen}</td>
          <td>${r.kondisi === 'good' ? '<span class="badge badge-good">Good</span>' : '<span class="badge badge-reject">Reject</span>'}</td>
          <td>${r.jumlah} bundle</td><td style="color:var(--text4)">${r.alasan}</td>
        </tr>`).join('')}</tbody></table>
      </div>`;
  }

  else if (tab === 'penjualan') {
    const totalBundle = DB.poList.reduce((s, p) => s + p.bundle, 0);
    const totalNominal = DB.poList.reduce((s, p) => s + p.total, 0);
    const lunas = DB.poList.filter(p => p.status === 'lunas').length;
    const berjalan = DB.poList.filter(p => p.status === 'berjalan' || p.status === 'telat').length;
    const retur = DB.poList.filter(p => p.status === 'retur').length;
    const avgPO = DB.poList.length ? Math.round(totalNominal / DB.poList.length) : 0;
    container.innerHTML = `
      <div class="stat-grid-4" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">Total bundle terjual</div><div class="stat-val" style="color:#5DCAA5">${totalBundle}</div></div>
        <div class="stat-card"><div class="stat-label">Nilai penjualan</div><div class="stat-val">${fmtRp(totalNominal)}</div></div>
        <div class="stat-card"><div class="stat-label">PO lunas</div><div class="stat-val" style="color:#5DCAA5">${lunas}</div></div>
        <div class="stat-card"><div class="stat-label">PO aktif</div><div class="stat-val" style="color:#FAC775">${berjalan}</div></div>
      </div>
      <div class="stat-grid-4" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">PO retur</div><div class="stat-val" style="color:#F09595">${retur}</div></div>
        <div class="stat-card"><div class="stat-label">Rata-rata nilai/PO</div><div class="stat-val">${fmtRp(avgPO)}</div></div>
        <div class="stat-card"><div class="stat-label">Jumlah PO</div><div class="stat-val">${DB.poList.length}</div></div>
        <div class="stat-card"><div class="stat-label">Bundle rata-rata/PO</div><div class="stat-val">${DB.poList.length ? (totalBundle / DB.poList.length).toFixed(1) : '0'}</div></div>
      </div>
      <div class="section-head">Semua PO</div>
      <div class="tbl-wrap">
        <table><thead><tr>
          <th>PO</th><th>Konsumen</th><th>Bundle</th><th>Total</th><th>Terbayar</th><th>Sisa</th><th>Status</th>
        </tr></thead>
        <tbody>${DB.poList.map(p => {
      const terbayar = p.cicilan.filter(c => c.status === 'lunas').reduce((s, c) => s + c.tagihan, 0);
      const st = p.status === 'telat' ? '<span class="badge badge-late">Telat</span>' : p.status === 'lunas' ? '<span class="badge badge-good">Lunas</span>' : '<span class="badge badge-active">Berjalan</span>';
      return `<tr>
            <td style="color:#AFA9EC">${p.id}</td><td>${p.konsumen}</td><td>${p.bundle}</td>
            <td>${fmtRpFull(p.total)}</td><td style="color:#5DCAA5">${fmtRpFull(terbayar)}</td>
            <td style="color:#F09595">${p.sisa > 0 ? fmtRpFull(p.sisa) : '—'}</td><td>${st}</td>
          </tr>`;
    }).join('')}</tbody></table>
      </div>`;
  }

  else if (tab === 'entitas') {
    // Ingat sub-tab yang sedang aktif (kalau sudah ada)
    const prevElTab = document.querySelector('[data-el-tab].active')?.dataset.elTab || 'sales';
    container.innerHTML = `
      <div class="tabs" id="entitas-laporan-tabs" style="margin-bottom:16px">
        <div class="tab${prevElTab === 'sales' ? ' active' : ''}" data-el-tab="sales" onclick="setEntitasLaporanTab('sales')">Sales</div>
        <div class="tab${prevElTab === 'nego' ? ' active' : ''}" data-el-tab="nego"  onclick="setEntitasLaporanTab('nego')">Nego</div>
        <div class="tab${prevElTab === 'collector' ? ' active' : ''}" data-el-tab="collector" onclick="setEntitasLaporanTab('collector')">Collector</div>
        <div class="tab${prevElTab === 'koordinator' ? ' active' : ''}" data-el-tab="koordinator" onclick="setEntitasLaporanTab('koordinator')">Konsumen</div>
        <div class="tab${prevElTab === 'kc' ? ' active' : ''}" data-el-tab="kc" onclick="setEntitasLaporanTab('kc')">Kepala Cabang</div>
        <div class="tab${prevElTab === 'supir' ? ' active' : ''}" data-el-tab="supir" onclick="setEntitasLaporanTab('supir')">Supir</div>
      </div>
      <div id="entitas-laporan-content"></div>`;
    setEntitasLaporanTab(prevElTab);
  }

  else if (tab === 'konsumen') {
    container.innerHTML = `
      <div class="section-head">Laporan Konsumen</div>
      <div class="tbl-wrap">
        <table><thead><tr>
          <th>Nama</th><th>Kota</th><th>Total PO</th><th>Total Nilai</th><th>Sudah Terbayar</th><th>Sisa Tagihan</th><th>Status</th>
        </tr></thead>
        <tbody>${DB.konsumen.map(k => {
      const pos = DB.poList.filter(p => k.po.includes(p.id));
      const totalNilai = pos.reduce((s, p) => s + p.total, 0);
      const totalTerbayar = pos.reduce((s, p) =>
        s + p.cicilan.filter(c => c.status === 'lunas').reduce((ss, c) => ss + c.tagihan, 0), 0);
      const sisaRT = pos.filter(p => p.status !== 'retur').reduce((s, p) => s + (p.sisa || 0), 0);
      const st = sisaRT > 0
        ? '<span class="badge badge-late">Ada tagihan</span>'
        : '<span class="badge badge-good">Lunas</span>';
      const aktif = !k.aktif ? '<span class="badge badge-reject" style="margin-left:4px">Nonaktif</span>' : '';
      return `<tr>
            <td style="font-weight:500;color:var(--text)">${k.nama}${aktif}</td>
            <td>${k.kota}</td><td>${k.po.length}</td>
            <td>${fmtRpFull(totalNilai)}</td>
            <td style="color:#5DCAA5">${fmtRpFull(totalTerbayar)}</td>
            <td style="color:${sisaRT > 0 ? '#FAC775' : '#5DCAA5'}">${sisaRT > 0 ? fmtRpFull(sisaRT) : 'Lunas'}</td>
            <td>${st}</td>
          </tr>`;
    }).join('')}</tbody></table>
      </div>`;
  }

  else if (tab === 'tahunan') {
    const tahunNum = tahun !== 'semua' ? parseInt(tahun) : new Date().getFullYear();
    const bNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const bFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const parseTglShortL = parseTglShortGlobal;

    // Hitung per bulan
    const perBulan = bNames.map((bn, m) => {
      const masuk = DB.poList.reduce((s, p) =>
        s + p.cicilan.filter(c => {
          if (c.status !== 'lunas') return false;
          const d = parseTglShortL(c.jatuh);
          return d && d.getFullYear() === tahunNum && d.getMonth() === m;
        }).reduce((ss, c) => ss + c.tagihan, 0), 0);
      const poNew = DB.poList.filter(p => { const d = parseTglShortL(p.tanggal); return d && d.getFullYear() === tahunNum && d.getMonth() === m; });
      const bundle = poNew.reduce((s, p) => s + p.bundle, 0);
      const retur = (DB.returList || []).filter(r => { const d = parseTglShortL(r.tanggal); return d && d.getFullYear() === tahunNum && d.getMonth() === m; }).reduce((s, r) => s + r.jumlah, 0);
      return { bn, bFull: bFull[m], masuk, poCount: poNew.length, bundle, retur };
    });

    const totalMasuk = perBulan.reduce((s, d) => s + d.masuk, 0);
    const totalPO = perBulan.reduce((s, d) => s + d.poCount, 0);
    const totalBundle = perBulan.reduce((s, d) => s + d.bundle, 0);
    const totalRetur = perBulan.reduce((s, d) => s + d.retur, 0);
    const uangKeluar = DB.entitas.reduce((s, e) => s + (e.pengeluaran || 0), 0);
    const outstanding = DB.poList.filter(p => p.status !== 'retur').reduce((s, p) => s + (p.sisa || 0), 0);
    const maxMasuk = Math.max(...perBulan.map(d => d.masuk), 1);

    // Bar chart tahunan
    const chartBars = perBulan.map(d => {
      const h = Math.max(Math.round((d.masuk / maxMasuk) * 90), d.masuk > 0 ? 3 : 0);
      return `<div class="bar-col">
        <div class="bar-val" style="font-size:9px">${fmtRp(d.masuk).replace('Rp ', '')}</div>
        <div class="bar" style="height:${h}px;background:#0F6E56"></div>
        <div class="bar-label">${d.bn}</div>
      </div>`;
    }).join('');

    // Tabel per bulan detail
    const tblRows = perBulan.map(d => `<tr>
      <td style="font-weight:500">${d.bFull}</td>
      <td style="color:#5DCAA5">${fmtRpFull(d.masuk)}</td>
      <td>${d.poCount}</td>
      <td>${d.bundle}</td>
      <td style="color:${d.retur > 0 ? '#F09595' : '#5F5E5A'}">${d.retur}</td>
      <td style="color:${d.masuk > 0 ? '#5DCAA5' : '#5F5E5A'}">${d.masuk > 0 ? '✓' : '—'}</td>
    </tr>`).join('');

    // Laporan per konsumen tahunan
    const konsumenRows = DB.konsumen.map(k => {
      const pos = DB.poList.filter(p => k.po.includes(p.id) && (() => { const d = parseTglShortL(p.tanggal); return d && d.getFullYear() === tahunNum; })());
      if (!pos.length) return '';
      const nilai = pos.reduce((s, p) => s + p.total, 0);
      const bayar = pos.reduce((s, p) => s + p.cicilan.filter(c => c.status === 'lunas').reduce((ss, c) => ss + c.tagihan, 0), 0);
      const sisa = pos.filter(p => p.status !== 'retur').reduce((s, p) => s + (p.sisa || 0), 0);
      return `<tr>
        <td style="font-weight:500;color:var(--text)">${k.nama}</td>
        <td>${pos.length}</td>
        <td>${pos.reduce((s, p) => s + p.bundle, 0)}</td>
        <td>${fmtRpFull(nilai)}</td>
        <td style="color:#5DCAA5">${fmtRpFull(bayar)}</td>
        <td style="color:${sisa > 0 ? '#FAC775' : '#5DCAA5'}">${sisa > 0 ? fmtRpFull(sisa) : 'Lunas'}</td>
      </tr>`;
    }).filter(Boolean).join('');

    // Entitas ringkasan tahunan
    const entitasRows = DB.entitas.map(e => {
      const poT = DB.poList.filter(p => (p.sales === e.nama || p.nego === e.nama || p.coll === e.nama || p.koor === e.nama) && (() => { const d = parseTglShortL(p.tanggal); return d && d.getFullYear() === tahunNum; })());
      const unit = e.peran === 'Collector'
        ? poT.reduce((s, p) => s + p.cicilan.filter(c => c.status === 'lunas').length, 0)
        : poT.reduce((s, p) => s + (p.bundle || 0), 0);
      const rateMap = { Sales: DB.settings.komisi_sales, Nego: DB.settings.komisi_nego, Konsumen: DB.settings.komisi_koor, Collector: DB.settings.komisi_coll };
      const kotor = unit * (rateMap[e.peran] || 0);
      const peng = (e.pengeluaranList || []).reduce((s, p) => s + (p.jml || 0), 0);
      return `<tr>
        <td>${e.peran}</td>
        <td style="color:var(--text2)">${e.nama}</td>
        <td>${poT.length}</td>
        <td>${unit}</td>
        <td style="color:#5DCAA5">${fmtRpFull(kotor)}</td>
        <td style="color:#F09595">${fmtRpFull(peng)}</td>
        <td style="font-weight:500">${fmtRpFull(kotor - peng)}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="stat-grid-4" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">Total uang masuk ${tahunNum}</div><div class="stat-val" style="color:#5DCAA5">${fmtRp(totalMasuk)}</div><div class="stat-sub">dari cicilan lunas</div></div>
        <div class="stat-card"><div class="stat-label">Total PO dibuat</div><div class="stat-val">${totalPO}</div><div class="stat-sub">${totalBundle} bundle total</div></div>
        <div class="stat-card"><div class="stat-label">Outstanding belum tertagih</div><div class="stat-val" style="color:#FAC775">${fmtRp(outstanding)}</div></div>
        <div class="stat-card"><div class="stat-label">Total pengeluaran entitas</div><div class="stat-val" style="color:#F09595">${fmtRp(uangKeluar)}</div></div>
      </div>
      <div class="stat-grid-4" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-label">Net cashflow</div><div class="stat-val" style="color:${totalMasuk - uangKeluar >= 0 ? '#5DCAA5' : '#F09595'}">${fmtRp(totalMasuk - uangKeluar)}</div></div>
        <div class="stat-card"><div class="stat-label">Total retur</div><div class="stat-val" style="color:#FAC775">${totalRetur} unit</div></div>
        <div class="stat-card"><div class="stat-label">Bulan paling produktif</div><div class="stat-val" style="font-size:14px">${perBulan.reduce((a, b) => b.masuk > a.masuk ? b : a, perBulan[0]).bFull}</div></div>
        <div class="stat-card"><div class="stat-label">Rata-rata/bulan</div><div class="stat-val">${fmtRp(Math.round(totalMasuk / 12))}</div></div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">Pemasukan per bulan — Tahun ${tahunNum}</div>
        <div class="bar-chart" id="laporan-chart-tahunan" style="height:110px">${chartBars}</div>
        <div style="font-size:11px;color:var(--text4);margin-top:6px">■ Uang masuk (cicilan lunas per bulan)</div>
      </div>
      <div class="section-head">Detail per Bulan</div>
      <div class="tbl-wrap" style="margin-bottom:16px">
        <table><thead><tr>
          <th>Bulan</th><th>Uang Masuk</th><th>PO Baru</th><th>Bundle</th><th>Retur</th><th>Status</th>
        </tr></thead><tbody>${tblRows}</tbody>
        <tfoot><tr style="background:var(--bg5);font-weight:500">
          <td>TOTAL</td>
          <td style="color:#5DCAA5">${fmtRpFull(totalMasuk)}</td>
          <td>${totalPO}</td><td>${totalBundle}</td>
          <td style="color:#FAC775">${totalRetur}</td><td></td>
        </tr></tfoot>
        </table>
      </div>
      <div class="section-head">Rekap Konsumen — Tahun ${tahunNum}</div>
      <div class="tbl-wrap" style="margin-bottom:16px">
        <table><thead><tr>
          <th>Konsumen</th><th>Total PO</th><th>Bundle</th><th>Nilai PO</th><th>Sudah Bayar</th><th>Sisa</th>
        </tr></thead><tbody>${konsumenRows || '<tr><td colspan="6" style="text-align:center;color:var(--text4);padding:16px">Belum ada data konsumen tahun ini</td></tr>'}</tbody></table>
      </div>
      <div class="section-head">Rekap Entitas / Komisi — Tahun ${tahunNum}</div>
      <div class="tbl-wrap">
        <table><thead><tr>
          <th>Peran</th><th>Nama</th><th>PO</th><th>Unit</th><th>Komisi Kotor</th><th>Pengeluaran</th><th>Komisi Bersih</th>
        </tr></thead><tbody>${entitasRows || '<tr><td colspan="7" style="text-align:center;color:var(--text4);padding:16px">Belum ada data entitas</td></tr>'}</tbody></table>
      </div>`;
  }
}

function setEntitasLaporanTab(tab) {
  document.querySelectorAll('[data-el-tab]').forEach(t => t.classList.toggle('active', t.dataset.elTab === tab));
  updateExportLabel('entitas');
  const container = document.getElementById('entitas-laporan-content');
  if (!container) return;

  // Guard: pastikan semua array & settings DB tersedia
  if (!DB.poList) DB.poList = [];
  if (!DB.entitas) DB.entitas = [];
  if (!DB.konsumen) DB.konsumen = [];
  if (!DB.tripList) DB.tripList = [];
  if (!DB.returList) DB.returList = [];
  if (!DB.settings) DB.settings = {};
  const _ks = DB.settings.komisi_sales || 0;
  const _kn = DB.settings.komisi_nego || 0;
  const _kc = DB.settings.komisi_coll || 1500;

  const { bulan: bulanSel, tahun: tahunSel } = getLaporanFilter();

  function poInBulan(po) {
    return poMatchFilter(po, bulanSel, tahunSel);
  }

  // ── SALES ─────────────────────────────────────────────────────
  if (tab === 'sales') {
    const salesList = DB.entitas.filter(e => e.peran === 'Sales');
    const label = (bulanSel === 'semua' && tahunSel === 'semua') ? 'Semua waktu'
      : bulanSel !== 'semua' && tahunSel !== 'semua' ? `${bulanSel} ${tahunSel}`
        : bulanSel !== 'semua' ? bulanSel
          : `Tahun ${tahunSel}`;

    container.innerHTML = salesList.map(e => {
      const poBulan = DB.poList.filter(p => p.sales === e.nama && poInBulan(p));

      // ── Komisi kotor total periode ──────────────────────────
      const bundleBulan = poBulan.reduce((s, p) => s + p.bundle, 0);
      const komisiKotorBulan = bundleBulan * _ks;

      // ── Minus total periode ─────────────────────────────────
      const pengBulan = (e.pengeluaranList || []).filter(x => {
        if (bulanSel === 'semua' && tahunSel === 'semua') return true;
        // Coba match dari PO
        if (x.poId) {
          const po = DB.poList.find(p => p.id === x.poId);
          if (po) return poInBulan(po);
        }
        // Coba match dari keterangan (includes PO id)
        const poByKet = DB.poList.find(p => (x.ket || '').includes(p.id));
        if (poByKet) return poInBulan(poByKet);
        // Coba match dari tripId
        if (x.tripId) {
          const trip = (DB.tripList || []).find(t => t.id === x.tripId);
          if (trip) return poMatchFilter({ tanggal: trip.tanggal }, bulanSel, tahunSel);
        }
        // Coba match dari tanggal field langsung (souvenir, dll)
        if (x.tanggal) return poMatchFilter({ tanggal: x.tanggal }, bulanSel, tahunSel);
        return true;
      });
      const pengLoss = pengBulan.filter(x => x.tipe === 'loss');
      const pengSouvenir = pengBulan.filter(x => x.tipe === 'souvenir' || x.jenis === 'Souvenir' || x.jenis === 'Sovenir');
      const pengOps = pengBulan.filter(x => x.tipe === 'operasional');
      const pengLain = pengBulan.filter(x => x.tipe !== 'loss' && x.tipe !== 'souvenir' && x.tipe !== 'operasional' && x.jenis !== 'Souvenir' && x.jenis !== 'Sovenir');
      const tLoss = pengLoss.reduce((s, x) => s + x.jml, 0);
      const tSouvenir = pengSouvenir.reduce((s, x) => s + x.jml, 0);
      const tOps = pengOps.reduce((s, x) => s + x.jml, 0);
      const tLain = pengLain.reduce((s, x) => s + x.jml, 0);
      const tMinus = tLoss + tSouvenir + tOps + tLain;
      const netKomisi = komisiKotorBulan - tMinus;
      const split1 = Math.round(netKomisi * (DB.settings.split_komisi_pct1 || 60) / 100);
      const split2 = netKomisi - split1;
      const lunasT1 = poBulan.some(p => p.cicilan.filter(c => c.status === 'lunas').length >= (DB.settings.split_termin1 || 4));
      const lunasAll = poBulan.some(p => p.status === 'lunas');
      const totalRetur = (DB.returList || []).filter(r => poBulan.find(p => p.id === r.po)).reduce((s, r) => s + r.jumlah, 0);

      // ── Group PO by tanggal → per hari ─────────────────────
      const hariMap = {};
      poBulan.forEach(p => {
        const tgl = p.tanggal || 'Tanpa tanggal';
        if (!hariMap[tgl]) hariMap[tgl] = [];
        hariMap[tgl].push(p);
      });

      // ── Group pengeluaran by hari ───────────────────────────
      function pengByHari(arr) {
        const m = {};
        arr.forEach(x => {
          // Cari tanggal dari poId atau tripId
          let tgl = null;
          if (x.poId) { const po = DB.poList.find(p => p.id === x.poId); if (po) tgl = po.tanggal; }
          if (!tgl && x.tripId) { const trip = (DB.tripList || []).find(t => t.id === x.tripId); if (trip) tgl = trip.tanggal; }
          if (!tgl) tgl = 'Tanpa tanggal';
          if (!m[tgl]) m[tgl] = [];
          m[tgl].push(x);
        });
        return m;
      }
      const souvByHari = pengByHari(pengSouvenir);
      const opsByHari = pengByHari(pengOps);
      const lossByHari = pengByHari(pengLoss);
      const lainByHari = pengByHari(pengLain);

      // ── Render per hari ─────────────────────────────────────
      const allTanggal = [...new Set([
        ...Object.keys(hariMap),
        ...Object.keys(souvByHari),
        ...Object.keys(opsByHari),
        ...Object.keys(lossByHari),
      ])].sort((a, b) => {
        // Sort ascending by date string "D Mon YYYY"
        const parse = s => parseTglShortGlobal(s) || new Date(0);
        return parse(a) - parse(b);
      });

      const hariRows = allTanggal.map(tgl => {
        const poHari = hariMap[tgl] || [];
        const souvHari = souvByHari[tgl] || [];
        const opsHari = opsByHari[tgl] || [];
        const lossHari = lossByHari[tgl] || [];
        const lainHari = lainByHari[tgl] || [];

        const bundleHari = poHari.reduce((s, p) => s + p.bundle, 0);
        const komisiHari = bundleHari * _ks;
        const tSouvHari = souvHari.reduce((s, x) => s + x.jml, 0);
        const tOpsHari = opsHari.reduce((s, x) => s + x.jml, 0);
        const tLossHari = lossHari.reduce((s, x) => s + x.jml, 0);
        const tLainHari = lainHari.reduce((s, x) => s + x.jml, 0);
        const tMinusHari = tSouvHari + tOpsHari + tLossHari + tLainHari;
        const netHari = komisiHari - tMinusHari;

        // Sort PO by sesi
        const poSorted = [...poHari].sort((a, b) => (a.sesi || 0) - (b.sesi || 0));

        // Sesi rows
        const sesiRows = poSorted.map(p => {
          const souvPO = pengSouvenir.filter(x => x.poId === p.id || (x.ket || '').includes(p.id));
          const lossPO = pengLoss.filter(x => x.poId === p.id || (x.ket || '').includes(p.id));
          const tSouvPO = souvPO.reduce((s, x) => s + x.jml, 0);
          const tLossPO = lossPO.reduce((s, x) => s + x.jml, 0);
          const komisiPO = p.bundle * _ks;
          const netPO = komisiPO - tSouvPO - tLossPO;

          const souvDetail = souvPO.map(x => `<span style="font-size:10px;background:#1a1800;color:#FAC775;padding:1px 6px;border-radius:3px;margin-left:4px">&#127873; ${fmtRpFull(x.jml)}</span>`).join('');
          const lossDetail = lossPO.map(x => `<span style="font-size:10px;background:#1a1000;color:#F09595;padding:1px 6px;border-radius:3px;margin-left:4px">&#9888; ${fmtRpFull(x.jml)}</span>`).join('');

          return `
            <tr style="background:var(--bg2)">
              <td style="padding:6px 10px 6px 28px;font-size:12px;color:var(--text4)">
                <span style="background:var(--bg5);color:var(--accent2);padding:1px 7px;border-radius:4px;font-size:11px;margin-right:6px">Jam ${p.sesi || '?'}</span>
                ${p.lokasi || p.konsumen}
              </td>
              <td style="padding:6px 10px;font-size:12px;color:var(--text4);text-align:center">${p.bundle} bundle</td>
              <td style="padding:6px 10px;font-size:12px;color:#5DCAA5;text-align:right">${fmtRpFull(komisiPO)}</td>
              <td style="padding:6px 10px;font-size:12px;text-align:right">
                ${souvDetail}${lossDetail}
                ${tSouvPO + tLossPO > 0 ? `<div style="font-size:11px;color:#F09595;margin-top:2px">&#8722; ${fmtRpFull(tSouvPO + tLossPO)}</div>` : ''}
              </td>
              <td style="padding:6px 10px;font-size:12px;font-weight:500;text-align:right;color:${netPO >= 0 ? '#5DCAA5' : '#F09595'}">${netPO < 0 ? '&#8722;' : ''}${fmtRpFull(Math.abs(netPO))}</td>
            </tr>`;
        }).join('');

        // Operasional trip hari ini
        const opsRow = tOpsHari > 0 ? `
            <tr style="background:var(--bg2)">
              <td colspan="3" style="padding:5px 10px 5px 28px;font-size:11px;color:#9DC4FA">
                &#128663; Operasional: ${opsHari.map(x => x.ket ? x.ket.split('—')[1]?.split('(')[0]?.trim() || 'Trip' : 'Trip').filter((v, i, a) => a.indexOf(v) === i).join(', ')}
              </td>
              <td style="padding:5px 10px;font-size:11px;color:#9DC4FA;text-align:right">&#8722; ${fmtRpFull(tOpsHari)}</td>
              <td style="padding:5px 10px;font-size:11px;color:#9DC4FA;text-align:right">&#8722; ${fmtRpFull(tOpsHari)}</td>
            </tr>` : '';

        const minusColor = netHari >= 0 ? '#5DCAA5' : '#F09595';

        return `
          <tr style="border-top:0.5px solid var(--border);cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
            <td style="padding:9px 10px;font-size:13px;color:var(--text2);font-weight:500">
              &#9660; ${tgl}
              <span style="font-size:11px;color:var(--text4);font-weight:400;margin-left:8px">${poHari.length} sesi · ${bundleHari} bundle</span>
            </td>
            <td style="padding:9px 10px;font-size:13px;text-align:center;color:var(--text4)">${bundleHari}</td>
            <td style="padding:9px 10px;font-size:13px;text-align:right;color:#5DCAA5">${fmtRpFull(komisiHari)}</td>
            <td style="padding:9px 10px;font-size:13px;text-align:right;color:${tMinusHari > 0 ? '#F09595' : 'var(--text4)'}">${tMinusHari > 0 ? '&#8722; ' + fmtRpFull(tMinusHari) : '—'}</td>
            <td style="padding:9px 10px;font-size:13px;font-weight:600;text-align:right;color:${minusColor}">${netHari < 0 ? '&#8722;' : ''}${fmtRpFull(Math.abs(netHari))}</td>
          </tr>
          <tbody style="display:''">
            ${sesiRows}
            ${opsRow}
          </tbody>`;
      }).join('');

      // ── Summary total ───────────────────────────────────────
      const summaryMinusRows = [
        tLoss > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:var(--text4)">&#9888; Ganti rugi loss</span><span style="color:#F09595">&#8722; ${fmtRpFull(tLoss)}</span></div>` : '',
        tSouvenir > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:var(--text4)">&#127873; Souvenir</span><span style="color:#FAC775">&#8722; ${fmtRpFull(tSouvenir)}</span></div>` : '',
        tOps > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:var(--text4)">&#128663; Operasional trip</span><span style="color:#9DC4FA">&#8722; ${fmtRpFull(tOps)}</span></div>` : '',
        tLain > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:var(--text4)">Lainnya</span><span style="color:#F09595">&#8722; ${fmtRpFull(tLain)}</span></div>` : '',
      ].filter(Boolean).join('');

      return `<div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar-sm" style="background:${e.warna};color:${e.warnaTxt}">${e.inisial}</div>
            <div>
              <div style="font-size:14px;font-weight:500">${e.nama}</div>
              <div style="font-size:11px;color:var(--text4)">${e.peran}${e.nik ? ' &middot; NIK: ' + e.nik : ''}${e.telp ? ' &middot; ' + e.telp : ''}</div>
            </div>
          </div>
          <span style="font-size:11px;color:var(--accent2);background:var(--accent-bg);padding:3px 10px;border-radius:6px">${label}</span>
        </div>
        <div class="stat-grid-3" style="margin-bottom:14px">
          <div class="stat-card"><div class="stat-label">Bundle terjual</div><div class="stat-val">${bundleBulan}</div></div>
          <div class="stat-card"><div class="stat-label">Komisi kotor</div><div class="stat-val" style="color:#5DCAA5">${fmtRp(komisiKotorBulan)}</div></div>
          <div class="stat-card"><div class="stat-label">Komisi bersih</div><div class="stat-val" style="color:${netKomisi >= 0 ? '#5DCAA5' : '#F09595'}">${netKomisi < 0 ? '-' : ''}${fmtRp(Math.abs(netKomisi))}</div></div>
        </div>

        <!-- Tabel per hari + jam -->
        <div style="margin-bottom:12px">
          <div style="font-size:11px;color:var(--text4);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">Rincian Per Hari &amp; Sesi</div>
          <div style="font-size:11px;color:var(--text4);margin-bottom:4px">Klik baris hari untuk expand/collapse sesi</div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:0.5px solid var(--border)">
                <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">Tanggal / Sesi</th>
                <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:center">Bundle</th>
                <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">Komisi kotor</th>
                <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">Minus</th>
                <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">Bersih</th>
              </tr>
            </thead>
            ${hariRows || '<tr><td colspan="5" style="padding:12px;color:var(--text4);text-align:center;font-size:13px">Belum ada PO</td></tr>'}
            <tfoot>
              <tr style="border-top:1px solid var(--border);background:var(--bg5)">
                <td style="padding:9px 10px;font-size:13px;font-weight:600">Total ${label}</td>
                <td style="padding:9px 10px;font-size:13px;text-align:center;font-weight:600">${bundleBulan}</td>
                <td style="padding:9px 10px;font-size:13px;text-align:right;color:#5DCAA5;font-weight:600">${fmtRpFull(komisiKotorBulan)}</td>
                <td style="padding:9px 10px;font-size:13px;text-align:right;color:#F09595;font-weight:600">${tMinus > 0 ? '&#8722; ' + fmtRpFull(tMinus) : '—'}</td>
                <td style="padding:9px 10px;font-size:14px;text-align:right;font-weight:700;color:${netKomisi >= 0 ? '#5DCAA5' : '#F09595'}">${netKomisi < 0 ? '&#8722;' : ''}${fmtRpFull(Math.abs(netKomisi))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Breakdown minus total + split komisi -->
        ${tMinus > 0 || lunasT1 || lunasAll ? `
        <div class="grid2" style="margin-top:4px">
          <div>
            <div style="font-size:11px;color:var(--text4);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">Rincian Potongan</div>
            ${summaryMinusRows}
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;font-weight:500;border-top:0.5px solid var(--border);margin-top:4px">
              <span>Total potongan</span><span style="color:#F09595">&#8722; ${fmtRpFull(tMinus)}</span>
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text4);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">Split Pencairan</div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px">
              <span style="color:#5DCAA5">${(DB.settings.split_komisi_pct1 || 60)}% (termin 1&#8211;${(DB.settings.split_termin1 || 4)})</span>
              <span style="color:${lunasT1 ? '#5DCAA5' : 'var(--text4)'};font-weight:${lunasT1 ? '600' : '400'}">${lunasT1 ? fmtRpFull(split1) : 'Belum cair'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px">
              <span style="color:#FAC775">${DB.settings.split_komisi_pct2}% (sisa termin)</span>
              <span style="color:${lunasAll ? '#FAC775' : 'var(--text4)'};font-weight:${lunasAll ? '600' : '400'}">${lunasAll ? fmtRpFull(split2) : 'Belum cair'}</span>
            </div>
          </div>
        </div>` : ''}
        <div style="display:flex;justify-content:flex-end;padding-top:10px;border-top:0.5px solid var(--border2);margin-top:10px">
          <button class="btn btn-success" style="font-size:11px;padding:4px 14px;border-color:#1a6e40"
            onclick="exportSalesIndividu('${e.nama}')">&#x1F4CA; Export Excel</button>
        </div>
      </div>`;
    }).join('') || '<div class="empty">Tidak ada data Sales</div>';
  }


  // ── NEGO ──────────────────────────────────────────────────────
  else if (tab === 'nego') {
    const negoList = DB.entitas.filter(e => e.peran === 'Nego');
    const label = (bulanSel === 'semua' && tahunSel === 'semua') ? 'Semua waktu'
      : bulanSel !== 'semua' && tahunSel !== 'semua' ? `${bulanSel} ${tahunSel}`
        : bulanSel !== 'semua' ? bulanSel
          : `Tahun ${tahunSel}`;

    container.innerHTML = negoList.map(e => {
      const poNego = DB.poList.filter(p => p.nego === e.nama && poInBulan(p));
      const komisiRate = _kn || 15000;
      const komisi = poNego.length * komisiRate;

      const poRows = poNego.length
        ? poNego.map(p => `
          <tr style="background:var(--bg2)">
            <td style="padding:6px 10px;font-size:12px;color:var(--text4)">
              <a href="#" onclick="selectPO('${p.id}');navigate('transaksi')" style="color:#AFA9EC;text-decoration:underline dotted">${p.id}</a>
            </td>
            <td style="padding:6px 10px;font-size:12px;color:var(--text4)">${p.tanggal || '\u2014'}</td>
            <td style="padding:6px 10px;font-size:12px">${p.konsumen || '\u2014'}</td>
            <td style="padding:6px 10px;font-size:12px;color:var(--text4)">${p.sales || '\u2014'}</td>
            <td style="padding:6px 10px;font-size:12px;color:#5DCAA5;font-weight:500;text-align:right">${fmtRpFull(komisiRate)}</td>
          </tr>`).join('')
        : `<tr><td colspan="5" style="padding:12px;color:var(--text4);text-align:center;font-size:13px">Belum ada PO</td></tr>`;

      return `<div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar-sm" style="background:${e.warna};color:${e.warnaTxt}">${e.inisial}</div>
            <div>
              <div style="font-size:14px;font-weight:500">${e.nama}</div>
              <div style="font-size:11px;color:var(--text4)">${e.peran}${e.nik ? ' &middot; NIK: ' + e.nik : ''}${e.telp ? ' &middot; ' + e.telp : ''}</div>
            </div>
          </div>
          <span style="font-size:11px;color:var(--accent2);background:var(--accent-bg);padding:3px 10px;border-radius:6px">${label}</span>
        </div>
        <div class="stat-grid-3" style="margin-bottom:14px">
          <div class="stat-card"><div class="stat-label">Total PO</div><div class="stat-val">${poNego.length}</div></div>
          <div class="stat-card"><div class="stat-label">Komisi/PO</div><div class="stat-val" style="color:var(--text4);font-size:15px">${fmtRp(komisiRate)}</div></div>
          <div class="stat-card"><div class="stat-label">Total komisi</div><div class="stat-val" style="color:#5DCAA5">${fmtRp(komisi)}</div></div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:0.5px solid var(--border)">
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">ID PO</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">Tanggal</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">Konsumen</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:left">Sales</th>
            <th style="padding:7px 10px;font-size:11px;color:var(--text4);text-align:right">Komisi</th>
          </tr></thead>
          ${poRows}
        </table>
        <div style="display:flex;justify-content:flex-end;padding-top:10px;border-top:0.5px solid var(--border2);margin-top:10px">
          <button class="btn btn-success" style="font-size:11px;padding:4px 14px;border-color:#1a6e40"
            onclick="exportSalesIndividu('${e.nama}')">&#x1F4CA; Export Excel</button>
        </div>
      </div>`;
    }).join('') || '<div class="empty">Tidak ada data Nego</div>';
  }

  // ── COLLECTOR ─────────────────────────────────────────────────
  else if (tab === 'collector') {
    const collList = DB.entitas.filter(e => e.peran === 'Collector');
    const labelC = (bulanSel === 'semua' && tahunSel === 'semua') ? 'Semua waktu'
      : bulanSel !== 'semua' && tahunSel !== 'semua' ? `${bulanSel} ${tahunSel}`
        : bulanSel !== 'semua' ? bulanSel : `Tahun ${tahunSel}`;
    container.innerHTML = collList.map(e => {
      const poColl = DB.poList.filter(p => p.coll === e.nama && poInBulan(p));
      const totalTx = poColl.reduce((s, p) =>
        s + p.cicilan.filter(c => c.status === 'lunas' || c.status === 'kurang' || (c.terbayar || 0) > 0).length, 0);
      const komisiRate = _kc || 1500;
      const komisi = totalTx * komisiRate;
      return `<div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar-sm" style="background:${e.warna};color:${e.warnaTxt}">${e.inisial}</div>
            <div><div style="font-size:14px;font-weight:500">${e.nama}</div>
            <div style="font-size:11px;color:var(--text4)">${e.peran}${e.nik ? ' &middot; NIK: ' + e.nik : ''}</div></div>
          </div>
          <span style="font-size:11px;color:var(--accent2);background:var(--accent-bg);padding:3px 10px;border-radius:6px">${labelC}</span>
        </div>
        <div class="stat-grid-3" style="margin-bottom:12px">
          <div class="stat-card"><div class="stat-label">Kwitansi tertagih</div><div class="stat-val">${totalTx}</div></div>
          <div class="stat-card"><div class="stat-label">Komisi/kwitansi</div><div class="stat-val" style="color:var(--text4);font-size:15px">${fmtRp(komisiRate)}</div></div>
          <div class="stat-card"><div class="stat-label">Total komisi</div><div class="stat-val" style="color:#5DCAA5">${fmtRp(komisi)}</div></div>
        </div>
        <div style="display:flex;justify-content:flex-end;padding-top:10px;border-top:0.5px solid var(--border2)">
          <button class="btn btn-success" style="font-size:11px;padding:4px 14px;border-color:#1a6e40"
            onclick="cetakKwitansiKomisi(${e.id})">&#x1F9FE; Kwitansi Komisi</button>
        </div>
      </div>`;
    }).join('') || '<div class="empty">Tidak ada data Collector</div>';
  }

  // ── KOORDINATOR ─────────────────────────────────────────────
  else if (tab === 'koordinator') {
    const label2 = (bulanSel === 'semua' && tahunSel === 'semua') ? 'Semua waktu'
      : bulanSel !== 'semua' && tahunSel !== 'semua' ? `${bulanSel} ${tahunSel}`
        : bulanSel !== 'semua' ? bulanSel : `Tahun ${tahunSel}`;
    const konsList = DB.konsumen.filter(k => k.aktif !== false);
    const rewardCfg = DB.settings.rewardConfig || [];
    // Tampilkan info config reward di atas
    const cfgInfo = rewardCfg.length
      ? `<div style="background:var(--bg2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px">
          <div style="font-weight:600;color:var(--text2);margin-bottom:6px">\u{1F381} Konfigurasi Reward Aktif</div>
          ${rewardCfg.map(r => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid var(--border2)">
            <span style="color:var(--text4)">Grade ${r.gradeMin}\u2013${r.gradeMax ?? '\u221e'}</span>
            <span style="font-weight:500">${r.reward}</span>
            ${r.invNama ? `<span style="color:var(--text4);font-size:11px">inv: ${r.invNama}</span>` : ''}
          </div>`).join('')}
        </div>`
      : `<div style="background:#2a1a0a;border:1px dashed #8B6914;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#FAC775">
          \u26A0\uFE0F Belum ada konfigurasi reward. Buka <strong>Settings</strong> dan buat rule reward terlebih dahulu.
        </div>`;
    container.innerHTML = cfgInfo + (konsList.map(k => {
      const closedPO = DB.poList.filter(p =>
        (p.konsumenId === k.id || p.konsumen === k.nama) &&
        p.status === 'lunas' && poInBulan(p));
      const grade = closedPO.reduce((s, p) => s + p.bundle, 0);
      // Cari reward berdasarkan grade
      const rwCfg = rewardCfg.find(r => grade >= (r.gradeMin || 0) && (r.gradeMax === null || r.gradeMax === undefined || grade <= r.gradeMax));
      const rwLabel = rwCfg
        ? `<span style="color:#FAC775;font-weight:600">\u{1F381} ${rwCfg.reward}</span>${rwCfg.invNama ? ` <span style="font-size:10px;color:var(--text4)">(stok: ${(DB.inventory.find(i => i.nama === rwCfg.invNama) || {}).stok ?? '?'})</span>` : ''}`
        : `<span style="color:var(--text4);font-size:12px">Tidak ada reward untuk grade ini</span>`;
      // Cek riwayat cair periode ini
      const sudahCair = (k.riwayatCair || []).some(r => r.periode === label2 && r.reward);
      return `<div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar-sm" style="background:#1B3A5C;color:#FAC775">${k.nama.charAt(0).toUpperCase()}</div>
            <div><div style="font-size:14px;font-weight:500">${k.nama}</div>
            <div style="font-size:11px;color:var(--text4)">Konsumen &middot; ${k.kota || '&mdash;'}${k.telp ? ' &middot; ' + k.telp : ''}</div></div>
          </div>
          <span style="font-size:11px;color:var(--accent2);background:var(--accent-bg);padding:3px 10px;border-radius:6px">${label2}</span>
        </div>
        <div class="stat-grid-3" style="margin-bottom:12px">
          <div class="stat-card"><div class="stat-label">PO Lunas</div><div class="stat-val">${closedPO.length}</div></div>
          <div class="stat-card"><div class="stat-label">Grade (bundle lunas)</div><div class="stat-val" style="color:#FAC775;font-size:18px">${grade}</div></div>
          <div class="stat-card"><div class="stat-label">Reward</div><div class="stat-val" style="font-size:13px">${rwLabel}</div></div>
        </div>
        ${sudahCair ? `<div style="font-size:11px;color:#5DCAA5;margin-bottom:8px">✓ Reward sudah dicairkan periode ini</div>` : ''}
        <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:10px;border-top:0.5px solid var(--border2)">
          <button class="btn btn-success" style="font-size:11px;padding:4px 14px;border-color:#1a6e40"
            onclick="cetakKwitansiKomisiKonsumen('${k.id}')">&#x1F9FE; Kwitansi</button>
          ${rwCfg && !sudahCair ? `<button class="btn" style="font-size:11px;padding:4px 14px;background:#2a1a05;border-color:#8B6914;color:#FAC775"
            onclick="cairkanRewardKonsumen('${k.id}')">\u{1F381} Cairkan Reward</button>` : ''}
        </div>
      </div>`;
    }).join('') || '<div class="empty">Tidak ada data Konsumen</div>');
  }

  // ── KEPALA CABANG ─────────────────────────────────────────────
  else if (tab === 'kc') {
    const kcList = DB.entitas.filter(e => e.peran === 'Kepala Cabang');
    const poLunas = DB.poList.filter(p => p.status === 'lunas' && poInBulan(p));
    const labelKC = (bulanSel === 'semua' && tahunSel === 'semua') ? 'Semua waktu'
      : bulanSel !== 'semua' && tahunSel !== 'semua' ? `${bulanSel} ${tahunSel}`
        : bulanSel !== 'semua' ? bulanSel : `Tahun ${tahunSel}`;
    container.innerHTML = kcList.map(e => {
      const bE = poLunas.reduce((s, p) => s + p.bundle, 0);
      const komisiRateKC = DB.settings.komisi_kc || 5000;
      const k = bE * komisiRateKC;
      return `<div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar-sm" style="background:${e.warna};color:${e.warnaTxt}">${e.inisial}</div>
            <div><div style="font-size:14px;font-weight:500">${e.nama}</div>
            <div style="font-size:11px;color:var(--text4)">${e.peran}${e.nik ? ' &middot; NIK: ' + e.nik : ''}</div></div>
          </div>
          <span style="font-size:11px;color:var(--accent2);background:var(--accent-bg);padding:3px 10px;border-radius:6px">${labelKC}</span>
        </div>
        <div class="stat-grid-3" style="margin-bottom:12px">
          <div class="stat-card"><div class="stat-label">PO Lunas</div><div class="stat-val">${poLunas.length}</div></div>
          <div class="stat-card"><div class="stat-label">Bundle &times; ${fmtRp(komisiRateKC)}</div><div class="stat-val" style="color:var(--text4);font-size:14px">${bE}</div></div>
          <div class="stat-card"><div class="stat-label">Total komisi</div><div class="stat-val" style="color:#5DCAA5">${fmtRp(k)}</div></div>
        </div>
        <div style="display:flex;justify-content:flex-end;padding-top:10px;border-top:0.5px solid var(--border2)">
          <button class="btn btn-success" style="font-size:11px;padding:4px 14px;border-color:#1a6e40"
            onclick="cetakKwitansiKomisi(${e.id})">&#x1F9FE; Kwitansi Komisi</button>
        </div>
      </div>`;
    }).join('') || '<div class="empty">Tidak ada data Kepala Cabang</div>';
  }

  else if (tab === 'supir') {
    const supirList = DB.entitas.filter(e => e.peran === 'Supir');
    const label = bulanSel !== 'semua' && tahunSel !== 'semua' ? `${bulanSel} ${tahunSel}` : bulanSel !== 'semua' ? bulanSel : tahunSel !== 'semua' ? tahunSel : 'Semua waktu';
    if (!supirList.length) {
      container.innerHTML = '<div class="empty">Belum ada entitas dengan peran Supir terdaftar.</div>';
      return;
    }
    container.innerHTML = supirList.map(supir => {
      // Trip yang melibatkan supir ini dalam periode filter
      const tripsSupir = (DB.tripList || []).filter(t => {
        if (t.supirId !== supir.id && t.supirNama !== supir.nama) return false;
        const d = parseTglShortGlobal(t.tanggal);
        if (!d) return false;
        if (tahunSel !== 'semua' && d.getFullYear() !== parseInt(tahunSel)) return false;
        if (bulanSel !== 'semua') {
          const bNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          if (bNames[d.getMonth()] !== bulanSel) return false;
        }
        return true;
      });
      const totalTrip = tripsSupir.length;
      const totalUpah = tripsSupir.reduce((s, t) => s + (t.upahSupir || 0), 0);
      const totalUpahAllTime = (DB.tripList || [])
        .filter(t => t.supirId === supir.id || t.supirNama === supir.nama)
        .reduce((s, t) => s + (t.upahSupir || 0), 0);
      const sudahCair = supir.komisiDibayar || 0;
      const belumCair = Math.max(0, totalUpahAllTime - sudahCair);
      return `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:#1a2a1a;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#5DCAA5;border:1.5px solid #2a4a2a">
              ${supir.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-size:14px;font-weight:500;color:var(--text)">${supir.nama}</div>
              <div style="font-size:11px;color:var(--text4)">Supir · NIK: ${supir.nik || '—'}</div>
            </div>
          </div>
          <span style="font-size:11px;color:var(--text4);background:var(--bg5);padding:3px 8px;border-radius:4px">${label}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
          <div class="stat-card"><div class="stat-label">Trip periode ini</div><div class="stat-val">${totalTrip}</div></div>
          <div class="stat-card"><div class="stat-label">Upah periode ini</div><div class="stat-val" style="color:#5DCAA5">${fmtRp(totalUpah)}</div></div>
          <div class="stat-card"><div class="stat-label">Total upah all-time</div><div class="stat-val" style="color:#FAC775">${fmtRp(totalUpahAllTime)}</div></div>
          <div class="stat-card"><div class="stat-label">Belum dicairkan</div><div class="stat-val" style="color:${belumCair > 0 ? '#F09595' : '#5DCAA5'}">${belumCair > 0 ? fmtRp(belumCair) : '—'}</div></div>
        </div>
        ${totalTrip > 0 ? `
        <div style="font-size:11px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Riwayat trip</div>
        <div class="tbl-wrap"><table><thead><tr>
          <th>Tanggal</th><th>Konsumen</th><th>Tujuan</th><th>Upah supir</th><th>Total trip</th>
        </tr></thead><tbody>${tripsSupir.map(t => `<tr>
          <td style="color:var(--text4)">${t.tanggal || '—'}</td>
          <td>${t.konsumen || '—'}</td>
          <td style="color:var(--text4)">${t.tujuan || '—'}</td>
          <td style="color:#5DCAA5">${t.upahSupir > 0 ? fmtRpFull(t.upahSupir) : '—'}</td>
          <td style="color:var(--text4)">${fmtRpFull(t.total || 0)}</td>
        </tr>`).join('')}</tbody></table></div>` : '<div style="font-size:12px;color:var(--text4);padding:8px 0">Tidak ada trip di periode ini.</div>'}
        <div style="display:flex;justify-content:flex-end;padding-top:10px;border-top:0.5px solid var(--border2);margin-top:10px">
          <button class="btn btn-success" style="font-size:11px;padding:4px 14px;border-color:#1a6e40"
            onclick="cetakKwitansiKomisi(${supir.id})">&#x1F9FE; Kwitansi Komisi</button>
        </div>
      </div>`;
    }).join('');
  }
}

// ============================================================
// TRIP HARIAN — Render
// ============================================================
function renderTripPage() {
  const statsEl = document.getElementById('trip-stats');
  const listEl = document.getElementById('trip-list');
  if (!listEl) return;

  const trips = DB.tripList || [];

  // ── Stats ──
  const totalTrip = trips.length;
  const totalBiaya = trips.reduce((s, t) => s + (t.total || 0), 0);
  const bulanIni = new Date().toLocaleString('id-ID', { month: 'short', year: 'numeric' });
  const tripBulanIni = trips.filter(t => (t.tanggal || '').includes(bulanIni));
  const biayaBulan = tripBulanIni.reduce((s, t) => s + (t.total || 0), 0);

  if (statsEl) {
    statsEl.innerHTML = `
            <div class="stat-card"><div class="stat-label">Total trip</div><div class="stat-val">${totalTrip}</div></div>
            <div class="stat-card"><div class="stat-label">Trip bulan ini</div><div class="stat-val">${tripBulanIni.length}</div></div>
            <div class="stat-card"><div class="stat-label">Biaya bulan ini</div><div class="stat-val" style="color:#F09595">${fmtRp(biayaBulan)}</div></div>
            <div class="stat-card"><div class="stat-label">Total biaya all-time</div><div class="stat-val" style="color:#F09595">${fmtRp(totalBiaya)}</div></div>`;
  }

  if (!trips.length) {
    listEl.innerHTML = '<div class="empty">Belum ada trip tercatat.<br>Klik "+ Catat Trip" untuk menambah.</div>';
    return;
  }

  // Group by bulan
  const byBulan = {};
  trips.forEach(t => {
    const parts = (t.tanggal || '').split(' ');
    const key = parts.length >= 3 ? parts.slice(1).join(' ') : 'Tanpa tanggal';
    if (!byBulan[key]) byBulan[key] = [];
    byBulan[key].push(t);
  });

  listEl.innerHTML = Object.entries(byBulan).map(([bulan, list]) => {
    const totalBulan = list.reduce((s, t) => s + (t.total || 0), 0);
    const rows = list.map(t => {
      const salesBadges = (t.salesNama || []).map(n =>
        `<span style="font-size:11px;background:var(--bg5);padding:1px 7px;border-radius:4px;color:var(--text4)">${n}</span>`
      ).join(' ');

      const biayaDetail = [
        t.sewa > 0 ? `Sewa ${fmtRpFull(t.sewa)}` : '',
        t.bensin > 0 ? `Bensin ${fmtRpFull(t.bensin)}` : '',
        t.upahSupir > 0 ? `Supir ${fmtRpFull(t.upahSupir)}` : '',
        t.lain > 0 ? `Lain ${fmtRpFull(t.lain)}` : '',
      ].filter(Boolean).join(' &middot; ');

      return `
            <div style="padding:12px 14px;border-bottom:0.5px solid var(--border2)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div style="font-size:13px;font-weight:500;color:var(--text2);margin-bottom:4px">
                    ${t.tanggal}${t.jam ? '  #' + t.jam + ' trip' : ''}${t.tujuan ? ' → ' + t.tujuan : ''}${t.ket ? ' — ' + t.ket : ''}
                  </div>
                  <div style="font-size:11px;color:var(--text4);margin-bottom:6px">
                    &#128663; Supir: <strong style="color:var(--text2)">${t.supirNama}</strong>
                    &nbsp;&middot;&nbsp; ${biayaDetail}
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">
                    <span style="font-size:11px;color:var(--text4)">Sales:</span>
                    ${salesBadges}
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:16px">
                  <div style="font-size:14px;font-weight:600;color:#F09595">${fmtRpFull(t.total)}</div>
                  <div style="font-size:11px;color:var(--text4);margin-top:2px">
                    ${fmtRpFull(t.perSales)}/sales &times; ${(t.salesIds || []).length}
                  </div>
                  <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">
                    <button class="btn" style="padding:2px 10px;font-size:11px" onclick="openTripModal('${t.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding:2px 10px;font-size:11px" onclick="hapusTrip('${t.id}')">Hapus</button>
                  </div>
                </div>
              </div>
            </div>`;
    }).join('');

    return `
        <div class="card" style="margin-bottom:14px;padding:0;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:0.5px solid var(--border2);background:var(--bg)">
            <span style="font-size:13px;font-weight:500;color:var(--text2)">${bulan}</span>
            <span style="font-size:12px;color:#F09595;font-weight:500">${fmtRpFull(totalBulan)}</span>
          </div>
          ${rows}
        </div>`;
  }).join('');
}