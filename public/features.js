// FEATURES — Modal Actions, Buat PO, Settings, Export

// INVENTORY
function openEditBarang(id) {
    const item = DB.inventory.find(x => x.id === id);
    if (!item) return;
    document.getElementById('modal-edit-barang-title').textContent = `Edit: ${item.nama}`;
    document.getElementById('eb-nama').value = item.nama;
    document.getElementById('eb-stok').value = item.stok;
    document.getElementById('eb-min').value = item.min;
    document.getElementById('eb-kondisi').value = item.kondisi;
    document.getElementById('eb-id').value = item.id;
    // Isi harga jika ada
    const hargaEl = document.getElementById('eb-harga');
    if (hargaEl) hargaEl.value = item.harga ? fmtRpFull(item.harga) : '';
    openModal('modal-edit-barang');
}

function submitEditBarang() {
    const id = parseInt(document.getElementById('eb-id').value);
    const item = DB.inventory.find(x => x.id === id);
    if (!item) return;
    item.nama = document.getElementById('eb-nama').value.trim() || item.nama;
    item.stok = parseInt(document.getElementById('eb-stok').value) || 0;
    item.min = parseInt(document.getElementById('eb-min').value) || 0;
    item.kondisi = document.getElementById('eb-kondisi').value;
    const hargaEl = document.getElementById('eb-harga');
    if (hargaEl && hargaEl.value.trim()) {
        item.harga = parseRp(hargaEl.value);
    }
    saveDB();
    closeModal('modal-edit-barang');
    toast(`${item.nama} berhasil diperbarui`);
    addAudit(`Edit barang: ${item.nama}`);
    renderInventory();
}

function submitBarangMasuk() {
    const nama = document.getElementById('bm-nama').value.trim();
    const kondisi = document.getElementById('bm-kondisi').value;
    const jml = parseInt(document.getElementById('bm-jumlah').value) || 0;
    const tgl = document.getElementById('bm-tanggal').value;
    const sup = document.getElementById('bm-supplier').value.trim();
    const cat = document.getElementById('bm-catatan').value.trim();
    const isNama = document.getElementById('bm-nama-type')?.value === 'baru';
    const namaBaru = document.getElementById('bm-nama-baru')?.value?.trim();
    const finalNama = isNama && namaBaru ? namaBaru : nama;
    const kategori = document.getElementById('bm-kategori')?.value || 'jual';
    const harga = parseRp(document.getElementById('bm-harga')?.value || '');

    if (!jml || jml <= 0) { toast('Jumlah tidak valid', 'error'); return; }
    if (!finalNama) { toast('Nama barang wajib diisi', 'error'); return; }

    // Cari atau buat item inventory
    let item = DB.inventory.find(x => x.nama === finalNama && x.kondisi === kondisi);
    if (item) {
        item.stok += jml;
        item.terakhir = formatDateShort(tgl) || item.terakhir;
        // Update harga jika diisi
        if (harga > 0) item.harga = harga;
    } else {
        // Tambah entry baru
        const newItem = {
            id: DB.nextInvId++,
            nama: finalNama,
            kategori: kategori,
            kondisi: kondisi,
            stok: jml,
            min: 0,
            terakhir: formatDateShort(tgl) || formatDateShort(new Date().toISOString().split('T')[0])
        };
        if (harga > 0) newItem.harga = harga;
        DB.inventory.push(newItem);
    }

    DB.riwayatMasuk.unshift({
        id: DB.nextRiwayatId++,
        tanggal: formatDateShort(tgl) || formatDateShort(new Date().toISOString().split('T')[0]),
        nama: finalNama, kondisi, jumlah: jml, supplier: sup, catatan: cat
    });

    // Reset field harga
    const hargaEl = document.getElementById('bm-harga');
    if (hargaEl) hargaEl.value = '';

    // Update dropdown bm-nama
    refreshBarangOptions();
    saveDB();
    closeModal('modal-barang-masuk');
    toast(`${jml} unit ${finalNama} (${kondisi}) berhasil ditambahkan`);
    addAudit(`Barang masuk: ${jml}x ${finalNama} kondisi ${kondisi}`);
    renderInventory();
}

function onBmKategoriChange(val) {
    const hargaRow = document.getElementById('bm-harga-row');
    const rewardInfo = document.getElementById('bm-reward-info');
    const cfgList = document.getElementById('bm-reward-cfg-list');
    if (val === 'reward') {
        // Sembunyikan harga
        if (hargaRow) hargaRow.style.display = 'none';
        // Tampilkan info grade config
        if (rewardInfo) rewardInfo.style.display = 'block';
        if (cfgList) {
            const cfg = DB.settings.rewardConfig || [];
            if (!cfg.length) {
                cfgList.innerHTML = '\u26a0\ufe0f Belum ada konfigurasi reward di Settings. Tambahkan dulu sebelum input barang reward.';
            } else {
                cfgList.innerHTML = '<strong>Konfigurasi reward aktif:</strong><br>' +
                    cfg.map(r => `\u2022 Grade ${r.gradeMin}\u2013${r.gradeMax ?? '\u221e'}: <strong>${r.reward}</strong>${r.invNama ? ` (nama di inventory: <em>${r.invNama}</em>)` : ''}`).join('<br>');
            }
        }
    } else {
        if (hargaRow) hargaRow.style.display = '';
        if (rewardInfo) rewardInfo.style.display = 'none';
    }
}

function refreshBarangOptions() {
    const namaSet = [...new Set(DB.inventory.map(i => i.nama))];
    const sel = document.getElementById('bm-nama');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = namaSet.map(n => `<option value="${n}" ${n === cur ? 'selected' : ''}>${n}</option>`).join('');
    // Auto-fill harga dari barang pertama
    if (namaSet.length) prefillHargaBarang(sel.value || namaSet[0]);
}

function prefillHargaBarang(nama) {
    const item = DB.inventory.find(i => i.nama === nama && i.harga);
    const hargaEl = document.getElementById('bm-harga');
    if (!hargaEl) return;
    if (item && item.harga) {
        hargaEl.value = fmtRpFull(item.harga);
        hargaEl.style.color = '#5DCAA5';
    } else {
        hargaEl.value = '';
        hargaEl.style.color = '';
    }
}

// BUNDLE / SET BARANG

function openBuatBundle() {
    // Reset form
    document.getElementById('bdl-nama').value = '';
    document.getElementById('bdl-harga').value = '';
    document.getElementById('bdl-stok').value = '0';
    document.getElementById('bdl-desc').value = '';
    // Mulai dengan 2 baris komponen kosong
    renderBundleKomponenRows('bdl-komponen-rows', [
        { invId: '', nama: '', qty: 1 },
        { invId: '', nama: '', qty: 1 }
    ]);
    openModal('modal-buat-bundle');
}

function getBundleKomponenRows(containerId) {
    const rows = document.querySelectorAll(`#${containerId} .bdl-row`);
    const result = [];
    rows.forEach(row => {
        const sel = row.querySelector('select');
        const inp = row.querySelector('input[type="number"]');
        const invId = parseInt(sel?.value) || null;
        const qty = parseInt(inp?.value) || 1;
        if (invId) {
            const inv = DB.inventory.find(i => i.id === invId);
            result.push({ invId, nama: inv ? inv.nama : '', qty });
        }
    });
    return result;
}

function renderBundleKomponenRows(containerId, komponen) {
    const el = document.getElementById(containerId);
    if (!el) return;
    // Buat opsi barang dari inventory (kondisi good)
    const opts = DB.inventory
        .filter(i => i.kondisi === 'good')
        .map(i => `<option value="${i.id}">${i.nama} (stok: ${i.stok})</option>`)
        .join('');
    el.innerHTML = (komponen || []).map((k, idx) => `
    <div class="bdl-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <select class="select" style="flex:1;background:var(--bg)" onchange="updateBundleStokPreview('${containerId}')">
        <option value="">-- Pilih barang --</option>
        ${DB.inventory.filter(i => i.kondisi === 'good').map(i =>
        `<option value="${i.id}" ${i.id === k.invId ? 'selected' : ''}>${i.nama} (stok: ${i.stok})</option>`
    ).join('')}
      </select>
      <input class="input" type="number" value="${k.qty}" min="1" style="width:70px;background:var(--bg)"
        placeholder="Qty" onchange="updateBundleStokPreview('${containerId}')" />
      <button class="btn btn-danger" style="padding:4px 8px;font-size:14px;flex-shrink:0"
        onclick="this.closest('.bdl-row').remove();updateBundleStokPreview('${containerId}')">×</button>
    </div>`).join('');
    updateBundleStokPreview(containerId);
}

function updateBundleStokPreview(containerId) {
    // Hitung stok bundle preview
    const rows = document.querySelectorAll(`#${containerId} .bdl-row`);
    let minStok = Infinity;
    rows.forEach(row => {
        const sel = row.querySelector('select');
        const inp = row.querySelector('input[type="number"]');
        const invId = parseInt(sel?.value) || 0;
        const qty = parseInt(inp?.value) || 1;
        if (!invId) return;
        const inv = DB.inventory.find(i => i.id === invId);
        const bisa = inv ? Math.floor(inv.stok / qty) : 0;
        if (bisa < minStok) minStok = bisa;
    });
    // Update field stok preview (ada di buat & edit)
    const stokEl = document.getElementById('bdl-stok') || document.getElementById('ebd-stok');
    if (stokEl) stokEl.value = minStok === Infinity ? 0 : minStok;
}

function addBundleKomponenRow() {
    const el = document.getElementById('bdl-komponen-rows');
    if (!el) return;
    const newRow = document.createElement('div');
    newRow.className = 'bdl-row';
    newRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px';
    newRow.innerHTML = `
      <select class="select" style="flex:1;background:var(--bg)" onchange="updateBundleStokPreview('bdl-komponen-rows')">
        <option value="">-- Pilih barang --</option>
        ${DB.inventory.filter(i => i.kondisi === 'good').map(i =>
        `<option value="${i.id}">${i.nama} (stok: ${i.stok})</option>`
    ).join('')}
      </select>
      <input class="input" type="number" value="1" min="1" style="width:70px;background:var(--bg)"
        placeholder="Qty" onchange="updateBundleStokPreview('bdl-komponen-rows')" />
      <button class="btn btn-danger" style="padding:4px 8px;font-size:14px;flex-shrink:0"
        onclick="this.closest('.bdl-row').remove();updateBundleStokPreview('bdl-komponen-rows')">×</button>`;
    el.appendChild(newRow);
}

function addEditBundleKomponenRow() {
    const el = document.getElementById('ebd-komponen-rows');
    if (!el) return;
    const newRow = document.createElement('div');
    newRow.className = 'bdl-row';
    newRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px';
    newRow.innerHTML = `
      <select class="select" style="flex:1;background:var(--bg)" onchange="updateBundleStokPreview('ebd-komponen-rows')">
        <option value="">-- Pilih barang --</option>
        ${DB.inventory.filter(i => i.kondisi === 'good').map(i =>
        `<option value="${i.id}">${i.nama} (stok: ${i.stok})</option>`
    ).join('')}
      </select>
      <input class="input" type="number" value="1" min="1" style="width:70px;background:var(--bg)"
        placeholder="Qty" onchange="updateBundleStokPreview('ebd-komponen-rows')" />
      <button class="btn btn-danger" style="padding:4px 8px;font-size:14px;flex-shrink:0"
        onclick="this.closest('.bdl-row').remove();updateBundleStokPreview('ebd-komponen-rows')">×</button>`;
    el.appendChild(newRow);
}

function submitBuatBundle() {
    const nama = document.getElementById('bdl-nama').value.trim();
    if (!nama) { toast('Nama bundle wajib diisi', 'error'); return; }
    const harga = parseRp(document.getElementById('bdl-harga').value || '');
    const desc = document.getElementById('bdl-desc').value.trim();
    const komponen = getBundleKomponenRows('bdl-komponen-rows');
    if (!komponen.length) { toast('Tambahkan minimal 1 komponen barang', 'error'); return; }

    if (!DB.bundleDef) DB.bundleDef = [];
    const newBundle = {
        id: Date.now(),
        nama, harga, desc,
        komponen,
        aktif: true,
        dibuat: new Date().toLocaleDateString('id-ID')
    };
    DB.bundleDef.push(newBundle);
    saveDB();
    closeModal('modal-buat-bundle');
    toast(`Bundle "${nama}" berhasil dibuat`);
    addAudit(`Buat bundle: ${nama}`);
    // Pindah ke tab bundle
    document.querySelectorAll('[data-inv-tab]').forEach(t => t.classList.toggle('active', t.dataset.invTab === 'bundle'));
    renderInventory();
}

function openEditBundle(id) {
    if (!DB.bundleDef) return;
    const b = DB.bundleDef.find(x => x.id === id);
    if (!b) return;
    document.getElementById('ebd-id').value = b.id;
    document.getElementById('ebd-nama').value = b.nama;
    document.getElementById('ebd-harga').value = b.harga ? fmtRpFull(b.harga) : '';
    document.getElementById('ebd-desc').value = b.desc || '';
    document.getElementById('ebd-aktif').value = b.aktif !== false ? '1' : '0';
    // Tambah field stok preview kalau belum ada
    let stokEl = document.getElementById('ebd-stok');
    if (!stokEl) {
        // sudah di HTML modal edit bundle
    }
    renderBundleKomponenRows('ebd-komponen-rows', b.komponen || []);
    openModal('modal-edit-bundle');
}

function submitEditBundle() {
    const id = parseInt(document.getElementById('ebd-id').value);
    if (!DB.bundleDef) return;
    const b = DB.bundleDef.find(x => x.id === id);
    if (!b) return;
    const nama = document.getElementById('ebd-nama').value.trim();
    if (!nama) { toast('Nama bundle wajib diisi', 'error'); return; }
    b.nama = nama;
    b.harga = parseRp(document.getElementById('ebd-harga').value || '');
    b.desc = document.getElementById('ebd-desc').value.trim();
    b.aktif = document.getElementById('ebd-aktif').value === '1';
    b.komponen = getBundleKomponenRows('ebd-komponen-rows');
    saveDB();
    closeModal('modal-edit-bundle');
    toast(`Bundle "${b.nama}" diperbarui`);
    addAudit(`Edit bundle: ${b.nama}`);
    renderBundleList();
}

function hapusBundle(id) {
    if (!DB.bundleDef) return;
    const b = DB.bundleDef.find(x => x.id === id);
    if (!b) return;
    konfirmasiHapus('Hapus Bundle', `Hapus bundle "${b.nama}" secara permanen?`, () => {
        DB.bundleDef = DB.bundleDef.filter(x => x.id !== id);
        saveDB();
        toast(`Bundle ${b.nama} dihapus`);
        addAudit(`Hapus bundle: ${b.nama}`);
        renderBundleList();
    });
}

// ── Retur: inisialisasi saat PO dipilih ──────────────────────
function onReturPOChange() {
    const poId = document.getElementById('retur-po')?.value;
    const infoEl = document.getElementById('retur-po-info');
    const unitRows = document.getElementById('retur-unit-rows');
    const preview = document.getElementById('retur-preview');
    if (preview) preview.style.display = 'none';
    if (!poId) { if (unitRows) unitRows.innerHTML = 'Pilih PO terlebih dahulu.'; return; }
    const po = DB.poList.find(p => p.id === poId);
    if (!po) return;

    if (infoEl) {
        infoEl.innerHTML = `<strong style="color:var(--text2)">${po.id}</strong> — ${po.konsumen} &nbsp;|&nbsp; Bundle: <strong>${po.bundle}</strong> &nbsp;|&nbsp; Total: <strong>${fmtRpFull(po.total)}</strong>`;
        infoEl.style.display = 'block';
    }

    const jmlEl = document.getElementById('retur-jumlah');
    if (jmlEl) { jmlEl.max = po.bundle; jmlEl.value = Math.min(parseInt(jmlEl.value) || 1, po.bundle); }
    const jmlRetur = parseInt(jmlEl?.value) || 1;

    const items = [];
    (po.bundleDetail || []).forEach(bd => {
        const bundleDef = (DB.bundleDef || []).find(b => b.nama === bd.produk || b.id === bd.id);
        const bundleQty = bd.qty || 1;
        if (bundleDef && bundleDef.komponen && bundleDef.komponen.length) {
            bundleDef.komponen.forEach(komp => {
                const inv = DB.inventory.find(i => i.id == komp.invId || i.id == komp.itemId || i.nama === komp.nama);
                if (!inv) return;
                // totalQty = qty per bundle × jumlah bundle yang diretur (bukan total PO)
                const qtyPerBundle = komp.qty || 1;
                const totalQty = qtyPerBundle * jmlRetur;
                items.push({ nama: inv.nama, invId: inv.id, totalQty, qtyPerBundle });
            });
        } else {
            items.push({ nama: bd.produk, invId: null, totalQty: jmlRetur, qtyPerBundle: 1 });
        }
    });

    if (!items.length) { if (unitRows) unitRows.innerHTML = 'Tidak ada komponen barang terdeteksi.'; return; }

    if (unitRows) {
        unitRows.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 80px 80px;gap:6px;align-items:center;margin-bottom:6px;font-size:11px;color:var(--text4);padding:0 4px">
            <div>Barang</div><div style="text-align:center">Good (OK)</div><div style="text-align:center">Reject/NG</div>
        </div>
        ${items.map((item, idx) => `
        <div class="retur-item-row" style="display:grid;grid-template-columns:1fr 80px 80px;gap:6px;align-items:center;padding:8px 10px;background:var(--bg);border:0.5px solid var(--border);border-radius:8px;margin-bottom:5px" data-inv-id="${item.invId || ''}" data-qty-per-bundle="${item.qtyPerBundle}">
            <div><div style="font-size:13px;color:var(--text2)">${item.nama}</div><div style="font-size:10px;color:var(--text4)">${item.totalQty} unit akan dikembalikan</div></div>
            <input class="input retur-good" type="number" value="${item.totalQty}" min="0" max="${item.totalQty}" style="text-align:center;font-size:12px;padding:4px;border-color:#0F6E56" title="Unit kondisi Good/OK" oninput="_updateReturPreview()"/>
            <input class="input retur-reject" type="number" value="0" min="0" max="${item.totalQty}" style="text-align:center;font-size:12px;padding:4px;border-color:#501313;color:#F09595" title="Unit kondisi Reject/NG" oninput="_updateReturPreview()"/>
        </div>`).join('')}
        <div style="font-size:10px;color:var(--text4);margin-top:4px">💡 Isi kondisi actual tiap unit yang kembali. Good = stok good, Reject/NG = stok reject.</div>`;
    }
    _updateReturPreview();
}

function _renderReturUnitRows() {
    // Called when jmlRetur changes - re-render rows with new qty
    const poId = document.getElementById('retur-po')?.value;
    if (!poId) return;
    const unitRows = document.getElementById('retur-unit-rows');
    if (!unitRows) return;
    const po = DB.poList.find(p => p.id === poId);
    if (!po) return;
    const jmlRetur = parseInt(document.getElementById('retur-jumlah')?.value) || 1;
    const items = [];
    (po.bundleDetail || []).forEach(bd => {
        const bundleDef = (DB.bundleDef || []).find(b => b.nama === bd.produk || b.id === bd.id);
        if (bundleDef && bundleDef.komponen && bundleDef.komponen.length) {
            bundleDef.komponen.forEach(komp => {
                const inv = DB.inventory.find(i => i.id == komp.invId || i.id == komp.itemId || i.nama === komp.nama);
                if (!inv) return;
                const qtyPerBundle = komp.qty || 1;
                items.push({ nama: inv.nama, invId: inv.id, totalQty: qtyPerBundle * jmlRetur, qtyPerBundle });
            });
        } else {
            items.push({ nama: bd.produk, invId: null, totalQty: jmlRetur, qtyPerBundle: 1 });
        }
    });
    if (!items.length) return;
    // Update each row's qty and max
    const rows = unitRows.querySelectorAll('.retur-item-row');
    items.forEach((item, i) => {
        const row = rows[i];
        if (!row) return;
        const label = row.querySelector('[style*="text4"]');
        if (label) label.textContent = item.totalQty + ' unit akan dikembalikan';
        const goodInput = row.querySelector('.retur-good');
        const rejectInput = row.querySelector('.retur-reject');
        if (goodInput) { goodInput.max = item.totalQty; goodInput.value = item.totalQty; }
        if (rejectInput) { rejectInput.max = item.totalQty; rejectInput.value = 0; }
    });
    _updateReturPreview();
}

function onReturCalc() {
    // Update unit rows qty berdasarkan jumlah bundle terbaru
    _renderReturUnitRows();
    _updateReturPreview();
}

function _updateReturPreview() {
    const poId = document.getElementById('retur-po')?.value;
    const jml = parseInt(document.getElementById('retur-jumlah')?.value) || 1;
    const preview = document.getElementById('retur-preview');
    if (!poId || !preview) return;
    const po = DB.poList.find(p => p.id === poId);
    if (!po) return;

    const hargaPerBundle = po.bundle > 0 ? Math.round(po.total / po.bundle) : 0;
    const penguranganTagihan = hargaPerBundle * jml;
    const bundleSetelah = Math.max(0, po.bundle - jml);
    const tagihanSetelah = Math.max(0, po.total - penguranganTagihan);

    preview.style.display = 'block';
    preview.innerHTML = `
    <div style="font-size:11px;color:var(--accent2);margin-bottom:8px;font-weight:500;text-transform:uppercase">Preview Dampak Retur</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px">
        <div style="color:var(--text4)">Bundle diretur</div><div style="color:#FAC775;font-weight:500">${jml} bundle</div>
        <div style="color:var(--text4)">Sisa bundle PO</div><div style="color:#5DCAA5;font-weight:500">${po.bundle} → ${bundleSetelah}</div>
        <div style="color:var(--text4)">Harga per bundle</div><div style="color:var(--text2)">${fmtRpFull(hargaPerBundle)}</div>
        <div style="color:var(--text4)">Pengurangan tagihan</div><div style="color:#F09595;font-weight:600">${fmtRpFull(penguranganTagihan)}</div>
        <div style="color:var(--text4);font-weight:600;border-top:0.5px solid var(--border);padding-top:6px;margin-top:4px">Tagihan setelah retur</div>
        <div style="color:var(--text2);font-weight:700;border-top:0.5px solid var(--border);padding-top:6px;margin-top:4px">${fmtRpFull(tagihanSetelah)}</div>
    </div>`;
}

function submitRetur() {
    const poVal = document.getElementById('retur-po')?.value || '';
    const jml = parseInt(document.getElementById('retur-jumlah').value) || 0;
    const alasan = document.getElementById('retur-alasan').value.trim();

    if (!poVal) { toast('Tidak ada PO aktif untuk diretur', 'error'); return; }
    if (!alasan) { toast('Harap isi alasan retur', 'error'); return; }
    if (jml <= 0) { toast('Jumlah tidak valid', 'error'); return; }

    const po = DB.poList.find(p => p.id === poVal);
    if (!po) { toast('PO tidak ditemukan', 'error'); return; }
    if (jml > po.bundle) { toast(`Jumlah retur (${jml}) melebihi bundle PO (${po.bundle})`, 'error'); return; }

    const hargaPerBundle = po.bundle > 0 ? Math.round(po.total / po.bundle) : 0;
    const penguranganTagihan = hargaPerBundle * jml;
    const bundleSetelah = Math.max(0, po.bundle - jml);
    const tagihanSetelah = Math.max(0, po.total - penguranganTagihan);
    // isFullRetur jika semua bundle habis, atau bundle sudah 0 (edge case data lama)
    const isFullRetur = bundleSetelah === 0;

    if (!confirm(`Konfirmasi retur PO ${poVal}?\n\nBundle diretur: ${jml}\nSisa bundle: ${bundleSetelah}\nPengurangan tagihan: ${fmtRpFull(penguranganTagihan)}\nTagihan setelah retur: ${fmtRpFull(tagihanSetelah)}\n${isFullRetur ? '\u26a0 Semua bundle diretur — PO akan ditandai RETUR\n' : ''}\nAksi ini tidak bisa dibatalkan.`)) return;

    const today = formatDateShort(new Date().toISOString().split('T')[0]);
    const unitItems = [];
    document.querySelectorAll('.retur-item-row').forEach(row => {
        const invId = parseInt(row.dataset.invId) || null;
        const good = parseInt(row.querySelector('.retur-good')?.value) || 0;
        const reject = parseInt(row.querySelector('.retur-reject')?.value) || 0;
        const nama = row.querySelector('[style*="text2"]')?.textContent?.trim() || '';
        unitItems.push({ invId, good, reject, nama });

        if (invId) {
            const inv = DB.inventory.find(i => i.id === invId);
            if (inv) {
                if (good > 0) {
                    const t = DB.inventory.find(i => i.nama === inv.nama && i.kondisi === 'good');
                    if (t) t.stok += good; else DB.inventory.push({ id: DB.nextInvId++, nama: inv.nama, kategori: inv.kategori || 'jual', kondisi: 'good', stok: good, min: 0, harga: inv.harga || 0, terakhir: today });
                }
                if (reject > 0) {
                    const t = DB.inventory.find(i => i.nama === inv.nama && i.kondisi === 'reject');
                    if (t) t.stok += reject; else DB.inventory.push({ id: DB.nextInvId++, nama: inv.nama, kategori: inv.kategori || 'jual', kondisi: 'reject', stok: reject, min: 0, harga: inv.harga || 0, terakhir: today });
                }
            }
        } else if (nama) {
            const inv = DB.inventory.find(i => i.nama === nama);
            if (inv) inv.stok += good + reject;
        }
    });

    const bundleAsli = po.bundle; // simpan sebelum dimodifikasi
    const sisaSebelumRetur = po.sisa || 0;

    if (isFullRetur) {
        po.cicilan.forEach(c => { if (c.status !== 'lunas') c.status = 'batal'; });
        po.status = 'retur';
        po.bundle = 0;
        po.total = 0;
        po.sisa = 0;
        // Kembalikan stok souvenir ke inventory
        (po.souvenir || []).forEach(s => {
            const inv = DB.inventory.find(i => i.nama === s.nama && i.kategori === 'sovenir');
            if (inv) inv.stok += (s.qty || 1);
        });
    } else {
        po.bundle = bundleSetelah;
        po.total = tagihanSetelah;
        const terbayarAmt = po.cicilan.filter(c => c.status === 'lunas').reduce((s, c) => s + c.tagihan, 0);
        const sisaBaru = Math.max(0, tagihanSetelah - terbayarAmt);
        const cicilanBelum = po.cicilan.filter(c => c.status !== 'lunas' && c.status !== 'batal');
        const totalBelum = cicilanBelum.reduce((s, c) => s + c.tagihan, 0);
        if (totalBelum > 0) {
            let sisa = sisaBaru;
            cicilanBelum.forEach((c, idx) => {
                if (idx === cicilanBelum.length - 1) { c.tagihan = Math.max(0, sisa); }
                else { const prop = Math.round((c.tagihan / totalBelum) * sisaBaru); c.tagihan = Math.max(0, prop); sisa -= c.tagihan; }
                if (c.tagihan === 0) c.status = 'batal';
            });
        }
        po.sisa = po.cicilan.filter(c => c.status !== 'lunas' && c.status !== 'batal').reduce((s, c) => s + c.tagihan, 0);
        if (!po.cicilan.some(c => c.status !== 'lunas' && c.status !== 'batal')) { po.status = 'lunas'; po.sisa = 0; }
    }

    const kons = DB.konsumen.find(k => k.id === po.konsumenId || k.nama === po.konsumen);
    if (kons) kons.tagihan = Math.max(0, isFullRetur ? Math.max(0, (kons.tagihan || 0) - sisaSebelumRetur) : po.sisa);

    // ── Rollback komisi entitas proporsional dengan bundle yang diretur ──
    if (bundleAsli > 0) {
        const rasio = jml / bundleAsli; // proporsi yang diretur
        // Sales
        const salesEnt = DB.entitas.find(e => e.peran === 'Sales' && e.nama === po.sales);
        if (salesEnt) {
            const potonganSales = Math.round((po.rateKomisiSales || DB.settings.komisi_sales || 1150000) * jml);
            salesEnt.komisiKotor = Math.max(0, (salesEnt.komisiKotor || 0) - potonganSales);
            salesEnt.bundle = Math.max(0, (salesEnt.bundle || 0) - jml);
        }
        // Nego
        const negoEnt = DB.entitas.find(e => e.peran === 'Nego' && e.nama === po.nego);
        if (negoEnt) {
            const potonganNego = Math.round((po.rateKomisiNego || DB.settings.komisi_nego || 300000) * jml);
            // Jika PO sudah lunas (komisi sudah cair ke komisiKotor), kurangi dari sana
            if (po.komisiNegoCair) {
                negoEnt.komisiKotor = Math.max(0, (negoEnt.komisiKotor || 0) - potonganNego);
            } else {
                // Belum cair, kurangi dari pending
                negoEnt.komisiPending = Math.max(0, (negoEnt.komisiPending || 0) - potonganNego);
            }
            negoEnt.bundle = Math.max(0, (negoEnt.bundle || 0) - jml);
        }
        // KC
        if (isFullRetur) {
            // KC hanya dapat dari PO lunas — kalau full retur, PO tidak akan lunas
            // Tidak perlu rollback karena KC belum dapat (po.status tidak pernah lunas)
        }
        // Konsumen koordinator — komisi baru cair saat lunas, jadi rollback hanya jika lunas sebelum retur
        if (isFullRetur && po.komisiKoorDiberi && kons) {
            const potonganKoor = Math.round((po.rateKomisiKoor || DB.settings.komisi_koor || 200000) * jml);
            kons.komisiKotor = Math.max(0, (kons.komisiKotor || 0) - potonganKoor);
            kons.komisiBundle = Math.max(0, (kons.komisiBundle || 0) - jml);
            po.komisiKoorDiberi = false;
        }
        // Collector — rollback komisi per termin yang sudah dibayar dan catat bundle baru
        // Setiap termin yang sudah diberi komisi, hitung ulang: selisih rate×bundle_baru vs rate×bundle_lama
        po.cicilan.forEach(c => {
            if (c.komisiDiberi) {
                const collEnt = DB.entitas.find(e => e.peran === 'Collector' && e.nama === (c.collector || po.coll));
                if (collEnt) {
                    const rateC = collEnt.komisiRate || DB.settings.komisi_coll || 1500;
                    const bundleLama = bundleAsli; // sebelum retur
                    const bundleBaru = po.bundle;  // setelah retur (sudah dikurangi di atas)
                    const selisih = rateC * (bundleLama - bundleBaru);
                    collEnt.komisiKotor = Math.max(0, (collEnt.komisiKotor || 0) - selisih);
                }
            }
        });
    }

    const kondisiLog = unitItems.map(u => `${u.nama}: ${u.good}G/${u.reject}R`).join(', ');
    DB.returList.unshift({
        id: Date.now(),
        tanggal: today,
        po: poVal, konsumen: po.konsumen,
        kondisi: kondisiLog || 'mixed',
        jumlah: jml, alasan,
        unitDetail: unitItems,
        isFullRetur
    });

    saveDB();
    closeModal('modal-retur');
    toast(`Retur ${poVal}: ${jml} bundle (${isFullRetur ? 'penuh' : 'sebagian'}) berhasil`);
    addAudit(`Retur PO ${poVal}: ${jml} bundle, kurangi tagihan ${fmtRpFull(penguranganTagihan)}`);
    renderInventory();
    renderPOList();
    if (DB.selectedPO === poVal) renderPODetail(poVal);
}

function openReturFromPO(poId) {
    const po = DB.poList.find(p => p.id === poId);
    if (!po) return;
    const sel = document.getElementById('retur-po');
    if (sel) {
        const activePO = DB.poList.filter(p => p.status !== 'retur');
        sel.innerHTML = activePO.map(p => `<option value="${p.id}">${p.id} – ${p.konsumen} (${p.bundle} bundle)</option>`).join('');
        sel.value = poId;
    }
    onReturPOChange();
    openModal('modal-retur');
}

// KONSUMEN
function openEditKonsumen(id) {
    const k = DB.konsumen.find(x => x.id === id);
    if (!k) return;
    document.getElementById('ke-id').value = k.id;
    document.getElementById('ke-nama').value = k.nama;
    document.getElementById('ke-telp').value = k.telp;
    document.getElementById('ke-kota').value = k.kota;
    document.getElementById('ke-alamat').value = k.alamat;
    openModal('modal-edit-konsumen');
}

function submitEditKonsumen() {
    const id = parseInt(document.getElementById('ke-id').value);
    const k = DB.konsumen.find(x => x.id === id);
    if (!k) return;
    k.nama = document.getElementById('ke-nama').value.trim() || k.nama;
    k.telp = document.getElementById('ke-telp').value.trim() || k.telp;
    k.kota = document.getElementById('ke-kota').value.trim() || k.kota;
    k.alamat = document.getElementById('ke-alamat').value.trim() || k.alamat;
    k.inisial = k.nama.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
    saveDB();
    closeModal('modal-edit-konsumen');
    toast(`Data ${k.nama} berhasil diperbarui`);
    addAudit(`Edit konsumen: ${k.nama}`);
    renderKonsumenList();
    renderKonsumenDetail(id);
}

function toggleAktifKonsumen(id) {
    const k = DB.konsumen.find(x => x.id === id);
    if (!k) return;
    if (k.aktif && k.tagihan > 0) {
        if (!confirm(`${k.nama} masih punya tagihan ${fmtRp(k.tagihan)}. Yakin nonaktifkan?`)) return;
    }
    k.aktif = !k.aktif;
    saveDB();
    toast(`Konsumen ${k.nama} ${k.aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
    addAudit(`Konsumen ${k.nama} ${k.aktif ? 'aktif' : 'nonaktif'}`);
    renderKonsumenList();
    renderKonsumenDetail(id);
}

function submitKonsumen() {
    const nama = document.getElementById('k-nama').value.trim();
    const telp = document.getElementById('k-telp').value.trim();
    const kota = document.getElementById('k-kota').value.trim();
    const alamat = document.getElementById('k-alamat').value.trim();
    if (!nama) { toast('Nama wajib diisi', 'error'); return; }
    const inisial = nama.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
    const colors = [['#1e1d2e', '#AFA9EC'], ['#1a2d1e', '#5DCAA5'], ['#291a14', '#F0997B'], ['#0c1f35', '#85B7EB']];
    const [warna, warnaTxt] = colors[DB.konsumen.length % colors.length];
    const newK = { id: Date.now(), nama, inisial, warna, warnaTxt, telp, kota, alamat, since: 'Apr 2026', tagihan: 0, aktif: true, po: [] };
    DB.konsumen.push(newK);
    DB.selectedKonsumen = newK.id;

    // Reset form
    ['k-nama', 'k-telp', 'k-kota', 'k-alamat'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    saveDB();
    closeModal('modal-konsumen');
    toast(`Konsumen ${nama} berhasil ditambahkan`);
    addAudit(`Tambah konsumen: ${nama}`);

    // Update dropdown konsumen di buat PO
    refreshKonsumenSelect();
    renderKonsumenList();
    renderKonsumenDetail(newK.id);
}

// ── Helper: opsi dropdown konsumen ───────────────────────────
function getKonsumenOptions() {
    if (!DB.konsumen || !DB.konsumen.length) {
        return '<option value="">— Belum ada konsumen —</option>';
    }
    return DB.konsumen
        .filter(k => k.aktif !== false)
        .map(k => `<option value="${k.id}">${k.nama}${k.kota ? ' — ' + k.kota.split(',')[0] : ''}</option>`)
        .join('');
}

// ── Helper: opsi dropdown Sales ──────────────────────────────
function getSalesOptions() {
    const list = (DB.entitas || []).filter(e => e.peran === 'Sales' && e.aktifStatus !== false);
    if (!list.length) return '<option value="">— Belum ada Sales —</option>';
    return list.map(e => `<option value="${e.nama}">${e.nama}</option>`).join('');
}

// ── Helper: opsi dropdown Nego ───────────────────────────────
function getNegoOptions() {
    const list = (DB.entitas || []).filter(e => e.peran === 'Nego' && e.aktifStatus !== false);
    if (!list.length) return '<option value="">— Belum ada Nego —</option>';
    return list.map(e => `<option value="${e.nama}">${e.nama}</option>`).join('');
}

// ── Helper: opsi dropdown Collector ──────────────────────────
function getCollOptions() {
    const list = (DB.entitas || []).filter(e => e.peran === 'Collector' && e.aktifStatus !== false);
    if (!list.length) return '<option value="">— Belum ada Collector —</option>';
    return list.map(e => `<option value="${e.nama}">${e.nama}</option>`).join('');
}

function renderCollChips(containerId, currentVal) {
    const list = (DB.entitas || []).filter(e => e.peran === 'Collector' && e.aktifStatus !== false);
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!list.length) { container.innerHTML = '<div style="font-size:12px;color:var(--text4)">Belum ada Collector</div>'; return; }
    container.innerHTML = list.map(e => {
        const isSelected = e.nama === currentVal;
        return `<div onclick="selectColl(this,'${e.nama}')" style="
            display:inline-flex;align-items:center;gap:6px;padding:6px 10px;
            border-radius:20px;cursor:pointer;margin:3px;
            border:1.5px solid ${isSelected ? e.warna : 'var(--border)'};
            background:${isSelected ? e.warna + '22' : 'var(--bg3)'};
            transition:all .15s" data-nama="${e.nama}">
            <div style="width:22px;height:22px;border-radius:50%;background:${e.warna};color:${e.warnaTxt};font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:600">${e.inisial}</div>
            <span style="font-size:12px;color:${isSelected ? 'var(--text)' : 'var(--text3)'};font-weight:${isSelected ? 500 : 400}">${e.nama}</span>
            ${isSelected ? '<span style="font-size:10px;color:#5DCAA5">✓</span>' : ''}
        </div>`;
    }).join('');
    if (!document.getElementById(containerId + '-val')) {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = containerId + '-val';
        hidden.value = currentVal || '';
        container.parentNode.appendChild(hidden);
    } else {
        document.getElementById(containerId + '-val').value = currentVal || '';
    }
}

function selectColl(el, nama) {
    const container = el.closest('[id]');
    const hiddenId = container.id + '-val';
    document.getElementById(hiddenId).value = nama;
    container.querySelectorAll('[data-nama]').forEach(chip => {
        const ent = DB.entitas.find(e => e.nama === chip.dataset.nama);
        const sel = chip.dataset.nama === nama;
        chip.style.borderColor = sel ? (ent?.warna || '#5DCAA5') : 'var(--border)';
        chip.style.background = sel ? (ent?.warna || '#5DCAA5') + '22' : 'var(--bg3)';
        chip.innerHTML = `
            <div style="width:22px;height:22px;border-radius:50%;background:${ent?.warna || '#888'};color:${ent?.warnaTxt || '#fff'};font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:600">${ent?.inisial || '?'}</div>
            <span style="font-size:12px;color:${sel ? 'var(--text)' : 'var(--text3)'};font-weight:${sel ? 500 : 400}">${chip.dataset.nama}</span>
            ${sel ? '<span style="font-size:10px;color:#5DCAA5">✓</span>' : ''}
        `;
    });
}

function refreshKonsumenSelect() {
    const sel = document.getElementById('po-konsumen');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = getKonsumenOptions();
    // try restore
    for (let opt of sel.options) { if (opt.value === cur) { opt.selected = true; break; } }
}

// PO / TRANSAKSI
let catatBayarPO = null, catatBayarN = null;

function openCatatBayar(poId, nTermin) {
    catatBayarPO = poId;
    catatBayarN = nTermin;
    const p = DB.poList.find(x => x.id === poId);
    const c = p.cicilan.find(x => x.n === nTermin);
    const sudahBayar = c.terbayar || 0;
    const tagihanSisa = c.tagihan - sudahBayar;

    // Kasus kelebihan bayar: terbayar > tagihan (akibat loss adjustment turunkan tagihan)
    if (tagihanSisa < 0) {
        const lebih = Math.abs(tagihanSisa);
        if (!confirm(`Termin ${nTermin} PO ${poId} kelebihan bayar sebesar ${fmtRpFull(lebih)}.\n\nSudah terbayar: ${fmtRpFull(sudahBayar)}\nTagihan setelah adjustment: ${fmtRpFull(c.tagihan)}\n\nOtomatis tandai LUNAS dan catat kelebihan ${fmtRpFull(lebih)} sebagai kredit konsumen?`)) return;
        c.status = 'lunas';
        c.terbayar = c.tagihan;
        c.sisaTagihan = 0;
        const kons = DB.konsumen.find(k => k.id === p.konsumenId || k.nama === p.konsumen);
        if (kons) {
            kons.kreditSaldo = (kons.kreditSaldo || 0) + lebih;
            if (!kons.kreditLog) kons.kreditLog = [];
            kons.kreditLog.push({ tanggal: formatDateShort(new Date().toISOString().split('T')[0]), jumlah: lebih, ket: `Kelebihan bayar termin ${nTermin} PO ${poId} (after loss adjustment)` });
        }
        p.sisa = p.cicilan.filter(x => x.status !== 'batal').reduce((s, x) => s + (x.tagihan - (x.terbayar || 0)), 0);
        const semuaLunas = p.cicilan.filter(x => x.status !== 'batal').every(x => x.status === 'lunas');
        if (semuaLunas) { p.status = 'lunas'; p.sisa = 0; }
        if (kons) kons.tagihan = Math.max(0, p.sisa);
        saveDB();
        toast(`Termin ${nTermin} lunas. Kelebihan ${fmtRpFull(lebih)} dicatat sebagai kredit ${p.konsumen}.`, 'success');
        addAudit(`Auto-lunas termin ${nTermin} PO ${poId}: kelebihan bayar ${fmtRpFull(lebih)} → kredit konsumen`);
        renderPOList(); renderPODetail(poId);
        return;
    }

    const kurangInfo = sudahBayar > 0
        ? `<div style="background:#1a1800;border-radius:6px;padding:8px 10px;font-size:12px;margin-bottom:10px;border:0.5px solid #3a3000">
             Sudah terbayar: <strong style="color:#5DCAA5">${fmtRpFull(sudahBayar)}</strong>
             &nbsp;|&nbsp; Sisa tagihan: <strong style="color:#FAC775">${fmtRpFull(tagihanSisa)}</strong>
           </div>` : '';
    const konsForBayar = DB.konsumen.find(k => k.id === p.konsumenId || k.nama === p.konsumen);
    const kreditAvail = konsForBayar?.kreditSaldo || 0;
    const kreditInfo = kreditAvail > 0
        ? `<div style="background:#0a1a10;border-radius:6px;padding:8px 10px;font-size:12px;margin-bottom:10px;border:0.5px solid #1a3020;display:flex;justify-content:space-between;align-items:center">
             <span>💰 Kredit tersedia: <strong style="color:#5DCAA5">${fmtRpFull(kreditAvail)}</strong></span>
             <button class="btn btn-success" style="padding:3px 10px;font-size:11px" onclick="pakaiKreditKonsumen('${poId}',${nTermin},${kreditAvail},${tagihanSisa})">Gunakan kredit</button>
           </div>` : '';
    const collOpts = getCollOptions();
    document.getElementById('modal-bayar-body').innerHTML = `
    <div class="alert alert-warn">PO: <strong>${poId}</strong> &middot; Termin ${nTermin}/${p.cicilan.length} &middot; Konsumen: ${p.konsumen}</div>
    ${kurangInfo}
    ${kreditInfo}
    <div class="form-group"><div class="label">Jumlah dibayar sekarang (Rp)</div>
      <input class="input" id="bayar-jumlah" type="number" value="${tagihanSisa}" min="1" max="${tagihanSisa}"/></div>
    <div class="form-row">
      <div class="form-group" style="margin:0"><div class="label">Tanggal bayar</div>
        <input class="input" type="date" id="bayar-tanggal" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group" style="margin:0"><div class="label">Collector yang menagih</div>
        <div id="bayar-collector-chips" style="display:flex;flex-wrap:wrap;gap:2px;padding:6px 0"></div>
        <input type="hidden" id="bayar-collector-chips-val" value="${p.coll}" />
      </div>
    </div>
    <div class="form-group"><div class="label">Catatan</div>
      <input class="input" id="bayar-catatan" placeholder="Opsional..."/></div>
    <div style="background:var(--bg5);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--text4)">
      Tagihan termin ${nTermin}: <strong style="color:var(--text2)">${fmtRpFull(c.tagihan)}</strong>
      &nbsp;&middot;&nbsp; Perlu dibayar: <strong style="color:#FAC775">${fmtRpFull(tagihanSisa)}</strong>
    </div>`;
    openModal('modal-bayar');
    setTimeout(() => renderCollChips('bayar-collector-chips', p.coll), 50);
}

function pakaiKreditKonsumen(poId, nTermin, kreditAvail, tagihanSisa) {
    const p = DB.poList.find(x => x.id === poId);
    const c = p.cicilan.find(x => x.n === nTermin);
    const kons = DB.konsumen.find(k => k.id === p.konsumenId || k.nama === p.konsumen);
    if (!kons || !kreditAvail) { toast('Tidak ada kredit tersedia', 'error'); return; }

    const pakaiJml = Math.min(kreditAvail, tagihanSisa);
    if (!confirm(`Gunakan kredit konsumen ${kons.nama}?\n\nKredit tersedia: ${fmtRpFull(kreditAvail)}\nDipakai untuk termin ${nTermin}: ${fmtRpFull(pakaiJml)}\n${pakaiJml >= tagihanSisa ? 'Termin akan otomatis LUNAS.' : `Sisa tagihan setelah kredit: ${fmtRpFull(tagihanSisa - pakaiJml)}`}`)) return;

    // Potong kreditSaldo
    kons.kreditSaldo = Math.max(0, (kons.kreditSaldo || 0) - pakaiJml);
    if (!kons.kreditLog) kons.kreditLog = [];
    kons.kreditLog.push({ tanggal: formatDateShort(new Date().toISOString().split('T')[0]), jumlah: -pakaiJml, ket: `Digunakan untuk termin ${nTermin} PO ${poId}` });

    // Update cicilan
    const sudahBayar = c.terbayar || 0;
    c.terbayar = sudahBayar + pakaiJml;
    c.sisaTagihan = Math.max(0, c.tagihan - c.terbayar);

    if (c.terbayar >= c.tagihan) {
        c.status = 'lunas'; c.terbayar = c.tagihan; c.sisaTagihan = 0;
        if (!c.komisiDiberi) {
            const collEnt = DB.entitas.find(e => e.peran === 'Collector' && e.nama === (c.collector || p.coll));
            if (collEnt) {
                const rateC = collEnt.komisiRate || DB.settings.komisi_coll || 1500;
                collEnt.komisiKotor = (collEnt.komisiKotor || 0) + (rateC * Math.max(0, p.bundle || 0));
            }
            c.komisiDiberi = true;
        }
    } else {
        c.status = 'kurang';
    }

    // Update sisa PO
    p.sisa = p.cicilan.filter(x => x.status !== 'batal').reduce((s, x) => s + (x.tagihan - (x.terbayar || 0)), 0);
    const semuaLunas = p.cicilan.filter(x => x.status !== 'batal').every(x => x.status === 'lunas');
    if (semuaLunas) {
        p.status = 'lunas'; p.sisa = 0;
        if (!p.komisiKoorDiberi) {
            const _k = DB.konsumen.find(k => k.id === p.konsumenId || k.nama === p.konsumen);
            if (_k) { _k.komisiKotor = (_k.komisiKotor || 0) + p.bundle * (p.rateKomisiKoor || DB.settings.komisi_koor || 200000); _k.komisiBundle = (_k.komisiBundle || 0) + p.bundle; }
            p.komisiKoorDiberi = true;
        }
    }
    kons.tagihan = Math.max(0, p.sisa);

    saveDB();
    closeModal('modal-bayar');
    toast(`Kredit ${fmtRpFull(pakaiJml)} digunakan untuk termin ${nTermin} PO ${poId}`, 'success');
    addAudit(`Pakai kredit ${fmtRpFull(pakaiJml)} → termin ${nTermin} PO ${poId}`);
    renderPOList(); renderPODetail(poId);
}

function openCatatBayarNext(poId) {
    const p = DB.poList.find(x => x.id === poId);
    const next = p.cicilan.find(c => c.status !== 'lunas' && c.status !== 'batal');
    if (!next) { toast('Semua cicilan sudah lunas', 'warn'); return; }
    openCatatBayar(poId, next.n);
}

function submitBayar() {
    const p = DB.poList.find(x => x.id === catatBayarPO);
    const c = p.cicilan.find(x => x.n === catatBayarN);
    const jml = parseInt(document.getElementById('bayar-jumlah').value);
    const collectorVal = document.getElementById('bayar-collector-chips-val')?.value || '';

    // Validasi collector wajib dipilih
    if (!collectorVal || collectorVal === '' || collectorVal === '—') {
        toast('Collector harus dipilih sebelum menyimpan pembayaran', 'error'); return;
    }
    if (!jml || jml <= 0) { toast('Jumlah tidak valid', 'error'); return; }

    const sudahBayar = c.terbayar || 0;
    const tagihanSisa = c.tagihan - sudahBayar;

    if (jml > tagihanSisa) { toast(`Jumlah melebihi sisa tagihan termin ini (${fmtRpFull(tagihanSisa)})`, 'error'); return; }

    if (!confirm(`Konfirmasi simpan pembayaran?\n\nPO: ${catatBayarPO} — Termin ${catatBayarN}\nCollector: ${collectorVal}\nJumlah dibayar: ${fmtRpFull(jml)}\n${jml < tagihanSisa ? `Sisa termin: ${fmtRpFull(tagihanSisa - jml)}\n` : 'Status: LUNAS\n'}\nTekan OK untuk menyimpan.`)) return;

    c.terbayar = sudahBayar + jml;
    c.sisaTagihan = c.tagihan - c.terbayar;
    c.collector = collectorVal;
    c.tglBayar = document.getElementById('bayar-tanggal')?.value || '';
    c.catatan = document.getElementById('bayar-catatan')?.value || '';

    if (c.terbayar >= c.tagihan) {
        c.status = 'lunas'; c.sisaTagihan = 0;
    } else {
        c.status = 'kurang';
    }

    // Komisi collector — rate × bundle aktif PO, hanya sekali per termin
    if (!c.komisiDiberi) {
        const collEnt = DB.entitas.find(e => e.peran === 'Collector' && e.nama === c.collector);
        if (collEnt) {
            const rateC = collEnt.komisiRate || DB.settings.komisi_coll || 1500;
            const bundleAktif = Math.max(0, (p.bundle || 0));
            collEnt.komisiKotor = (collEnt.komisiKotor || 0) + (rateC * bundleAktif);
        }
        c.komisiDiberi = true;
    }

    // ── Split komisi Sales: cair 60% setelah termin splitN1 lunas, 40% setelah semua lunas ──
    const _salesEnt = DB.entitas.find(e => e.peran === 'Sales' && e.nama === p.sales);
    if (_salesEnt) {
        const splitN1 = p.splitN1 || (p.cicilan.length % 2 === 0 ? p.cicilan.length / 2 : Math.floor(p.cicilan.length / 2) + 1);
        const komisiTotal = p.bundle * (p.rateKomisiSales || DB.settings.komisi_sales);
        const komisi60 = Math.round(komisiTotal * (p.splitPct1 || DB.settings.split_komisi_pct1 || 60) / 100);
        const komisi40 = komisiTotal - komisi60;
        // Cek apakah termin 1..splitN1 semua sudah lunas
        const termin1ToN1 = p.cicilan.filter(x => x.n <= splitN1 && x.status !== 'batal');
        const split1Lunas = termin1ToN1.length > 0 && termin1ToN1.every(x => x.status === 'lunas');
        if (split1Lunas && !p.komisiSalesSplit1Cair) {
            _salesEnt.komisiKotor = (_salesEnt.komisiKotor || 0) + komisi60;
            p.komisiSalesSplit1Cair = true;
            p.komisiSalesSplit1Nominal = komisi60;
            addAudit(`Komisi Sales ${p.sales} cair 60% PO ${p.id}: ${fmtRpFull(komisi60)}`);
            toast(`Komisi Sales 60% PO ${p.id} cair: ${fmtRpFull(komisi60)}`, 'success');
        }
    }

    // Hitung sisa PO: tagihan - terbayar di semua termin aktif
    p.sisa = p.cicilan
        .filter(x => x.status !== 'batal')
        .reduce((s, x) => s + (x.tagihan - (x.terbayar || 0)), 0);

    const semuaLunas = p.cicilan
        .filter(x => x.status !== 'batal')
        .every(x => x.status === 'lunas');
    if (semuaLunas) {
        p.status = 'lunas'; p.sisa = 0;
        // ── 40% komisi Sales cair saat semua lunas ──
        const _salesLunas = DB.entitas.find(e => e.peran === 'Sales' && e.nama === p.sales);
        if (_salesLunas && p.komisiSalesSplit1Cair && !p.komisiSalesSplit2Cair) {
            const komisiTotal = p.bundle * (p.rateKomisiSales || DB.settings.komisi_sales);
            const komisi40 = komisiTotal - (p.komisiSalesSplit1Nominal || Math.round(komisiTotal * (p.splitPct1 || DB.settings.split_komisi_pct1 || 60) / 100));
            _salesLunas.komisiKotor = (_salesLunas.komisiKotor || 0) + komisi40;
            p.komisiSalesSplit2Cair = true;
            p.komisiSalesSplit2Nominal = komisi40;
            addAudit(`Komisi Sales ${p.sales} cair 40% PO ${p.id}: ${fmtRpFull(komisi40)}`);
        } else if (_salesLunas && !p.komisiSalesSplit1Cair && !p.komisiSalesSplit2Cair) {
            // Edge case: langsung lunas semua (uncommon) - cair sekaligus
            const komisiTotal = p.bundle * (p.rateKomisiSales || DB.settings.komisi_sales);
            _salesLunas.komisiKotor = (_salesLunas.komisiKotor || 0) + komisiTotal;
            p.komisiSalesSplit1Cair = true; p.komisiSalesSplit2Cair = true;
            p.komisiSalesSplit1Nominal = Math.round(komisiTotal * (p.splitPct1 || DB.settings.split_komisi_pct1 || 60) / 100);
            p.komisiSalesSplit2Nominal = komisiTotal - p.komisiSalesSplit1Nominal;
        }
        // Komisi Koordinator/Konsumen, Nego, KC — cair saat lunas, hanya sekali
        if (!p.komisiKoorDiberi) {
            const _konsLunas = DB.konsumen.find(k => k.nama === p.konsumen || k.id === p.konsumenId);
            if (_konsLunas) {
                const komisiKons = p.bundle * (p.rateKomisiKoor || DB.settings.komisi_koor || 200000);
                _konsLunas.komisiKotor = (_konsLunas.komisiKotor || 0) + komisiKons;
                _konsLunas.komisiBundle = (_konsLunas.komisiBundle || 0) + p.bundle;
            }
            // Nego komisi cair dari pending
            const _negoLunas = DB.entitas.find(e => e.peran === 'Nego' && e.nama === p.nego);
            if (_negoLunas && !p.komisiNegoCair) {
                const pending = (_negoLunas.riwayatPO || []).find(r => (r.poId || r.po) === p.id);
                const jmlCair = pending?.komisiPending || (p.bundle * (p.rateKomisiNego || DB.settings.komisi_nego || 300000));
                _negoLunas.komisiKotor = (_negoLunas.komisiKotor || 0) + jmlCair;
                _negoLunas.komisiPending = Math.max(0, (_negoLunas.komisiPending || 0) - jmlCair);
                p.komisiNegoCair = true;
            }
            // KC komisi cair dari pending
            const _kcLunas = DB.entitas.find(e => e.peran === 'Kepala Cabang' && e.nama === p.kc);
            if (_kcLunas && !p.komisiKcCair) {
                const pendingKc = (_kcLunas.riwayatPO || []).find(r => (r.poId || r.po) === p.id);
                const jmlCairKc = pendingKc?.komisiPending || (p.bundle * (p.rateKomisiKc || DB.settings.komisi_kc || 5000));
                _kcLunas.komisiKotor = (_kcLunas.komisiKotor || 0) + jmlCairKc;
                _kcLunas.komisiPending = Math.max(0, (_kcLunas.komisiPending || 0) - jmlCairKc);
                p.komisiKcCair = true;
            }
            p.komisiKoorDiberi = true;
        }
    } else if (p.status === 'lunas') {
        p.status = 'berjalan'; // PO sebelumnya ditandai lunas tapi ada cicilan baru
    } else {
        // Re-evaluate telat: cek apakah masih ada cicilan lain yang telat
        const masihAdaTelat = p.cicilan.some(c => c.status === 'telat');
        p.status = masihAdaTelat ? 'telat' : 'berjalan';
    }

    const k = DB.konsumen.find(x => x.id === p.konsumenId || x.nama === p.konsumen);
    if (k) k.tagihan = Math.max(0, p.sisa);

    saveDB();
    closeModal('modal-bayar');
    const statusMsg = c.status === 'lunas' ? 'Lunas' : `Kurang bayar ${fmtRpFull(c.sisaTagihan)}`;
    toast(`Termin ${catatBayarN}: ${statusMsg}`);
    addAudit(`Bayar termin ${catatBayarN} PO ${catatBayarPO}: ${fmtRpFull(jml)} (${statusMsg})`);
    renderPOList();
    renderPODetail(catatBayarPO);
}

// ── Edit pembayaran termin yang sudah dicatat ─────────────────
let editBayarPO = null, editBayarN = null;

function openEditBayar(poId, nTermin) {
    editBayarPO = poId;
    editBayarN = nTermin;
    const p = DB.poList.find(x => x.id === poId);
    const c = p.cicilan.find(x => x.n === nTermin);
    if (!c) return;

    const collOpts = getCollOptions();
    document.getElementById('modal-edit-bayar-body').innerHTML = `
    <div class="alert alert-warn">Edit pembayaran PO: <strong>${poId}</strong> &middot; Termin ${nTermin}/${p.cicilan.length} &middot; Konsumen: ${p.konsumen}</div>
    <div style="background:var(--bg5);border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:12px">
      Tagihan termin ini: <strong style="color:var(--text2)">${fmtRpFull(c.tagihan)}</strong>
    </div>
    <div class="form-group"><div class="label">Jumlah terbayar (Rp)</div>
      <input class="input" id="edit-bayar-jumlah" type="number" value="${c.terbayar || 0}" min="0" max="${c.tagihan}"/></div>
    <div class="form-row">
      <div class="form-group" style="margin:0"><div class="label">Tanggal bayar</div>
        <input class="input" type="date" id="edit-bayar-tanggal" value="${c.tglBayar || new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group" style="margin:0"><div class="label">Collector</div>
        <select class="select" id="edit-bayar-collector">
          <option value="${c.collector || p.coll}" selected>${c.collector || p.coll || '—'}</option>
          ${collOpts}
        </select></div>
    </div>
    <div class="form-group"><div class="label">Catatan</div>
      <input class="input" id="edit-bayar-catatan" value="${c.catatan || ''}" placeholder="Opsional..."/></div>
    <div style="background:#1a1200;border-radius:6px;padding:8px 10px;font-size:11px;color:#FAC775;border:0.5px solid #3a2d00">
      ⚠️ Edit pembayaran akan mengubah status termin dan sisa outstanding PO secara langsung.
    </div>`;
    openModal('modal-edit-bayar');
}

function submitEditBayar() {
    const p = DB.poList.find(x => x.id === editBayarPO);
    const c = p.cicilan.find(x => x.n === editBayarN);
    if (!p || !c) return;

    const jml = parseInt(document.getElementById('edit-bayar-jumlah').value) || 0;
    if (jml < 0 || jml > c.tagihan) { toast(`Jumlah tidak valid (0 – ${fmtRpFull(c.tagihan)})`, 'error'); return; }

    if (!confirm(`Konfirmasi edit pembayaran?\n\nPO: ${editBayarPO} — Termin ${editBayarN}\nTerbayar baru: ${fmtRpFull(jml)}\n\nData lama akan ditimpa.`)) return;

    // Rollback komisi collector lama jika ada (hanya jika flag sudah set)
    if (c.komisiDiberi) {
        const oldCollEnt = DB.entitas.find(e => e.peran === 'Collector' && e.nama === c.collector);
        if (oldCollEnt) {
            const rateC = oldCollEnt.komisiRate || DB.settings.komisi_coll || 1500;
            const bundleAktif = Math.max(0, (p.bundle || 0));
            oldCollEnt.komisiKotor = Math.max(0, (oldCollEnt.komisiKotor || 0) - (rateC * bundleAktif));
        }
        c.komisiDiberi = false; // reset agar bisa di-set ulang
    }

    // Update data cicilan
    c.terbayar = jml;
    c.sisaTagihan = c.tagihan - jml;
    c.collector = document.getElementById('edit-bayar-collector')?.value || p.coll;
    c.tglBayar = document.getElementById('edit-bayar-tanggal')?.value || '';
    c.catatan = document.getElementById('edit-bayar-catatan')?.value || '';

    if (jml >= c.tagihan) {
        c.status = 'lunas';
        c.sisaTagihan = 0;
    } else if (jml > 0) {
        c.status = 'kurang';
    } else {
        c.status = 'belum';
        c.komisiDiberi = false;
    }

    // Komisi collector baru (hanya sekali, pakai flag)
    if (jml > 0 && !c.komisiDiberi) {
        const newCollEnt = DB.entitas.find(e => e.peran === 'Collector' && e.nama === c.collector);
        if (newCollEnt) {
            const rateC = newCollEnt.komisiRate || DB.settings.komisi_coll || 1500;
            const bundleAktif = Math.max(0, (p.bundle || 0));
            newCollEnt.komisiKotor = (newCollEnt.komisiKotor || 0) + (rateC * bundleAktif);
        }
        c.komisiDiberi = true;
    }

    // Hitung ulang sisa PO
    p.sisa = p.cicilan.filter(x => x.status !== 'batal').reduce((s, x) => s + (x.tagihan - (x.terbayar || 0)), 0);
    const semuaLunas = p.cicilan.filter(x => x.status !== 'batal').every(x => x.status === 'lunas');
    if (semuaLunas) {
        p.status = 'lunas'; p.sisa = 0;
    } else if (p.status === 'lunas') {
        p.status = 'berjalan';
    } else {
        const masihAdaTelat = p.cicilan.some(x => x.status === 'telat');
        p.status = masihAdaTelat ? 'telat' : 'berjalan';
    }

    const k = DB.konsumen.find(x => x.id === p.konsumenId || x.nama === p.konsumen);
    if (k) k.tagihan = Math.max(0, p.sisa);

    saveDB();
    closeModal('modal-edit-bayar');
    toast(`Termin ${editBayarN} PO ${editBayarPO} berhasil diperbarui`);
    addAudit(`Edit bayar termin ${editBayarN} PO ${editBayarPO}: terbayar ${fmtRpFull(jml)}`);
    renderPOList();
    renderPODetail(editBayarPO);
}

function editTanggalPO(poId) {
    const p = DB.poList.find(x => x.id === poId);
    if (!p) return;
    const BULAN = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11 };
    let isoVal = '';
    if (p.tanggal) {
        const parts = p.tanggal.split(' ');
        if (parts.length === 3) {
            const m = BULAN[parts[1]];
            if (m !== undefined) isoVal = `${parts[2]}-${String(m + 1).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
        }
    }
    const el = document.getElementById(`po-tgl-disp-${poId}`);
    if (!el) return;
    el.innerHTML = `<input type="date" value="${isoVal}" id="po-tgl-edit"
        style="font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid var(--accent);background:var(--bg3);color:var(--text)"
        onkeydown="if(event.key==='Escape'){renderPODetail('${poId}')}"
        onchange="saveTanggalPO('${poId}',this.value)" />`;
    document.getElementById('po-tgl-edit')?.focus();
}

function saveTanggalPO(poId, isoVal) {
    if (!isoVal) return;
    const p = DB.poList.find(x => x.id === poId);
    if (!p) return;
    p.tanggal = formatDateShort(isoVal);
    saveDB();
    toast(`Tanggal PO ${poId} diperbarui ke ${p.tanggal}`, 'success');
    addAudit(`Edit tanggal PO ${poId}: ${p.tanggal}`);
    renderPODetail(poId);
    renderPOList();
}

// ── Edit Tanggal Jatuh Tempo Termin ──────────────
function editJatuhTermin(poId, nTermin) {
    const p = DB.poList.find(x => x.id === poId);
    const c = p?.cicilan.find(x => x.n === nTermin);
    if (!p || !c) return;
    const dispEl = document.getElementById(`jatuh-disp-${poId}-${nTermin}`);
    if (!dispEl) return;
    const BULAN_MAP = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11 };
    let isoVal = '';
    if (c.jatuh) {
        const parts = c.jatuh.split(' ');
        if (parts.length >= 2) {
            const m = BULAN_MAP[parts[1]];
            const d = parseInt(parts[0]);
            let y = parts[2] ? parseInt(parts[2]) : parseInt((p.tanggal || '').split(' ')[2] || new Date().getFullYear());
            if (!isNaN(d) && m !== undefined && !isNaN(y)) {
                isoVal = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
        }
    }
    dispEl.innerHTML = `<input type="date" value="${isoVal}" id="jatuh-edit-${poId}-${nTermin}"
        style="font-size:12px;padding:2px 5px;border-radius:4px;border:1px solid var(--accent);background:var(--bg3);color:var(--text);width:130px"
        onkeydown="if(event.key==='Escape'){renderPODetail('${poId}')}"
        onchange="saveJatuhTermin('${poId}',${nTermin},this.value)" />`;
    document.getElementById(`jatuh-edit-${poId}-${nTermin}`)?.focus();
}

function saveJatuhTermin(poId, nTermin, isoVal) {
    if (!isoVal) return;
    const p = DB.poList.find(x => x.id === poId);
    const c = p?.cicilan.find(x => x.n === nTermin);
    if (!p || !c) return;
    const oldJatuh = c.jatuh;
    c.jatuh = formatDateShort(isoVal);
    saveDB();
    toast(`Jatuh tempo termin ${nTermin} PO ${poId} diperbarui: ${oldJatuh} → ${c.jatuh}`, 'success');
    addAudit(`Edit jatuh tempo termin ${nTermin} PO ${poId}: ${oldJatuh} → ${c.jatuh}`);
    renderPODetail(poId);
}

function cetakPO(id) {
    const p = DB.poList.find(x => x.id === id);
    if (!p) return;
    const prs = DB.settings.perusahaan || {};
    const nPrs = prs.nama || 'INTERGAS PERDANA';
    const aPrs = prs.alamat || '';
    const kPrs = prs.kota || '';
    const tPrs = [prs.telp, prs.telp2].filter(Boolean).join(' / ');
    const totalBundle = p.bundle;
    const win = window.open('', '_blank', 'width=700,height=900');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const today = new Date();
    const tglCetak = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
    <title>PO ${p.id}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;padding:28px 32px;color:#111;background:#fff;font-size:13px}
      hr.tebal{border:none;border-top:2.5px solid #000;margin:6px 0 2px}
      hr.tipis{border:none;border-top:1px solid #000;margin:2px 0 10px}
      .po-title{text-align:center;font-size:17px;font-weight:bold;letter-spacing:6px;margin:6px 0 14px}
      table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px}
      th,td{padding:7px 10px;text-align:left;border:1px solid #ccc}
      th{background:#f0f0f0;font-weight:bold;font-size:11px}
      .total-row td{font-weight:bold;font-size:14px}
      .foot{display:flex;justify-content:space-between;margin-top:36px;font-size:11px}
      .sign{text-align:center;width:180px}
      .sign-line{border-top:1px solid #000;padding-top:5px;margin-top:50px}
      .section-lbl{font-size:10px;text-transform:uppercase;color:#777;margin:12px 0 6px;letter-spacing:.5px;border-bottom:1px solid #ddd;padding-bottom:4px}
      .badge-st{display:inline-block;padding:1px 8px;border:1px solid #333;font-size:10px;border-radius:2px}
    </style></head><body>
    ${getKopSuratHTML()}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;margin-bottom:14px;gap:16px">
      <div class="po-title" style="margin:0;flex:1;text-align:center">P U R C H A S E &nbsp; O R D E R</div>
      <div style="border:1px solid #333;padding:6px 12px;font-size:11px;line-height:2;flex-shrink:0">
        <div><span style="display:inline-block;width:80px">No</span> : ${p.id}</div>
        <div><span style="display:inline-block;width:80px">Tanggal PO</span> : ${p.tanggal}</div>
        <div><span style="display:inline-block;width:80px">Dicetak</span> : ${tglCetak}</div>
      </div>
    </div>

    <div class="section-lbl">Data Konsumen & Tim</div>
    <table>
      <tr><th>Konsumen</th><td>${p.konsumen}</td><th>Sales</th><td>${p.sales}</td></tr>
      <tr><th>Nego</th><td>${p.nego}</td><th>Koordinator</th><td>${p.koor}</td></tr>
      <tr><th>Collector</th><td>${p.coll}</td><th>Status</th><td><span class="badge-st">${p.status.toUpperCase()}</span></td></tr>
    </table>

    <div class="section-lbl">Detail Produk</div>
    <table>
      <thead><tr><th>Produk</th><th style="text-align:right">Harga Satuan</th><th style="text-align:center">Qty</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>
        ${(p.bundleDetail || [{ produk: 'Bundle', harga: p.total / p.bundle, qty: p.bundle }]).map(b =>
        `<tr><td>${b.produk}</td><td style="text-align:right">${fmtRpFull(b.harga)}</td><td style="text-align:center">${b.qty}</td><td style="text-align:right">${fmtRpFull(b.harga * b.qty)}</td></tr>`
    ).join('')}
        <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right">${fmtRpFull(p.total)}</td></tr>
      </tbody>
    </table>

    <div class="section-lbl">Jadwal Cicilan</div>
    <table>
      <thead><tr><th style="text-align:center">Termin</th><th>Jatuh Tempo</th><th style="text-align:right">Tagihan</th><th style="text-align:center">Status</th></tr></thead>
      <tbody>${p.cicilan.map(c =>
        `<tr><td style="text-align:center">${c.n}</td><td>${c.jatuh}</td><td style="text-align:right">${fmtRpFull(c.tagihan)}</td><td style="text-align:center"><span class="badge-st">${c.status.toUpperCase()}</span></td></tr>`
    ).join('')}</tbody>
    </table>

    <div class="foot">
      <div class="sign">Penanggung Jawab<div class="sign-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div></div>
      <div class="sign">Konsumen<div class="sign-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div></div>
      <div class="sign">Mengetahui<div class="sign-line">${p.koor || 'Koordinator'}</div></div>
    </div>

    <div style="margin-top:18px;font-size:9px;color:#999;border-top:1px dashed #ccc;padding-top:6px">
      Dokumen ini dicetak oleh sistem ${nPrs} · ${tglCetak} · ${p.id}
    </div>
    <script>window.print();<\/script>
    </body></html>`);
    win.document.close();
    addAudit(`Cetak PO ${id}`);
}

// ─────────────────────────────────────────────────────────────
// HELPER: Konversi angka ke terbilang (Bahasa Indonesia)
// ─────────────────────────────────────────────────────────────
function angkaTerbilang(n) {
    const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
        'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas',
        'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
    if (n === 0) return 'nol';
    if (n < 0) return 'minus ' + angkaTerbilang(-n);
    if (n < 20) return satuan[n];
    if (n < 100) {
        const puluhan = Math.floor(n / 10);
        const sisa = n % 10;
        return satuan[puluhan] + ' puluh' + (sisa ? ' ' + satuan[sisa] : '');
    }
    if (n < 200) return 'seratus' + (n > 100 ? ' ' + angkaTerbilang(n - 100) : '');
    if (n < 1000) {
        const ratusan = Math.floor(n / 100);
        const sisa = n % 100;
        return satuan[ratusan] + ' ratus' + (sisa ? ' ' + angkaTerbilang(sisa) : '');
    }
    if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + angkaTerbilang(n - 1000) : '');
    if (n < 1000000) {
        const ribuan = Math.floor(n / 1000);
        const sisa = n % 1000;
        return angkaTerbilang(ribuan) + ' ribu' + (sisa ? ' ' + angkaTerbilang(sisa) : '');
    }
    if (n < 1000000000) {
        const jutaan = Math.floor(n / 1000000);
        const sisa = n % 1000000;
        return angkaTerbilang(jutaan) + ' juta' + (sisa ? ' ' + angkaTerbilang(sisa) : '');
    }
    const milyar = Math.floor(n / 1000000000);
    const sisa = n % 1000000000;
    return angkaTerbilang(milyar) + ' miliar' + (sisa ? ' ' + angkaTerbilang(sisa) : '');
}

function terbilangRupiah(n) {
    const str = angkaTerbilang(n);
    return str.charAt(0).toUpperCase() + str.slice(1) + ' rupiah';
}

// ─────────────────────────────────────────────────────────────
// cetakKwitansi — sesuai template asli IGP (foto)
// ─────────────────────────────────────────────────────────────
function cetakKwitansi(n, poId) {
    const p = DB.poList.find(x => x.id === poId);
    const c = p?.cicilan.find(x => x.n === n);
    if (!p || !c) return;

    const prs = DB.settings.perusahaan || {};
    const namaPerusahaan = prs.nama || 'INTERGAS PERDANA';
    const alamat = prs.alamat || 'Jl. Villa Taman Kartini Blok B5';
    const kota = prs.kota || 'Bekasi Timur';
    const telp = prs.telp || '';
    const telp2 = prs.telp2 || '';
    const telephones = [telp, telp2].filter(Boolean).join(' / ');

    // Nomor kwitansi = nomor PO (1 transaksi = 1 nomor)
    const noKwitansi = `${poId}/T-${n}`;

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const today = new Date();
    const tglCetak = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    // Jenis barang (baris "Jenis" di template)
    const jenisBrg = (p.bundleDetail || []).map(b => {
        const nm = b.produk.split('(')[0].trim();
        return `${b.qty} Unit  ${nm}`;
    }).join(', ') || `${p.bundle} Unit`;

    const win = window.open('', '_blank', 'width=860,height=700');
    win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Kwitansi ${noKwitansi} - Termin ${n}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── DOT MATRIX OPTIMIZED ── */
    body {
      background: #ccc;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0 40px;
      /* Courier New = font dot matrix standar */
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #000;
    }

    /* Kertas continuous form dot matrix: 9.5" x 11"
       Minus perforasi kiri-kanan ~0.5" per sisi → area cetak ~8.5" */
    .paper {
      width: 21.59cm; /* 8.5 inch — lebar area cetak dot matrix */
      min-height: 13cm;
      background: #fff;
      padding: 12px 20px 16px 28px; /* left lebih besar = kompensasi perforasi */
      box-shadow: 0 2px 10px rgba(0,0,0,.3);
      position: relative;
    }

    hr.tebal { border: none; border-top: 2px solid #000; margin: 4px 0 1px; }
    hr.tipis  { border: none; border-top: 1px solid #000; margin: 1px 0 7px; }

    .judul {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 8px;
      margin: 4px 0 10px;
    }

    /* Baris isian — underline solid, bukan dotted (dot matrix friendly) */
    .baris {
      display: flex;
      align-items: flex-end;
      margin-bottom: 7px;
      font-size: 13px;
    }
    .lbl { width: 180px; flex-shrink: 0; }
    .sep { width: 12px; flex-shrink: 0; text-align: center; }
    .val {
      flex: 1;
      border-bottom: 1px solid #000; /* solid — dot matrix tidak bisa dotted */
      padding-bottom: 1px;
      min-height: 17px;
      font-weight: bold;
      padding-left: 4px;
    }
    .val.besar {
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .termin-box {
      border: 1px solid #000;
      padding: 1px 8px;
      font-size: 11px;
      font-weight: normal;
      white-space: nowrap;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .catatan {
      margin-top: 8px;
      font-size: 10px;
      color: #000;
      line-height: 1.8;
      border-top: 1px solid #000;
      padding-top: 6px;
    }
    .catatan b { font-weight: bold; }

    .ttd-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 12px;
      font-size: 12px;
    }
    .ttd-blok { text-align: center; width: 180px; }
    .ttd-garis {
      border-top: 1px solid #000;
      margin-top: 48px;
      padding-top: 4px;
      font-size: 11px;
    }

    .entitas-row {
      margin-top: 7px;
      font-size: 10px;
      color: #000;
      border-top: 1px solid #000;
      padding-top: 4px;
      display: flex;
      gap: 20px;
    }

    @media print {
      body { background: none; padding: 0; margin: 0; }
      .paper {
        box-shadow: none;
        width: 100%;
        min-height: unset;
        padding: 8px 16px 12px 24px;
      }
    }
  </style>
</head>
<body>
<div class="paper">

  <!-- ══ HEADER ══ -->
  ${getKopSuratHTML()}
  <div style="margin-top:8px;margin-bottom:10px">
    <div class="judul" style="margin:0 0 6px;text-align:center">K W I T A N S I</div>
    <div style="display:flex;justify-content:flex-end">
      <div style="border:1px solid #333;padding:5px 12px;font-size:11px;line-height:2">
        <div><span style="display:inline-block;width:85px">No Kwitansi</span> : ${noKwitansi}</div>
        <div><span style="display:inline-block;width:85px">Tanggal PO</span> : ${p.tanggal}</div>
        <div><span style="display:inline-block;width:85px">Jatuh Tempo</span> : ${c.jatuh}</div>
      </div>
    </div>
  </div>

  <!-- ══ ISI ══ -->
  <!-- Telah terima dari -->
  <div class="baris">
    <div class="lbl">Telah terima dari</div>
    <div class="sep">:</div>
    <div class="val">${p.konsumen}</div>
    <span class="termin-box">Termin ${n} / ${p.cicilan.length}</span>
  </div>

  <!-- No Kwitansi -->
  <div class="baris">
    <div class="lbl">No Kwitansi</div>
    <div class="sep">:</div>
    <div class="val">${noKwitansi}</div>
  </div>

  <!-- Sejumlah Uang -->
  <div class="baris">
    <div class="lbl">Sejumlah Uang</div>
    <div class="sep">:</div>
    <div class="val besar">Rp &nbsp;${c.tagihan.toLocaleString('id-ID')}</div>
  </div>

  <!-- Terbilang -->
  <div class="baris">
    <div class="lbl">Dengan Jumlah Terbilang</div>
    <div class="sep">:</div>
    <div class="val">${terbilangRupiah(c.tagihan)}</div>
  </div>

  <!-- Termin -->
  <div class="baris">
    <div class="lbl">Termin</div>
    <div class="sep">:</div>
    <div class="val">Ke ${n}</div>
  </div>

  <!-- Jenis (produk) -->
  <div class="baris">
    <div class="lbl">Jenis</div>
    <div class="sep">:</div>
    <div class="val">${jenisBrg}</div>
  </div>

  <!-- ══ CATATAN ══ -->
  <div class="catatan">
    <b>Catatan :</b><br>
    1. Simpan kwitansi ini sebagai bukti pembayaran yang sah sampai tanda termin ke-<b>${n}</b><br>
    2. Apabila barang dikembalikan maka uang yang sudah masuk tidak dapat dikembalikan<br>
    3. Komisi koordinator Rp ${(DB.settings.komisi_koor || 200000).toLocaleString('id-ID')},- / bundle diberikan setelah pelunasan termin ke ${p.cicilan.length} diluar retur dan masalah
  </div>

  <!-- ══ TTD ══ -->
  <div class="ttd-area">
    <div class="ttd-blok">
      Penanggung Jawab<br>Ttd
      <div class="ttd-garis">(${'\u00a0'.repeat(24)})</div>
    </div>
    <div class="ttd-blok">
      Collector ${namaPerusahaan}<br>Ttd
      <div class="ttd-garis">${c.collector || p.coll || 'Collector'}</div>
    </div>
  </div>

  <!-- ══ INFO ENTITAS ══ -->
  <div class="entitas-row">
    <span>Nego &nbsp;&nbsp;&nbsp;&nbsp;: ${p.nego || '—'}</span>
    <span>Sales &nbsp;&nbsp;&nbsp;&nbsp;: ${p.sales || '—'}</span>
    <span>Collector : ${c.collector || p.coll || '—'}</span>
    ${c.tglBayar ? `<span>Tgl Bayar : ${c.tglBayar}</span>` : ''}
  </div>

</div>
<script>window.print();<\/script>
</body>
</html>`);
    win.document.close();
    addAudit(`Cetak kwitansi ${poId} termin ${n}`);
}



// BUAT PO
let cicilanMode = 'preset';

function getActivePresets() {
    return (DB.presets && DB.presets.length) ? DB.presets : [{ nama: 'Default', vals: [100] }];
}

function initBuatPO() {
    // Inisialisasi bundleRows dari bundleDef jika ada
    const firstBundle = (DB.bundleDef && DB.bundleDef.length)
        ? DB.bundleDef.find(b => b.aktif !== false)
        : null;
    // Selalu reset bundleRows saat buka form PO baru agar menyesuaikan inventory terkini
    DB.bundleRows = firstBundle
        ? [{ produk: firstBundle.nama, harga: firstBundle.harga, qty: 1, id: firstBundle.id }]
        : [{ produk: 'Bundle', harga: DB.settings.harga_std || 5800000, qty: 1 }];

    // ── Set tanggal PO = hari ini (selalu fresh saat buka form) ──
    const todayISO = new Date().toISOString().split('T')[0];
    const todayFmt = formatDateShort(todayISO);  // "21 Apr 2026"
    // Mulai cicilan default = 7 hari ke depan (minggu pertama)
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekFmt = formatDateShort(nextWeek.toISOString().split('T')[0]);

    const tglEl = document.getElementById('po-tanggal');
    if (tglEl) tglEl.value = todayISO; // type=date butuh YYYY-MM-DD
    const mulaiEl = document.getElementById('po-mulai-cicilan');
    if (mulaiEl) mulaiEl.value = nextWeekFmt;

    const sel = document.getElementById('po-konsumen');
    if (sel) { sel.innerHTML = getKonsumenOptions(); makeSearchableSelect(sel); }
    const selSales = document.getElementById('po-sales');
    if (selSales) { selSales.innerHTML = getSalesOptions(); makeSearchableSelect(selSales); }
    const selNego = document.getElementById('po-nego');
    if (selNego) { selNego.innerHTML = getNegoOptions(); makeSearchableSelect(selNego); }

    // ── KC: tampilkan semua KC aktif sebagai dropdown (bisa dipilih) ──
    const kcList = DB.entitas.filter(e => e.peran === 'Kepala Cabang' && e.aktifStatus);
    const kcDisplay = document.getElementById('po-kc-display');
    const kcSelect = document.getElementById('po-kc-select');
    if (kcList.length > 1 && kcSelect) {
        // Lebih dari 1 KC — pakai dropdown
        kcSelect.innerHTML = kcList.map(e => `<option value="${e.nama}">${e.nama}</option>`).join('');
        kcSelect.style.display = 'block';
        if (kcDisplay) kcDisplay.style.display = 'none';
    } else {
        // 0 atau 1 KC — tampilkan nama saja
        if (kcDisplay) {
            kcDisplay.textContent = kcList[0]?.nama || 'Belum ada KC aktif';
            kcDisplay.style.display = 'block';
        }
        if (kcSelect) kcSelect.style.display = 'none';
    }

    renderBundleRows();
    resetSovenirRows();
    recalcCicilan();
    updatePOSummary();
}

function renderBundleRows() {
    // Pakai bundleDef dari DB jika ada, fallback ke BUNDLE_OPTIONS lama
    const bundleOpts = (DB.bundleDef && DB.bundleDef.length)
        ? DB.bundleDef.filter(b => b.aktif !== false).map(b => {
            // Hitung stok tersedia dari komponen
            let stokMin = Infinity;
            (b.komponen || []).forEach(komp => {
                const item = DB.inventory.find(i => i.id == komp.invId || i.id == komp.itemId || i.nama === komp.nama);
                const bisa = item ? Math.floor(item.stok / (komp.qty || 1)) : 0;
                if (bisa < stokMin) stokMin = bisa;
            });
            if (stokMin === Infinity) stokMin = 0;
            return { produk: b.nama, harga: b.harga, id: b.id, stok: stokMin };
        })
        : [{ produk: 'Bundle', harga: DB.settings.harga_std || 5800000, id: null, stok: null }];

    document.getElementById('bundle-rows').innerHTML = DB.bundleRows.map((r, i) => `
    <div style="display:flex;gap:8px;align-items:center;padding:9px 10px;background:var(--bg);border:0.5px solid var(--border);border-radius:8px;margin-bottom:6px">
      <select class="select" style="flex:1;background:var(--bg2)" onchange="updateBundle(${i},'produk',this.value)">
        ${bundleOpts.map(o => `<option value="${o.produk}" ${o.produk === r.produk ? 'selected' : ''}>${o.produk}${o.stok !== null ? ` (stok: ${o.stok})` : ''}</option>`).join('')}
      </select>
      <input class="input" value="${fmtRpFull(r.harga)}" style="width:130px;color:#5DCAA5;background:var(--bg2)" readonly/>
      <input class="input" type="number" value="${r.qty}" style="width:70px;background:var(--bg2)" min="1" onchange="updateBundle(${i},'qty',this.value)"/>
      <button class="btn" style="width:28px;padding:0;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px" onclick="removeBundle(${i})">×</button>
    </div>`).join('');
}

function updateBundle(i, key, val) {
    if (key === 'produk') {
        // Cari harga dari bundleDef dulu, fallback ke BUNDLE_OPTIONS
        const def = (DB.bundleDef || []).find(b => b.nama === val);
        const harga = def ? def.harga
            : (val.includes('Standard') ? DB.settings.harga_std : DB.settings.harga_prem);
        DB.bundleRows[i].produk = val;
        DB.bundleRows[i].harga = harga;
        if (def) DB.bundleRows[i].id = def.id;
    } else if (key === 'qty') {
        DB.bundleRows[i].qty = Math.max(1, parseInt(val) || 1);
    }
    renderBundleRows(); recalcCicilan(); updatePOSummary();
}

function addBundleRow() {
    const firstBundle = (DB.bundleDef && DB.bundleDef.length)
        ? DB.bundleDef.find(b => b.aktif !== false) : null;
    DB.bundleRows.push(firstBundle
        ? { produk: firstBundle.nama, harga: firstBundle.harga, qty: 1, id: firstBundle.id }
        : { produk: 'Bundle', harga: DB.settings.harga_std, qty: 1 });
    renderBundleRows(); recalcCicilan(); updatePOSummary();
}

// ── Souvenir di PO ────────────────────────────────────────────
if (!window.DB_SOVENIR_ROWS) window.DB_SOVENIR_ROWS = [];

function addSovenirRow() {
    if (!window.DB_SOVENIR_ROWS) window.DB_SOVENIR_ROWS = [];
    // Ambil pilihan dari inventory kategori sovenir
    const sovItems = (DB.inventory || []).filter(i => i.kategori === 'sovenir' && i.kondisi !== 'reject');
    const defaultNama = sovItems.length ? sovItems[0].nama : '';
    const defaultHarga = sovItems.length ? (sovItems[0].harga || 0) : 0;
    window.DB_SOVENIR_ROWS.push({ nama: defaultNama, harga: defaultHarga, qty: 1 });
    renderSovenirRows();
}

function removeSovenir(i) {
    window.DB_SOVENIR_ROWS.splice(i, 1);
    renderSovenirRows();
}

function renderSovenirRows() {
    const container = document.getElementById('sovenir-rows');
    if (!container) return;
    const sovItems = (DB.inventory || []).filter(i => i.kategori === 'sovenir' && i.kondisi !== 'reject');
    const opts = sovItems.map(i => `<option value="${i.nama}" data-harga="${i.harga || 0}">${i.nama} (${fmtRpFull(i.harga || 0)})</option>`).join('');

    if (!window.DB_SOVENIR_ROWS || !window.DB_SOVENIR_ROWS.length) {
        container.innerHTML = '<div style="font-size:12px;color:var(--text4);padding:6px 0">Belum ada souvenir ditambahkan.</div>';
        const totalEl = document.getElementById('sovenir-total-info');
        if (totalEl) totalEl.style.display = 'none';
        return;
    }

    container.innerHTML = window.DB_SOVENIR_ROWS.map((row, i) => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <select class="select" style="flex:1;font-size:12px" onchange="onSovenirChange(${i},this)">
            ${sovItems.length ? opts : `<option value="${row.nama || ''}">${row.nama || 'Ketik nama manual'}</option>`}
        </select>
        <input class="input" type="number" value="${row.harga || 0}" min="0" style="width:110px;font-size:12px" placeholder="Harga/unit"
            oninput="window.DB_SOVENIR_ROWS[${i}].harga=parseInt(this.value)||0;updateSovenirTotal()"/>
        <input class="input" type="number" value="${row.qty || 1}" min="1" style="width:70px;font-size:12px;text-align:center"
            oninput="window.DB_SOVENIR_ROWS[${i}].qty=parseInt(this.value)||1;updateSovenirTotal()"/>
        <button class="btn btn-danger" style="padding:3px 8px;font-size:12px" onclick="removeSovenir(${i})">×</button>
    </div>`).join('');

    // Set selected values
    container.querySelectorAll('select').forEach((sel, i) => {
        if (window.DB_SOVENIR_ROWS[i]?.nama) sel.value = window.DB_SOVENIR_ROWS[i].nama;
    });
    updateSovenirTotal();
}

function onSovenirChange(i, sel) {
    const opt = sel.options[sel.selectedIndex];
    window.DB_SOVENIR_ROWS[i].nama = sel.value;
    window.DB_SOVENIR_ROWS[i].harga = parseInt(opt.dataset.harga) || 0;
    renderSovenirRows();
}

function updateSovenirTotal() {
    if (!window.DB_SOVENIR_ROWS || !window.DB_SOVENIR_ROWS.length) return;
    const total = window.DB_SOVENIR_ROWS.reduce((s, r) => s + (r.harga || 0) * (r.qty || 1), 0);
    const totalEl = document.getElementById('sovenir-total-info');
    if (totalEl) {
        totalEl.style.display = total > 0 ? 'block' : 'none';
        totalEl.textContent = `Total souvenir: ${fmtRpFull(total)} (dipotong dari komisi Sales)`;
    }
}

function resetSovenirRows() {
    window.DB_SOVENIR_ROWS = [];
    renderSovenirRows();
}

function removeBundle(i) {
    if (DB.bundleRows.length <= 1) {
        // Boleh hapus bundle terakhir jika ada souvenir
        const hasSov = window.DB_SOVENIR_ROWS && window.DB_SOVENIR_ROWS.some(s => s.nama);
        if (!hasSov) { toast('Minimal 1 bundle, atau tambahkan souvenir terlebih dahulu', 'error'); return; }
    }
    DB.bundleRows.splice(i, 1);
    renderBundleRows(); recalcCicilan(); updatePOSummary();
}

function setCicilanMode(mode) {
    cicilanMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    const modeEl = { rata: 'mode-rata', preset: 'mode-preset', manual: 'mode-manual' };
    document.getElementById(modeEl[mode])?.classList.add('active');
    const presetInfo = document.getElementById('preset-info');
    if (presetInfo) presetInfo.style.display = mode === 'preset' ? 'flex' : 'none';
    recalcCicilan();
}

function cyclePreset() {
    const presets = getActivePresets();
    DB.currentPreset = ((DB.currentPreset || 0) + 1) % presets.length;
    const el = document.querySelector('#preset-info span');
    if (el) el.textContent = `Template: ${presets[DB.currentPreset].nama} (${presets[DB.currentPreset].vals.join('-')})`;
    recalcCicilan();
}

function recalcCicilan() {
    const nRaw = parseInt(document.getElementById('po-n-cicilan')?.value) || 7;
    const n = Math.max(1, Math.min(24, nRaw));
    const total = DB.bundleRows.reduce((s, r) => s + r.harga * r.qty, 0);
    const mulaiStr = document.getElementById('po-mulai-cicilan')?.value || '';
    const container = document.getElementById('cicilan-rows-container');
    if (!container) return;

    let pcts = [];
    if (cicilanMode === 'rata') {
        const base = Math.floor(100 / n);
        pcts = Array(n).fill(base);
        const rem = 100 - base * n;
        for (let i = 0; i < rem; i++) pcts[i]++;
    } else if (cicilanMode === 'preset') {
        const presets = getActivePresets();
        const currentPreset = presets[DB.currentPreset || 0] || presets[0];
        const preset = currentPreset.vals;
        pcts = preset.length >= n ? preset.slice(0, n) : [...preset, ...Array(n - preset.length).fill(0)];
        const sum = pcts.reduce((a, b) => a + b, 0);
        if (sum !== 100 && sum > 0) pcts[0] += (100 - sum);
    } else {
        pcts = Array(n).fill(Math.floor(100 / n));
    }

    let nominals = pcts.map(p => Math.round(total * p / 100));
    const totalCalc = nominals.reduce((a, b) => a + b, 0);
    if (totalCalc !== total && nominals.length) nominals[0] += (total - totalCalc);

    const dates = [];
    for (let i = 0; i < n; i++) dates.push(addWeeks(mulaiStr, i));

    if (cicilanMode === 'manual') {
        container.innerHTML = nominals.map((nom, i) => `
      <div class="cicilan-row-item">
        <span class="cicilan-num">${i + 1}</span>
        <input class="input" value="${fmtRpFull(nom)}" style="width:110px;background:var(--bg2);color:#5DCAA5"
          oninput="onManualInput(${n},${total})"/>
        <span style="font-size:11px;color:var(--text4);flex:1;text-align:center">${dates[i]}</span>
      </div>`).join('');
        document.getElementById('cicilan-total-label').textContent = 'Total nominal';
        document.getElementById('cicilan-total-val').textContent = fmtRpFull(total);
    } else {
        const totalPct = pcts.reduce((a, b) => a + b, 0);
        const pctOk = totalPct === 100;
        container.innerHTML = pcts.map((p, i) => `
      <div class="cicilan-row-item">
        <span class="cicilan-num">${i + 1}</span>
        <input class="input" value="${p}%" style="width:65px;background:var(--bg2)"
          oninput="onPresetInput(${n},${total})"/>
        <span style="font-size:11px;color:var(--text4);flex:1;text-align:center">${dates[i]}</span>
        <span style="font-size:13px;color:#5DCAA5;flex-shrink:0">${fmtRpFull(nominals[i])}</span>
      </div>`).join('');
        document.getElementById('cicilan-total-label').textContent = 'Total persentase';
        document.getElementById('cicilan-total-val').textContent = pctOk ? `${totalPct}% ✓` : `${totalPct}% ✗`;
        document.getElementById('cicilan-total-val').style.color = pctOk ? '#5DCAA5' : '#F09595';
    }
    updatePOSummary();
}

function onPresetInput(n, total) {
    const inputs = document.querySelectorAll('#cicilan-rows-container .cicilan-row-item input');
    const pcts = [];
    inputs.forEach(inp => pcts.push(parseInt(inp.value) || 0));
    const nominals = pcts.map(p => Math.round(total * p / 100));
    const totalPct = pcts.reduce((a, b) => a + b, 0);
    inputs.forEach((inp, idx) => {
        const spans = inp.closest('.cicilan-row-item').querySelectorAll('span');
        if (spans[1]) spans[1].textContent = fmtRpFull(nominals[idx]);
    });
    const pctOk = totalPct === 100;
    document.getElementById('cicilan-total-val').textContent = pctOk ? `${totalPct}% ✓` : `${totalPct}% ✗`;
    document.getElementById('cicilan-total-val').style.color = pctOk ? '#5DCAA5' : '#F09595';
}

function onManualInput(n, total) {
    const inputs = document.querySelectorAll('#cicilan-rows-container .cicilan-row-item input');
    let sum = 0;
    inputs.forEach(inp => sum += parseRp(inp.value));
    document.getElementById('cicilan-total-val').textContent = `${fmtRpFull(sum)} / ${fmtRpFull(total)}`;
    document.getElementById('cicilan-total-val').style.color = sum === total ? '#5DCAA5' : '#F09595';
}

function addWeeks(startStr, weeks) {
    if (!startStr) return `Minggu ${weeks + 1}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const parts = startStr.split(' ');
    if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const mIdx = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'].indexOf(parts[1].toLowerCase());
        const y = parseInt(parts[2]);
        if (mIdx >= 0) {
            const isBulanan = (DB.settings.interval || 'Mingguan') === 'Bulanan';
            const dt = isBulanan ? new Date(y, mIdx + weeks, d) : new Date(y, mIdx, d + weeks * 7);
            return `${dt.getDate()} ${months[dt.getMonth()]}`;
        }
    }
    return `Minggu ${weeks + 1}`;
}

function updatePOSummary() {
    const el = document.getElementById('po-summary');
    if (!el) return;
    const total = DB.bundleRows.reduce((s, r) => s + r.harga * r.qty, 0);
    const totalBundle = DB.bundleRows.reduce((s, r) => s + r.qty, 0);
    const n = parseInt(document.getElementById('po-n-cicilan')?.value) || 7;
    const sales = document.getElementById('po-sales')?.value || '';
    const nego = document.getElementById('po-nego')?.value || '';
    const koor = document.getElementById('po-konsumen')?.options[document.getElementById('po-konsumen')?.selectedIndex]?.text || '';
    const kcSel = document.getElementById('po-kc-select');
    const kcDis = document.getElementById('po-kc-display');
    const kc = (kcSel && kcSel.style.display !== 'none') ? kcSel.value : (kcDis?.textContent || '—');
    const komisiSales = totalBundle * DB.settings.komisi_sales;
    // Split dinamis: genap → n/2 | n/2, ganjil → ceil(n/2) | floor(n/2)
    const n_cic = parseInt(document.getElementById('po-n-cicilan')?.value) || DB.settings.n_cicilan || 7;
    const splitN1 = n_cic % 2 === 0 ? n_cic / 2 : Math.floor(n_cic / 2) + 1;
    const split60 = Math.round(komisiSales * DB.settings.split_komisi_pct1 / 100);
    const split40 = komisiSales - split60;

    const rowsHtml = DB.bundleRows.map(r => `
    <div class="sum-row">
      <span style="color:var(--text4)">${r.produk.split('(')[0].trim()} × ${r.qty}</span>
      <span style="color:var(--text2);font-weight:500">${fmtRpFull(r.harga * r.qty)}</span>
    </div>`).join('');

    el.innerHTML = `
    <div class="card-title">Ringkasan PO</div>
    ${rowsHtml}
    <div class="divider"></div>
    <div class="sum-row"><span style="color:var(--text4)">Total tagihan</span><span style="color:var(--text);font-size:15px;font-weight:500">${fmtRpFull(total)}</span></div>
    <div class="sum-row"><span style="color:var(--text4)">Total bundle</span><span style="color:var(--text2)">${totalBundle} bundle</span></div>
    <div class="sum-row"><span style="color:var(--text4)">Jumlah cicilan</span><span style="color:var(--text2)">${n}× ${DB.settings.interval.toLowerCase()}</span></div>
    <div class="divider"></div>
    <div style="font-size:11px;color:var(--text4);margin-bottom:8px">Split komisi Sales</div>
    <div class="sum-row"><span style="color:#5DCAA5">${DB.settings.split_komisi_pct1}% termin 1–${splitN1}</span><span style="color:#5DCAA5">${fmtRpFull(split60)}</span></div>
    <div class="sum-row"><span style="color:#FAC775">${DB.settings.split_komisi_pct2}% termin ${splitN1 + 1}–${n_cic}</span><span style="color:#FAC775">${fmtRpFull(split40)}</span></div>
    <div class="divider"></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      <span class="badge badge-active">Sales: ${sales.split(' ')[0] || '—'}</span>
      <span class="badge badge-active">Nego: ${nego.split(' ')[0] || '—'}</span>
      <span class="badge badge-active">KC: ${kc.split(' ')[0] || '—'}</span>
    </div>
    <button class="btn btn-primary" style="width:100%;padding:10px;font-size:14px;font-weight:500" onclick="submitBuatPO()">Buat PO & cetak</button>`;
}

function submitBuatPO() {
    const total = DB.bundleRows.reduce((s, r) => s + r.harga * r.qty, 0);
    const totalBundle = DB.bundleRows.reduce((s, r) => s + r.qty, 0);
    const konsumenId = parseInt(document.getElementById('po-konsumen')?.value) || 0;
    const konsumen = DB.konsumen.find(k => k.id === konsumenId);
    const salesNama = document.getElementById('po-sales')?.value || '';
    const negoNama = document.getElementById('po-nego')?.value || '';
    // Koordinator = konsumen yang dipilih
    const koorNama = konsumen?.nama || '';
    const collNama = '';  // Collector tidak ditentukan saat buat PO — diisi saat penagihan per kwitansi
    // KC: ambil dari dropdown (jika ada) atau dari display
    const kcSelectEl = document.getElementById('po-kc-select');
    const kcDisplayEl = document.getElementById('po-kc-display');
    const kcNama = (kcSelectEl && kcSelectEl.style.display !== 'none')
        ? kcSelectEl.value
        : (kcDisplayEl?.textContent || '');
    const tanggalRaw = document.getElementById('po-tanggal')?.value?.trim();
    const tanggal = tanggalRaw ? formatDateShort(tanggalRaw) : formatDateShort(new Date().toISOString().split('T')[0]);
    const nRaw = parseInt(document.getElementById('po-n-cicilan')?.value) || 7;
    const n = Math.max(1, Math.min(24, nRaw));
    const mulai = document.getElementById('po-mulai-cicilan')?.value || '';

    const sovTotal = (window.DB_SOVENIR_ROWS || []).reduce((s, r) => s + (r.harga || 0) * (r.qty || 1), 0);
    const hasSouvenir = sovTotal > 0;
    if (!konsumen) { toast('Konsumen wajib dipilih', 'error'); return; }
    if (!total && !hasSouvenir) { toast('Pilih minimal 1 bundle atau 1 souvenir', 'error'); return; }
    if (!salesNama) { toast('Sales wajib dipilih sebelum membuat PO', 'error'); return; }
    if (total > 0 && totalBundle <= 0) { toast('Jumlah bundle tidak valid', 'error'); return; }

    // Konfirmasi dulu sebelum PO dibuat
    const ringkasan = DB.bundleRows.filter(r => r.qty > 0).map(r => `${r.produk} x${r.qty}`).join(', ') || '(tanpa bundle)';
    const sovRingkasan = (window.DB_SOVENIR_ROWS || []).filter(s => s.nama).map(s => `${s.nama} x${s.qty || 1}`).join(', ');
    const konfirmLines = [`Konsumen: ${konsumen.nama}`, ringkasan !== '(tanpa bundle)' ? `Produk: ${ringkasan}` : 'Produk: Souvenir saja', sovRingkasan ? `Souvenir: ${sovRingkasan}` : '', `Total: ${fmtRpFull(total + sovTotal)}`, '', 'Data tidak bisa diubah setelah PO dibuat.'].filter(Boolean).join('\n');
    if (!confirm('Konfirmasi buat PO?\n\n' + konfirmLines)) return;

    // Validasi stok cukup untuk semua bundle yang dipilih
    const stokKurang = [];
    DB.bundleRows.forEach(row => {
        const bundleDef = (DB.bundleDef || []).find(b => b.nama === row.produk);
        if (bundleDef && bundleDef.komponen && bundleDef.komponen.length) {
            bundleDef.komponen.forEach(komp => {
                const item = DB.inventory.find(i => i.id == komp.invId || i.id == komp.itemId || i.nama === komp.nama);
                const butuh = (komp.qty || 1) * (row.qty || 1);
                if (!item || item.stok < butuh) {
                    stokKurang.push(`${komp.nama || 'Item'} butuh ${butuh}, stok ${item?.stok ?? 0}`);
                }
            });
        } else {
            const item = DB.inventory.find(i => i.nama === row.produk && i.kondisi === 'baru');
            if (item && item.stok < (row.qty || 1)) {
                stokKurang.push(`${row.produk} butuh ${row.qty}, stok ${item.stok}`);
            }
        }
    });
    if (stokKurang.length > 0) {
        toast(`Stok tidak cukup:\n${stokKurang.join('\n')}`, 'error');
        return;
    }

    // Build cicilan dari container
    const inputs = document.querySelectorAll('#cicilan-rows-container .cicilan-row-item input');
    const cicilan = [];
    let nominals = [];

    if (cicilanMode === 'manual') {
        nominals = Array.from(inputs).map(inp => parseRp(inp.value));
        const sumNominal = nominals.reduce((a, b) => a + b, 0);
        if (sumNominal !== total) {
            toast(`Total cicilan manual harus sama dengan total PO (${fmtRpFull(total)})`, 'error');
            return;
        }
    } else {
        const pcts = [];
        inputs.forEach(inp => pcts.push(parseInt(inp.value) || 0));
        const totalPct = pcts.reduce((a, b) => a + b, 0);
        if (totalPct !== 100) {
            toast('Total persentase cicilan harus 100%', 'error');
            return;
        }
        nominals = pcts.map(p => Math.round(total * p / 100));
        const totalCalc = nominals.reduce((a, b) => a + b, 0);
        if (totalCalc !== total && nominals.length) nominals[0] += (total - totalCalc);
    }
    for (let i = 0; i < n; i++) {
        const tagihan = nominals[i] || 0;
        cicilan.push({
            n: i + 1,
            jatuh: addWeeks(mulai, i) + ' ' + (tanggal.split(' ').pop() || '2026'),
            tagihan,
            // Termin dengan tagihan 0 langsung dibatal — tidak perlu dibayar
            status: tagihan === 0 ? 'batal' : 'belum'
        });
    }

    // Hitung total & sisa hanya dari cicilan yang punya tagihan
    const totalAktif = cicilan.filter(c => c.status !== 'batal').reduce((s, c) => s + c.tagihan, 0);

    const sesi = parseInt(document.getElementById('po-sesi')?.value) || 1;
    const lokasi = (document.getElementById('po-lokasi')?.value || '').trim();

    if (!DB.nextPONum || isNaN(DB.nextPONum)) {
        const maxN = (DB.poList || []).reduce((m, p) => {
            const parts = (p.id || '').split('-');
            const n = parseInt(parts[parts.length - 1]);
            return isNaN(n) ? m : Math.max(m, n);
        }, 0);
        DB.nextPONum = maxN + 1;
    }
    const poNum = DB.nextPONum++;
    const newId = `PO-${new Date().getFullYear()}-${String(poNum).padStart(3, '0')}`;
    const newPO = {
        id: newId, konsumenId, konsumen: konsumen.nama,
        bundle: totalBundle, total, sisa: totalAktif,
        status: 'berjalan', tanggal, sesi, lokasi,
        sales: salesNama, nego: negoNama, koor: koorNama, coll: '', kc: kcNama,
        bundleDetail: DB.bundleRows.map(r => ({ ...r })),
        cicilan,
        splitN1: cicilan.length % 2 === 0 ? cicilan.length / 2 : Math.floor(cicilan.length / 2) + 1,
        rateKomisiSales: DB.settings.komisi_sales || 1150000,
        rateKomisiNego: DB.settings.komisi_nego || 300000,
        rateKomisiKoor: DB.settings.komisi_koor || 200000,
        rateKomisiColl: DB.settings.komisi_coll || 50000,
        rateKomisiKc: DB.settings.komisi_kc || 5000,
        splitPct1: DB.settings.split_komisi_pct1 || 60,
        splitPct2: DB.settings.split_komisi_pct2 || 40
    };

    DB.poList.unshift(newPO);
    if (!konsumen.po.includes(newId)) konsumen.po.push(newId);

    // Kurangi stok inventory berdasarkan komponen bundle
    DB.bundleRows.forEach(row => {
        const bundleDef = (DB.bundleDef || []).find(b => b.nama === row.produk || b.id == row.id);
        if (bundleDef && bundleDef.komponen && bundleDef.komponen.length) {
            bundleDef.komponen.forEach(komp => {
                // Gunakan == (bukan ===) untuk handle string vs number mismatch
                const item = DB.inventory.find(i => i.id == komp.invId || i.id == komp.itemId || i.nama === komp.nama);
                if (item) {
                    const jmlKeluar = (komp.qty || 1) * (row.qty || 1);
                    item.stok = Math.max(0, item.stok - jmlKeluar);
                }
            });
        } else {
            const item = DB.inventory.find(i => i.nama === row.produk);
            if (item) item.stok = Math.max(0, item.stok - (row.qty || 1));
        }
    });
    renderInventory();
    renderBundleList();

    saveDB();

    // Reset bundleRows ke bundle pertama dari bundleDef
    const firstBundle = (DB.bundleDef && DB.bundleDef.length)
        ? DB.bundleDef.find(b => b.aktif !== false) : null;
    DB.bundleRows = firstBundle
        ? [{ produk: firstBundle.nama, harga: firstBundle.harga, qty: 1, id: firstBundle.id }]
        : [{ produk: 'Bundle', harga: DB.settings.harga_std, qty: 1 }];

    // ── Update komisi entitas saat PO dibuat ──
    const _salesEnt2 = DB.entitas.find(e => e.peran === 'Sales' && e.nama === salesNama);
    if (_salesEnt2) {
        _salesEnt2.bundle = (_salesEnt2.bundle || 0) + totalBundle;
        // komisiKotor TIDAK ditambah saat PO dibuat — hanya bertambah saat split termin lunas
        // (ditangani di submitBayar via komisiSalesSplit1Cair / Split2Cair)
        if (!_salesEnt2.riwayatPO) _salesEnt2.riwayatPO = [];
        _salesEnt2.riwayatPO.push({ poId: newId, bundle: totalBundle, tanggal, konsumen: konsumen.nama });

        // ── Potong komisi Sales untuk souvenir ──
        const sovenirRows = window.DB_SOVENIR_ROWS || [];
        if (sovenirRows.length > 0) {
            const totalSovenir = sovenirRows.reduce((s, r) => s + (r.harga || 0) * (r.qty || 1), 0);
            if (totalSovenir > 0) {
                _salesEnt2.komisiKotor = Math.max(0, (_salesEnt2.komisiKotor || 0) - totalSovenir);
                if (!_salesEnt2.sovenirLog) _salesEnt2.sovenirLog = [];
                _salesEnt2.sovenirLog.push({ poId: newId, total: totalSovenir, detail: sovenirRows.map(r => ({ nama: r.nama, harga: r.harga, qty: r.qty })), tanggal });
                // Simpan ke pengeluaranList agar muncul di laporan entitas
                if (!_salesEnt2.pengeluaranList) _salesEnt2.pengeluaranList = [];
                sovenirRows.forEach(r => {
                    if ((r.harga || 0) * (r.qty || 1) <= 0) return;
                    _salesEnt2.pengeluaranList.push({
                        id: Date.now() + Math.random(),
                        jenis: 'Souvenir',
                        ket: `Souvenir PO ${newId} — ${r.nama} ×${r.qty}`,
                        jml: (r.harga || 0) * (r.qty || 1),
                        tipe: 'souvenir',
                        poId: newId,
                        tanggal
                    });
                });
                _salesEnt2.pengeluaran = (_salesEnt2.pengeluaranList || []).reduce((s, x) => s + x.jml, 0);
            }
        }
    }

    // Simpan data souvenir di PO
    const sovenirRows = window.DB_SOVENIR_ROWS || [];
    if (sovenirRows.length > 0) {
        newPO.souvenir = sovenirRows.map(r => ({ nama: r.nama, harga: r.harga, qty: r.qty }));
        newPO.totalSouvenir = sovenirRows.reduce((s, r) => s + (r.harga || 0) * (r.qty || 1), 0);
        // Kurangi stok sovenir
        sovenirRows.forEach(r => {
            const inv = DB.inventory.find(i => i.nama === r.nama && i.kategori === 'sovenir');
            if (inv) inv.stok = Math.max(0, inv.stok - (r.qty || 1));
        });
    }
    resetSovenirRows();
    // Komisi konsumen (koordinator orang luar) dicatat di DB.konsumen,
    // akan dicairkan saat PO lunas (di submitBayar)
    const _konsumenEnt = DB.konsumen.find(k => k.nama === koorNama || k.id === konsumenId);
    if (_konsumenEnt) {
        if (!_konsumenEnt.riwayatPO) _konsumenEnt.riwayatPO = [];
        _konsumenEnt.riwayatPO.push({ poId: newId, bundle: totalBundle, tanggal });
    }
    const _negoEnt = DB.entitas.find(e => e.peran === 'Nego' && e.nama === negoNama);
    if (_negoEnt) {
        // Nego komisi pending - cair saat PO lunas
        if (!_negoEnt.komisiPending) _negoEnt.komisiPending = 0;
        _negoEnt.komisiPending += (newPO.rateKomisiNego) * totalBundle;
        _negoEnt.bundle = (_negoEnt.bundle || 0) + totalBundle;
        if (!_negoEnt.riwayatPO) _negoEnt.riwayatPO = [];
        _negoEnt.riwayatPO.push({ poId: newId, bundle: totalBundle, tanggal, konsumen: konsumen.nama, komisiPending: (newPO.rateKomisiNego) * totalBundle });
    }
    const _kcEnt = DB.entitas.find(e => e.peran === 'Kepala Cabang' && e.aktifStatus);
    if (_kcEnt) {
        // KC komisi pending - cair saat PO lunas
        if (!_kcEnt.komisiPending) _kcEnt.komisiPending = 0;
        _kcEnt.komisiPending += (newPO.rateKomisiKc) * totalBundle;
        _kcEnt.bundle = (_kcEnt.bundle || 0) + totalBundle;
        if (!_kcEnt.riwayatPO) _kcEnt.riwayatPO = [];
        _kcEnt.riwayatPO.push({ poId: newId, bundle: totalBundle, tanggal, konsumen: konsumen.nama, komisiPending: (newPO.rateKomisiKc) * totalBundle });
    }

    toast(`PO ${newId} berhasil dibuat!`);
    addAudit(`Buat PO ${newId} konsumen ${konsumen.nama}`);
    if (confirm(`PO ${newId} berhasil dibuat.\nCetak dokumen PO sekarang?`)) {
        cetakPO(newId);
    }
    setTimeout(() => { DB.selectedPO = newId; navigate('transaksi'); }, 300);
}

// ENTITAS
function openEditKomisi(id) {
    const e = DB.entitas.find(x => x.id === id);
    if (!e) return;
    document.getElementById('ek-id').value = e.id;
    document.getElementById('ek-nama').value = e.nama;
    document.getElementById('ek-rate').value = e.komisiRate;
    document.getElementById('ek-peran').textContent = e.peran;
    openModal('modal-edit-komisi');
}

function submitEditKomisi() {
    const id = parseInt(document.getElementById('ek-id').value);
    const e = DB.entitas.find(x => x.id === id);
    if (!e) return;
    const rate = parseInt(document.getElementById('ek-rate').value) || 0;
    e.komisiRate = rate;
    // Update setting global jika sesuai peran
    if (e.peran === 'Sales') DB.settings.komisi_sales = rate;
    else if (e.peran === 'Nego') DB.settings.komisi_nego = rate;
    // komisi_koor kini untuk konsumen (orang luar), diupdate via settings
    // tidak ada entitas karyawan Koordinator
    else if (e.peran === 'Collector') DB.settings.komisi_coll = rate;
    else if (e.peran === 'Kepala Cabang') DB.settings.komisi_kc = rate;
    closeModal('modal-edit-komisi');
    toast(`Komisi ${e.nama} diperbarui: ${fmtRpFull(rate)}`);
    addAudit(`Edit komisi ${e.nama}: ${fmtRpFull(rate)}`);
    renderEntitasDetail(id);
}

function openPengeluaran(id) {
    DB.selectedEntitas = id;
    document.getElementById('peng-jumlah').value = '';
    document.getElementById('peng-ket').value = '';
    openModal('modal-pengeluaran');
}

function submitPengeluaran() {
    const jenis = document.getElementById('peng-jenis').value;
    const jml = parseInt(document.getElementById('peng-jumlah').value.replace(/[^0-9]/g, '')) || 0;
    const ket = document.getElementById('peng-ket').value.trim();
    if (!jml || jml <= 0) { toast('Jumlah tidak valid', 'error'); return; }
    const e = DB.entitas.find(x => x.id === DB.selectedEntitas);
    if (!e) return;
    const entry = { id: Date.now(), jenis, ket, jml, tanggal: formatDateShort(new Date().toISOString().split('T')[0]) };
    if (!e.pengeluaranList) e.pengeluaranList = [];
    e.pengeluaranList.push(entry);
    e.pengeluaran = (e.pengeluaran || 0) + jml;
    // Pengeluaran tidak mengubah komisiKotor langsung — diperhitungkan saat cairkan
    saveDB();
    closeModal('modal-pengeluaran');
    toast(`Pengeluaran ${fmtRpFull(jml)} dicatat & dipotong dari komisi ${e.nama}`);
    addAudit(`Pengeluaran ${e.nama}: ${jenis} ${fmtRpFull(jml)}`);
    renderEntitasDetail(DB.selectedEntitas);
    renderEntitasList();
}

function submitEntitas() {
    const nama = document.getElementById('e-nama').value.trim();
    const peran = document.getElementById('e-peran').value;
    const telp = document.getElementById('e-telp').value.trim();
    const nik = (document.getElementById('e-nik')?.value || '').trim();
    if (!nama) { toast('Nama wajib diisi', 'error'); return; }
    // NIK = nomor ID internal, tidak wajib 16 digit
    const inisial = nama.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
    const rateMap = {
        Sales: DB.settings.komisi_sales,
        Nego: DB.settings.komisi_nego,
        Collector: DB.settings.komisi_coll,
        'Kepala Cabang': DB.settings.komisi_kc || 5000,
        Supir: 0
        // Koordinator = konsumen orang luar, bukan di entitas
    };
    const bulan = new Date().toLocaleString('id-ID', { month: 'short', year: 'numeric' });
    DB.entitas.push({
        id: Date.now(), nama, nik, inisial,
        warna: ['#2d1b69', '#1a3a2a', '#1a2a3a', '#3a1a1a', '#2a1a3a', '#1a3a3a'][Math.floor(Math.random() * 6)],
        warnaTxt: ['#AFA9EC', '#5DCAA5', '#6AB4EC', '#F09595', '#D4A5EC', '#5DCAA5'][Math.floor(Math.random() * 6)],
        peran, bundle: 0, komisiKotor: 0, pengeluaran: 0, aktif: bulan, aktifStatus: true,
        telp, komisiRate: rateMap[peran] || 0, pengeluaranList: [], riwayatPO: []
    });
    DB.currentEntitasTab = peran;
    document.querySelectorAll('[data-ent-tab]').forEach(t => t.classList.toggle('active', t.dataset.entTab === peran));
    saveDB();
    closeModal('modal-entitas');
    toast(`Entitas ${nama} berhasil ditambahkan`);
    addAudit(`Tambah entitas: ${nama} (${peran})`);
    renderEntitasList();
}

// SETTINGS ACTIONS
function updateSetting(key, val, type) {
    if (type === 'num') DB.settings[key] = parseInt(val) || 0;
    else if (type === 'pct') {
        const pct = Math.min(99, Math.max(1, parseInt(val) || 60));
        DB.settings[key] = pct;
        DB.settings['split_komisi_pct2'] = 100 - pct;
    } else {
        DB.settings[key] = val;
    }
    saveDB();
    toast('Pengaturan disimpan');
    addAudit(`Update setting: ${key} = ${val}`);
}

function saveSettingsCicilan() {
    saveDB();
    toast('Pengaturan cicilan disimpan ✓', 'success');
    addAudit('Simpan pengaturan cicilan');
}

function updateSettingRp(key, val, el) {
    const num = parseRp(val);
    // Guard: komisi tidak boleh terlalu kecil (< 100 = kemungkinan salah input)
    const MIN_KOMISI = { komisi_sales: 1000, komisi_nego: 1000, komisi_koor: 100, komisi_coll: 100, komisi_kc: 100 };
    if (MIN_KOMISI[key] && num < MIN_KOMISI[key] && num > 0) {
        if (!confirm(`Nilai ${fmtRpFull(num)} sepertinya terlalu kecil untuk ${key}.\nBiasanya dalam ribuan atau jutaan rupiah.\n\nTetap simpan ${fmtRpFull(num)}?`)) {
            if (el) el.focus();
            return;
        }
    }
    DB.settings[key] = num;
    if (el) el.value = fmtRpFull(num);
    saveDB();
    toast('Pengaturan disimpan');
    addAudit(`Update setting: ${key} = ${fmtRpFull(num)}`);
    if (typeof renderEntitasList === 'function') renderEntitasList();
}

function resetKomisiDefault() {
    const defaults = {
        komisi_sales: 1150000,
        komisi_nego: 300000,
        komisi_koor: 200000,
        komisi_coll: 50000,
        komisi_kc: 5000
    };
    const lines = Object.entries(defaults).map(([k, v]) => `${k}: ${fmtRpFull(v)}`).join('\n');
    if (!confirm('Reset rate komisi ke nilai default?\n\n' + lines + '\n\nNilai yang sudah diubah akan ditimpa.')) return;
    Object.assign(DB.settings, defaults);
    saveDB();
    toast('Rate komisi direset ke default', 'success');
    addAudit('Reset komisi ke default');
    renderSettings();
}

function updatePerusahaan(showToast = false) {
    const nama = document.getElementById('prs-nama')?.value.trim() || '';
    const alamat = document.getElementById('prs-alamat')?.value.trim() || '';
    const kota = document.getElementById('prs-kota')?.value.trim() || '';
    const telp = document.getElementById('prs-telp')?.value.trim() || '';
    const telp2 = document.getElementById('prs-telp2')?.value.trim() || '';
    const npwp = document.getElementById('prs-npwp')?.value.trim() || '';
    if (!DB.settings.perusahaan) DB.settings.perusahaan = {};
    Object.assign(DB.settings.perusahaan, { nama, alamat, kota, telp, telp2, npwp });
    saveDB();
    if (showToast) {
        toast('Profil perusahaan disimpan', 'success');
        addAudit('Update profil perusahaan: ' + nama);
    }
    // Re-render preview
    renderSettings();
}

// ── Logo Perusahaan ────────────────────────────────────────────
function uploadLogo(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 300 * 1024) { toast('Ukuran file max 300KB', 'error'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function (e) {
        DB.settings.logo = e.target.result; // simpan base64
        saveDB();
        toast('Logo berhasil diunggah');
        addAudit('Upload logo perusahaan');
        syncSidebarLogo();
        renderSettings();
    };
    reader.readAsDataURL(file);
}

function hapusLogo() {
    if (!confirm('Hapus logo perusahaan?')) return;
    delete DB.settings.logo;
    saveDB();
    toast('Logo dihapus');
    addAudit('Hapus logo perusahaan');
    renderSettings();
    syncSidebarLogo();
}

// ── Upload logo langsung dari sidebar ──────────────────────────
function uploadLogoSidebar(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 300 * 1024) { toast('Ukuran file max 300KB', 'error'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function (e) {
        DB.settings.logo = e.target.result;
        saveDB();
        toast('Logo berhasil diunggah');
        addAudit('Upload logo perusahaan (sidebar)');
        syncSidebarLogo();
        renderSettings();
    };
    reader.readAsDataURL(file);
}

// ── Sinkronisasi logo sidebar dengan DB ───────────────────────
function syncSidebarLogo() {
    const img = document.getElementById('sidebar-logo-img');
    const placeholder = document.getElementById('sidebar-logo-placeholder');
    if (!img || !placeholder) return;
    if (DB.settings && DB.settings.logo) {
        img.src = DB.settings.logo;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.src = '';
        img.style.display = 'none';
        placeholder.style.display = 'block';
    }
    const _nama = DB.settings?.perusahaan?.nama || 'INTERGAS PERDANA';
    const _sn = document.getElementById('sidebar-company-name');
    const _wn = document.getElementById('welcome-company-name');
    if (_sn) _sn.textContent = _nama;
    if (_wn) _wn.textContent = _nama;
}

function updateInvMin(id, val) {
    const item = DB.inventory.find(x => x.id === id);
    if (item) { item.min = parseInt(val) || 0; toast('Stok minimum diperbarui'); }
}

function toggleNotif(key, el) {
    if (key === 'hh' || key === 'telat' || key === 'stok' || key === 'hutang') {
        DB.settings.notif[key] = !DB.settings.notif[key];
    }
    el.classList.toggle('on');
    el.classList.toggle('off');
    saveDB();
    toast(el.classList.contains('on') ? 'Notifikasi diaktifkan' : 'Notifikasi dinonaktifkan');
}

function addHMinus() {
    DB.settings.notif.hMinus.push({ hari: 2, aktif: true });
    saveDB();
    renderSettings();
}

function removeHMinus(idx) {
    DB.settings.notif.hMinus.splice(idx, 1);
    saveDB();
    renderSettings();
}

function updateHMinus(idx, field, val) {
    if (field === 'aktif') {
        DB.settings.notif.hMinus[idx].aktif = !DB.settings.notif.hMinus[idx].aktif;
    } else {
        DB.settings.notif.hMinus[idx].hari = parseInt(val) || 1;
    }
    saveDB();
    toast('Notifikasi diperbarui');
}

// EXPORT

function getKopSuratHTML() {
    const prs = DB.settings.perusahaan || {};
    const nama = prs.nama || 'INTERGAS PERDANA';
    const alamat = prs.alamat || '';
    const kota = prs.kota || '';
    const telp = [prs.telp, prs.telp2].filter(Boolean).join(' / ');
    const logoBox = DB.settings.logo
        ? `<img src="${DB.settings.logo}" style="width:80px;height:80px;object-fit:contain;flex-shrink:0" />`
        : `<div style="width:80px;flex-shrink:0"></div>`;
    return `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:6px">
      ${logoBox}
      <div style="flex:1;text-align:center">
        <div style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;line-height:1.4">${nama}</div>
        <div style="font-size:10px;color:#333;margin-top:2px;line-height:1.8">${alamat}${kota ? ', ' + kota : ''}</div>
        <div style="font-size:10px;color:#333;line-height:1.8">No Telp: ${telp}</div>
      </div>
    </div>
    <div style="border-top:2.5px solid #000;margin:4px 0 1px"></div>
    <div style="border-top:1px solid #000;margin:1px 0 0"></div>`;
}

// Wrapper untuk laporan
function getLaporanHeaderHTML(judulDokumen, periodeLabel) {
    const today = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const tglCetak = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    return getKopSuratHTML() + `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;margin-bottom:14px;gap:16px">
      <div style="flex:1;text-align:center;font-size:14px;font-weight:bold;letter-spacing:2px">${judulDokumen}</div>
      <div style="border:1px solid #333;padding:6px 12px;font-size:11px;line-height:2;flex-shrink:0">
        <div><span style="display:inline-block;width:70px">Dicetak</span> : ${tglCetak}</div>
        <div><span style="display:inline-block;width:70px">Periode</span> : ${periodeLabel}</div>
      </div>
    </div>`;
}

// EXPORT DATA — real-time, dengan header IGP
// ── Export Entitas → Excel via server endpoint ────────────────
// ── Load SheetJS dari CDN (sekali saja) ──────────────────────
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) { resolve(window.XLSX); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = () => resolve(window.XLSX);
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// ── Export satu individu Sales/Nego langsung di browser ───────
async function exportSalesIndividu(nama) {
    const btn = event?.target;
    const origText = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳...'; }
    try {
        const bulanVal = document.getElementById('laporan-bulan')?.value || 'semua';
        const tahunVal = document.getElementById('laporan-tahun')?.value || 'semua';
        const BULAN_NAMA = { Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April', Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agu: 'Agustus', Sep: 'September', Okt: 'Oktober', Nov: 'November', Des: 'Desember' };
        const bulanNama = BULAN_NAMA[bulanVal] || null;
        let periodeLabel;
        if (bulanNama && tahunVal !== 'semua') periodeLabel = `${bulanNama} ${tahunVal}`;
        else if (bulanNama) periodeLabel = bulanNama;
        else if (tahunVal !== 'semua') periodeLabel = `Tahun ${tahunVal}`;
        else periodeLabel = 'Semua Periode';

        // Kirim filter sebagai comment di periode (server tetap forward ke Python)
        const encPeriode = '__filter__' + nama + '__' + periodeLabel;
        console.log('[Export Sales] periode:', encPeriode);
        const response = await fetch('/api/export/entitas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                periode: encPeriode,
                ...(bulanNama ? { bulan: bulanNama } : {}),
                ...(tahunVal !== 'semua' ? { tahun: String(tahunVal) } : {})
            })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nama.replace(/\s/g, '_') + '_' + periodeLabel.replace(/\s/g, '_') + '.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        toast('✓ Export ' + nama + ' berhasil', 'success');
    } catch (err) {
        console.error('[Export Sales]', err);
        toast(`Gagal export ${nama}: ${err.message}`, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
}
// ── Export Monitoring Global pakai Python template ────────────
async function exportMonitoringGlobal() {
    const btn = document.getElementById('btn-export-entitas-excel');
    if (btn) { btn.disabled = true; btn.innerHTML = '&#x1F4CA; ⏳ Generating...'; }
    try {
        const bulanVal = document.getElementById('laporan-bulan')?.value || 'semua';
        const tahunVal = document.getElementById('laporan-tahun')?.value || 'semua';
        const BULAN_NAMA = { Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April', Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agu: 'Agustus', Sep: 'September', Okt: 'Oktober', Nov: 'November', Des: 'Desember' };
        const bulanNama = BULAN_NAMA[bulanVal] || null;
        let periodeLabel;
        if (bulanNama && tahunVal !== 'semua') periodeLabel = `${bulanNama} ${tahunVal}`;
        else if (bulanNama) periodeLabel = bulanNama;
        else if (tahunVal !== 'semua') periodeLabel = `Tahun ${tahunVal}`;
        else periodeLabel = 'Semua Periode';

        const encPeriode2 = '__monitoring__' + periodeLabel;
        console.log('[Export Monitoring] periode:', encPeriode2);
        const response = await fetch('/api/export/entitas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                periode: encPeriode2,
                ...(bulanNama ? { bulan: bulanNama } : {}),
                ...(tahunVal !== 'semua' ? { tahun: String(tahunVal) } : {})
            })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Monitoring_Global_' + periodeLabel.replace(/\s/g, '_') + '.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        toast('✓ Monitoring Global berhasil diunduh', 'success');
    } catch (err) {
        console.warn('[Monitoring] Python failed, fallback SheetJS:', err.message);
        await exportMonitoringGlobalFallback();
    } finally {
        if (typeof updateExportLabel === 'function') updateExportLabel('global');
        if (btn) btn.disabled = false;
    }
}
async function exportMonitoringGlobalFallback() {
    try {
        const XLSX = await loadSheetJS();
        const bulanVal = document.getElementById('laporan-bulan')?.value || 'semua';
        const tahunVal = document.getElementById('laporan-tahun')?.value || 'semua';
        const BULAN_NAMA = { Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April', Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agu: 'Agustus', Sep: 'September', Okt: 'Oktober', Nov: 'November', Des: 'Desember' };
        const bulanNama = BULAN_NAMA[bulanVal] || null;
        let periodeLabel;
        if (bulanNama && tahunVal !== 'semua') periodeLabel = `${bulanNama} ${tahunVal}`;
        else if (bulanNama) periodeLabel = bulanNama;
        else if (tahunVal !== 'semua') periodeLabel = `Tahun ${tahunVal}`;
        else periodeLabel = 'Semua Periode';

        function poMatchPeriode(po) {
            const parts = (po.tanggal || '').split(' ');
            if (tahunVal !== 'semua' && parts[2] !== tahunVal) return false;
            if (bulanVal !== 'semua' && parts[1] !== bulanVal) return false;
            return true;
        }
        const poList = (DB.poList || []).filter(poMatchPeriode);
        const rows = [
            ['LAPORAN KEUANGAN GLOBAL — INTER GLOBAL'],
            [`Periode: ${periodeLabel}`],
            [],
            ['Tanggal', 'Sales', 'Nego', 'Supir', 'Sesi', 'Konsumen/Tujuan', 'Bundle', 'Total Tagihan', 'Terbayar', 'Sisa', 'Status']
        ];
        const byTgl = {};
        poList.forEach(po => { const t = po.tanggal || '-'; if (!byTgl[t]) byTgl[t] = []; byTgl[t].push(po); });
        Object.keys(byTgl).sort().forEach(tgl => {
            byTgl[tgl].forEach(po => {
                const terbayar = (po.cicilan || []).filter(c => c.status === 'lunas').reduce((s, c) => s + c.tagihan, 0);
                rows.push([tgl, po.sales || '', po.nego || '', po.supir || '', po.sesi || '', po.konsumen || '', po.bundle || 0, po.totalTagihan || 0, terbayar, (po.totalTagihan || 0) - terbayar, po.status || '']);
            });
        });
        const grandBundle = poList.reduce((s, p) => s + (p.bundle || 0), 0);
        const grandTagihan = poList.reduce((s, p) => s + (p.totalTagihan || 0), 0);
        rows.push([]);
        rows.push(['GRAND TOTAL', '', '', '', '', '', grandBundle, grandTagihan, '', '', '']);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Monitoring Global');
        XLSX.writeFile(wb, `Monitoring_Global_${periodeLabel.replace(/\s/g, '_')}.xlsx`);
        toast('✓ Monitoring Global berhasil diunduh', 'success');
    } catch (err) {
        console.error('[Export Monitoring Fallback]', err);
        toast(`Gagal export monitoring: ${err.message}`, 'error');
    }
}

// ── Dispatcher: pilih export Excel berdasarkan tab aktif ──────
function exportExcelDispatch() {
    const laporanTab = document.querySelector('[data-laporan-tab].tab.active')?.dataset.laporanTab || 'global';
    if (laporanTab === 'entitas') {
        // Di Per Entitas: tidak ada auto-download semua — gunakan tombol per individu di tiap card
        toast('Gunakan tombol "Export Excel" di tiap kartu Sales/Nego untuk download per individu', 'info');
    } else if (laporanTab === 'global') {
        exportMonitoringGlobal();
    } else {
        exportData('excel');
    }
}

async function exportEntitasExcel() {
    const bulanVal = document.getElementById('laporan-bulan')?.value || 'semua';
    const tahunVal = document.getElementById('laporan-tahun')?.value || 'semua';

    const laporanTab = document.querySelector('[data-laporan-tab].tab.active')?.dataset.laporanTab || 'global';
    const elTab = document.querySelector('[data-el-tab].active')?.dataset.elTab || 'sales';

    const BULAN_NAMA = {
        Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April',
        Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agu: 'Agustus',
        Sep: 'September', Okt: 'Oktober', Nov: 'November', Des: 'Desember'
    };
    const bulanNama = BULAN_NAMA[bulanVal] || null;

    let periodeLabel;
    if (bulanNama && tahunVal !== 'semua') periodeLabel = `${bulanNama} ${tahunVal}`;
    else if (bulanNama) periodeLabel = bulanNama;
    else if (tahunVal !== 'semua') periodeLabel = `Tahun ${tahunVal}`;
    else periodeLabel = 'Semua Periode';

    const btn = document.getElementById('btn-export-entitas-excel');
    if (btn) { btn.disabled = true; btn.innerHTML = '&#x1F4CA; ⏳ Exporting...'; }

    // Helper: download satu file
    async function doDownload(body, filename) {
        const response = await fetch('/api/export/entitas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Unknown' }));
            throw new Error(err.error || `HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    }

    const baseBody = {
        periode: periodeLabel,
        laporanTab, elTab,
        ...(bulanNama ? { bulan: bulanNama } : {}),
        ...(tahunVal !== 'semua' ? { tahun: String(tahunVal) } : {})
    };

    try {
        // Kalau di tab Per Entitas → download file terpisah per individu
        if (laporanTab === 'entitas') {
            const peranMap = { sales: 'Sales', nego: 'Nego', collector: 'Collector', supir: 'Supir' };
            const peran = peranMap[elTab];
            const individu = peran
                ? (DB.entitas || []).filter(e => e.peran === peran)
                : [];

            if (individu.length === 0) {
                // Fallback: download semua dalam 1 file
                await doDownload(baseBody, `laporan_${elTab}_${periodeLabel.replace(/\s/g, '_')}.xlsx`);
            } else {
                // Download per individu, selang 600ms agar browser tidak block
                for (let i = 0; i < individu.length; i++) {
                    const e = individu[i];
                    if (btn) btn.innerHTML = `&#x1F4CA; ⏳ ${i + 1}/${individu.length}...`;
                    await doDownload(
                        { ...baseBody, filterEntitasId: e.id, filterEntitasNama: e.nama },
                        `${elTab === 'sales' ? 'S' : elTab === 'nego' ? 'N' : elTab.charAt(0).toUpperCase()}-${e.nama.replace(/\s/g, '_')}_${periodeLabel.replace(/\s/g, '_')}.xlsx`
                    );
                    if (i < individu.length - 1) await new Promise(r => setTimeout(r, 700));
                }
                toast(`✓ ${individu.length} file berhasil diunduh`, 'success');
                addAudit(`Export per individu ${elTab}: ${periodeLabel}`);
            }
        } else {
            // Tab lain → 1 file seperti biasa
            await doDownload(baseBody, `laporan_${laporanTab}_${periodeLabel.replace(/\s/g, '_')}.xlsx`);
            toast('Export Excel berhasil diunduh ✓', 'success');
            addAudit(`Export Excel: ${laporanTab} — ${periodeLabel}`);
        }
    } catch (err) {
        console.error('[Export Excel]', err);
        toast(`Gagal export: ${err.message}`, 'error');
    } finally {
        if (typeof updateExportLabel === 'function') updateExportLabel(laporanTab);
        if (btn) btn.disabled = false;
    }
}

function exportData(format) {
    const tab = document.querySelector('[data-laporan-tab].tab.active')?.dataset.laporanTab || 'global';
    const elTab = document.querySelector('[data-el-tab].active')?.dataset.elTab || 'sales';
    const bulan = document.getElementById('laporan-bulan')?.value || 'semua';
    const tahun = document.getElementById('laporan-tahun')?.value || 'semua';

    // Map bulan value → nama Indonesia
    const BULAN_INDO = {
        Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April',
        Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agu: 'Agustus',
        Sep: 'September', Okt: 'Oktober', Nov: 'November', Des: 'Desember'
    };
    const bulanNama = BULAN_INDO[bulan] || null;

    // Susun periodeLabel dari kombinasi bulan + tahun
    let periodeLabel;
    if (bulanNama && tahun !== 'semua') periodeLabel = `${bulanNama} ${tahun}`;
    else if (bulanNama) periodeLabel = bulanNama;
    else if (tahun !== 'semua') periodeLabel = `Tahun ${tahun}`;
    else periodeLabel = 'Semua Periode';

    const bulanMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11 };

    function parseTglS(s) {
        if (!s) return null;
        const bM = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11 };
        const p = s.split(' ');
        if (p.length < 3) return null;
        const m = bM[p[1]]; if (m === undefined) return null;
        return new Date(parseInt(p[2]), m, parseInt(p[0]));
    }

    function filterPeriode(tgl) {
        if (bulan === 'semua' && tahun === 'semua') return true;
        const d = parseTglS(tgl);
        if (!d) return false;
        if (tahun !== 'semua' && String(d.getFullYear()) !== tahun) return false;
        if (bulan !== 'semua' && d.getMonth() !== (bulanMap[bulan] ?? -1)) return false;
        return true;
    }

    if (format === 'csv') {
        let csv = `LAPORAN ${tab.toUpperCase()} — ${periodeLabel.toUpperCase()}\n`;
        const _namaPrs1 = DB.settings.perusahaan?.nama || 'INTERGAS PERDANA';
        csv += `${_namaPrs1}\n\n`;

        if (tab === 'global') {
            const uangMasuk = DB.poList.reduce((s, p) =>
                s + p.cicilan.filter(c => c.status === 'lunas' && filterPeriode(c.jatuh)).reduce((ss, c) => ss + c.tagihan, 0), 0);
            const uangKeluar = DB.entitas.reduce((s, e) => s + (e.pengeluaran || 0), 0);
            const outstanding = DB.poList.filter(p => p.status !== 'retur').reduce((s, p) => s + (p.sisa || 0), 0);
            csv += `Total Uang Masuk,${fmtRpFull(uangMasuk)}\n`;
            csv += `Total Uang Keluar,${fmtRpFull(uangKeluar)}\n`;
            csv += `Piutang Konsumen,${fmtRpFull(outstanding)}\n`;
            csv += `Net Cashflow,${fmtRpFull(uangMasuk - uangKeluar)}\n`;

        } else if (tab === 'penjualan') {
            csv += `PO ID,Konsumen,Bundle,Total,Terbayar,Sisa,Status,Tanggal\n`;
            DB.poList.filter(p => filterPeriode(p.tanggal)).forEach(p => {
                const terbayar = p.cicilan.filter(c => c.status === 'lunas').reduce((s, c) => s + c.tagihan, 0);
                csv += `${p.id},${p.konsumen},${p.bundle},${p.total},${terbayar},${p.sisa},${p.status},${p.tanggal}\n`;
            });

        } else if (tab === 'barang') {
            csv += `Tanggal,Nama Barang,Kondisi,Jumlah,Supplier,Catatan\n`;
            DB.riwayatMasuk.filter(r => filterPeriode(r.tanggal)).forEach(r => {
                csv += `${r.tanggal},${r.nama},${r.kondisi},${r.jumlah},${r.supplier},${r.catatan || ''}\n`;
            });

        } else if (tab === 'konsumen') {
            csv += `Nama,Kota,Total PO,Total Nilai,Terbayar,Sisa Tagihan,Status\n`;
            DB.konsumen.forEach(k => {
                const pos = DB.poList.filter(p => k.po.includes(p.id));
                const totalNilai = pos.reduce((s, p) => s + p.total, 0);
                const terbayar = pos.reduce((s, p) => s + p.cicilan.filter(c => c.status === 'lunas').reduce((ss, c) => ss + c.tagihan, 0), 0);
                const sisa = pos.filter(p => p.status !== 'retur').reduce((s, p) => s + (p.sisa || 0), 0);
                csv += `${k.nama},${k.kota},${k.po.length},${totalNilai},${terbayar},${sisa},${sisa > 0 ? 'Ada tagihan' : 'Lunas'}\n`;
            });

        } else if (tab === 'entitas') {
            // Export hanya sub-tab aktif
            const ELTAB_PERAN = { sales: 'Sales', nego: 'Nego', collector: 'Collector', koordinator: 'Koordinator', kc: 'Kepala Cabang', supir: 'Supir' };
            const peranFilter = ELTAB_PERAN[elTab] || null;
            const rateMap = { Sales: DB.settings.komisi_sales, Nego: DB.settings.komisi_nego, Collector: DB.settings.komisi_coll, Koordinator: DB.settings.komisi_koor, 'Kepala Cabang': DB.settings.komisi_kc || 5000, Supir: DB.settings.komisi_supir || 0 };
            const entitasFiltered = peranFilter ? DB.entitas.filter(e => e.peran === peranFilter) : DB.entitas;
            csv += `Peran,Nama,PO Terlibat,Unit,Rate Komisi,Komisi Kotor,Pengeluaran,Komisi Bersih,Status\n`;
            entitasFiltered.forEach(e => {
                const poT = DB.poList.filter(p => filterPeriode(p.tanggal) && (p.sales === e.nama || p.nego === e.nama || p.coll === e.nama || p.koor === e.nama));
                const unit = e.peran === 'Collector'
                    ? poT.reduce((s, p) => s + p.cicilan.filter(c => c.status === 'lunas').length, 0)
                    : poT.reduce((s, p) => s + (p.bundle || 0), 0);
                const rate = rateMap[e.peran] || 0;
                const kotor = unit * rate;
                const peng = (e.pengeluaranList || []).reduce((s, p) => s + (p.jml || 0), 0);
                csv += `${e.peran},${e.nama},${poT.length},${unit},${rate},${kotor},${peng},${kotor - peng},${e.aktifStatus ? 'Aktif' : 'Nonaktif'}\n`;
            });

        } else if (tab === 'tahunan') {
            csv += `Bulan,Uang Masuk,Uang Keluar,Net,PO Baru,Bundle Terjual,Outstanding Tertagih\n`;
            const tahunExport = tahun !== 'semua' ? parseInt(tahun) : new Date().getFullYear();
            const bNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            for (let m = 0; m < 12; m++) {
                const masuk = DB.poList.reduce((s, p) => s + p.cicilan.filter(c => {
                    if (c.status !== 'lunas') return false;
                    const d = parseTglS(c.jatuh);
                    return d && d.getFullYear() === tahunExport && d.getMonth() === m;
                }).reduce((ss, c) => ss + c.tagihan, 0), 0);
                const poNew = DB.poList.filter(p => { const d = parseTglS(p.tanggal); return d && d.getFullYear() === tahunExport && d.getMonth() === m; });
                const bundleNew = poNew.reduce((s, p) => s + p.bundle, 0);
                csv += `${bNames[m]},${masuk},0,${masuk},${poNew.length},${bundleNew},${masuk}\n`;
            }
        }

        const blob = new Blob([csv.replace(/\n/g, '\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const tabSlug = tab === 'entitas' ? elTab : tab;
        a.href = url; a.download = `laporan_${tabSlug}_${periodeLabel.replace(/\s/g, '_')}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast('Export CSV berhasil diunduh ✓');
        addAudit(`Export CSV: ${tabSlug} — ${periodeLabel}`);

    } else if (format === 'excel') {
        // Export tab non-entitas sebagai CSV (Excel-compatible, tidak ada warning format)
        const tabLabel = { global: 'Laporan Global', barang: 'Barang', penjualan: 'Penjualan', konsumen: 'Konsumen', tahunan: 'Tahunan' }[tab] || tab;

        // Konversi tabel HTML di laporan-content ke CSV
        const container = document.getElementById('laporan-content');
        const tables = container ? container.querySelectorAll('table') : [];

        function tableToCSV(table) {
            const rows = [];
            table.querySelectorAll('tr').forEach(tr => {
                const cells = [...tr.querySelectorAll('th, td')].map(td => {
                    // Ambil teks bersih, hilangkan koma dan newline
                    const txt = (td.innerText || td.textContent || '').replace(/\n/g, ' ').replace(/"/g, '""').trim();
                    return `"${txt}"`;
                });
                if (cells.length) rows.push(cells.join(','));
            });
            return rows.join('\n');
        }

        const _namaPrs2 = DB.settings.perusahaan?.nama || 'INTERGAS PERDANA';
        let csvLines = `"Laporan ${tabLabel} — ${periodeLabel}"\n"${_namaPrs2}"\n\n`;
        if (tables.length) {
            tables.forEach((t, i) => {
                if (i > 0) csvLines += '\n\n';
                csvLines += tableToCSV(t);
            });
        } else {
            csvLines += '"Tidak ada data untuk periode ini"';
        }

        // BOM agar Excel buka dengan encoding UTF-8 yang benar
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvLines], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_${tab}_${periodeLabel.replace(/\s/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast(`Export ${tabLabel} berhasil diunduh ✓`, 'success');
        addAudit(`Export CSV ${tab}: ${periodeLabel}`);

    } else if (format === 'json') {
        const backup = { exportedAt: new Date().toISOString(), app: 'IGP', version: 'v4', data: DB };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `backup_igp_${new Date().toISOString().slice(0, 10)}.json`;
        a.click(); URL.revokeObjectURL(url);
        toast('Backup JSON berhasil diunduh');
        addAudit('Export JSON backup');

    } else if (format === 'pdf') {
        const SUB_LABEL = { sales: 'Sales', nego: 'Nego', collector: 'Collector', koordinator: 'Koordinator', kc: 'Kepala Cabang', supir: 'Supir' };
        const tabLabel = tab === 'entitas'
            ? `Per Entitas — ${SUB_LABEL[elTab] || 'Semua'}`
            : ({ global: 'Laporan Global', barang: 'Barang', penjualan: 'Penjualan', konsumen: 'Konsumen', tahunan: 'Tahunan' }[tab] || tab);
        const content = document.getElementById('laporan-content')?.innerHTML || '';
        const hdrHTML = getLaporanHeaderHTML(`LAPORAN ${tabLabel.toUpperCase()}`, periodeLabel);
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
        <title>Laporan ${tabLabel} — ${periodeLabel}</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'Courier New',monospace;padding:28px 32px;color:#111;background:#fff;font-size:12px}
          table{width:100%;border-collapse:collapse;margin-bottom:14px}
          th,td{padding:7px 10px;text-align:left;border:1px solid #ccc;font-size:11px}
          th{background:#f0f0f0;font-weight:bold;font-size:10px;text-transform:uppercase}
          .stat-grid-4,.stat-grid-3{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
          .stat-card{border:1px solid #ccc;border-radius:4px;padding:10px}
          .stat-label{font-size:9px;color:#666;margin-bottom:3px;text-transform:uppercase}
          .stat-val{font-size:16px;font-weight:700}
          .stat-sub{font-size:9px;color:#888;margin-top:2px}
          .section-head{font-size:10px;color:#555;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin:12px 0 8px;letter-spacing:.5px}
          .tbl-wrap{border:1px solid #ccc;border-radius:4px;overflow:hidden;margin-bottom:12px}
          .badge{padding:1px 6px;border-radius:10px;font-size:9px;font-weight:600}
          .badge-good{background:#d4edda;color:#155724}
          .badge-late{background:#f8d7da;color:#721c24}
          .badge-active{background:#d1ecf1;color:#0c5460}
          .badge-pending{background:#f0f0f0;color:#555}
          .card{border:1px solid #ccc;border-radius:4px;padding:12px;margin-bottom:10px}
          .card-title{font-size:9px;color:#555;text-transform:uppercase;margin-bottom:8px;font-weight:600}
          .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
          .bar-chart{display:flex;align-items:flex-end;gap:8px;height:90px;margin-bottom:6px}
          .bar-col{display:flex;flex-direction:column;align-items:center;flex:1;gap:2px;height:100%;justify-content:flex-end}
          .bar{width:100%;border-radius:2px 2px 0 0;min-height:2px}
          .bar-label,.bar-val{font-size:9px;color:#666}
          @media print{body{padding:0}}
        </style></head><body>
        ${hdrHTML}
        ${content}
        <div style="margin-top:20px;font-size:9px;color:#999;border-top:1px dashed #ccc;padding-top:6px">
          Dicetak oleh sistem IGP · ${new Date().toLocaleString('id-ID')} · Laporan ${tabLabel} ${periodeLabel}
        </div>
        <script>window.print();<\/script>
        </body></html>`);
        win.document.close();
        toast('Print/PDF berhasil dibuka');
        addAudit(`Export PDF: ${tab} ${periodeLabel}`);
    }
}

// ── Export PDF via Python (Laporan Global & Per Entitas) ──────
async function exportPDF() {
    const laporanTab = document.querySelector('[data-laporan-tab].tab.active')?.dataset.laporanTab || 'global';
    if (laporanTab === 'global') {
        await exportMonitoringGlobalPDF();
    } else if (laporanTab === 'entitas') {
        await exportEntitasPDF();
    } else {
        // Tab lain: fallback ke print browser
        exportData('pdf');
    }
}

// ── Export PDF Monitoring Global ──────────────────────────────
async function exportMonitoringGlobalPDF() {
    const btn = document.getElementById('btn-export-pdf');
    const origText = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '\u23F3 Generating PDF...'; }
    try {
        const bulanVal = document.getElementById('laporan-bulan')?.value || 'semua';
        const tahunVal = document.getElementById('laporan-tahun')?.value || 'semua';
        const BULAN_NAMA = { Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April', Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agu: 'Agustus', Sep: 'September', Okt: 'Oktober', Nov: 'November', Des: 'Desember' };
        const bulanNama = BULAN_NAMA[bulanVal] || null;
        let periodeLabel;
        if (bulanNama && tahunVal !== 'semua') periodeLabel = `${bulanNama} ${tahunVal}`;
        else if (bulanNama) periodeLabel = bulanNama;
        else if (tahunVal !== 'semua') periodeLabel = `Tahun ${tahunVal}`;
        else periodeLabel = 'Semua Periode';

        const response = await fetch('/api/export/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monitoringOnly: true,
                periode: periodeLabel,
                ...(bulanNama ? { bulan: bulanNama } : {}),
                ...(tahunVal !== 'semua' ? { tahun: String(tahunVal) } : {})
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(err.error || `HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Monitoring_Global_' + periodeLabel.replace(/\s/g, '_') + '.pdf';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        toast('\u2713 PDF Monitoring Global berhasil diunduh', 'success');
        addAudit(`Export PDF Monitoring Global: ${periodeLabel}`);
    } catch (err) {
        console.error('[PDF Monitoring]', err);
        toast(`Gagal export PDF: ${err.message}`, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
}

// ── Export PDF Per Entitas (semua atau per individu) ──────────
async function exportEntitasPDF() {
    const btn = document.getElementById('btn-export-pdf');
    const origText = btn?.innerHTML;
    const elTab = document.querySelector('[data-el-tab].active')?.dataset.elTab || 'sales';
    if (btn) { btn.disabled = true; btn.innerHTML = '\u23F3 Generating PDF...'; }
    try {
        const bulanVal = document.getElementById('laporan-bulan')?.value || 'semua';
        const tahunVal = document.getElementById('laporan-tahun')?.value || 'semua';
        const BULAN_NAMA = { Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April', Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agu: 'Agustus', Sep: 'September', Okt: 'Oktober', Nov: 'November', Des: 'Desember' };
        const bulanNama = BULAN_NAMA[bulanVal] || null;
        let periodeLabel;
        if (bulanNama && tahunVal !== 'semua') periodeLabel = `${bulanNama} ${tahunVal}`;
        else if (bulanNama) periodeLabel = bulanNama;
        else if (tahunVal !== 'semua') periodeLabel = `Tahun ${tahunVal}`;
        else periodeLabel = 'Semua Periode';

        const peranMap = { sales: 'Sales', nego: 'Nego', collector: 'Collector', supir: 'Supir' };
        const peran = peranMap[elTab];
        const individu = peran ? (DB.entitas || []).filter(e => e.peran === peran) : [];

        async function downloadPDF(body, filename) {
            const response = await fetch('/api/export/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(err.error || `HTTP ${response.status}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        }

        const baseBody = {
            periode: periodeLabel,
            ...(bulanNama ? { bulan: bulanNama } : {}),
            ...(tahunVal !== 'semua' ? { tahun: String(tahunVal) } : {})
        };

        if (individu.length === 0) {
            // Semua entitas dalam 1 PDF
            await downloadPDF(baseBody, `laporan_${elTab}_${periodeLabel.replace(/\s/g, '_')}.pdf`);
            toast('\u2713 PDF berhasil diunduh', 'success');
        } else {
            // Per individu
            for (let i = 0; i < individu.length; i++) {
                const e = individu[i];
                if (btn) btn.innerHTML = `\u23F3 PDF ${i + 1}/${individu.length}...`;
                await downloadPDF(
                    { ...baseBody, filterEntitasNama: e.nama },
                    `${elTab === 'sales' ? 'S' : 'N'}-${e.nama.replace(/\s/g, '_')}_${periodeLabel.replace(/\s/g, '_')}.pdf`
                );
                if (i < individu.length - 1) await new Promise(r => setTimeout(r, 500));
            }
            toast(`\u2713 ${individu.length} PDF berhasil diunduh`, 'success');
        }
        addAudit(`Export PDF ${elTab}: ${periodeLabel}`);
    } catch (err) {
        console.error('[PDF Entitas]', err);
        toast(`Gagal export PDF: ${err.message}`, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
}

// CRUD — HAPUS (dengan modal konfirmasi)

// ── Konfirmasi modal universal ────────────────────────────────
let _hapusCb = null;

function konfirmasiHapus(judul, pesan, cb) {
    document.getElementById('konfirm-judul').textContent = judul;
    document.getElementById('konfirm-pesan').textContent = pesan;
    _hapusCb = cb;
    openModal('modal-konfirmasi');
}

function eksekusiHapus() {
    closeModal('modal-konfirmasi');
    if (typeof _hapusCb === 'function') _hapusCb();
    _hapusCb = null;
}

// ── Hapus Konsumen ─────────────────────────────────────────────
function hapusKonsumen(id) {
    const k = DB.konsumen.find(x => x.id === id);
    if (!k) return;
    const poAktif = DB.poList.filter(p => k.po.includes(p.id) && p.status !== 'lunas' && p.status !== 'retur');
    if (poAktif.length > 0) {
        toast(`Tidak bisa dihapus — masih ada ${poAktif.length} PO aktif`, 'error');
        return;
    }
    konfirmasiHapus(
        'Hapus Konsumen',
        `Hapus "${k.nama}" secara permanen? Riwayat PO yang sudah lunas tetap ada.`,
        () => {
            DB.konsumen = DB.konsumen.filter(x => x.id !== id);
            if (DB.selectedKonsumen === id) DB.selectedKonsumen = DB.konsumen[0]?.id || null;
            saveDB();
            toast(`Konsumen ${k.nama} dihapus`);
            addAudit(`Hapus konsumen: ${k.nama}`);
            renderKonsumenList();
            if (DB.selectedKonsumen) renderKonsumenDetail(DB.selectedKonsumen);
            else document.getElementById('konsumen-detail-header').innerHTML = '';
        }
    );
}

// ── Hapus PO ───────────────────────────────────────────────────
// ── Edit Bundle PO ─────────────────────────────────────────────
function openEditBundlePO(id) {
    const p = DB.poList.find(x => x.id === id);
    if (!p) return;
    if (p.status === 'lunas') {
        if (!confirm('PO ini sudah LUNAS. Edit bundle akan mengubah total dan recalculate cicilan.\nLanjutkan?')) return;
    }

    const details = p.bundleDetail || [{ produk: p.produk || 'Bundle', harga: p.total, qty: p.bundle }];
    const activeBundles = (DB.bundleDef || []).filter(b => b.aktif !== false);
    // Hitung stok bundle dari komponen inventory
    function calcBundleStok(b) {
        if (!b.komponen || !b.komponen.length) return b.stok ?? '?';
        let min = Infinity;
        b.komponen.forEach(k => {
            const item = DB.inventory.find(x => x.id == k.invId || x.id == k.itemId || x.nama === k.nama);
            const bisa = item ? Math.floor(item.stok / (k.qty || 1)) : 0;
            if (bisa < min) min = bisa;
        });
        return min === Infinity ? 0 : min;
    }

    // Simpan details ke global untuk di-render setelah overlay dibuat
    window._bundleEditDetails = details.map(bd => ({ ...bd }));

    // Buat overlay langsung
    let _ov = document.getElementById('overlay-edit-bundle');
    if (_ov) _ov.remove();
    _ov = document.createElement('div');
    _ov.id = 'overlay-edit-bundle';
    _ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    _ov.innerHTML = `
        <div style="background:var(--bg1,#1a1a2e);border:1px solid var(--border,#333);border-radius:14px;padding:24px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto">
            <div style="font-size:15px;font-weight:600;margin-bottom:4px">\u270F Edit Bundle \u2014 ${id}</div>
            <div style="font-size:12px;color:var(--text4,#888);margin-bottom:16px">Bundle sekarang: <strong>${p.bundle}</strong> &nbsp;&bull;&nbsp; Total: <strong>${fmtRpFull(p.total)}</strong></div>
            <div id="bundle-edit-rows"></div>
            <button class="btn" style="font-size:12px;margin-top:4px;margin-bottom:16px" onclick="addBundleEditRow('${id}')">+ Tambah baris</button>

            <div style="border-top:0.5px solid var(--border,#333);margin:12px 0 10px"></div>
            <div style="font-size:12px;font-weight:600;color:var(--text2,#ccc);margin-bottom:8px">\u{1F381} Souvenir</div>
            <div id="sov-edit-rows"></div>
            <button class="btn" style="font-size:12px;margin-bottom:16px" onclick="addSovEditRow('${id}')">+ Tambah souvenir</button>

            <div style="background:var(--bg2,#12121f);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px">
                <div style="color:var(--text4,#888);margin-bottom:4px;font-size:11px">PREVIEW TOTAL BARU</div>
                <div id="bundle-edit-preview" style="font-size:16px;font-weight:600;color:#5DCAA5">Rp 0</div>
                <div id="sov-edit-preview" style="font-size:12px;color:var(--text4,#888);margin-top:2px"></div>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="btn" onclick="document.getElementById('overlay-edit-bundle').remove()">Batal</button>
                <button class="btn btn-success" style="border-color:#1a6e40" onclick="submitEditBundlePO('${id}')">Simpan Perubahan</button>
            </div>
        </div>`;
    document.body.appendChild(_ov);
    _ov.addEventListener('click', e => { if (e.target === _ov) _ov.remove(); });
    // Render bundle rows ke DOM setelah overlay ada
    _renderBundleEditRows();
    // Init souvenir rows dari data PO yang ada
    window._sovEditRows = (p.souvenir || []).map(s => ({ nama: s.nama, harga: s.harga, qty: s.qty || 1 }));
    _renderSovEditRows();
    _updateBundleEditPreview();
    document.getElementById('bundle-edit-rows').addEventListener('input', _updateBundleEditPreview);
    document.getElementById('bundle-edit-rows').addEventListener('change', _updateBundleEditPreview);
}

function _renderBundleEditRows() {
    const container = document.getElementById('bundle-edit-rows');
    if (!container) return;
    const details = window._bundleEditDetails || [];
    const activeBundles = (DB.bundleDef || []).filter(b => b.aktif !== false);
    function calcStok(b) {
        if (!b.komponen || !b.komponen.length) return b.stok ?? '?';
        let min = Infinity;
        b.komponen.forEach(k => {
            const item = DB.inventory.find(x => x.id == k.invId || x.id == k.itemId || x.nama === k.nama);
            const bisa = item ? Math.floor(item.stok / (k.qty || 1)) : 0;
            if (bisa < min) min = bisa;
        });
        return min === Infinity ? 0 : min;
    }
    if (!details.length) {
        container.innerHTML = '<div style="font-size:12px;color:var(--text4,#888);padding:4px 0;margin-bottom:8px">Belum ada bundle.</div>';
        return;
    }
    container.innerHTML = details.map((bd, i) => {
        const opts = activeBundles.map(b =>
            `<option value="${b.nama}" data-harga="${b.harga}" ${b.nama === bd.produk ? 'selected' : ''}>${b.nama} (stok: ${calcStok(b)})</option>`
        ).join('') + (!activeBundles.find(b => b.nama === bd.produk) ? `<option value="${bd.produk}" selected>${bd.produk}</option>` : '');
        return `<div class="bundle-edit-row" id="ber-${i}" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <select class="select" style="flex:1;font-size:13px" id="ber-produk-${i}" onchange="window._bundleEditDetails[${i}].produk=this.value;window._bundleEditDetails[${i}].harga=parseInt(this.options[this.selectedIndex].dataset.harga)||0;_updateBundleEditPreview()">${opts}</select>
            <input type="number" class="input" style="width:90px;font-size:13px;text-align:center" id="ber-qty-${i}" value="${bd.qty}" min="0" placeholder="Qty" oninput="window._bundleEditDetails[${i}].qty=parseInt(this.value)||0;_updateBundleEditPreview()">
            <span style="font-size:11px;color:var(--text4,#888);white-space:nowrap" id="ber-harga-${i}">${fmtRp(bd.harga)}/bundle</span>
            <button class="btn btn-danger" style="padding:4px 8px;font-size:12px" onclick="window._bundleEditDetails.splice(${i},1);_renderBundleEditRows();_updateBundleEditPreview()">x</button>
        </div>`;
    }).join('');
    container.addEventListener('change', _updateBundleEditPreview);
    container.addEventListener('input', _updateBundleEditPreview);
}

function _renderSovEditRows() {
    const container = document.getElementById('sov-edit-rows');
    if (!container) return;
    const sovItems = (DB.inventory || []).filter(i => i.kategori === 'sovenir' && i.kondisi !== 'reject');
    const rows = window._sovEditRows || [];
    if (!rows.length) {
        container.innerHTML = '<div style="font-size:12px;color:var(--text4,#888);padding:4px 0;margin-bottom:8px">Belum ada souvenir.</div>';
    } else {
        container.innerHTML = rows.map((s, i) => {
            const opts = sovItems.map(it => `<option value="${it.nama}" data-harga="${it.harga || 0}" ${it.nama === s.nama ? 'selected' : ''}>${it.nama} (${fmtRpFull(it.harga || 0)})</option>`).join('');
            return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
                <select class="select" style="flex:1;font-size:12px" onchange="window._sovEditRows[${i}].nama=this.value;window._sovEditRows[${i}].harga=parseInt(this.options[this.selectedIndex].dataset.harga)||0;_updateBundleEditPreview()">
                    ${opts || `<option value="${s.nama}">${s.nama}</option>`}
                </select>
                <input class="input" type="number" value="${s.harga || 0}" min="0" style="width:110px;font-size:12px" placeholder="Harga"
                    oninput="window._sovEditRows[${i}].harga=parseInt(this.value)||0;_updateBundleEditPreview()"/>
                <input class="input" type="number" value="${s.qty || 1}" min="1" style="width:65px;font-size:12px;text-align:center"
                    oninput="window._sovEditRows[${i}].qty=parseInt(this.value)||1;_updateBundleEditPreview()"/>
                <button class="btn btn-danger" style="padding:3px 8px;font-size:12px" onclick="window._sovEditRows.splice(${i},1);_renderSovEditRows();_updateBundleEditPreview()">x</button>
            </div>`;
        }).join('');
    }
}

function addSovEditRow() {
    const sovItems = (DB.inventory || []).filter(i => i.kategori === 'sovenir' && i.kondisi !== 'reject');
    if (!window._sovEditRows) window._sovEditRows = [];
    window._sovEditRows.push({ nama: sovItems[0]?.nama || '', harga: sovItems[0]?.harga || 0, qty: 1 });
    _renderSovEditRows();
    _updateBundleEditPreview();
}

function _updateBundleEditPreview() {
    let total = 0;
    (window._bundleEditDetails || []).forEach((bd, i) => {
        total += (bd.harga || 0) * (bd.qty || 0);
        const hEl = document.getElementById(`ber-harga-${i}`);
        if (hEl) hEl.textContent = fmtRp(bd.harga || 0) + '/bundle';
    });
    const sovTotal = (window._sovEditRows || []).reduce((s, r) => s + (r.harga || 0) * (r.qty || 1), 0);
    const el = document.getElementById('bundle-edit-preview');
    if (el) el.textContent = fmtRpFull(total);
    const sovEl = document.getElementById('sov-edit-preview');
    if (sovEl) sovEl.textContent = sovTotal > 0 ? `+ Souvenir: ${fmtRpFull(sovTotal)}` : '';
}

function addBundleEditRow() {
    const activeBundles = (DB.bundleDef || []).filter(b => b.aktif !== false);
    if (!activeBundles.length) { toast('Belum ada bundle definition', 'error'); return; }
    if (!window._bundleEditDetails) window._bundleEditDetails = [];
    const first = activeBundles[0];
    window._bundleEditDetails.push({ produk: first.nama, harga: first.harga, qty: 1 });
    _renderBundleEditRows();
    _updateBundleEditPreview();
}

function removeBundleEditRow(i) {
    if (window._bundleEditDetails) window._bundleEditDetails.splice(i, 1);
    _renderBundleEditRows();
    _updateBundleEditPreview();
}

function submitEditBundlePO(id) {
    const p = DB.poList.find(x => x.id === id);
    if (!p) return;

    // Kumpulkan baris bundle baru dari _bundleEditDetails
    const newRows = (window._bundleEditDetails || []).filter(r => (r.qty || 0) > 0).map(r => ({ ...r }));

    const newSovCheck = (window._sovEditRows || []).filter(s => s.nama && (s.qty || 1) > 0);
    if (!newRows.length && !newSovCheck.length) { toast('Minimal 1 bundle atau 1 souvenir', 'error'); return; }

    const newTotal = newRows.reduce((s, r) => s + r.harga * r.qty, 0);
    const newBundle = newRows.reduce((s, r) => s + r.qty, 0);
    // Souvenir-only PO boleh bundle = 0
    const oldBundle = p.bundle;
    const oldTotal = p.total;
    const diff = newBundle - oldBundle;

    if (!confirm(`Konfirmasi edit bundle PO ${id}?\n\nBundle: ${oldBundle} \u2192 ${newBundle}\nTotal: ${fmtRpFull(oldTotal)} \u2192 ${fmtRpFull(newTotal)}\n\nCicilan yang BELUM lunas akan di-recalculate proporsional.`)) return;

    // \u2500\u2500 Rollback stok lama \u2500\u2500
    (p.bundleDetail || []).forEach(bd => {
        const bundleDef = (DB.bundleDef || []).find(b => b.nama === bd.produk);
        if (bundleDef) {
            if (bundleDef.komponen && bundleDef.komponen.length) {
                bundleDef.komponen.forEach(k => {
                    const item = DB.inventory.find(x => x.id == k.invId || x.id == k.itemId || x.nama === k.nama);
                    if (item) item.stok += (k.qty || 1) * bd.qty;
                });
            } else {
                bundleDef.stok = (bundleDef.stok || 0) + bd.qty;
            }
        }
    });

    // \u2500\u2500 Kurangi stok baru \u2500\u2500
    const stokKurang = [];
    newRows.forEach(row => {
        const bundleDef = (DB.bundleDef || []).find(b => b.nama === row.produk);
        if (bundleDef) {
            if (bundleDef.komponen && bundleDef.komponen.length) {
                bundleDef.komponen.forEach(k => {
                    const item = DB.inventory.find(x => x.id == k.invId || x.id == k.itemId || x.nama === k.nama);
                    const butuh = (k.qty || 1) * row.qty;
                    if (!item || item.stok < butuh) stokKurang.push(`${k.nama} butuh ${butuh}, stok ${item?.stok ?? 0}`);
                });
            } else {
                if (bundleDef.stok < row.qty) stokKurang.push(`${row.produk} butuh ${row.qty}, stok ${bundleDef.stok}`);
            }
        }
    });
    if (stokKurang.length) {
        // Rollback stok karena kita sudah kembalikan di atas
        (p.bundleDetail || []).forEach(bd => {
            const bundleDef = (DB.bundleDef || []).find(b => b.nama === bd.produk);
            if (bundleDef) {
                if (bundleDef.komponen && bundleDef.komponen.length) {
                    bundleDef.komponen.forEach(k => {
                        const item = DB.inventory.find(x => x.id == k.invId || x.id == k.itemId || x.nama === k.nama);
                        if (item) item.stok -= (k.qty || 1) * bd.qty;
                    });
                } else {
                    bundleDef.stok = Math.max(0, (bundleDef.stok || 0) - bd.qty);
                }
            }
        });
        toast('Stok tidak cukup:\n' + stokKurang.join('\n'), 'error');
        return;
    }

    // Commit stok baru
    newRows.forEach(row => {
        const bundleDef = (DB.bundleDef || []).find(b => b.nama === row.produk);
        if (bundleDef) {
            if (bundleDef.komponen && bundleDef.komponen.length) {
                bundleDef.komponen.forEach(k => {
                    const item = DB.inventory.find(x => x.id == k.invId || x.id == k.itemId || x.nama === k.nama);
                    if (item) item.stok -= (k.qty || 1) * row.qty;
                });
            } else {
                bundleDef.stok = Math.max(0, (bundleDef.stok || 0) - row.qty);
            }
        }
    });

    // \u2500\u2500 Rollback stok souvenir lama \u2500\u2500
    (p.souvenir || []).forEach(s => {
        const inv = DB.inventory.find(x => x.nama === s.nama && x.kategori === 'sovenir');
        if (inv) inv.stok += (s.qty || 1);
    });
    // Commit stok souvenir baru
    const newSovRows = (window._sovEditRows || []).filter(s => s.nama);
    newSovRows.forEach(s => {
        const inv = DB.inventory.find(x => x.nama === s.nama && x.kategori === 'sovenir');
        if (inv) inv.stok = Math.max(0, inv.stok - (s.qty || 1));
    });
    const newTotalSouvenir = newSovRows.reduce((s, r) => s + (r.harga || 0) * (r.qty || 1), 0);

    // \u2500\u2500 Update PO fields \u2500\u2500
    p.bundle = newBundle;
    p.total = newTotal;
    p.bundleDetail = newRows.map(r => ({ ...r }));
    p.souvenir = newSovRows.map(s => ({ ...s }));
    p.totalSouvenir = newTotalSouvenir;

    // \u2500\u2500 Recalculate cicilan yang belum lunas secara proporsional \u2500\u2500
    const aktifCicilan = p.cicilan.filter(c => c.status !== 'batal' && c.status !== 'lunas');
    const sudahLunas = p.cicilan.filter(c => c.status === 'lunas').reduce((s, c) => s + c.tagihan, 0);
    const sisaBaru = Math.max(0, newTotal - sudahLunas);

    if (aktifCicilan.length > 0 && sisaBaru > 0) {
        const totalAktifLama = aktifCicilan.reduce((s, c) => s + c.tagihan, 0);
        let assigned = 0;
        aktifCicilan.forEach((c, idx) => {
            if (idx === aktifCicilan.length - 1) {
                c.tagihan = sisaBaru - assigned; // sisa ke termin terakhir
            } else {
                const portion = totalAktifLama > 0 ? Math.round(c.tagihan / totalAktifLama * sisaBaru) : Math.floor(sisaBaru / aktifCicilan.length);
                c.tagihan = portion;
                assigned += portion;
            }
            // Reset kurang bayar jika tagihan berubah
            if (c.status === 'kurang') {
                if ((c.terbayar || 0) >= c.tagihan) c.status = 'lunas';
            }
        });
    } else if (sisaBaru === 0 && aktifCicilan.length > 0) {
        // Semua sudah terbayar
        aktifCicilan.forEach(c => { c.tagihan = 0; c.status = 'lunas'; });
        p.status = 'lunas';
    }

    // \u2500\u2500 Update sisa PO & komisi entitas \u2500\u2500
    p.sisa = sisaBaru;
    if (p.status !== 'lunas' && sisaBaru <= 0) p.status = 'lunas';

    // \u2500\u2500 Recalculate komisi entitas dari scratch (lebih akurat dari incremental) \u2500\u2500
    const rateS = DB.settings.komisi_sales || 0;
    const rateN = DB.settings.komisi_nego || 0;
    const rateKC = DB.settings.komisi_kc || 5000;
    const rateKoor = DB.settings.komisi_koor || 200000;

    // Sales: hitung ulang bundle & komisiKotor dari semua PO
    if (p.sales) {
        const sEnt = DB.entitas.find(e => e.peran === 'Sales' && e.nama === p.sales);
        if (sEnt) {
            const allSalesPO = DB.poList.filter(x => x.sales === sEnt.nama && x.status !== 'retur');
            sEnt.bundle = allSalesPO.reduce((s, x) => s + (x.bundle || 0), 0);
            sEnt.komisiKotor = allSalesPO.reduce((s, x) => s + (x.bundle || 0) * (x.rateKomisiSales || rateS), 0);
            // Update riwayatPO entry untuk PO ini
            const riwEntry = (sEnt.riwayatPO || []).find(r => (r.poId || r.po) === p.id);
            if (riwEntry) {
                riwEntry.bundle = newBundle;
                riwEntry.komisiNominal = newBundle * (p.rateKomisiSales || rateS);
            }
        }
    }
    // Kepala Cabang: hitung ulang dari semua PO lunas
    DB.entitas.filter(e => e.peran === 'Kepala Cabang').forEach(kc => {
        const poLunas = DB.poList.filter(x => x.status === 'lunas' && x.status !== 'retur');
        kc.komisiKotor = poLunas.reduce((s, x) => s + (x.bundle || 0) * rateKC, 0);
    });
    // Konsumen/Koordinator
    const koorKons = DB.konsumen.find(k => k.id === p.konsumenId || k.nama === p.konsumen);
    if (koorKons) {
        const poKons = DB.poList.filter(x => (x.konsumenId === koorKons.id || x.konsumen === koorKons.nama) && x.status === 'lunas');
        koorKons.komisiKotor = poKons.reduce((s, x) => s + (x.bundle || 0) * rateKoor, 0);
        koorKons.komisiBundle = poKons.reduce((s, x) => s + (x.bundle || 0), 0);
    }

    // Update tagihan konsumen
    const kons = DB.konsumen.find(k => k.id === p.konsumenId || k.nama === p.konsumen);
    if (kons) {
        kons.tagihan = DB.poList
            .filter(x => (x.konsumenId === kons.id || x.konsumen === kons.nama) && x.status !== 'retur')
            .reduce((s, x) => s + (x.cicilan || [])
                .filter(c => c.status !== 'batal' && c.status !== 'lunas')
                .reduce((a, c) => a + (c.tagihan - (c.terbayar || 0)), 0), 0);
    }

    saveDB();
    const _ov2 = document.getElementById('overlay-edit-bundle'); if (_ov2) _ov2.remove();
    toast(`Bundle PO ${id} diperbarui: ${oldBundle} \u2192 ${newBundle} bundle`, 'success');
    addAudit(`Edit bundle PO ${id}: ${oldBundle} \u2192 ${newBundle} bundle, total ${fmtRpFull(oldTotal)} \u2192 ${fmtRpFull(newTotal)}`);
    renderPOList();
    renderPODetail(id);
}

function hapusPO(id) {
    const p = DB.poList.find(x => x.id === id);
    if (!p) return;

    const belumLunas = p.status !== 'lunas' && p.status !== 'retur';
    const sisa = (p.cicilan || []).filter(c => c.status !== 'lunas' && c.status !== 'batal').length;
    const sisaTagihan = (p.cicilan || []).filter(c => c.status !== 'lunas' && c.status !== 'batal')
        .reduce((s, c) => s + (c.tagihan - (c.terbayar || 0)), 0);
    const bundleDesc = (p.bundleDetail || []).map(b => `${b.produk} x${b.qty}`).join(', ') || `${p.bundle} bundle`;

    // Buat overlay konfirmasi
    let _ov = document.getElementById('overlay-hapus-po');
    if (_ov) _ov.remove();
    _ov = document.createElement('div');
    _ov.id = 'overlay-hapus-po';
    _ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    _ov.innerHTML = `
        <div style="background:var(--bg1,#1a1a2e);border:1.5px solid #501313;border-radius:14px;padding:24px;width:100%;max-width:480px">
            <div style="font-size:15px;font-weight:600;color:#F09595;margin-bottom:12px">
                ${belumLunas ? '\u26a0\ufe0f Hapus PO Belum Lunas' : '\ud83d\uddd1\ufe0f Hapus PO'}
            </div>
            <div style="font-size:13px;color:var(--text,#eee);margin-bottom:6px">
                PO <strong>${p.id}</strong> &mdash; ${p.konsumen}
            </div>
            <div style="font-size:12px;color:var(--text4,#888);margin-bottom:${belumLunas ? '10px' : '16px'}">
                Bundle: ${bundleDesc} &nbsp;&bull;&nbsp; Total: ${fmtRpFull(p.total)}
            </div>
            ${belumLunas ? `
            <div style="background:#2a0e0e;border:1px solid #501313;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#F09595">
                \u26a0\ufe0f PO ini <strong>BELUM LUNAS</strong> &mdash; status: <strong>${p.status}</strong><br>
                Sisa ${sisa} termin belum dibayar (${fmtRpFull(sisaTagihan)})
            </div>` : ''}
            <div style="background:var(--bg2,#12121f);border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:12px">
                <div style="font-weight:600;color:var(--text2,#ccc);margin-bottom:8px">Kembalikan stok ke inventory?</div>
                <div style="color:var(--text4,#888);margin-bottom:10px">
                    Pilih <strong style="color:#5DCAA5">Ya</strong> jika ini <strong>salah input / double entry</strong> &mdash; stok akan dikembalikan.<br>
                    Pilih <strong style="color:#F09595">Tidak</strong> jika memang sudah dikirim ke konsumen.
                </div>
                <div style="font-size:11px;color:var(--text4,#888)">${bundleDesc}</div>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                <button class="btn" style="font-size:12px" onclick="document.getElementById('overlay-hapus-po').remove()">Batal</button>
                <button class="btn btn-danger" style="font-size:12px" onclick="_doHapusPO('${id}', false)">
                    \ud83d\uddd1\ufe0f Hapus (stok TIDAK dikembalikan)
                </button>
                <button class="btn btn-success" style="font-size:12px;border-color:#1a6e40" onclick="_doHapusPO('${id}', true)">
                    \u2705 Hapus + Kembalikan Stok
                </button>
            </div>
        </div>`;
    document.body.appendChild(_ov);
    _ov.addEventListener('click', e => { if (e.target === _ov) _ov.remove(); });
}

function _doHapusPO(id, rollbackStok) {
    const p = DB.poList.find(x => x.id === id);
    if (!p) return;
    const _ov = document.getElementById('overlay-hapus-po');
    if (_ov) _ov.remove();

    // Rollback stok jika dipilih
    if (rollbackStok) {
        (p.bundleDetail || []).forEach(bd => {
            const bundleDef = (DB.bundleDef || []).find(b => b.nama === bd.produk);
            if (bundleDef) {
                if (bundleDef.komponen && bundleDef.komponen.length) {
                    bundleDef.komponen.forEach(k => {
                        const item = DB.inventory.find(x => x.id == k.invId || x.id == k.itemId || x.nama === k.nama);
                        if (item) item.stok += (k.qty || 1) * (bd.qty || 1);
                    });
                } else {
                    bundleDef.stok = (bundleDef.stok || 0) + (bd.qty || 1);
                }
            }
        });
        // Rollback stok souvenir
        (p.souvenir || []).forEach(s => {
            const inv = DB.inventory.find(x => x.nama === s.nama && x.kategori === 'sovenir');
            if (inv) inv.stok += (s.qty || 1);
        });
    }

    // Rollback komisi Sales di entitas
    const rateS = DB.settings.komisi_sales || 0;
    if (p.sales) {
        const sEnt = DB.entitas.find(e => e.peran === 'Sales' && e.nama === p.sales);
        if (sEnt) {
            sEnt.bundle = Math.max(0, (sEnt.bundle || 0) - (p.bundle || 0));
            sEnt.komisiKotor = Math.max(0, (sEnt.komisiKotor || 0) - (p.bundle || 0) * rateS);
            sEnt.riwayatPO = (sEnt.riwayatPO || []).filter(r => (r.poId || r.po) !== id);
        }
    }

    // Bersihkan referensi di konsumen
    const k = DB.konsumen.find(x => x.id === p.konsumenId || x.nama === p.konsumen);
    if (k) {
        k.po = (k.po || []).filter(pid => pid !== id);
    }
    DB.poList = DB.poList.filter(x => x.id !== id);
    if (k) {
        k.tagihan = DB.poList
            .filter(x => (x.konsumenId === k.id || x.konsumen === k.nama) && x.status !== 'retur')
            .reduce((s, x) => s + (x.cicilan || [])
                .filter(c => c.status !== 'batal' && c.status !== 'lunas')
                .reduce((a, c) => a + (c.tagihan - (c.terbayar || 0)), 0), 0);
    }
    if (DB.selectedPO === id) DB.selectedPO = DB.poList[0]?.id || null;
    saveDB();
    toast(`PO ${id} dihapus${rollbackStok ? ' + stok dikembalikan' : ''}`, 'success');
    addAudit(`Hapus PO ${id}${rollbackStok ? ' (stok dikembalikan)' : ' (stok tidak dikembalikan)'}`);
    renderPOList();
    if (DB.selectedPO) renderPODetail(DB.selectedPO);
    else {
        document.getElementById('po-detail-header').innerHTML = '';
        document.getElementById('po-detail-body').innerHTML = '<div class="empty">Pilih PO dari daftar</div>';
    }
}

// ── Hapus Entitas ──────────────────────────────────────────────
function cairkanKomisi(id) {
    const e = DB.entitas.find(x => x.id === id);
    if (!e) return;
    const komisiDibayarBersih = Math.max(0, e.komisiDibayar || 0);
    const outstanding = Math.max(0, (e.komisiKotor || 0) - komisiDibayarBersih);
    const totalPengeluaran = (e.pengeluaranList || []).reduce((s, p) => s + (p.jml || 0), 0);
    const sudahDipotong = e.pengeluaranDipotong || 0;
    const sisaHutang = Math.max(0, totalPengeluaran - sudahDipotong);
    const cairBersih = Math.max(0, outstanding - sisaHutang);
    const adaHutang = sisaHutang > 0;

    if (outstanding <= 0 && !adaHutang) { toast('Tidak ada komisi yang perlu dicairkan', 'warn'); return; }
    if (outstanding <= 0) { toast('Komisi kotor masih 0 — jalankan Repair Komisi di Settings dulu.', 'warn'); return; }

    if (e.peran === 'Sales' || e.peran === 'Nego') {
        const field = e.peran === 'Sales' ? 'sales' : 'nego';
        const myPOs = (DB.poList || []).filter(p => p[field] === e.nama);
        const adaSplitCair = myPOs.some(p => p.komisiSalesSplit1Cair || p.komisiSalesSplit2Cair);
        if (!adaSplitCair) {
            toast(`Komisi ${e.nama} belum bisa dicairkan — belum ada termin yang memenuhi syarat split komisi`, 'warn');
            return;
        }
    }

    let konfirmMsg = `Cairkan komisi ${e.nama}?\n\n`;
    konfirmMsg += `Komisi tersedia : ${fmtRpFull(outstanding)}\n`;
    if (adaHutang) {
        konfirmMsg += `Kasbon / Hutang : -${fmtRpFull(sisaHutang)}\n`;
        konfirmMsg += `${'─'.repeat(28)}\n`;
        konfirmMsg += `Dibayarkan      : ${fmtRpFull(cairBersih)}\n`;
    }
    konfirmMsg += `\nAksi ini tidak dapat dibatalkan.`;
    if (!confirm(konfirmMsg)) return;

    const today = formatDateShort(new Date().toISOString().split('T')[0]);
    if (!e.riwayatCair) e.riwayatCair = [];
    if (adaHutang) {
        e.pengeluaranDipotong = (e.pengeluaranDipotong || 0) + Math.min(sisaHutang, outstanding);
        e.riwayatCair.push({ tanggal: today, jumlah: cairBersih, keterangan: `Komisi ${fmtRpFull(outstanding)} - kasbon ${fmtRpFull(sisaHutang)} = dibayar ${fmtRpFull(cairBersih)}` });
        toast(`Komisi ${e.nama}: ${fmtRpFull(outstanding)} - kasbon ${fmtRpFull(sisaHutang)} = dibayar ${fmtRpFull(cairBersih)}`, 'success');
        addAudit(`Cairkan komisi ${e.nama}: ${fmtRpFull(outstanding)} - kasbon ${fmtRpFull(sisaHutang)} = ${fmtRpFull(cairBersih)}`);
    } else {
        e.riwayatCair.push({ tanggal: today, jumlah: outstanding });
        toast(`Komisi ${e.nama} sebesar ${fmtRpFull(outstanding)} berhasil dicairkan`, 'success');
        addAudit(`Cairkan komisi ${e.nama}: ${fmtRpFull(outstanding)}`);
    }
    e.komisiDibayar = komisiDibayarBersih + outstanding;
    saveDB();
    renderEntitasDetail(id);
}

// ── Dynamic Reward Config ──────────────────────────────────────
// DB.settings.rewardConfig = [{ id, gradeMin, gradeMax, reward, invNama, keterangan }]
// grade = bundleLunas per konsumen dalam periode

function getRewardForGrade(grade) {
    const cfg = DB.settings.rewardConfig || [];
    const match = cfg.find(r => grade >= (r.gradeMin || 0) && (r.gradeMax === null || r.gradeMax === undefined || grade <= r.gradeMax));
    if (match) return match;
    return null;
}

function saveRewardConfig() {
    const rows = document.querySelectorAll('.reward-cfg-row');
    const configs = [];
    let hasOverlap = false;
    rows.forEach(row => {
        const min = parseInt(row.querySelector('.rc-min').value) || 0;
        const maxVal = row.querySelector('.rc-max').value;
        const max = maxVal === '' || maxVal === null ? null : parseInt(maxVal);
        const reward = row.querySelector('.rc-reward').value.trim();
        const invNama = row.querySelector('.rc-inv').value.trim();
        const ket = row.querySelector('.rc-ket').value.trim();
        if (!reward) return;
        const maxCmp = max === null ? Infinity : max;
        configs.forEach(c => {
            const cMax = c.gradeMax === null ? Infinity : c.gradeMax;
            if (min <= cMax && maxCmp >= (c.gradeMin || 0)) hasOverlap = true;
        });
        configs.push({ id: Date.now() + Math.random(), gradeMin: min, gradeMax: max, reward, invNama, keterangan: ket });
    });
    if (hasOverlap) { toast('Ada range grade yang overlap! Perbaiki dulu.', 'error'); return; }
    if (!DB.settings) DB.settings = {};
    DB.settings.rewardConfig = configs;
    saveDB();
    toast('Konfigurasi reward berhasil disimpan', 'success');
    addAudit('Update reward config koordinator: ' + configs.length + ' rules');
    renderSettings();
}

function addRewardConfigRow(min, max, reward, inv, ket) {
    min = min || ''; max = max || ''; reward = reward || ''; inv = inv || ''; ket = ket || '';
    const container = document.getElementById('reward-config-rows');
    if (!container) return;
    const invItems = (DB.inventory || []).filter(i => i.kondisi !== 'reject').map(i => i.nama);
    const row = document.createElement('div');
    row.className = 'reward-cfg-row';
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap';
    row.innerHTML =
        '<input class="input rc-min" type="number" placeholder="Grade min" value="' + min + '" min="0" style="width:90px;font-size:12px" title="Bundle minimum">' +
        '<span style="font-size:11px;color:var(--text4)">-</span>' +
        '<input class="input rc-max" type="number" placeholder="maks (kosong=tak terbatas)" value="' + max + '" min="0" style="width:140px;font-size:12px" title="Bundle max, kosong = tidak terbatas">' +
        '<input class="input rc-reward" type="text" placeholder="Nama reward" value="' + reward + '" style="width:150px;font-size:12px" list="inv-rlist">' +
        '<datalist id="inv-rlist">' + invItems.map(n => '<option value="' + n + '">').join('') + '</datalist>' +
        '<input class="input rc-inv" type="text" placeholder="Nama di inventory" value="' + inv + '" style="width:150px;font-size:12px" list="inv-rlist2">' +
        '<datalist id="inv-rlist2">' + invItems.map(n => '<option value="' + n + '">').join('') + '</datalist>' +
        '<input class="input rc-ket" type="text" placeholder="Keterangan (opsional)" value="' + ket + '" style="width:130px;font-size:12px">' +
        '<button class="btn btn-danger" style="padding:3px 8px;font-size:12px" onclick="this.closest(\'.reward-cfg-row\').remove()">x</button>';
    container.appendChild(row);
}

function cairkanRewardKonsumen(id) {
    const k = DB.konsumen.find(x => x.id === id);
    if (!k) return;

    const bulanEl = document.getElementById('laporan-bulan');
    const tahunEl = document.getElementById('laporan-tahun');
    const bulanSel = bulanEl ? bulanEl.value : 'semua';
    const tahunSel = tahunEl ? tahunEl.value : 'semua';

    const poLunas = DB.poList.filter(p =>
        (p.konsumenId === k.id || p.konsumen === k.nama) &&
        p.status === 'lunas' && poMatchFilter(p, bulanSel, tahunSel));
    const grade = poLunas.reduce((s, p) => s + (p.bundle || 0), 0);
    const rewardCfg = getRewardForGrade(grade);

    if (!rewardCfg) {
        toast('Grade ' + grade + ' tidak masuk range reward manapun. Cek konfigurasi reward di Settings.', 'warn');
        return;
    }

    // Cek stok inventory - wajib ada jika invNama dikonfigurasi
    let invItem = null;
    if (rewardCfg.invNama) {
        invItem = DB.inventory.find(i => i.nama === rewardCfg.invNama && i.kategori === 'reward');
        if (!invItem) {
            toast('Barang reward "' + rewardCfg.invNama + '" tidak ditemukan di inventory kategori Reward. Tambahkan dulu di Inventory \u2192 tab Reward.', 'error');
            return;
        }
        if (invItem.stok < 1) {
            toast('Stok "' + rewardCfg.invNama + '" habis (0). Tambahkan stok di Inventory \u2192 tab Reward sebelum mencairkan.', 'error');
            return;
        }
    }

    const periodeLabel = (bulanSel === 'semua' && tahunSel === 'semua') ? 'Semua Periode'
        : bulanSel !== 'semua' && tahunSel !== 'semua' ? bulanSel + ' ' + tahunSel
            : bulanSel !== 'semua' ? bulanSel : 'Tahun ' + tahunSel;

    const stokSekarang = invItem ? invItem.stok : '-';
    let msg = 'Cairkan reward untuk ' + k.nama + '?\n\nPeriode: ' + periodeLabel +
        '\nGrade: ' + grade + ' bundle lunas' +
        '\nReward: ' + rewardCfg.reward +
        (invItem ? '\nStok sekarang: ' + stokSekarang + ' \u2192 akan jadi ' + (stokSekarang - 1) : '');
    if (rewardCfg.keterangan) msg += '\nKet: ' + rewardCfg.keterangan;
    if (!confirm(msg)) return;

    if (invItem) invItem.stok = Math.max(0, invItem.stok - 1);

    if (!k.riwayatCair) k.riwayatCair = [];
    const today = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    k.riwayatCair.push({
        tanggal: today.getDate() + ' ' + months[today.getMonth()] + ' ' + today.getFullYear(),
        reward: rewardCfg.reward,
        grade,
        periode: periodeLabel,
        invDikurangi: (stokCukup && invItem) ? rewardCfg.invNama : null
    });

    saveDB();
    toast('Reward "' + rewardCfg.reward + '" untuk ' + k.nama + ' (grade ' + grade + ') dicairkan!' +
        (stokCukup && invItem ? ' Stok inventory -1.' : ''), 'success');
    addAudit('Cairkan reward ' + k.nama + ': grade ' + grade + ' -> ' + rewardCfg.reward + ' (' + periodeLabel + ')');
    if (typeof renderKonsumenDetail === 'function') renderKonsumenDetail(id);
    if (typeof setEntitasLaporanTab === 'function') setEntitasLaporanTab('koordinator');
}



function cairkanKomisiKonsumen(id) {
    const k = DB.konsumen.find(x => x.id === id);
    if (!k) return;
    const outstanding = Math.max(0, (k.komisiKotor || 0) - (k.komisiDibayar || 0));
    if (outstanding <= 0) { toast('Tidak ada komisi yang perlu dicairkan', 'warn'); return; }
    if (!confirm(`Cairkan komisi konsumen ${k.nama}?\n\nJumlah: ${fmtRpFull(outstanding)}\n\nIni menandai komisi sudah dibayarkan ke ${k.nama}.`)) return;
    k.komisiDibayar = (k.komisiDibayar || 0) + outstanding;
    if (!k.riwayatCair) k.riwayatCair = [];
    k.riwayatCair.push({ tanggal: formatDateShort(new Date().toISOString().split('T')[0]), jumlah: outstanding });
    saveDB();
    toast(`Komisi ${k.nama} sebesar ${fmtRpFull(outstanding)} berhasil dicairkan`, 'success');
    addAudit(`Cairkan komisi konsumen ${k.nama}: ${fmtRpFull(outstanding)}`);
    renderKonsumenDetail(id);
}

// ── Cetak Kwitansi Komisi Entitas ──────────────────────────────
function cetakKwitansiKomisi(id, cairIdx) {
    const e = DB.entitas.find(x => x.id === id);
    if (!e) return;
    const riwayat = e.riwayatCair || [];
    if (!riwayat.length) {
        toast('Belum ada pencairan komisi untuk dicetak', 'warn');
        return;
    }
    if (cairIdx !== undefined && cairIdx >= 0) {
        _cetakKwitansiKomisiData(e, riwayat[cairIdx], cairIdx);
    } else if (riwayat.length === 1) {
        _cetakKwitansiKomisiData(e, riwayat[0], 0);
    } else {
        _showPilihPencairan(e);
    }
}

function _showPilihPencairan(e) {
    let _ov = document.getElementById('overlay-pilih-cair');
    if (_ov) _ov.remove();
    _ov = document.createElement('div');
    _ov.id = 'overlay-pilih-cair';
    _ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    const rows = (e.riwayatCair || []).map((rc, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:0.5px solid var(--border2);cursor:pointer"
             onclick="_cetakKwitansiKomisiData(DB.entitas.find(x=>x.id===${e.id}),DB.entitas.find(x=>x.id===${e.id}).riwayatCair[${i}],${i});document.getElementById('overlay-pilih-cair').remove()"
             onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
            <div>
                <div style="font-size:13px;font-weight:500">${rc.tanggal}</div>
                <div style="font-size:11px;color:var(--text4)">${rc.keterangan || 'Pencairan komisi'}</div>
            </div>
            <div style="font-size:14px;font-weight:600;color:#5DCAA5">${fmtRpFull(rc.jumlah)}</div>
        </div>`).join('');
    _ov.innerHTML = `
        <div style="background:var(--bg1,#1a1a2e);border:1px solid var(--border,#333);border-radius:14px;padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto">
            <div style="font-size:15px;font-weight:600;margin-bottom:4px">🧾 Pilih Pencairan</div>
            <div style="font-size:12px;color:var(--text4);margin-bottom:16px">${e.nama} — ${e.peran}</div>
            ${rows}
            <div style="display:flex;justify-content:flex-end;margin-top:14px">
                <button class="btn" onclick="document.getElementById('overlay-pilih-cair').remove()">Tutup</button>
            </div>
        </div>`;
    document.body.appendChild(_ov);
    _ov.addEventListener('click', ev => { if (ev.target === _ov) _ov.remove(); });
}

function _cetakKwitansiKomisiData(e, cairData, cairIdx) {
    const prs = DB.settings.perusahaan || {};
    const nPrs = prs.nama || 'INTERGAS PERDANA';
    const aPrs = [prs.alamat, prs.kota].filter(Boolean).join(', ');
    const tPrs = [prs.telp, prs.telp2].filter(Boolean).join(' / ');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const today = new Date();
    const tglCetak = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    const tglCair = cairData ? cairData.tanggal : tglCetak;
    const noKwt = `KMK/${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}/${String(e.id).padStart(4, '0')}${cairIdx >= 0 ? '-' + String(cairIdx + 1).padStart(2, '0') : ''}`;
    const jumlahCair = cairData ? cairData.jumlah : 0;
    const keteranganCair = cairData?.keterangan || '';
    let kasbonPotong = 0;
    if (keteranganCair && keteranganCair.includes('kasbon')) {
        const match = keteranganCair.match(/kasbon Rp ([0-9.,]+)/);
        if (match) kasbonPotong = parseRp(match[1]);
    }
    const komisiKotorRaw = jumlahCair + kasbonPotong;

    let detailRows = '';
    const labelMap = { Sales: 'Komisi Sales', Nego: 'Komisi Nego', Collector: 'Komisi Collector', 'Kepala Cabang': 'Komisi KC', Supir: 'Upah Supir' };
    const rateInfo = e.peran === 'Collector' ? `${fmtRpFull(DB.settings.komisi_coll || 1500)}/kwitansi`
        : e.peran === 'Kepala Cabang' ? `${fmtRpFull(DB.settings.komisi_kc || 5000)}/bundle`
            : '—';
    detailRows = `<tr>
        <td>${labelMap[e.peran] || 'Komisi'}</td>
        <td>Pencairan ke-${cairIdx + 1}</td>
        <td style="text-align:right">${rateInfo}</td>
        <td style="text-align:right;font-weight:600;color:#3D5A73">${fmtRpFull(komisiKotorRaw)}</td>
    </tr>`;

    const kasbonRow = kasbonPotong > 0 ? `<tr style="color:#F09595">
        <td>Potongan Kasbon</td>
        <td>Dipotong dari komisi</td>
        <td style="text-align:right">—</td>
        <td style="text-align:right;font-weight:600;color:#F09595">-${fmtRpFull(kasbonPotong)}</td>
    </tr>` : '';

    const allCair = e.riwayatCair || [];
    const totalSemuaCair = allCair.reduce((s, r) => s + (r.jumlah || 0), 0);
    const rekapRows = allCair.map((rc, i) => `
        <tr style="${i === cairIdx ? 'background:#f0f7f0;font-weight:600' : ''}">
            <td style="padding:4px 8px;font-size:10px;color:#555">${rc.tanggal}</td>
            <td style="padding:4px 8px;font-size:10px;color:#555">${rc.keterangan || 'Pencairan komisi'}</td>
            <td style="padding:4px 8px;font-size:10px;text-align:right;color:${i === cairIdx ? '#3D5A73' : '#555'}">${fmtRpFull(rc.jumlah)}</td>
        </tr>`).join('');

    const win = window.open('', '_blank', 'width=680,height=900');
    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
    <title>Kwitansi Komisi ${e.nama} - ${tglCair}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;padding:6mm 8mm;color:#111;background:#fff;font-size:11px;width:241.3mm;min-height:279.4mm}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
      .co-name{font-size:13px;font-weight:bold;color:#3D5A73;letter-spacing:1px}
      .co-sub{font-size:10px;color:#555;margin-top:2px}
      .kwt-box{border:1.5px solid #3D5A73;padding:5px 12px;text-align:center;min-width:140px}
      .kwt-box .label{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#555}
      .kwt-box .no{font-size:12px;font-weight:bold;color:#3D5A73;margin-top:2px}
      hr.tebal{border:none;border-top:2px solid #3D5A73;margin:4px 0 2px}
      hr.tipis{border:none;border-top:1px solid #000;margin:2px 0 10px}
      .title{text-align:center;font-size:13px;font-weight:bold;letter-spacing:4px;margin:8px 0 12px;color:#3D5A73}
      .info-grid{display:grid;grid-template-columns:120px 1fr;gap:2px 8px;font-size:11px;margin-bottom:12px}
      .info-grid .lbl{color:#555}
      .info-grid .val{font-weight:500}
      table.main{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
      table.main th{background:#3D5A73;color:#fff;padding:5px 8px;text-align:left;font-size:10px}
      table.main td{padding:6px 8px;border-bottom:1px solid #e8e8e8}
      .total-box{background:#f7f9f7;border:1.5px solid #3D5A73;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
      .total-box .lbl{font-size:11px;color:#333}
      .total-box .amt{font-size:18px;font-weight:bold;color:#3D5A73}
      .terbilang{background:#f7faf7;border:1px dashed #90b090;padding:6px 10px;font-size:10px;color:#555;margin-bottom:14px;font-style:italic}
      .rekap-section{margin-top:16px;padding-top:10px;border-top:1px dashed #ccc}
      .rekap-title{font-size:9px;text-transform:uppercase;color:#888;margin-bottom:6px;letter-spacing:.5px;font-weight:600}
      table.rekap{width:100%;border-collapse:collapse;font-size:10px}
      table.rekap th{background:#f0f0f0;padding:4px 8px;text-align:left;color:#555;font-size:9px;border-bottom:1px solid #ccc}
      table.rekap td{padding:4px 8px;border-bottom:1px dotted #eee}
      .rekap-total{display:flex;justify-content:space-between;padding:5px 8px;background:#f5f5f5;font-weight:600;font-size:11px;border-top:1.5px solid #ccc;margin-top:2px}
      .foot{display:flex;justify-content:space-between;margin-top:24px;font-size:10px}
      .sign{text-align:center;width:180px}
      .sign-line{border-top:1px solid #000;padding-top:4px;margin-top:50px}
      @page{size:9.5in 11in;margin:0}
      @media print{body{padding:6mm 8mm;width:241.3mm}.no-print{display:none}button{display:none}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="co-name">${nPrs.toUpperCase()}</div>
        ${aPrs ? `<div class="co-sub">${aPrs}</div>` : ''}
        ${tPrs ? `<div class="co-sub">Telp: ${tPrs}</div>` : ''}
      </div>
      <div class="kwt-box">
        <div class="label">No. Kwitansi</div>
        <div class="no">${noKwt}</div>
      </div>
    </div>
    <hr class="tebal"><hr class="tipis">
    <div class="title">B U K T I &nbsp; P E M B A Y A R A N &nbsp; K O M I S I</div>
    <div class="info-grid">
      <span class="lbl">Tanggal cairkan</span><span class="val">${tglCair}</span>
      <span class="lbl">Tanggal cetak</span><span class="val">${tglCetak}</span>
      <span class="lbl">Nama penerima</span><span class="val">${e.nama}</span>
      <span class="lbl">Jabatan</span><span class="val">${e.peran}</span>
      ${e.nik ? `<span class="lbl">NIK</span><span class="val">${e.nik}</span>` : ''}
      ${e.telp ? `<span class="lbl">No. Telp</span><span class="val">${e.telp}</span>` : ''}
      <span class="lbl">Pencairan ke</span><span class="val">${cairIdx + 1} dari ${allCair.length} total pencairan</span>
    </div>
    <table class="main">
      <thead><tr><th>Keterangan</th><th>Detail</th><th style="text-align:right">Rate</th><th style="text-align:right">Jumlah</th></tr></thead>
      <tbody>${detailRows}${kasbonRow}</tbody>
    </table>
    <div class="total-box">
      <span class="lbl">Dibayarkan Pencairan Ini</span>
      <span class="amt">Rp ${jumlahCair.toLocaleString('id-ID')}</span>
    </div>
    <div class="terbilang">Terbilang: <strong>${terbilangRupiah(jumlahCair)}</strong></div>
    <div class="rekap-section">
      <div class="rekap-title">Rekap Semua Pencairan Komisi — ${e.nama}</div>
      <table class="rekap">
        <thead><tr><th>Tanggal</th><th>Keterangan</th><th style="text-align:right">Jumlah Dibayar</th></tr></thead>
        <tbody>${rekapRows}</tbody>
      </table>
      <div class="rekap-total">
        <span>Total Semua Pencairan</span>
        <span>Rp ${totalSemuaCair.toLocaleString('id-ID')}</span>
      </div>
    </div>
    <div class="foot">
      <div class="sign">
        <div style="font-size:11px;color:#555">Mengetahui,</div>
        <div class="sign-line">${nPrs}</div>
        <div style="font-size:10px;color:#888">Pimpinan / Manajer</div>
      </div>
      <div class="sign">
        <div style="font-size:11px;color:#555">Penerima,</div>
        <div class="sign-line">${e.nama}</div>
        <div style="font-size:10px;color:#888">${e.peran}</div>
      </div>
    </div>
    <div style="margin-top:20px;padding-top:8px;border-top:1px dashed #ccc;font-size:9px;color:#aaa;text-align:center">
      Dokumen ini dicetak secara sistem oleh ${nPrs} pada ${tglCetak} &bull; ${noKwt}
    </div>
    <div class="no-print" style="margin-top:16px;text-align:center">
      <button onclick="window.print()" style="padding:8px 24px;background:#3D5A73;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;font-family:inherit">🖨 Cetak / Simpan PDF</button>
    </div>
    </body></html>`);
    win.document.close();
    addAudit(`Cetak kwitansi komisi ${e.nama} pencairan ke-${cairIdx + 1}: ${fmtRpFull(jumlahCair)}`);
}

function cetakKwitansiKomisiKonsumen(id) {
    const k = DB.konsumen.find(x => String(x.id) === String(id));
    if (!k) return;
    const prs = DB.settings.perusahaan || {};
    const nPrs = prs.nama || 'INTERGAS PERDANA';
    const aPrs = [prs.alamat, prs.kota].filter(Boolean).join(', ');
    const tPrs = [prs.telp, prs.telp2].filter(Boolean).join(' / ');

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const today = new Date();
    const tglCetak = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    const noKwt = `KMK-K/${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}/${String(k.id).padStart(4, '0')}`;

    const bulanSel = document.getElementById('laporan-bulan')?.value || 'semua';
    const tahunSel = document.getElementById('laporan-tahun')?.value || 'semua';
    let periodeLabel = (bulanSel === 'semua' && tahunSel === 'semua') ? 'Semua Periode'
        : bulanSel !== 'semua' && tahunSel !== 'semua' ? `${bulanSel} ${tahunSel}`
            : bulanSel !== 'semua' ? bulanSel : `Tahun ${tahunSel}`;

    const closedPO = DB.poList.filter(p =>
        (p.konsumenId === k.id || p.konsumen === k.nama) &&
        p.status === 'lunas' && poMatchFilter(p, bulanSel, tahunSel));
    const bundleClosed = closedPO.reduce((s, p) => s + p.bundle, 0);
    const rate = DB.settings.komisi_koor || 15000;
    const totalKomisi = bundleClosed * rate;

    const detailRows = closedPO.map(p =>
        `<tr><td>Konsumen</td><td>${p.konsumen} (${p.tanggal || '-'})</td><td style="text-align:right">${fmtRpFull(rate)}/bundle</td><td style="text-align:right;font-weight:600;color:#3D5A73">${fmtRpFull(p.bundle * rate)}</td></tr>`
    ).join('') || `<tr><td colspan="4" style="text-align:center;color:#888">Tidak ada PO lunas di periode ini</td></tr>`;

    const win = window.open('', '_blank', 'width=680,height=860');
    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
    <title>Kwitansi Komisi ${k.nama}</title>
    <style>
      *{box-*{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;padding:6mm 8mm;color:#111;background:#fff;font-size:11px;width:241.3mm;min-height:279.4mm}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
      .co-name{font-size:13px;font-weight:bold;color:#3D5A73;letter-spacing:1px}
      .co-sub{font-size:10px;color:#555;margin-top:2px}
      .kwt-box{border:1.5px solid #3D5A73;padding:5px 12px;text-align:center;min-width:140px}
      .kwt-box .label{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#555}
      .kwt-box .no{font-size:12px;font-weight:bold;color:#3D5A73;margin-top:2px}
      hr.tebal{border:none;border-top:2px solid #3D5A73;margin:4px 0 2px}
      hr.tipis{border:none;border-top:1px solid #000;margin:2px 0 10px}
      .title{text-align:center;font-size:13px;font-weight:bold;letter-spacing:4px;margin:8px 0 12px;color:#3D5A73}
      .info-grid{display:grid;grid-template-columns:120px 1fr;gap:2px 8px;font-size:11px;margin-bottom:12px}
      .info-grid .lbl{color:#555} .info-grid .val{font-weight:500}
      table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
      th{background:#3D5A73;color:#fff;padding:5px 8px;text-align:left;font-size:10px}
      td{padding:5px 8px;border-bottom:1px solid #e8e8e8}
      .total-box{background:#f7f9f7;border:1.5px solid #3D5A73;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
      .total-box .lbl{font-size:11px;color:#333} .total-box .amt{font-size:18px;font-weight:bold;color:#3D5A73}
      .terbilang{background:#f7faf7;border:1px dashed #90b090;padding:6px 10px;font-size:10px;color:#555;margin-bottom:14px;font-style:italic}
      .foot{display:flex;justify-content:space-between;margin-top:24px;font-size:10px}
      .sign{text-align:center;width:180px} .sign-line{border-top:1px solid #000;padding-top:4px;margin-top:50px}
      @page{size:9.5in 11in;margin:0}
      @media print{body{padding:6mm 8mm;width:241.3mm}button{display:none}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="co-name">${nPrs.toUpperCase()}</div>
        ${aPrs ? `<div class="co-sub">${aPrs}</div>` : ''}
        ${tPrs ? `<div class="co-sub">Telp: ${tPrs}</div>` : ''}
      </div>
      <div class="kwt-box"><div class="label">No. Kwitansi</div><div class="no">${noKwt}</div></div>
    </div>
    <hr class="tebal"><hr class="tipis">
    <div class="title">B U K T I &nbsp; P E M B A Y A R A N &nbsp; K O M I S I</div>
    <div class="info-grid">
      <span class="lbl">Tanggal cetak</span><span class="val">${tglCetak}</span>
      <span class="lbl">Periode</span><span class="val">${periodeLabel}</span>
      <span class="lbl">Nama penerima</span><span class="val">${k.nama}</span>
      <span class="lbl">Peran</span><span class="val">Konsumen / Koordinator</span>
      ${k.kota ? `<span class="lbl">Kota</span><span class="val">${k.kota}</span>` : ''}
      ${k.telp ? `<span class="lbl">No. Telp</span><span class="val">${k.telp}</span>` : ''}
    </div>
    <table>
      <thead><tr><th>Peran</th><th>PO</th><th style="text-align:right">Rate</th><th style="text-align:right">Jumlah</th></tr></thead>
      <tbody>${detailRows}</tbody>
    </table>
    <div class="total-box">
      <span class="lbl">Total Komisi Periode Ini</span>
      <span class="amt">Rp ${totalKomisi.toLocaleString('id-ID')}</span>
    </div>
    <div class="terbilang">Terbilang: <strong>${terbilangRupiah(totalKomisi)} rupiah</strong></div>
    <div class="foot">
      <div class="sign"><div style="font-size:11px;color:#555">Mengetahui,</div><div class="sign-line">${nPrs}</div><div style="font-size:10px;color:#888">Pimpinan / Manajer</div></div>
      <div class="sign"><div style="font-size:11px;color:#555">Penerima,</div><div class="sign-line">${k.nama}</div><div style="font-size:10px;color:#888">Koordinator</div></div>
    </div>
    <div style="margin-top:24px;text-align:center">
      <button onclick="window.print()" style="padding:8px 24px;background:#3D5A73;color:#ffffff;border:none;border-radius:4px;font-size:13px;cursor:pointer;font-family:inherit">&#x1F5A8; Cetak / Simpan PDF</button>
    </div>
    </body></html>`);
    win.document.close();
}

function hapusEntitas(id) {
    const e = DB.entitas.find(x => x.id === id);
    if (!e) return;
    const terlibat = DB.poList.filter(p =>
        (p.status === 'berjalan' || p.status === 'telat') &&
        (p.sales === e.nama || p.nego === e.nama || p.koor === e.nama || p.coll === e.nama)
    );
    if (terlibat.length > 0) {
        toast(`Tidak bisa dihapus — masih terlibat di ${terlibat.length} PO aktif`, 'error');
        return;
    }
    konfirmasiHapus(
        'Hapus Entitas',
        `Hapus "${e.nama}" (${e.peran}) secara permanen?`,
        () => {
            DB.entitas = DB.entitas.filter(x => x.id !== id);
            const sameTab = DB.entitas.filter(x => x.peran === e.peran);
            DB.selectedEntitas = sameTab[0]?.id || DB.entitas[0]?.id || null;
            saveDB();
            toast(`Entitas ${e.nama} dihapus`);
            addAudit(`Hapus entitas: ${e.nama} (${e.peran})`);
            renderEntitasList();
            if (DB.selectedEntitas) renderEntitasDetail(DB.selectedEntitas);
            else document.getElementById('entitas-detail-header').innerHTML = '';
        }
    );
}

// ── Hapus item Inventory ───────────────────────────────────────
function hapusInventory(id) {
    const item = DB.inventory.find(x => x.id === id);
    if (!item) return;
    konfirmasiHapus(
        'Hapus Barang',
        `Hapus "${item.nama}" (${item.kondisi}, stok: ${item.stok}) dari inventaris?`,
        () => {
            DB.inventory = DB.inventory.filter(x => x.id !== id);
            saveDB();
            toast(`Barang ${item.nama} dihapus`);
            addAudit(`Hapus inventaris: ${item.nama} (${item.kondisi})`);
            renderInventory();
        }
    );
}

// ── Hapus Riwayat Masuk ────────────────────────────────────────
function hapusRiwayatMasuk(id) {
    const r = DB.riwayatMasuk.find(x => x.id === id);
    if (!r) return;
    konfirmasiHapus(
        'Hapus Riwayat Masuk',
        `Hapus riwayat masuk "${r.nama}" (${r.tanggal}, +${r.jumlah} unit)?`,
        () => {
            DB.riwayatMasuk = DB.riwayatMasuk.filter(x => x.id !== id);
            saveDB();
            toast('Riwayat masuk dihapus');
            addAudit(`Hapus riwayat masuk: ${r.nama} ${r.tanggal}`);
            renderRiwayatMasuk();
        }
    );
}

// ── Hapus Retur ────────────────────────────────────────────────
function hapusRetur(id) {
    const r = (DB.returList || []).find(x => x.id === id);
    if (!r) return;
    konfirmasiHapus(
        'Hapus Retur',
        `Hapus retur dari "${r.konsumen}" (${r.po}, ${r.tanggal})?`,
        () => {
            DB.returList = DB.returList.filter(x => x.id !== id);
            saveDB();
            toast('Data retur dihapus');
            addAudit(`Hapus retur: ${r.po} ${r.konsumen}`);
            renderRetur();
        }
    );
}

// ============================================================
// LOSS HANDLING — Konsumen Kabur (inventory-integrated)
// ============================================================

/**
 * Ambil semua komponen inventory dari bundleDetail PO.
 * Return array: [{ invId, nama, harga, kondisi, maxUnit, qtyPerBundle, bundleNama }]
 */
function getLossItemOptions(po) {
    const result = [];
    (po.bundleDetail || []).forEach(bd => {
        const def = (DB.bundleDef || []).find(b => b.nama === bd.produk || b.id === bd.id);
        const bundleQty = bd.qty || 1;
        if (def && def.komponen && def.komponen.length) {
            def.komponen.forEach(komp => {
                const inv = DB.inventory.find(i => i.id == komp.invId || i.id == komp.itemId || i.nama === komp.nama);
                if (!inv) return;
                const existing = result.find(r => r.invId == inv.id);
                const totalQtyInPO = (komp.qty || 1) * bundleQty;
                if (existing) {
                    existing.maxUnit += totalQtyInPO;
                } else {
                    result.push({
                        invId: inv.id,
                        nama: inv.nama,
                        harga: inv.harga || 0,
                        kondisi: inv.kondisi,
                        maxUnit: totalQtyInPO,
                        qtyPerBundle: komp.qty || 1,
                        bundleNama: def.nama
                    });
                }
            });
        } else {
            const inv = DB.inventory.find(i => i.nama === bd.produk);
            if (inv) {
                result.push({
                    invId: inv.id,
                    nama: inv.nama,
                    harga: inv.harga || 0,
                    kondisi: inv.kondisi,
                    maxUnit: bundleQty,
                    qtyPerBundle: 1,
                    bundleNama: bd.produk
                });
            }
        }
    });
    return result;
}

/**
 * Buka modal loss. Opsional pre-select poId.
 */
function openLossModal(poId) {
    const sel = document.getElementById('loss-po');
    if (!sel) return;
    const activePO = (DB.poList || []).filter(p => p.status !== 'lunas' && p.status !== 'retur');
    sel.innerHTML = activePO.map(p =>
        `<option value="${p.id}">${p.id} \u2013 ${p.konsumen} (${p.bundle} bundle)</option>`
    ).join('');
    if (poId) sel.value = poId;
    document.getElementById('loss-keterangan').value = '';
    const prev = document.getElementById('loss-preview');
    if (prev) prev.style.display = 'none';
    const tb = document.getElementById('loss-total-beban');
    if (tb) tb.style.display = 'none';
    onLossPOChange();
    openModal('modal-loss');
}

function openLossFromPO(poId) {
    openLossModal(poId);
}

// ============================================================
// MENINGGAL — Konsumen meninggal: hapus sisa tagihan, kurangi bundle & komisi
// ============================================================

function initMeninggalOptions() {
    const sel = document.getElementById('meninggal-po');
    if (!sel) return;
    const activePO = (DB.poList || []).filter(p => p.status !== 'retur');
    sel.innerHTML = activePO.map(p =>
        `<option value="${p.id}">${p.id} \u2013 ${p.konsumen} (${p.bundle} bundle)</option>`
    ).join('');
    document.getElementById('meninggal-jumlah').value = 1;
    document.getElementById('meninggal-keterangan').value = '';
    const prev = document.getElementById('meninggal-preview');
    if (prev) prev.style.display = 'none';
    onMeninggalPOChange();
}

function openMeninggalFromPO(poId) {
    initMeninggalOptions();
    const sel = document.getElementById('meninggal-po');
    if (sel && poId) sel.value = poId;
    onMeninggalPOChange();
    openModal('modal-meninggal');
}

function onMeninggalPOChange() {
    const poId = document.getElementById('meninggal-po')?.value;
    if (!poId) return;
    const po = DB.poList.find(p => p.id === poId);
    if (!po) return;
    const nilaiPerBundle = po.bundle > 0 ? Math.round(po.total / po.bundle) : 0;
    const el = document.getElementById('meninggal-nilai');
    if (el) el.value = fmtRpFull(nilaiPerBundle);
    const jmlEl = document.getElementById('meninggal-jumlah');
    if (jmlEl) jmlEl.max = po.bundle;
    onMeninggalCalc();
}

function onMeninggalCalc() {
    const poId = document.getElementById('meninggal-po')?.value;
    if (!poId) return;
    const po = DB.poList.find(p => p.id === poId);
    if (!po) return;
    const jml = parseInt(document.getElementById('meninggal-jumlah')?.value) || 0;
    const nilaiPerBundle = po.bundle > 0 ? Math.round(po.total / po.bundle) : 0;
    const tagihanDihapus = nilaiPerBundle * jml;
    const bundleSetelah = Math.max(0, po.bundle - jml);

    const prev = document.getElementById('meninggal-preview');
    if (prev) prev.style.display = 'block';
    const elBundle = document.getElementById('meninggal-prev-bundle');
    const elTagihan = document.getElementById('meninggal-prev-tagihan');
    const elSisa = document.getElementById('meninggal-prev-sisa');
    if (elBundle) elBundle.textContent = `${po.bundle} \u2192 ${bundleSetelah}`;
    if (elTagihan) elTagihan.textContent = fmtRpFull(tagihanDihapus);
    if (elSisa) elSisa.textContent = fmtRpFull(Math.max(0, po.sisa - tagihanDihapus));
}

function submitMeninggal() {
    const poId = document.getElementById('meninggal-po')?.value;
    if (!poId) { toast('Pilih PO terlebih dahulu', 'error'); return; }
    const po = DB.poList.find(p => p.id === poId);
    if (!po) { toast('PO tidak ditemukan', 'error'); return; }

    const jml = parseInt(document.getElementById('meninggal-jumlah')?.value) || 0;
    const keterangan = document.getElementById('meninggal-keterangan')?.value.trim() || '';
    if (jml <= 0) { toast('Jumlah bundle tidak valid', 'error'); return; }
    if (jml > po.bundle) { toast(`Jumlah (${jml}) melebihi bundle PO (${po.bundle})`, 'error'); return; }

    const nilaiPerBundle = po.bundle > 0 ? Math.round(po.total / po.bundle) : 0;
    const tagihanDihapus = nilaiPerBundle * jml;
    const bundleLama = po.bundle;
    const bundleSetelah = Math.max(0, bundleLama - jml);
    const totalBaru = Math.max(0, po.total - tagihanDihapus);
    const isFullMeninggal = bundleSetelah === 0;

    if (!confirm(
        `Konfirmasi: ${jml} bundle dari PO ${poId} ditandai MENINGGAL?\n\n` +
        `Tagihan dihapus: ${fmtRpFull(tagihanDihapus)}\n` +
        `Bundle: ${bundleLama} \u2192 ${bundleSetelah}\n` +
        (keterangan ? `Ket: ${keterangan}\n` : '') +
        `\nBarang TIDAK dikembalikan. Komisi dikurangi.\n` +
        `Aksi ini tidak bisa dibatalkan.`
    )) return;

    const today = formatDateShort(new Date().toISOString().split('T')[0]);

    // 1. Kurangi bundle & total PO
    po.bundle = bundleSetelah;
    po.total = totalBaru;
    if (po.bundleDetail && bundleLama > 0 && bundleSetelah > 0) {
        po.bundleDetail.forEach(bd => {
            bd.qty = Math.max(1, Math.round((bd.qty || 1) * bundleSetelah / bundleLama));
        });
    }

    // 2. Kurangi cicilan yang BELUM lunas saja
    const cicilanBelum = po.cicilan.filter(c => c.status !== 'lunas' && c.status !== 'batal');
    const totalBelum = cicilanBelum.reduce((s, c) => s + (c.tagihan - (c.terbayar || 0)), 0);
    let sisaPengurangan = Math.min(tagihanDihapus, totalBelum);
    if (sisaPengurangan > 0 && cicilanBelum.length > 0) {
        cicilanBelum.forEach((c, idx) => {
            if (sisaPengurangan <= 0) return;
            const sisaC = c.tagihan - (c.terbayar || 0);
            const sisa_len = cicilanBelum.length - idx;
            const kurang = Math.min(sisaC, idx === cicilanBelum.length - 1 ? sisaPengurangan : Math.round(sisaPengurangan / sisa_len));
            c.tagihan = Math.max(0, c.tagihan - kurang);
            c.sisaTagihan = Math.max(0, c.tagihan - (c.terbayar || 0));
            sisaPengurangan -= kurang;
            if (c.tagihan === 0) c.status = 'batal';
            else if ((c.terbayar || 0) >= c.tagihan) { c.status = 'lunas'; c.sisaTagihan = 0; }
        });
    }

    // 3. Hitung ulang sisa PO
    po.sisa = po.cicilan
        .filter(c => c.status !== 'lunas' && c.status !== 'batal')
        .reduce((s, c) => s + (c.tagihan - (c.terbayar || 0)), 0);
    const semuaSelesai = po.cicilan.filter(c => c.status !== 'batal').every(c => c.status === 'lunas');
    if (semuaSelesai) { po.status = 'lunas'; po.sisa = 0; }
    else if (isFullMeninggal) po.status = 'meninggal';

    const kons = DB.konsumen.find(k => k.id === po.konsumenId || k.nama === po.konsumen);
    if (kons) kons.tagihan = Math.max(0, (kons.tagihan || 0) - tagihanDihapus);

    // 4. Kurangi komisi TANPA beban ke sales
    if (jml > 0) {
        const salesEnt = DB.entitas.find(e => e.peran === 'Sales' && e.nama === po.sales);
        if (salesEnt) {
            const potSales = Math.round((po.rateKomisiSales || DB.settings?.komisi_sales || 1150000) * jml);
            salesEnt.komisiKotor = Math.max(0, (salesEnt.komisiKotor || 0) - potSales);
            salesEnt.bundle = Math.max(0, (salesEnt.bundle || 0) - jml);
        }
        const negoEnt = DB.entitas.find(e => e.peran === 'Nego' && e.nama === po.nego);
        if (negoEnt) {
            const potNego = Math.round((po.rateKomisiNego || DB.settings?.komisi_nego || 300000) * jml);
            if (po.komisiNegoCair) negoEnt.komisiKotor = Math.max(0, (negoEnt.komisiKotor || 0) - potNego);
            else negoEnt.komisiPending = Math.max(0, (negoEnt.komisiPending || 0) - potNego);
            negoEnt.bundle = Math.max(0, (negoEnt.bundle || 0) - jml);
        }
        const kcEnt = DB.entitas.find(e => e.peran === 'Kepala Cabang' && e.nama === po.kc);
        if (kcEnt) {
            const potKc = Math.round((po.rateKomisiKc || DB.settings?.komisi_kc || 5000) * jml);
            if (po.komisiKcCair) kcEnt.komisiKotor = Math.max(0, (kcEnt.komisiKotor || 0) - potKc);
            else kcEnt.komisiPending = Math.max(0, (kcEnt.komisiPending || 0) - potKc);
            kcEnt.bundle = Math.max(0, (kcEnt.bundle || 0) - jml);
        }
        po.cicilan.forEach(c => {
            if (c.komisiDiberi) {
                const collEnt = DB.entitas.find(e => e.peran === 'Collector' && e.nama === (c.collector || po.coll));
                if (collEnt) {
                    const rateC = collEnt.komisiRate || DB.settings?.komisi_coll || 1500;
                    collEnt.komisiKotor = Math.max(0, (collEnt.komisiKotor || 0) - (rateC * jml));
                }
            }
        });
    }

    // 5. Log meninggal
    if (!DB.meninggalLog) DB.meninggalLog = [];
    const logEntry = {
        id: Date.now(), tanggal: today,
        po: poId, konsumen: po.konsumen,
        jumlah: jml, nilaiPerBundle, nilaiTotal: tagihanDihapus,
        sales: po.sales, nego: po.nego, keterangan
    };
    DB.meninggalLog.unshift(logEntry);
    if (!po.meninggalLog) po.meninggalLog = [];
    po.meninggalLog.push(logEntry);

    saveDB();
    closeModal('modal-meninggal');
    toast(`Meninggal PO ${poId}: ${jml} bundle, tagihan dihapus ${fmtRpFull(tagihanDihapus)}`, 'warn');
    addAudit(`Meninggal PO ${poId}: ${jml} bundle, tagihan dihapus ${fmtRpFull(tagihanDihapus)}${keterangan ? ' (' + keterangan + ')' : ''}`);
    renderPOList();
    renderPODetail(poId);
    renderEntitasList();
}

/**
 * Saat PO dipilih — render baris komponen barang dari inventory.
 */
function onLossPOChange() {
    const poId = document.getElementById('loss-po')?.value;
    const infoEl = document.getElementById('loss-po-info');
    const container = document.getElementById('loss-items-container');
    const previewEl = document.getElementById('loss-preview');
    const bebanWrap = document.getElementById('loss-total-beban');
    if (!poId) {
        if (container) container.innerHTML = '';
        return;
    }
    const po = DB.poList.find(p => p.id === poId);
    if (!po) return;

    if (infoEl) {
        infoEl.innerHTML = `
            <strong style="color:var(--text2)">${po.id}</strong> \u2014 ${po.konsumen} &nbsp;|&nbsp;
            Bundle: <strong>${po.bundle}</strong> &nbsp;|&nbsp;
            Total: <strong>${fmtRpFull(po.total)}</strong> &nbsp;|&nbsp;
            Sales: <strong>${po.sales}</strong>`;
        infoEl.style.display = 'block';
    }

    const items = getLossItemOptions(po);
    if (!items.length) {
        container.innerHTML = `<div style="font-size:12px;color:var(--text4);padding:8px 0">Tidak ada komponen barang terdaftar di inventory untuk PO ini.</div>`;
        if (bebanWrap) bebanWrap.style.display = 'none';
        return;
    }

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 120px 62px 90px 28px;gap:6px;align-items:center;margin-bottom:6px;padding:0 4px">
            <div style="font-size:11px;color:var(--text4)">Barang (dari inventory)</div>
            <div style="font-size:11px;color:var(--text4)">Harga/unit</div>
            <div style="font-size:11px;color:var(--text4)">Hilang</div>
            <div style="font-size:11px;color:var(--text4)">Kembali (Good / Reject)</div>
            <div></div>
        </div>
        ${items.map(item => `
        <div class="loss-item-row"
             style="display:grid;grid-template-columns:1fr 120px 62px 90px 28px;gap:6px;align-items:center;padding:8px 10px;background:var(--bg);border:0.5px solid var(--border);border-radius:8px;margin-bottom:5px"
             data-inv-id="${item.invId}"
             data-max="${item.maxUnit}"
             data-qty-per-bundle="${item.qtyPerBundle}">
            <div>
                <div style="font-size:13px;color:var(--text2);font-weight:500">${item.nama}</div>
                <div style="font-size:10px;color:var(--text4)">Maks ${item.maxUnit} unit di PO \u00b7 ${item.bundleNama}</div>
            </div>
            <input class="input loss-harga" type="text"
                value="${item.harga ? fmtRpFull(item.harga) : ''}"
                placeholder="Rp 0"
                style="font-size:12px;padding:5px 8px;${item.harga ? 'color:#5DCAA5' : ''}"
                onblur="this.value=this.value?fmtRpFull(parseRp(this.value)):'';onLossCalc()"
                onfocus="var v=parseRp(this.value);this.value=v||''"
                oninput="onLossCalc()" />
            <input class="input loss-hilang" type="number" value="0" min="0" max="${item.maxUnit}"
                style="font-size:12px;padding:5px 8px;text-align:center"
                oninput="onLossCalc()" />
            <div style="display:flex;flex-direction:column;gap:3px">
                <input class="input loss-kembali-good" type="number" value="0" min="0" max="${item.maxUnit}"
                    style="font-size:11px;padding:3px 6px;text-align:center;border-color:#0F6E56"
                    title="Kembali kondisi Good"
                    oninput="onLossCalc()" placeholder="Good" />
                <input class="input loss-kembali-reject" type="number" value="0" min="0" max="${item.maxUnit}"
                    style="font-size:11px;padding:3px 6px;text-align:center;border-color:#501313;color:#F09595"
                    title="Kembali kondisi Reject"
                    oninput="onLossCalc()" placeholder="Reject" />
            </div>
            <div style="font-size:9px;color:var(--text4);text-align:center;line-height:2">
                <div style="color:#5DCAA5">Good</div>
                <div style="color:#F09595">Reject</div>
            </div>
        </div>`).join('')}`;

    if (previewEl) previewEl.style.display = 'none';
    if (bebanWrap) bebanWrap.style.display = 'none';
}

/**
 * Hitung preview real-time setiap ada perubahan input.
 */
function onLossCalc() {
    const poId = document.getElementById('loss-po')?.value;
    const previewEl = document.getElementById('loss-preview');
    const bebanWrap = document.getElementById('loss-total-beban');
    const bebanValEl = document.getElementById('loss-beban-val');
    if (!poId) return;
    const po = DB.poList.find(p => p.id === poId);
    if (!po) return;

    const rows = document.querySelectorAll('.loss-item-row');
    let totalBeban = 0;
    let anyLoss = false;
    const detailLines = [];
    let bundleDikurangi = 0;

    rows.forEach(row => {
        const invId = parseInt(row.dataset.invId);
        const qtyPerBundle = parseInt(row.dataset.qtyPerBundle) || 1;
        const harga = parseRp(row.querySelector('.loss-harga')?.value || '');
        const hilang = parseInt(row.querySelector('.loss-hilang')?.value) || 0;
        const kembaliGood = parseInt(row.querySelector('.loss-kembali-good')?.value) || 0;
        const kembaliReject = parseInt(row.querySelector('.loss-kembali-reject')?.value) || 0;
        const kembaliTotal = kembaliGood + kembaliReject;
        const netLoss = Math.max(0, hilang);
        if (hilang > 0 || kembaliTotal > 0) {
            anyLoss = true;
            const inv = DB.inventory.find(i => i.id === invId);
            if (netLoss > 0) {
                totalBeban += harga * netLoss;
                detailLines.push({ nama: inv?.nama || '?', netLoss, harga, subtotal: harga * netLoss, qtyPerBundle, kembaliGood, kembaliReject, kembaliTotal });
                const b = Math.floor(netLoss / qtyPerBundle);
                if (b > bundleDikurangi) bundleDikurangi = b;
            } else if (kembaliTotal > 0) {
                detailLines.push({ nama: inv?.nama || '?', netLoss: 0, harga: 0, subtotal: 0, qtyPerBundle, kembaliGood, kembaliReject, kembaliTotal, returnOnly: true });
            }
        }
    });

    if (bebanWrap) {
        bebanWrap.style.display = anyLoss ? 'block' : 'none';
        if (bebanValEl) bebanValEl.textContent = fmtRpFull(totalBeban);
    }

    if (!anyLoss || !previewEl) {
        if (previewEl) previewEl.style.display = 'none';
        return;
    }

    const bundleSetelah = Math.max(0, po.bundle - bundleDikurangi);
    const komisiLama = po.bundle * (po.rateKomisiSales || DB.settings.komisi_sales);
    const komisiBaru = bundleSetelah * (po.rateKomisiSales || DB.settings.komisi_sales);

    previewEl.style.display = 'block';
    previewEl.innerHTML = `
        <div style="font-size:11px;color:var(--accent2);margin-bottom:8px;font-weight:500;text-transform:uppercase;letter-spacing:.4px">\u26a0 Preview Dampak Loss</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px;margin-bottom:8px">
            ${detailLines.map(d => `
            <div style="color:var(--text4)">${d.returnOnly
            ? d.nama + ' (recovery: ' + (d.kembaliGood > 0 ? '+' + d.kembaliGood + ' good' : '') + (d.kembaliGood > 0 && d.kembaliReject > 0 ? ', ' : '') + (d.kembaliReject > 0 ? '+' + d.kembaliReject + ' reject' : '') + ')'
            : d.nama + ' ×' + d.netLoss + ' hilang' + (d.kembaliTotal > 0 ? ' — kembali: ' + (d.kembaliGood > 0 ? d.kembaliGood + 'g' : '') + (d.kembaliReject > 0 ? '+' + d.kembaliReject + 'r' : '') : '')
        }</div>
            <div style="color:#F09595;font-weight:500">beban ${fmtRpFull(d.subtotal)}</div>`).join('')}
        </div>
        <div style="border-top:0.5px solid var(--border);padding-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px">
            <div style="color:var(--text4)">Bundle PO setelah loss</div>
            <div style="color:#FAC775;font-weight:500">${po.bundle} \u2192 ${bundleSetelah} bundle (−${bundleDikurangi})</div>
            <div style="color:var(--text4)">Komisi Sales</div>
            <div style="color:#5DCAA5;font-weight:500">${fmtRpFull(komisiLama)} \u2192 ${fmtRpFull(komisiBaru)} <span style="color:#F09595">(−${fmtRpFull(komisiLama - komisiBaru)})</span></div>
            <div style="color:var(--text4);font-weight:600;padding-top:6px;border-top:0.5px solid var(--border);margin-top:4px">Total beban ganti rugi Sales</div>
            <div style="color:#F09595;font-weight:700;font-size:13px;padding-top:6px;border-top:0.5px solid var(--border);margin-top:4px">${fmtRpFull(totalBeban)}</div>
        </div>`;
}

/**
 * Submit proses loss.
 */
function submitLoss() {
    const poId = document.getElementById('loss-po')?.value;
    if (!poId) { toast('Pilih PO terlebih dahulu', 'error'); return; }
    const po = DB.poList.find(p => p.id === poId);
    if (!po) { toast('PO tidak ditemukan', 'error'); return; }
    const keterangan = document.getElementById('loss-keterangan')?.value.trim() || '';

    const rows = document.querySelectorAll('.loss-item-row');
    const lossItems = [];
    let valid = true;

    rows.forEach(row => {
        const invId = parseInt(row.dataset.invId);
        const qtyPerBundle = parseInt(row.dataset.qtyPerBundle) || 1;
        const maxUnit = parseInt(row.dataset.max) || 0;
        const harga = parseRp(row.querySelector('.loss-harga')?.value || '');
        const hilang = parseInt(row.querySelector('.loss-hilang')?.value) || 0;
        const kembaliGood = parseInt(row.querySelector('.loss-kembali-good')?.value) || 0;
        const kembaliReject = parseInt(row.querySelector('.loss-kembali-reject')?.value) || 0;
        const kembaliTotal = kembaliGood + kembaliReject;
        if (hilang > maxUnit) { toast('Unit hilang melebihi stok di PO', 'error'); valid = false; return; }
        if (kembaliTotal > maxUnit) { toast('Unit kembali melebihi stok di PO', 'error'); valid = false; return; }
        if (hilang > 0 || kembaliTotal > 0) {
            lossItems.push({ invId, qtyPerBundle, harga, hilang, kembaliGood, kembaliReject, kembaliTotal, netLoss: Math.max(0, hilang) });
        }
    });

    if (!valid) return;
    if (!lossItems.length) { toast('Isi minimal 1 barang: masukkan jumlah hilang atau kembali', 'error'); return; }

    // Harga wajib hanya jika ada yang benar-benar hilang (netLoss > 0)
    const missingHarga = lossItems.find(i => i.netLoss > 0 && (!i.harga || i.harga <= 0));
    if (missingHarga) {
        const inv = DB.inventory.find(x => x.id === missingHarga.invId);
        toast(`Harga/unit wajib diisi untuk: ${inv?.nama || 'barang'}`, 'error');
        return;
    }

    // Hitung bundle dikurangi
    let bundleDikurangi = 0;
    lossItems.forEach(item => {
        const b = Math.floor(item.netLoss / item.qtyPerBundle);
        if (b > bundleDikurangi) bundleDikurangi = b;
    });
    const bundleLama = po.bundle;
    const bundleSetelah = Math.max(0, bundleLama - bundleDikurangi);
    const totalBeban = lossItems.reduce((s, i) => s + i.harga * i.netLoss, 0);

    const konfirmMsg = `Konfirmasi proses loss PO ${poId}?\n\n` +
        lossItems.map(i => {
            const inv = DB.inventory.find(x => x.id === i.invId);
            const kembaliInfo = [
                i.kembaliGood > 0 ? `${i.kembaliGood} good` : '',
                i.kembaliReject > 0 ? `${i.kembaliReject} reject` : ''
            ].filter(Boolean).join(', ');
            return `\u2022 ${inv?.nama || '?'}: hilang ${i.hilang}${kembaliInfo ? ', kembali (' + kembaliInfo + ')' : ''}, net loss ${i.netLoss} unit \u00d7 ${fmtRpFull(i.harga)}`;
        }).join('\n') +
        `\n\nBundle dikurangi: ${bundleLama} \u2192 ${bundleSetelah}\n` +
        `Beban ganti rugi Sales: ${fmtRpFull(totalBeban)}\n\n` +
        `Aksi ini tidak dapat dibatalkan.`;

    if (!confirm(konfirmMsg)) return;

    // ── 1. Kembalikan stok unit yang berhasil di-recover (good & reject terpisah) ──
    lossItems.forEach(item => {
        const inv = DB.inventory.find(i => i.id === item.invId);
        if (!inv) return;
        const today = formatDateShort(new Date().toISOString().split('T')[0]);

        function addStok(kondisi, qty) {
            if (qty <= 0) return;
            if (kondisi === inv.kondisi) {
                inv.stok += qty;
            } else {
                const target = DB.inventory.find(i => i.nama === inv.nama && i.kondisi === kondisi);
                if (target) {
                    target.stok += qty;
                } else {
                    DB.inventory.push({
                        id: DB.nextInvId++,
                        nama: inv.nama,
                        kategori: inv.kategori || 'jual',
                        kondisi,
                        stok: qty,
                        min: 0,
                        harga: inv.harga || 0,
                        terakhir: today
                    });
                }
            }
        }

        addStok('good', item.kembaliGood || 0);
        addStok('reject', item.kembaliReject || 0);
        item.kondisiKembali = [
            (item.kembaliGood > 0) ? item.kembaliGood + ' good' : '',
            (item.kembaliReject > 0) ? item.kembaliReject + ' reject' : ''
        ].filter(Boolean).join(', ') || '-';
    });

    // ── 2. Kurangi bundle & nilai PO ──
    const hargaPerBundle = bundleLama > 0 ? Math.round(po.total / bundleLama) : 0;
    const penguranganNilai = hargaPerBundle * bundleDikurangi;
    const nilaiBaru = Math.max(0, po.total - penguranganNilai);
    po.bundle = bundleSetelah;
    po.total = nilaiBaru;

    if (po.bundleDetail && bundleDikurangi > 0 && bundleLama > 0) {
        po.bundleDetail.forEach(bd => {
            bd.qty = Math.max(1, Math.round((bd.qty || 1) * bundleSetelah / bundleLama));
        });
    }

    // ── 3. Redistribute pengurangan ke SEMUA termin (termasuk yang sudah lunas) ──
    if (bundleDikurangi > 0) {
        const totalCicilanAktif = po.cicilan.filter(c => c.status !== 'batal');
        const totalTagihanLama = totalCicilanAktif.reduce((s, c) => s + c.tagihan, 0);
        const penguranganTotal = totalTagihanLama - nilaiBaru; // total yang perlu dikurangi
        const jmlAktif = totalCicilanAktif.length;

        if (jmlAktif > 0 && penguranganTotal > 0) {
            const penguranganPerTermin = Math.round(penguranganTotal / jmlAktif);
            let sisaPengurangan = penguranganTotal;
            const kons = DB.konsumen.find(k => k.id === po.konsumenId || k.nama === po.konsumen);

            totalCicilanAktif.forEach((c, idx) => {
                const kurang = idx === jmlAktif - 1 ? sisaPengurangan : penguranganPerTermin;
                sisaPengurangan -= kurang;
                const tagihanBaru = Math.max(0, c.tagihan - kurang);
                const sudahBayar = c.terbayar || 0;

                if (c.status === 'lunas') {
                    // Termin sudah lunas — tagihan berkurang, selisih jadi kredit konsumen
                    const kelebihan = sudahBayar - tagihanBaru;
                    if (kelebihan > 0 && kons) {
                        kons.kreditSaldo = (kons.kreditSaldo || 0) + kelebihan;
                        if (!kons.kreditLog) kons.kreditLog = [];
                        kons.kreditLog.push({
                            tanggal: formatDateShort(new Date().toISOString().split('T')[0]),
                            jumlah: kelebihan,
                            ket: `Kelebihan bayar termin ${c.n} PO ${po.id} akibat loss adjustment`
                        });
                    }
                    c.tagihan = tagihanBaru;
                    c.terbayar = Math.min(sudahBayar, tagihanBaru);
                } else {
                    // Termin belum lunas — kurangi tagihan, update sisa
                    c.tagihan = tagihanBaru;
                    c.sisaTagihan = Math.max(0, tagihanBaru - sudahBayar);
                    if (tagihanBaru === 0) {
                        c.status = 'batal';
                    } else if (sudahBayar >= tagihanBaru) {
                        c.status = 'lunas';
                        c.terbayar = tagihanBaru;
                        c.sisaTagihan = 0;
                    } else if (sudahBayar > 0) {
                        c.status = 'kurang';
                    }
                }
            });
        }
    }

    // ── 4. Hitung ulang sisa PO ──
    po.sisa = po.cicilan
        .filter(c => c.status !== 'lunas' && c.status !== 'batal')
        .reduce((s, c) => s + (c.tagihan - (c.terbayar || 0)), 0);
    const semuaLunasLoss = po.cicilan.filter(c => c.status !== 'batal').every(c => c.status === 'lunas');
    if (semuaLunasLoss) { po.status = 'lunas'; po.sisa = 0; }
    const kons = DB.konsumen.find(k => k.id === po.konsumenId || k.nama === po.konsumen);
    if (kons) kons.tagihan = Math.max(0, po.sisa);

    // ── 5. Beban & penyesuaian komisi Sales ──
    const salesEntitas = DB.entitas.find(e => e.peran === 'Sales' && e.nama === po.sales);
    if (salesEntitas) {
        if (!salesEntitas.pengeluaranList) salesEntitas.pengeluaranList = [];
        lossItems.forEach(item => {
            if (item.netLoss <= 0) return;
            const inv = DB.inventory.find(i => i.id === item.invId);
            salesEntitas.pengeluaranList.push({
                id: Date.now() + item.invId,
                jenis: 'Ganti rugi loss',
                ket: `Loss PO ${poId} \u2014 ${inv?.nama || '?'} \u00d7${item.netLoss}${keterangan ? ' (' + keterangan + ')' : ''}`,
                jml: item.harga * item.netLoss,
                tipe: 'loss',
                poId
            });
        });
        salesEntitas.pengeluaran = salesEntitas.pengeluaranList.reduce((s, p) => s + p.jml, 0);
        if (bundleDikurangi > 0) {
            salesEntitas.bundle = Math.max(0, (salesEntitas.bundle || 0) - bundleDikurangi);
            salesEntitas.komisiKotor = salesEntitas.bundle * (po.rateKomisiSales || DB.settings.komisi_sales);
        }
    }

    // Kurangi komisi Nego dan KC jika bundle berkurang (pending atau cair)
    if (bundleDikurangi > 0) {
        const negoLoss = DB.entitas.find(e => e.peran === 'Nego' && e.nama === po.nego);
        if (negoLoss) {
            const potonganNego = (po.rateKomisiNego || DB.settings.komisi_nego || 300000) * bundleDikurangi;
            if (po.komisiNegoCair) {
                negoLoss.komisiKotor = Math.max(0, (negoLoss.komisiKotor || 0) - potonganNego);
            } else {
                negoLoss.komisiPending = Math.max(0, (negoLoss.komisiPending || 0) - potonganNego);
            }
            negoLoss.bundle = Math.max(0, (negoLoss.bundle || 0) - bundleDikurangi);
        }
        const kcLoss = DB.entitas.find(e => e.peran === 'Kepala Cabang' && e.nama === po.kc);
        if (kcLoss) {
            const potonganKc = (po.rateKomisiKc || DB.settings.komisi_kc || 5000) * bundleDikurangi;
            if (po.komisiKcCair) {
                kcLoss.komisiKotor = Math.max(0, (kcLoss.komisiKotor || 0) - potonganKc);
            } else {
                kcLoss.komisiPending = Math.max(0, (kcLoss.komisiPending || 0) - potonganKc);
            }
            kcLoss.bundle = Math.max(0, (kcLoss.bundle || 0) - bundleDikurangi);
        }
        // Collector — penyesuaian komisi per termin yang sudah diberi, proporsional bundle dikurangi
        po.cicilan.forEach(c => {
            if (c.komisiDiberi) {
                const collEnt = DB.entitas.find(e => e.peran === 'Collector' && e.nama === (c.collector || po.coll));
                if (collEnt) {
                    const rateC = collEnt.komisiRate || DB.settings.komisi_coll || 1500;
                    collEnt.komisiKotor = Math.max(0, (collEnt.komisiKotor || 0) - (rateC * bundleDikurangi));
                }
            }
        });
    }

    // ── 6. Log loss di PO ──
    if (!po.lossLog) po.lossLog = [];
    po.lossLog.push({
        id: Date.now(),
        tanggal: formatDateShort(new Date().toISOString().split('T')[0]),
        items: lossItems.map(i => ({
            invId: i.invId,
            nama: DB.inventory.find(x => x.id === i.invId)?.nama || '?',
            hilang: i.hilang,
            kembaliGood: i.kembaliGood || 0,
            kembaliReject: i.kembaliReject || 0,
            kembaliTotal: i.kembaliTotal || 0,
            kondisiKembali: i.kondisiKembali || '-',
            netLoss: i.netLoss,
            harga: i.harga,
            subtotal: i.harga * i.netLoss
        })),
        bundleDikurangi,
        bundleSetelah,
        totalBeban,
        keterangan
    });

    saveDB();
    closeModal('modal-loss');
    toast(`Loss PO ${poId}: ${bundleDikurangi} bundle dikurangi, beban sales ${fmtRpFull(totalBeban)}`, 'warn');
    addAudit(`Loss PO ${poId}: bundle ${bundleLama}\u2192${bundleSetelah}, beban sales ${fmtRpFull(totalBeban)}`);

    renderPOList();
    renderPODetail(poId);
    renderInventory();
    if (salesEntitas) renderEntitasList();
}

// ============================================================
// TRIP HARIAN — Operasional kendaraan harian
// ============================================================

/**
 * Buka modal trip baru, atau isi ulang untuk edit.
 * @param {string|null} tripId - jika diisi, mode edit
 */
function openTripModal(tripId) {
    // Isi dropdown supir
    const supirSel = document.getElementById('trip-supir');
    if (!supirSel) return;
    const supirList = DB.entitas.filter(e => e.peran === 'Supir' && e.aktifStatus);
    supirSel.innerHTML = supirList.length
        ? supirList.map(s => `<option value="${s.id}">${s.nama}</option>`).join('')
        : '<option value="">— Tidak ada supir terdaftar —</option>';

    // Isi chip sales (multi-select style)
    const checksEl = document.getElementById('trip-sales-checks');
    const salesList = DB.entitas.filter(e => e.peran === 'Sales' && e.aktifStatus);
    if (!window._tripSelectedSales) window._tripSelectedSales = new Set();
    window._tripSelectedSales.clear();
    checksEl.innerHTML = salesList.map(s => `
        <div class="trip-sales-chip" data-id="${s.id}"
            onclick="toggleTripSales(${s.id},'${s.nama}')">
            ${s.nama}
        </div>`).join('');

    // Reset fields
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trip-tanggal').value = today;
    document.getElementById('trip-sewa').value = '';
    document.getElementById('trip-bensin').value = '';
    document.getElementById('trip-upah-supir').value = '';
    document.getElementById('trip-lain').value = '';
    document.getElementById('trip-ket').value = '';
    document.getElementById('trip-preview').style.display = 'none';

    // Reset jam berangkat
    const tripJamEl = document.getElementById('trip-jam');
    if (tripJamEl) tripJamEl.value = '1';

    // Mode edit
    if (tripId) {
        const trip = DB.tripList.find(t => t.id === tripId);
        if (trip) {
            document.getElementById('trip-tanggal').value = trip.tanggalRaw || today;
            if (supirSel) supirSel.value = trip.supirId;
            document.getElementById('trip-sewa').value = trip.sewa ? fmtRpFull(trip.sewa) : '';
            document.getElementById('trip-bensin').value = trip.bensin ? fmtRpFull(trip.bensin) : '';
            document.getElementById('trip-upah-supir').value = trip.upahSupir ? fmtRpFull(trip.upahSupir) : '';
            document.getElementById('trip-lain').value = trip.lain ? fmtRpFull(trip.lain) : '';
            document.getElementById('trip-ket').value = trip.ket || '';
            if (tripJamEl && trip.jam) tripJamEl.value = trip.jam;
            // Re-select chips yang dulu dipilih
            (trip.salesIds || []).forEach(sid => {
                window._tripSelectedSales.add(sid);
                const chip = checksEl.querySelector(`[data-id="${sid}"]`);
                if (chip) chip.classList.add('selected');
            });
            _updateTripSalesLabel();
            // Isi tujuan jika ada
            const trip2 = DB.tripList.find(t => t.id === tripId);
            if (trip2?.tujuan) document.getElementById('trip-tujuan').value = trip2.tujuan || '';
        }
    }

    // Simpan mode di modal
    document.getElementById('modal-trip').dataset.editId = tripId || '';
    onTripCalc();
    openModal('modal-trip');
    // Apply searchable select ke supir
    setTimeout(() => makeSearchableSelect(document.getElementById('trip-supir')), 50);
}

/**
 * Toggle pilihan sales pada chip.
 */
function toggleTripSales(id, nama) {
    if (!window._tripSelectedSales) window._tripSelectedSales = new Set();
    const chip = document.querySelector(`.trip-sales-chip[data-id="${id}"]`);
    if (window._tripSelectedSales.has(id)) {
        window._tripSelectedSales.delete(id);
        if (chip) chip.classList.remove('selected');
    } else {
        window._tripSelectedSales.add(id);
        if (chip) chip.classList.add('selected');
    }
    _updateTripSalesLabel();
    onTripCalc();
}

function _updateTripSalesLabel() {
    const el = document.getElementById('trip-sales-selected');
    if (!el) return;
    const ids = [...(window._tripSelectedSales || [])];
    if (!ids.length) { el.textContent = 'Belum ada sales dipilih'; return; }
    const names = ids.map(id => DB.entitas.find(e => e.id === id)?.nama || '?');
    el.textContent = `${ids.length} sales dipilih: ${names.join(', ')}`;
}

/**
 * Hitung preview split biaya real-time.
 */
function onTripCalc() {
    const sewa = parseRp(document.getElementById('trip-sewa')?.value || '');
    const bensin = parseRp(document.getElementById('trip-bensin')?.value || '');
    const upah = parseRp(document.getElementById('trip-upah-supir')?.value || '');
    const lain = parseRp(document.getElementById('trip-lain')?.value || '');
    const total = sewa + bensin + upah + lain;

    const checked = [...(window._tripSelectedSales || [])].map(id => ({ value: id }));
    const previewEl = document.getElementById('trip-preview');
    const rowsEl = document.getElementById('trip-preview-rows');

    if (!previewEl || !rowsEl) return;

    if (total === 0 || checked.length === 0) {
        previewEl.style.display = 'none';
        return;
    }

    const perSales = Math.ceil(total / checked.length);

    rowsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:8px">
            <span style="color:var(--text4)">Sewa mobil</span>
            <span style="color:var(--text2)">${fmtRpFull(sewa)}</span>
            <span style="color:var(--text4)">Bensin</span>
            <span style="color:var(--text2)">${fmtRpFull(bensin)}</span>
            <span style="color:var(--text4)">Upah supir</span>
            <span style="color:var(--text2)">${fmtRpFull(upah)}</span>
            ${lain > 0 ? `<span style="color:var(--text4)">Lain-lain</span><span style="color:var(--text2)">${fmtRpFull(lain)}</span>` : ''}
        </div>
        <div style="border-top:0.5px solid var(--border);padding-top:8px;margin-bottom:8px;display:flex;justify-content:space-between">
            <span style="color:var(--text4);font-weight:500">Total biaya</span>
            <span style="color:#F09595;font-weight:600">${fmtRpFull(total)}</span>
        </div>
        <div style="font-size:11px;color:var(--text4);margin-bottom:6px">Dibagi rata ke ${checked.length} sales:</div>
        ${checked.map(cb => {
        const ent = DB.entitas.find(e => e.id === parseInt(cb.value));
        return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border2)">
                <span style="color:var(--text2)">${ent?.nama || '?'}</span>
                <span style="color:#F09595;font-weight:500">&#8722; ${fmtRpFull(perSales)}</span>
            </div>`;
    }).join('')}`;

    previewEl.style.display = 'block';
}

/**
 * Simpan trip dan push pengeluaran ke masing-masing sales.
 */
function submitTrip() {
    const tanggalRaw = document.getElementById('trip-tanggal')?.value;
    if (!tanggalRaw) { toast('Tanggal wajib diisi', 'error'); return; }

    const supirId = parseInt(document.getElementById('trip-supir')?.value) || null;
    const supir = supirId ? DB.entitas.find(e => e.id === supirId) : null;

    const sewa = parseRp(document.getElementById('trip-sewa')?.value || '');
    const bensin = parseRp(document.getElementById('trip-bensin')?.value || '');
    const upah = parseRp(document.getElementById('trip-upah-supir')?.value || '');
    const lain = parseRp(document.getElementById('trip-lain')?.value || '');
    const total = sewa + bensin + upah + lain;
    const ket = document.getElementById('trip-ket')?.value.trim() || '';

    const salesIds = [...(window._tripSelectedSales || [])];

    if (total <= 0) { toast('Isi minimal 1 komponen biaya', 'error'); return; }
    if (salesIds.length === 0) { toast('Pilih minimal 1 sales yang ikut', 'error'); return; }

    const perSales = Math.ceil(total / salesIds.length);
    const tanggal = formatDateShort(tanggalRaw);
    const editId = document.getElementById('modal-trip')?.dataset.editId;
    const isEdit = !!editId;

    // Jika edit — hapus pengeluaran lama dulu
    if (isEdit) {
        const old = DB.tripList.find(t => t.id === editId);
        if (old) {
            (old.salesIds || []).forEach(sid => {
                const ent = DB.entitas.find(e => e.id === sid);
                if (ent) {
                    ent.pengeluaranList = (ent.pengeluaranList || []).filter(p => p.tripId !== editId);
                    ent.pengeluaran = ent.pengeluaranList.reduce((s, p) => s + p.jml, 0);
                }
            });
            DB.tripList = DB.tripList.filter(t => t.id !== editId);
        }
    }

    const tripId = isEdit ? editId : 'TRIP-' + Date.now();

    // Simpan trip
    const newTrip = {
        id: tripId,
        tanggal, tanggalRaw,
        supirId, supirNama: supir?.nama || '—',
        salesIds,
        salesNama: salesIds.map(sid => DB.entitas.find(e => e.id === sid)?.nama || '?'),
        jam: parseInt(document.getElementById('trip-jam')?.value) || 1,
        tujuan: document.getElementById('trip-tujuan')?.value.trim() || '',
        sewa, bensin, upahSupir: upah, lain,
        total, perSales, ket
    };
    if (!DB.tripList) DB.tripList = [];
    DB.tripList.unshift(newTrip);

    // Push pengeluaran ke masing-masing sales
    const komponenKet = [
        sewa > 0 ? `Sewa ${fmtRpFull(sewa)}` : '',
        bensin > 0 ? `Bensin ${fmtRpFull(bensin)}` : '',
        upah > 0 ? `Supir ${fmtRpFull(upah)}` : '',
        lain > 0 ? `Lain ${fmtRpFull(lain)}` : '',
    ].filter(Boolean).join(', ');

    salesIds.forEach(sid => {
        const ent = DB.entitas.find(e => e.id === sid);
        if (!ent) return;
        if (!ent.pengeluaranList) ent.pengeluaranList = [];
        ent.pengeluaranList.push({
            id: Date.now() + sid,
            tripId,
            jenis: 'Operasional',
            tipe: 'operasional',
            ket: `Trip ${tanggal}${ket ? ' \u2014 ' + ket : ''} (${komponenKet}) \u00f7 ${salesIds.length} sales`,
            jml: perSales
        });
        ent.pengeluaran = ent.pengeluaranList.reduce((s, p) => s + p.jml, 0);
    });

    // Upah supir ke entitas supir (komisi)
    if (supir && upah > 0) {
        supir.komisiKotor = (supir.komisiKotor || 0) + upah;
    }

    saveDB();
    closeModal('modal-trip');
    toast(`Trip ${tanggal} berhasil dicatat — biaya ${fmtRpFull(total)} dibagi ${salesIds.length} sales`);
    addAudit(`Trip ${tanggal}: ${fmtRpFull(total)}, ${salesIds.length} sales, supir ${supir?.nama || '—'}`);
    renderTripPage();
    renderEntitasDetail(DB.selectedEntitas);
}

/**
 * Hapus trip dan rollback pengeluaran sales.
 */
function hapusTrip(tripId) {
    const trip = DB.tripList.find(t => t.id === tripId);
    if (!trip) return;
    if (!confirm(`Hapus trip ${trip.tanggal}?\nPengeluaran sales terkait akan dihapus.`)) return;

    (trip.salesIds || []).forEach(sid => {
        const ent = DB.entitas.find(e => e.id === sid);
        if (ent) {
            ent.pengeluaranList = (ent.pengeluaranList || []).filter(p => p.tripId !== tripId);
            ent.pengeluaran = ent.pengeluaranList.reduce((s, p) => s + p.jml, 0);
        }
    });

    DB.tripList = DB.tripList.filter(t => t.id !== tripId);
    saveDB();
    toast('Trip berhasil dihapus', 'warn');
    addAudit(`Hapus trip ${trip.tanggal}`);
    renderTripPage();
}

// ── Hapus Pengeluaran Entitas ──────────────────────────────────
function hapusPengeluaran(entitasId, pengeluaranId) {
    const e = DB.entitas.find(x => x.id === entitasId);
    if (!e) return;
    const p = e.pengeluaranList.find(x => x.id === pengeluaranId);
    if (!p) return;
    konfirmasiHapus(
        'Hapus Pengeluaran',
        `Hapus pengeluaran "${p.jenis}" (${fmtRpFull(p.jml)})?\n\nKomisi akan dikembalikan sebesar ${fmtRpFull(p.jml)}.`,
        () => {
            e.pengeluaranList = e.pengeluaranList.filter(x => x.id !== pengeluaranId);
            e.pengeluaran = e.pengeluaranList.reduce((s, x) => s + x.jml, 0);
            // Rollback komisi yang sudah dipotong
            e.komisiKotor = (e.komisiKotor || 0) + p.jml;
            saveDB();
            toast(`Pengeluaran dihapus, komisi ${e.nama} dikembalikan ${fmtRpFull(p.jml)}`);
            addAudit(`Hapus pengeluaran ${e.nama}: ${p.jenis} → rollback komisi ${fmtRpFull(p.jml)}`);
            renderEntitasDetail(entitasId);
            renderEntitasList();
        }
    );
}
// ============================================================
// RESET SEMUA DATA — Zona Bahaya
// ============================================================
async function resetSemuaData() {
    const ok = confirm(
        '⚠️ RESET SEMUA DATA?\n\n' +
        'Ini akan menghapus PERMANEN:\n' +
        '• Semua PO & cicilan\n' +
        '• Semua konsumen\n' +
        '• Semua entitas (Sales, Nego, Collector)\n' +
        '• Seluruh inventory & riwayat\n' +
        '• Trip, retur, loss log, audit log\n\n' +
        'Yang TETAP disimpan:\n' +
        '• Settings & konfigurasi perusahaan\n' +
        '• Bundle Definition (paket produk)\n\n' +
        'Server akan otomatis backup data sebelum reset.\n\n' +
        'Aksi ini TIDAK BISA DIBATALKAN. Lanjutkan?'
    );
    if (!ok) return;

    const ok2 = confirm('Konfirmasi terakhir: Hapus semua data transaksi sekarang?');
    if (!ok2) return;

    try {
        toast('Mereset data...', 'warn');
        const res = await fetch('/api/reset', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
            toast('✅ Reset berhasil! Halaman akan dimuat ulang...', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            toast('❌ Reset gagal: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (err) {
        toast('Koneksi server error: ' + err.message, 'error');
        console.error('[Reset]', err);
    }
}