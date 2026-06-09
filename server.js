// ============================================================
// Distrib.App — Local Server  (v2 — upgraded)
// Jalankan: node server.js
// ============================================================
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec, execSync, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Helpers ──────────────────────────────────────────────────
function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return getDefaultDB(); }
}

function writeDB(data) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

// ── GET semua data ────────────────────────────────────────────
app.get('/api/db', (req, res) => {
  res.json(readDB());
});

// ── SAVE semua data (dari frontend) ──────────────────────────
app.post('/api/db', (req, res) => {
  try {
    writeDB(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── EXPORT ENTITAS → Excel (Python + openpyxl) ───────────────
app.post('/api/export/entitas', (req, res) => {
  const scriptPath = path.join(__dirname, 'export_entitas.py');

  if (!fs.existsSync(scriptPath)) {
    return res.status(500).json({
      ok: false,
      error: 'export_entitas.py tidak ditemukan di folder app.'
    });
  }

  // ── Auto-detect perintah python ───────────────────────────
  let pythonCmd = 'python3';
  try {
    execSync('python3 --version', { stdio: 'ignore' });
  } catch {
    try {
      execSync('python --version', { stdio: 'ignore' });
      pythonCmd = 'python';
    } catch {
      return res.status(500).json({
        ok: false,
        error: 'Python tidak ditemukan. Install Python 3 dan pastikan ada di PATH.'
      });
    }
  }

  // ── Auto-install openpyxl jika belum ada ─────────────────
  try {
    execSync(`${pythonCmd} -c "import openpyxl"`, { stdio: 'ignore' });
  } catch {
    console.log('[Export] openpyxl tidak ada, mencoba install...');
    try {
      execSync(`${pythonCmd} -m pip install openpyxl --quiet`, { stdio: 'pipe' });
      console.log('[Export] openpyxl berhasil diinstall');
    } catch {
      return res.status(500).json({
        ok: false,
        error: 'openpyxl tidak ada dan gagal diinstall. Jalankan: pip install openpyxl'
      });
    }
  }

  // ── Filter DB berdasarkan bulan/tahun ─────────────────────
  const db = readDB();
  const { bulan, tahun, periode } = req.body;
  const filterEntitasNama = req.body.filterEntitasNama || null;
  const monitoringOnly = req.body.monitoringOnly || false;

  let filteredDB = { ...db };
  // Preserve encoded periode (starts with __) — jangan di-override oleh bulan+tahun
  const isEncodedPeriode = (periode || '').startsWith('__');
  let periodeLabel = periode || 'Semua Periode';

  const BULAN_MAP = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
    'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
    'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  };
  const BULAN_ABR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function matchTgl(tgl, bNum, tNum) {
    if (!tgl) return false;
    const parts = tgl.split(' ');
    if (parts.length === 3) {
      const m = BULAN_ABR.indexOf(parts[1]);
      const y = parseInt(parts[2]);
      if (bNum && tNum) return m === bNum && y === tNum;
      if (tNum) return y === tNum;
      return true;
    }
    const iso = tgl.split('-');
    if (iso.length === 3) {
      const y = parseInt(iso[0]), m = parseInt(iso[1]);
      if (bNum && tNum) return y === tNum && m === bNum;
      if (tNum) return y === tNum;
      return true;
    }
    return false;
  }

  if (bulan && tahun) {
    const bNum = BULAN_MAP[bulan] || parseInt(bulan);
    const tNum = parseInt(tahun);
    if (!isEncodedPeriode) periodeLabel = `${bulan} ${tahun}`;

    filteredDB.poList = (db.poList || []).filter(p => matchTgl(p.tanggal, bNum, tNum));
    filteredDB.tripList = (db.tripList || []).filter(t => matchTgl(t.tanggal || t.tanggalRaw, bNum, tNum));
    filteredDB.riwayatMasuk = (db.riwayatMasuk || []).filter(r => matchTgl(r.tanggal, bNum, tNum));

    const poIds = new Set(filteredDB.poList.map(p => p.id));
    filteredDB.entitas = (db.entitas || []).map(e => ({
      ...e, riwayatPO: (e.riwayatPO || []).filter(r => poIds.has(r.po || r.poId))
    }));

  } else if (tahun) {
    const tNum = parseInt(tahun);
    if (!isEncodedPeriode) periodeLabel = `Tahun ${tahun}`;

    filteredDB.poList = (db.poList || []).filter(p => matchTgl(p.tanggal, null, tNum));
    filteredDB.tripList = (db.tripList || []).filter(t => matchTgl(t.tanggal || t.tanggalRaw, null, tNum));
    filteredDB.riwayatMasuk = (db.riwayatMasuk || []).filter(r => matchTgl(r.tanggal, null, tNum));

    const poIds = new Set(filteredDB.poList.map(p => p.id));
    filteredDB.entitas = (db.entitas || []).map(e => ({
      ...e, riwayatPO: (e.riwayatPO || []).filter(r => poIds.has(r.po || r.poId))
    }));
  }

  const payload = JSON.stringify({
    db: filteredDB,
    periode: periodeLabel,
    ...(filterEntitasNama ? { filterEntitasNama } : {}),
    ...(monitoringOnly ? { monitoringOnly: true } : {})
  });
  const py = spawn(pythonCmd, [scriptPath]);
  const chunks = [];
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    py.kill('SIGTERM');
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'Export timeout — data terlalu besar atau Python hang' });
  }, 30000);

  py.stdout.on('data', d => chunks.push(d));
  py.stderr.on('data', d => console.error('[Export]', d.toString()));

  py.on('close', code => {
    clearTimeout(timeout);
    if (timedOut) return;
    if (code !== 0) {
      return res.status(500).json({ ok: false, error: `Python exit code ${code}` });
    }
    const buf = Buffer.concat(chunks);
    const safePeriode = periodeLabel.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const safeNama = filterEntitasNama ? filterEntitasNama.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : null;
    const filename = monitoringOnly ? 'Monitoring_Global_' + safePeriode + '.xlsx'
      : safeNama ? safeNama + '_' + safePeriode + '.xlsx'
        : 'laporan_' + safePeriode + '.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
    console.log(`[Export] ${filename} — ${buf.length} bytes`);
  });

  py.stdin.write(payload);
  py.stdin.end();
});

// ── EXPORT ENTITAS → PDF (Python + reportlab) ────────────────
app.post('/api/export/pdf', (req, res) => {
  const scriptPath = path.join(__dirname, 'export_entitas_pdf.py');

  if (!fs.existsSync(scriptPath)) {
    return res.status(500).json({
      ok: false,
      error: 'export_entitas_pdf.py tidak ditemukan di folder app.'
    });
  }

  let pythonCmd = 'python3';
  try {
    execSync('python3 --version', { stdio: 'ignore' });
  } catch {
    try {
      execSync('python --version', { stdio: 'ignore' });
      pythonCmd = 'python';
    } catch {
      return res.status(500).json({
        ok: false,
        error: 'Python tidak ditemukan. Install Python 3 dan pastikan ada di PATH.'
      });
    }
  }

  // Auto-install reportlab
  try {
    execSync(`${pythonCmd} -c "import reportlab"`, { stdio: 'ignore' });
  } catch {
    console.log('[PDF] reportlab tidak ada, mencoba install...');
    try {
      execSync(`${pythonCmd} -m pip install reportlab --quiet`, { stdio: 'pipe' });
      console.log('[PDF] reportlab berhasil diinstall');
    } catch {
      return res.status(500).json({
        ok: false,
        error: 'reportlab tidak ada dan gagal diinstall. Jalankan: pip install reportlab'
      });
    }
  }

  const db = readDB();
  const { bulan, tahun, periode } = req.body;
  const filterEntitasNama = req.body.filterEntitasNama || null;
  const monitoringOnly = req.body.monitoringOnly || false;

  let filteredDB = { ...db };
  const isEncodedPeriode = (periode || '').startsWith('__');
  let periodeLabel = periode || 'Semua Periode';

  const BULAN_MAP = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
    'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
    'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  };
  const BULAN_ABR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function matchTgl(tgl, bNum, tNum) {
    if (!tgl) return false;
    const parts = tgl.split(' ');
    if (parts.length === 3) {
      const m = BULAN_ABR.indexOf(parts[1]);
      const y = parseInt(parts[2]);
      if (bNum && tNum) return m === bNum && y === tNum;
      if (tNum) return y === tNum;
      return true;
    }
    const iso = tgl.split('-');
    if (iso.length === 3) {
      const y = parseInt(iso[0]), m = parseInt(iso[1]);
      if (bNum && tNum) return y === tNum && m === bNum;
      if (tNum) return y === tNum;
      return true;
    }
    return false;
  }

  if (bulan && tahun) {
    const bNum = BULAN_MAP[bulan] || parseInt(bulan);
    const tNum = parseInt(tahun);
    if (!isEncodedPeriode) periodeLabel = `${bulan} ${tahun}`;

    filteredDB.poList = (db.poList || []).filter(p => matchTgl(p.tanggal, bNum, tNum));
    filteredDB.tripList = (db.tripList || []).filter(t => matchTgl(t.tanggal || t.tanggalRaw, bNum, tNum));
    filteredDB.riwayatMasuk = (db.riwayatMasuk || []).filter(r => matchTgl(r.tanggal, bNum, tNum));

    const poIds = new Set(filteredDB.poList.map(p => p.id));
    filteredDB.entitas = (db.entitas || []).map(e => ({
      ...e, riwayatPO: (e.riwayatPO || []).filter(r => poIds.has(r.po || r.poId))
    }));
  } else if (tahun) {
    const tNum = parseInt(tahun);
    if (!isEncodedPeriode) periodeLabel = `Tahun ${tahun}`;

    filteredDB.poList = (db.poList || []).filter(p => matchTgl(p.tanggal, null, tNum));
    filteredDB.tripList = (db.tripList || []).filter(t => matchTgl(t.tanggal || t.tanggalRaw, null, tNum));
    filteredDB.riwayatMasuk = (db.riwayatMasuk || []).filter(r => matchTgl(r.tanggal, null, tNum));

    const poIds = new Set(filteredDB.poList.map(p => p.id));
    filteredDB.entitas = (db.entitas || []).map(e => ({
      ...e, riwayatPO: (e.riwayatPO || []).filter(r => poIds.has(r.po || r.poId))
    }));
  }

  const payload = JSON.stringify({
    db: filteredDB,
    periode: periodeLabel,
    ...(filterEntitasNama ? { filterEntitasNama } : {}),
    ...(monitoringOnly ? { monitoringOnly: true } : {})
  });

  const py = spawn(pythonCmd, [scriptPath]);
  const chunks = [];
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    py.kill('SIGTERM');
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'Export PDF timeout — data terlalu besar atau Python hang' });
  }, 30000);

  py.stdout.on('data', d => chunks.push(d));
  py.stderr.on('data', d => console.error('[PDF]', d.toString()));

  py.on('close', code => {
    clearTimeout(timeout);
    if (timedOut) return;
    if (code !== 0) {
      return res.status(500).json({ ok: false, error: `Python exit code ${code}` });
    }
    const buf = Buffer.concat(chunks);
    const safePeriode = periodeLabel.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const safeNama = filterEntitasNama
      ? filterEntitasNama.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : null;
    const filename = monitoringOnly ? `Monitoring_Global_${safePeriode}.pdf`
      : safeNama ? `${safeNama}_${safePeriode}.pdf`
        : `laporan_${safePeriode}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
    console.log(`[PDF] ${filename} — ${buf.length} bytes`);
  });

  py.stdin.write(payload);
  py.stdin.end();
});

// ── BACKUP manual & auto ──────────────────────────────────────
const BACKUP_DIR = path.join(__dirname, 'backup');
app.post('/api/backup', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
    const now = new Date();
    const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const folderBulan = `${BULAN[now.getMonth()]} ${now.getFullYear()}`;
    const monthDir = path.join(BACKUP_DIR, folderBulan);
    if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir);
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(monthDir, `backup_${ts}.json`);
    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, dest);

      // ── Rotasi: hapus file lama jika lebih dari 30 per bulan ──
      const MAX_BACKUP = 30;
      const files = fs.readdirSync(monthDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort(); // ascending — file lama di depan
      if (files.length > MAX_BACKUP) {
        const toDelete = files.slice(0, files.length - MAX_BACKUP);
        toDelete.forEach(f => {
          try { fs.unlinkSync(path.join(monthDir, f)); } catch { }
        });
        console.log(`[Backup] Rotasi: hapus ${toDelete.length} file lama di ${folderBulan}`);
      }

      res.json({ ok: true, file: dest });
    } else {
      res.json({ ok: false, error: 'db.json belum ada' });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── RESET DATA — hapus semua data transaksi, pertahankan settings & bundleDef ──
app.post('/api/reset', (req, res) => {
  try {
    // Backup otomatis sebelum reset
    const current = readDB();
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(BACKUP_DIR, `BEFORE_RESET_${ts}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(current, null, 2), 'utf8');
    console.log(`[Reset] Backup sebelum reset disimpan: ${backupFile}`);

    // Buat DB bersih — pertahankan settings, bundleDef, presets
    const freshDB = getDefaultDB();
    freshDB.settings = current.settings || freshDB.settings;
    freshDB.bundleDef = current.bundleDef || [];
    freshDB.presets = current.presets || freshDB.presets;
    freshDB.currentPreset = current.currentPreset ?? 0;

    writeDB(freshDB);
    console.log('[Reset] Semua data transaksi berhasil dihapus.');
    res.json({
      ok: true,
      backupFile,
      message: 'Semua data transaksi berhasil direset. Settings & bundle definition dipertahankan.'
    });
  } catch (e) {
    console.error('[Reset] Error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Root → index.html ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  ╔══════════════════════════════════╗');
  console.log('  ║       Distrib.App — Running      ║');
  console.log(`  ║   Buka browser: ${url.padEnd(18)}  ║`);
  console.log(`  ║   Port: ${String(PORT).padEnd(27)}║`);
  console.log('  ║   Ctrl+C untuk matikan server    ║');
  console.log('  ╚══════════════════════════════════╝');
  console.log('');
  console.log('  Tips: set PORT=8080 untuk ganti port');
  console.log('');

  const start = process.platform === 'win32' ? `start ${url}`
    : process.platform === 'darwin' ? `open ${url}`
      : `xdg-open ${url}`;
  exec(start, () => { });
});

// ── Default DB ────────────────────────────────────────────────
function getDefaultDB() {
  return {
    settings: {
      perusahaan: {
        nama: 'INTERGAS PERDANA',
        alamat: 'Jl. Villa Taman Kartini Blok B5',
        kota: 'Bekasi Timur',
        telp: '081211132939',
        telp2: '089898083388',
        npwp: ''
      },
      n_cicilan: 7,
      interval: 'Mingguan',
      split_komisi_pct1: 60,
      split_komisi_pct2: 40,
      split_termin1: 4,
      split_termin2: 3,
      komisi_sales: 1150000,
      komisi_nego: 300000,
      komisi_koor: 200000,
      komisi_coll: 50000,
      komisi_kc: 5000,
      harga_std: 5800000,
      harga_prem: 7500000,
      notif: {
        hh: true,
        hMinus: [{ hari: 3, aktif: true }, { hari: 1, aktif: true }],
        telat: true,
        stok: true,
        hutang: true
      }
    },
    presets: [
      { nama: 'Pola A', vals: [40, 20, 15, 10, 5, 5, 5] },
      { nama: 'Pola B', vals: [30, 30, 20, 10, 10] },
      { nama: 'Pola C', vals: [50, 25, 25] }
    ],
    currentPreset: 0,
    inventory: [],
    riwayatMasuk: [],
    returList: [],
    konsumen: [],
    selectedKonsumen: null,
    poList: [],
    selectedPO: null,
    entitas: [],
    selectedEntitas: null,
    currentEntitasTab: 'Sales',
    tripList: [],
    bundleDef: [],
    auditLog: [],
    nextPONum: 1,
    nextInvId: 1,
    nextRiwayatId: 1
  };
}