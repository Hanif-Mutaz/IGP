// ============================================================
// Distrib.App — Frontend Data Layer
// Berisi: DB global, loadDB, saveDB, utilitas format/parse,
//         audit log, auto-backup, cek telat
// Di-load pertama sebelum ui.js dan features.js
// ============================================================

// ── Global DB object (akan diisi oleh loadDB dari server) ────
let DB = {};

// ── Format Rupiah (ringkas, misal "Rp 5,8 Jt") ──────────────
function fmtRp(n) {
    if (isNaN(n) || n === null || n === undefined) return 'Rp 0';
    const abs = Math.abs(Math.round(n));
    if (abs >= 1000000000) {
        const v = (abs / 1000000000);
        const s = v % 1 === 0 ? v.toFixed(0) : v % 0.1 === 0 ? v.toFixed(1) : v.toFixed(2).replace(/\.?0+$/, '');
        return (n < 0 ? '-' : '') + 'Rp ' + s + ' M';
    }
    if (abs >= 1000000) {
        const v = (abs / 1000000);
        const s = v % 1 === 0 ? v.toFixed(0) : v % 0.1 === 0 ? v.toFixed(1) : v.toFixed(2).replace(/0+$/, '');
        return (n < 0 ? '-' : '') + 'Rp ' + s + ' Jt';
    }
    if (abs >= 1000) {
        const v = (abs / 1000);
        const s = v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.?0+$/, '');
        return (n < 0 ? '-' : '') + 'Rp ' + s + ' Rb';
    }
    return (n < 0 ? '-' : '') + 'Rp ' + abs.toLocaleString('id-ID');
}

// ── Format Rupiah (penuh, misal "Rp 5.800.000") ──────────────
function fmtRpFull(n) {
    if (isNaN(n) || n === null || n === undefined) return 'Rp 0';
    const abs = Math.abs(Math.round(n));
    return (n < 0 ? '-' : '') + 'Rp ' + abs.toLocaleString('id-ID');
}

// ── Parse Rupiah string → angka ──────────────────────────────
function parseRp(s) {
    if (!s) return 0;
    const cleaned = String(s).replace(/[Rr][Pp]?\s*/g, '').replace(/\./g, '').replace(/,/g, '').trim();
    return parseInt(cleaned) || 0;
}

// ── Format tanggal input (YYYY-MM-DD) → "DD Mon YYYY" ────────
function formatDateShort(isoOrDate) {
    if (!isoOrDate) return '';
    const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    let d;
    if (typeof isoOrDate === 'string') {
        const parts = isoOrDate.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
            d = new Date(isoOrDate);
        }
    } else {
        d = isoOrDate;
    }
    if (!d || isNaN(d.getTime())) return String(isoOrDate);
    return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Tambah entry audit log ────────────────────────────────────
function addAudit(msg) {
    if (!DB.auditLog) DB.auditLog = [];
    const now = new Date();
    DB.auditLog.unshift({
        ts: now.toISOString(),
        tgl: formatDateShort(now.toISOString().split('T')[0]),
        jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        msg
    });
    if (DB.auditLog.length > 500) DB.auditLog.length = 500;
}

// ── Load DB dari server ──────────────────────────────────────
async function loadDB() {
    const res = await fetch('/api/db');
    if (!res.ok) throw new Error(`Server error HTTP ${res.status}`);
    const data = await res.json();
    // Merge ke DB global agar referensi existing tidak putus
    Object.assign(DB, data);
    console.log('[DB] Load OK —', Object.keys(DB).length, 'keys');
}

// ── Save DB ke server (debounced 400ms) ──────────────────────
let _saveTimer = null;
function saveDB() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_doSave, 400);
}

async function _doSave() {
    try {
        const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(DB)
        });
        const data = await res.json();
        if (!data.ok) console.error('[DB] Save gagal:', data.error);
    } catch (err) {
        console.error('[DB] Save error:', err);
        if (typeof toast === 'function') toast('⚠ Gagal simpan data ke server', 'error');
    }
}

// ── Backup manual (tombol di Settings) ───────────────────────
async function backupDB() {
    try {
        const res = await fetch('/api/backup', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
            if (typeof toast === 'function') toast('Backup berhasil disimpan ✓', 'success');
            addAudit('Backup manual');
            saveDB();
        } else {
            if (typeof toast === 'function') toast('Backup gagal: ' + (data.error || ''), 'error');
        }
    } catch (err) {
        console.error('[Backup]', err);
        if (typeof toast === 'function') toast('Backup gagal — cek server', 'error');
    }
}

// ── Auto-backup harian (sekali per 24 jam) ───────────────────
function initAutoBackup() {
    const KEY = 'igp_last_backup';
    const last = localStorage.getItem(KEY);
    const now = Date.now();
    const ONE_DAY = 86400000;

    if (!last || now - parseInt(last) > ONE_DAY) {
        fetch('/api/backup', { method: 'POST' })
            .then(r => r.json())
            .then(d => {
                if (d.ok) {
                    localStorage.setItem(KEY, String(now));
                    addAudit('Auto-backup harian');
                    console.log('[AutoBackup] OK');
                }
            })
            .catch(err => console.warn('[AutoBackup] Gagal:', err));
    }
}

// ── Auto-detect cicilan telat saat startup ───────────────────
function initCekTelat() {
    if (!DB.poList) return;
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const bMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11 };
    let changed = false;

    DB.poList.forEach(p => {
        if (p.status === 'lunas' || p.status === 'retur') return;
        let adaTelat = false;

        p.cicilan.forEach(c => {
            if (c.status === 'lunas' || c.status === 'batal') return;
            const parts = (c.jatuh || '').split(' ');
            if (parts.length < 3) return;
            const bln = bMap[parts[1]];
            if (bln === undefined) return;
            const tglMs = new Date(parseInt(parts[2]), bln, parseInt(parts[0])).getTime();

            if (tglMs < todayMs) {
                if (c.status !== 'telat') { c.status = 'telat'; changed = true; }
                adaTelat = true;
            } else if (c.status === 'telat') {
                // Jatuh tempo belum lewat tapi sudah ditandai telat (misal tanggal dikoreksi)
                c.status = (c.terbayar && c.terbayar > 0) ? 'kurang' : 'belum';
                changed = true;
            }
        });

        const newStatus = adaTelat ? 'telat' : 'berjalan';
        if (p.status !== newStatus) { p.status = newStatus; changed = true; }
    });

    if (changed) {
        console.log('[initCekTelat] Status cicilan diperbarui');
        saveDB();
    }
}