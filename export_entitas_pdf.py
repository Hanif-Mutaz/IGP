#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export_entitas_pdf.py
Generate PDF laporan entitas (Sales/Nego) + Monitoring Global
Layout & data identik dengan export_entitas.py (Excel)
Input  : JSON via stdin  (sama persis dengan export_entitas.py)
Output : PDF bytes via stdout
"""
import sys, json, io
from datetime import datetime

# ── Auto-install reportlab ────────────────────────────────────
def ensure_reportlab():
    try:
        import reportlab
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'reportlab', '--quiet'])

ensure_reportlab()

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable

# ── Palette (sama dengan Excel) ───────────────────────────────
def hex2color(h):
    h = h.lstrip('#')
    return colors.HexColor('#' + h)

C_TITLE_BG  = hex2color('0D2137')
C_TITLE_FG  = hex2color('FAC775')
C_HEADER_BG = hex2color('1B3A5C')
C_HEADER_FG = colors.white
C_SUB_BG    = hex2color('2E5F8E')
C_SUB2_BG   = hex2color('3A7ABE')
C_ACCENT1   = hex2color('2E7D52')   # hijau
C_ACCENT2   = hex2color('C0392B')   # merah
C_ACCENT3   = hex2color('FAC775')   # gold
C_ROW_EVEN  = hex2color('EBF3FC')
C_ROW_ODD   = colors.white
C_TOTAL_BG  = hex2color('D4E4F0')
C_BORDER    = hex2color('B8C8D8')

def rp(n):
    try: return int(n or 0)
    except: return 0

def fmt_idr(n):
    n = rp(n)
    if n == 0: return '-'
    sign = '-' if n < 0 else ''
    s = f'{abs(n):,}'.replace(',', '.')
    return f'{sign}Rp {s}'

# ── Styles ────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def ps(name, parent='Normal', fontSize=7, leading=9,
       textColor=colors.black, alignment=TA_LEFT,
       fontName='Helvetica', bold=False, spaceAfter=0):
    fn = 'Helvetica-Bold' if bold else fontName
    return ParagraphStyle(name, parent=styles[parent],
                          fontSize=fontSize, leading=leading,
                          textColor=textColor, alignment=alignment,
                          fontName=fn, spaceAfter=spaceAfter)

ST_TITLE    = ps('title',  fontSize=13, bold=True, textColor=C_TITLE_FG, alignment=TA_CENTER)
ST_H1       = ps('h1',     fontSize=9,  bold=True, textColor=C_HEADER_FG, alignment=TA_CENTER)
ST_H2       = ps('h2',     fontSize=8,  bold=True, textColor=colors.white, alignment=TA_CENTER)
ST_DATA_C   = ps('dc',     fontSize=7,  alignment=TA_CENTER, textColor=hex2color('1B3A5C'))
ST_DATA_L   = ps('dl',     fontSize=7,  alignment=TA_LEFT,   textColor=hex2color('1B3A5C'))
ST_DATA_R   = ps('dr',     fontSize=7,  alignment=TA_RIGHT,  textColor=hex2color('1B3A5C'))
ST_MONEY    = ps('mo',     fontSize=7,  alignment=TA_RIGHT,  textColor=C_ACCENT1)
ST_MONEY_N  = ps('mon',    fontSize=7,  alignment=TA_RIGHT,  textColor=C_ACCENT2)
ST_TOTAL_C  = ps('tc',     fontSize=7,  bold=True, alignment=TA_CENTER, textColor=hex2color('1B3A5C'))
ST_TOTAL_R  = ps('tr',     fontSize=7,  bold=True, alignment=TA_RIGHT,  textColor=C_ACCENT1)
ST_GRAND    = ps('gr',     fontSize=8,  bold=True, alignment=TA_LEFT,   textColor=C_TITLE_FG)
ST_META     = ps('mt',     fontSize=7,  textColor=hex2color('555555'))
ST_META_VAL = ps('mv',     fontSize=7,  bold=True, textColor=hex2color('1B3A5C'))
ST_FOOTER   = ps('ft',     fontSize=6,  textColor=hex2color('888888'), alignment=TA_CENTER)
ST_SECTION  = ps('sec',    fontSize=8,  bold=True, textColor=C_TITLE_FG, alignment=TA_LEFT)
ST_SUB_LBL  = ps('sl2',    fontSize=7,  bold=True, textColor=hex2color('1B3A5C'), alignment=TA_LEFT)

def P(text, style):
    return Paragraph(str(text) if text is not None else '', style)

# ── Kop surat ─────────────────────────────────────────────────
def build_kop(settings, doc_title, periode_label):
    per = settings.get('perusahaan', {})
    nama_p  = per.get('nama',   'Inter Global Pratama')
    alamat  = per.get('alamat', '')
    kota    = per.get('kota',   '')
    telp    = per.get('telp',   '')
    telp2   = per.get('telp2',  '')

    today   = datetime.now()
    bulan_n = ['Januari','Februari','Maret','April','Mei','Juni',
               'Juli','Agustus','September','Oktober','November','Desember']
    tgl_cetak = f"{today.day} {bulan_n[today.month-1]} {today.year}"

    # Kop tabel: nama kiri, info kanan
    telp_str = telp + (f' / {telp2}' if telp2 else '')
    kop_data = [[
        P(nama_p, ps('kn', fontSize=12, bold=True, textColor=hex2color('0D2137'))),
        P(f'Telp: {telp_str}', ps('kt', fontSize=7, alignment=TA_RIGHT, textColor=hex2color('333333')))
    ],[
        P(f'{alamat}, {kota}', ps('ka', fontSize=7, textColor=hex2color('444444'))),
        P(f'Dicetak: {tgl_cetak}', ps('kd', fontSize=7, alignment=TA_RIGHT, textColor=hex2color('666666')))
    ]]
    kop_tbl = Table(kop_data, colWidths=['*', '*'])
    kop_tbl.setStyle(TableStyle([
        ('VALIGN',      (0,0),(-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
    ]))

    # Garis bawah kop
    hr = HRFlowable(width='100%', thickness=1.5, color=hex2color('1B3A5C'), spaceAfter=4)

    # Judul dokumen
    title_data = [[
        P(doc_title, ST_TITLE),
        P(f'Periode: {periode_label}',
          ps('pl', fontSize=8, bold=True, alignment=TA_RIGHT, textColor=hex2color('2E5F8E')))
    ]]
    title_tbl = Table(title_data, colWidths=['*', 80*mm])
    title_tbl.setStyle(TableStyle([
        ('BACKGROUND',  (0,0),(-1,-1), C_TITLE_BG),
        ('VALIGN',      (0,0),(-1,-1), 'MIDDLE'),
        ('TOPPADDING',  (0,0),(-1,-1), 6),
        ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ('LEFTPADDING', (0,0),(0,-1),  8),
        ('RIGHTPADDING',(-1,0),(-1,-1),8),
    ]))

    return [kop_tbl, Spacer(1, 2*mm), hr, title_tbl, Spacer(1, 3*mm)]


# ══════════════════════════════════════════════════════════════
# BUILD SALES / NEGO SHEET
# ══════════════════════════════════════════════════════════════
def build_sales_nego_section(db, entitas, peran, po_list, settings,
                              periode_label, loss_item_names, souvenir_names):
    nama         = entitas.get('nama', '?')
    komisi_rate  = rp(entitas.get('komisiRate', 0))
    pct1         = settings.get('split_komisi_pct1', 60) / 100
    pct2         = settings.get('split_komisi_pct2', 40) / 100
    splitN1      = settings.get('split_termin1', 4)

    field  = 'sales' if peran == 'Sales' else 'nego'
    my_pos = [p for p in po_list if p.get(field) == nama]

    max_cicilan = max(
        (sum(1 for c in p.get('cicilan', [])
             if c.get('status','') != 'batal' and c.get('tagihan',0) > 0)
         for p in my_pos), default=1)
    max_cicilan = max(max_cicilan, 1)

    elements = []

    # ── Meta info baris ──
    meta_data = [
        [P('Nama '+peran, ST_META), P(nama, ST_META_VAL),
         P('Rate Komisi', ST_META), P(fmt_idr(komisi_rate), ST_META_VAL),
         P('Rekanan', ST_META), P('Nego' if peran=='Sales' else 'Sales', ST_META_VAL)],
    ]
    meta_tbl = Table(meta_data, colWidths=[22*mm,40*mm,22*mm,28*mm,20*mm,'*'])
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND',  (0,0),(-1,-1), hex2color('EBF5FF')),
        ('BOX',         (0,0),(-1,-1), 0.5, C_BORDER),
        ('TOPPADDING',  (0,0),(-1,-1), 4),
        ('BOTTOMPADDING',(0,0),(-1,-1), 4),
        ('LEFTPADDING', (0,0),(-1,-1), 5),
    ]))
    elements.append(meta_tbl)
    elements.append(Spacer(1, 2*mm))

    # ── Header row ──
    rek_lbl   = 'Nego' if peran == 'Sales' else 'Sales'
    cic_hdrs  = [P(str(i+1), ST_H2) for i in range(max_cicilan)]
    pay_hdrs  = [P(f'Termin\n1-{splitN1}', ST_H2),
                 P(f'Termin\n{splitN1+1}-{max_cicilan}', ST_H2)]
    minus_hdrs= [P(nm, ps('mh', fontSize=6, bold=True, textColor=colors.white, alignment=TA_CENTER))
                 for nm in loss_item_names]
    sv_hdrs   = [P(f'Sv:{nm}', ps('svh', fontSize=6, bold=True, textColor=colors.white, alignment=TA_CENTER))
                 for nm in souvenir_names]

    header_row = (
        [P('No',ST_H1), P('Tanggal',ST_H1), P('Konsumen',ST_H1),
         P('Alamat',ST_H1), P(rek_lbl,ST_H1), P('Coll',ST_H1),
         P('Sold',ST_H1), P('Retur',ST_H1)]
        + cic_hdrs
        + [P('Komisi',ST_H2), P('Value\nKomisi',ST_H2), P('Souvenir',ST_H2)]
        + [P(f'Komisi\n{nm}', ps('ki', fontSize=6, bold=True, textColor=colors.white, alignment=TA_CENTER)) for nm in loss_item_names]
        + pay_hdrs
        + minus_hdrs + sv_hdrs
        + [P('Total\nMinus', ps('tm', fontSize=6, bold=True, textColor=colors.white, alignment=TA_CENTER))]
        + [P(str(i+1), ST_H2) for i in range(max_cicilan)]
    )

    # Lebar kolom (mm)
    W_NO   = 7*mm;  W_TGL = 18*mm; W_KONS = 24*mm; W_AMAT = 20*mm
    W_REK  = 16*mm; W_COL = 14*mm; W_SOL  = 12*mm; W_RET  = 12*mm
    W_CIC  = 16*mm; W_KOM = 14*mm; W_VAL  = 16*mm; W_SOV  = 14*mm
    W_ITEM = 12*mm; W_PAY = 16*mm; W_MIN  = 11*mm; W_TM   = 12*mm
    W_TER  = 16*mm

    col_widths = (
        [W_NO, W_TGL, W_KONS, W_AMAT, W_REK, W_COL, W_SOL, W_RET]
        + [W_CIC]*max_cicilan
        + [W_KOM, W_VAL, W_SOV]
        + [W_ITEM]*len(loss_item_names)
        + [W_PAY, W_PAY]
        + [W_MIN]*(len(loss_item_names)+len(souvenir_names))
        + [W_TM]
        + [W_TER]*max_cicilan
    )

    # ── Data rows ──
    table_data = [header_row]
    total_sold = total_retur = total_value = total_sov_cost = 0
    total_pay1 = total_pay2 = 0
    total_minus_arr = [0]*len(loss_item_names)
    total_sv_arr    = [0]*len(souvenir_names)
    total_tm        = 0
    cic_totals      = [0]*max_cicilan
    termin_totals   = [0]*max_cicilan

    def po_loss_by_item(po):
        r2 = {}
        for log in (po.get('lossLog') or []):
            for item in (log.get('items') or []):
                nm = item.get('nama',''); nl = rp(item.get('netLoss',0))
                if nm: r2[nm] = r2.get(nm,0) + nl
        return r2

    def po_sv_by_item(po):
        r2 = {}
        for sv in (po.get('souvenir') or []):
            nm = sv.get('nama',''); qty = rp(sv.get('qty',0))
            if nm: r2[nm] = r2.get(nm,0) + qty
        return r2

    for idx, po in enumerate(my_pos):
        cicilan    = po.get('cicilan', [])
        bundle     = rp(po.get('bundle', 0))
        total_loss = sum(rp(log.get('bundleDikurangi',0)) for log in (po.get('lossLog') or []))
        loss_by_item = po_loss_by_item(po)
        sv_by_item   = po_sv_by_item(po)
        value_k      = bundle * komisi_rate
        sv_cost      = rp(po.get('totalSouvenir', 0))
        pay1         = int(value_k * pct1)
        pay2         = int(value_k * pct2)

        bg = C_ROW_EVEN if idx % 2 == 0 else C_ROW_ODD

        # Cicilan
        cic_cells = []
        for i in range(max_cicilan):
            if i < len(cicilan) and cicilan[i].get('status') == 'lunas':
                v = rp(cicilan[i].get('tagihan', 0))
                cic_totals[i] += v
                cic_cells.append(P(fmt_idr(v), ST_MONEY))
            else:
                cic_cells.append(P('', ST_DATA_C))

        # Minus unit
        minus_cells = []
        tm = 0
        for i, nm in enumerate(loss_item_names):
            qty = loss_by_item.get(nm, 0)
            total_minus_arr[i] += qty
            tm += qty
            minus_cells.append(P(str(qty) if qty else '', ps('mc', fontSize=7, alignment=TA_CENTER, textColor=C_ACCENT2) if qty else ST_DATA_C))
        sv_cells = []
        for i, nm in enumerate(souvenir_names):
            qty = sv_by_item.get(nm, 0)
            total_sv_arr[i] += qty
            sv_cells.append(P(str(qty) if qty else '', ST_DATA_C))

        # Total Termin
        termin_cells = []
        for i in range(max_cicilan):
            if i < len(cicilan) and cicilan[i].get('status') == 'lunas':
                v = rp(cicilan[i].get('tagihan', 0))
                termin_totals[i] += v
                termin_cells.append(P(fmt_idr(v), ST_MONEY))
            else:
                termin_cells.append(P('', ST_DATA_C))

        rekan = po.get('nego','') if peran=='Sales' else po.get('sales','')

        row = (
            [P(str(idx+1), ST_DATA_C),
             P(po.get('tanggal',''), ST_DATA_L),
             P(po.get('konsumen',''), ST_DATA_L),
             P(po.get('lokasi', po.get('alamat','')), ST_DATA_L),
             P(rekan, ST_DATA_L),
             P(po.get('coll',''), ST_DATA_C),
             P(str(bundle), ST_DATA_C),
             P(str(total_loss) if total_loss else '', ps('rt', fontSize=7, alignment=TA_CENTER, textColor=C_ACCENT2) if total_loss else ST_DATA_C)]
            + cic_cells
            + [P(fmt_idr(komisi_rate), ST_DATA_R),
               P(fmt_idr(value_k), ST_MONEY),
               P(fmt_idr(sv_cost) if sv_cost else '', ST_MONEY if sv_cost else ST_DATA_C)]
            + [P('', ST_DATA_C)]*len(loss_item_names)   # Komisi per item (placeholder)
            + [P(fmt_idr(pay1), ST_MONEY), P(fmt_idr(pay2), ST_MONEY)]
            + minus_cells + sv_cells
            + [P(str(tm) if tm else '', ps('tmc', fontSize=7, bold=True, alignment=TA_CENTER, textColor=C_ACCENT2) if tm else ST_DATA_C)]
            + termin_cells
        )
        table_data.append(row)

        total_sold  += bundle
        total_retur += total_loss
        total_value += value_k
        total_sov_cost += sv_cost
        total_pay1  += pay1
        total_pay2  += pay2
        total_tm    += tm

    # ── Total row ──
    tot_cic_cells   = [P(fmt_idr(v) if v else '', ST_TOTAL_R) for v in cic_totals]
    tot_minus_cells = [P(str(v) if v else '', ps('tmc2', fontSize=7, bold=True, alignment=TA_CENTER, textColor=C_ACCENT2) if v else ST_TOTAL_C) for v in total_minus_arr]
    tot_sv_cells    = [P(str(v) if v else '', ST_TOTAL_C) for v in total_sv_arr]
    tot_termin_cells= [P(fmt_idr(v) if v else '', ST_TOTAL_R) for v in termin_totals]

    total_row = (
        [P('TOTAL', ps('tot', fontSize=7, bold=True, alignment=TA_CENTER, textColor=hex2color('1B3A5C'))),
         P('', ST_DATA_C), P('', ST_DATA_C), P('', ST_DATA_C), P('', ST_DATA_C), P('', ST_DATA_C),
         P(str(total_sold), ST_TOTAL_C),
         P(str(total_retur) if total_retur else '', ps('tr2', fontSize=7, bold=True, alignment=TA_CENTER, textColor=C_ACCENT2) if total_retur else ST_TOTAL_C)]
        + tot_cic_cells
        + [P('', ST_TOTAL_C),
           P(fmt_idr(total_value), ST_TOTAL_R),
           P(fmt_idr(total_sov_cost) if total_sov_cost else '', ST_TOTAL_R if total_sov_cost else ST_TOTAL_C)]
        + [P('', ST_TOTAL_C)]*len(loss_item_names)
        + [P(fmt_idr(total_pay1), ST_TOTAL_R), P(fmt_idr(total_pay2), ST_TOTAL_R)]
        + tot_minus_cells + tot_sv_cells
        + [P(str(total_tm) if total_tm else '', ps('ttm', fontSize=7, bold=True, alignment=TA_CENTER, textColor=C_ACCENT2) if total_tm else ST_TOTAL_C)]
        + tot_termin_cells
    )
    table_data.append(total_row)

    tbl = Table(table_data, colWidths=col_widths, repeatRows=1)

    # Style
    n_data = len(my_pos)
    n_cols = len(col_widths)
    n_hdr  = 1
    tot_row_idx = n_hdr + n_data

    ts = [
        ('BACKGROUND',  (0,0),  (-1,0),     C_HEADER_BG),
        ('TEXTCOLOR',   (0,0),  (-1,0),     colors.white),
        ('FONTNAME',    (0,0),  (-1,0),     'Helvetica-Bold'),
        ('FONTSIZE',    (0,0),  (-1,0),     7),
        ('ALIGN',       (0,0),  (-1,0),     'CENTER'),
        ('VALIGN',      (0,0),  (-1,-1),    'MIDDLE'),
        ('GRID',        (0,0),  (-1,-1),    0.4, C_BORDER),
        ('TOPPADDING',  (0,0),  (-1,-1),    2),
        ('BOTTOMPADDING',(0,0), (-1,-1),    2),
        ('LEFTPADDING', (0,0),  (-1,-1),    3),
        ('RIGHTPADDING',(0,0),  (-1,-1),    3),
        # Total row
        ('BACKGROUND',  (0, tot_row_idx), (-1, tot_row_idx), C_TOTAL_BG),
        ('FONTNAME',    (0, tot_row_idx), (-1, tot_row_idx), 'Helvetica-Bold'),
        # Alternating rows
    ]
    for i in range(n_data):
        bg = C_ROW_EVEN if i % 2 == 0 else C_ROW_ODD
        ts.append(('BACKGROUND', (0, n_hdr+i), (-1, n_hdr+i), bg))

    tbl.setStyle(TableStyle(ts))

    elements.append(tbl)
    return elements


# ══════════════════════════════════════════════════════════════
# BUILD MONITORING GLOBAL SECTION
# ══════════════════════════════════════════════════════════════
def build_monitoring_section(db, periode_label):
    from collections import defaultdict

    trip_list  = db.get('tripList', [])
    po_list    = db.get('poList', [])
    settings   = db.get('settings', {})
    inventory  = db.get('inventory', [])

    # Barang jual
    barang_map = {}
    for inv in inventory:
        if inv.get('kategori') == 'jual' and inv.get('kondisi') == 'good':
            nm = inv.get('nama', '')
            if nm and nm not in barang_map:
                barang_map[nm] = rp(inv.get('harga', 0))
    all_barang = list(barang_map.keys())

    # Souvenir
    souvenir_map = {}
    for inv in inventory:
        if inv.get('kategori') == 'sovenir':
            nm = inv.get('nama', '')
            if nm and nm not in souvenir_map:
                souvenir_map[nm] = rp(inv.get('harga', 0))
    for po in po_list:
        for sv in (po.get('souvenir') or []):
            nm = sv.get('nama', '')
            if nm and nm not in souvenir_map:
                souvenir_map[nm] = rp(sv.get('harga', 0))
    all_souvenir = list(souvenir_map.keys())

    all_sales_aktif = [e['nama'] for e in db.get('entitas', [])
                       if e.get('peran') == 'Sales' and e.get('aktifStatus')]

    po_by_tgl_sales = defaultdict(list)
    for po in po_list:
        key = (po.get('tanggal',''), po.get('sales',''))
        po_by_tgl_sales[key].append(po)

    trip_by_tgl = defaultdict(list)
    for trip in trip_list:
        trip_by_tgl[trip.get('tanggal','')].append(trip)

    all_dates_raw = sorted(set(t.get('tanggalRaw','') for t in trip_list if t.get('tanggalRaw')))

    def parse_raw(raw):
        try:
            p = raw.split('-')
            return int(p[0]), int(p[1]), int(p[2])
        except:
            return (0,0,0)

    dates_by_month = defaultdict(list)
    for raw in all_dates_raw:
        y, m, d = parse_raw(raw)
        dates_by_month[(y,m)].append(raw)

    BULAN_ID = ['','Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember']

    # ── Header ──
    brg_hdrs = []
    for nm in all_barang:
        short = nm[:8]
        brg_hdrs += [P(f'{short}\nQty', ps('bh', fontSize=6, bold=True, textColor=colors.white, alignment=TA_CENTER)),
                     P(f'{short}\nVal', ps('bh2', fontSize=6, bold=True, textColor=colors.white, alignment=TA_CENTER))]
    sv_hdrs = []
    for nm in all_souvenir:
        short = nm[:8]
        sv_hdrs += [P(f'Sv:{short}\nQty', ps('sh', fontSize=6, bold=True, textColor=colors.white, alignment=TA_CENTER)),
                    P(f'Sv:{short}\nVal', ps('sh2', fontSize=6, bold=True, textColor=colors.white, alignment=TA_CENTER))]

    header_row = (
        [P('Tanggal', ST_H1), P('Sales', ST_H1), P('Nego', ST_H1),
         P('Supir', ST_H1), P('Sesi', ST_H1), P('Konsumen', ST_H1)]
        + brg_hdrs + sv_hdrs
        + [P('Total\nQty', ST_H2), P('Total\nVal', ST_H2),
           P('Sv\nQty', ST_H2), P('Sv\nVal', ST_H2),
           P('Ket', ST_H1)]
    )

    W_TGL  = 16*mm; W_NM = 18*mm; W_SESI = 10*mm; W_KONS = 22*mm
    W_BRG  = 9*mm;  W_BRG_V = 18*mm; W_TOT = 12*mm; W_KET = 18*mm

    col_widths = (
        [W_TGL, W_NM, W_NM, W_NM, W_SESI, W_KONS]
        + [W_BRG, W_BRG_V] * len(all_barang)
        + [W_BRG, W_BRG_V] * len(all_souvenir)
        + [W_TOT, W_TOT, W_TOT, W_TOT, W_KET]
    )

    table_data = [header_row]

    grand_rows_start = []
    row_idx = 1  # track row index for styling

    for (year, month), dates in sorted(dates_by_month.items()):
        # Bulan header
        bulan_str = f'{BULAN_ID[month]} {year}'
        bulan_ncols = len(col_widths)
        bulan_row = [P(bulan_str, ps('bln', fontSize=8, bold=True, textColor=C_TITLE_FG, alignment=TA_LEFT))] + [P('',ST_DATA_C)]*(bulan_ncols-1)
        table_data.append(bulan_row)
        row_idx += 1
        month_data_start = row_idx

        for raw in sorted(dates):
            y2, m2, d2 = parse_raw(raw)
            tgl_obj = datetime(y2, m2, d2)
            tgl_display = f'{d2} {["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][m2]} {y2}'

            trips_hari = trip_by_tgl.get(tgl_display, [])
            if not trips_hari:
                continue

            day_start = row_idx
            for trip in trips_hari:
                sales_nm = trip.get('sales', '')
                nego_nm  = trip.get('nego', '')
                supir_nm = trip.get('supir', '')
                sesi     = trip.get('sesi', '')
                ket      = trip.get('ket', '')
                is_off   = trip.get('isOff', False)

                konsumen_list = []
                brg_q  = {}; brg_v  = {}
                sv_q   = {}; sv_v   = {}
                total_brg_qty = total_brg_val = 0
                total_sv_qty  = total_sv_val  = 0

                if not is_off:
                    pos_hari = po_by_tgl_sales.get((tgl_display, sales_nm), [])
                    for po in pos_hari:
                        kons = po.get('konsumen','')
                        if kons and kons not in konsumen_list:
                            konsumen_list.append(kons)
                        for log in (po.get('lossLog') or []):
                            for itm in (log.get('items') or []):
                                nm  = itm.get('nama','')
                                qty = rp(itm.get('netLoss', 0))
                                hrg = barang_map.get(nm, 0)
                                if nm in [b for b in all_barang]:
                                    brg_q[nm]  = brg_q.get(nm,0)  + qty
                                    brg_v[nm]  = brg_v.get(nm,0)  + qty * hrg
                        for sv in (po.get('souvenir') or []):
                            nm  = sv.get('nama','')
                            qty = rp(sv.get('qty',0))
                            hrg = souvenir_map.get(nm, 0)
                            if nm in all_souvenir:
                                sv_q[nm] = sv_q.get(nm,0) + qty
                                sv_v[nm] = sv_v.get(nm,0) + qty * hrg

                kons_str = ', '.join(konsumen_list[:3]) + ('...' if len(konsumen_list) > 3 else '')

                brg_cells = []
                for nm in all_barang:
                    qty = brg_q.get(nm, 0); val = brg_v.get(nm, 0)
                    total_brg_qty += qty; total_brg_val += val
                    brg_cells += [
                        P(str(qty) if qty else '', ps('bq', fontSize=6, alignment=TA_CENTER, textColor=C_ACCENT1) if qty else ST_DATA_C),
                        P(fmt_idr(val) if val else '', ps('bv', fontSize=6, alignment=TA_RIGHT, textColor=C_ACCENT1) if val else ST_DATA_C)
                    ]
                sv_cells = []
                for nm in all_souvenir:
                    qty = sv_q.get(nm,0); val = sv_v.get(nm,0)
                    total_sv_qty += qty; total_sv_val += val
                    sv_cells += [
                        P(str(qty) if qty else '', ST_DATA_C),
                        P(fmt_idr(val) if val else '', ST_DATA_R if val else ST_DATA_C)
                    ]

                fg_ket = C_ACCENT2 if is_off else hex2color('1B3A5C')
                ket_txt = ket if is_off else kons_str

                row = (
                    [P(tgl_display, ST_DATA_C),
                     P(sales_nm, ST_DATA_L),
                     P(nego_nm,  ST_DATA_L),
                     P(supir_nm, ST_DATA_L),
                     P(sesi,     ST_DATA_C),
                     P(ket_txt,  ST_DATA_L)]
                    + brg_cells + sv_cells
                    + [P(str(total_brg_qty) if total_brg_qty else '', ps('tbq', fontSize=7, bold=True, alignment=TA_CENTER, textColor=C_ACCENT1) if total_brg_qty else ST_DATA_C),
                       P(fmt_idr(total_brg_val) if total_brg_val else '', ps('tbv', fontSize=7, bold=True, alignment=TA_RIGHT, textColor=C_ACCENT1) if total_brg_val else ST_DATA_C),
                       P(str(total_sv_qty) if total_sv_qty else '', ST_DATA_C),
                       P(fmt_idr(total_sv_val) if total_sv_val else '', ST_DATA_R if total_sv_val else ST_DATA_C),
                       P(ket if not is_off else '', ps('kt2', fontSize=6, alignment=TA_LEFT, textColor=hex2color('AA3333')) if is_off else ST_DATA_C)]
                )
                table_data.append(row)
                grand_rows_start.append(row_idx)
                row_idx += 1

        # Subtotal bulan (simplified — just label row)
        sub_ncols = len(col_widths)
        sub_row = [P(f'  TOTAL {BULAN_ID[month].upper()} {year}',
                     ps('sub', fontSize=7, bold=True, textColor=colors.white, alignment=TA_LEFT))] + [P('',ST_DATA_C)]*(sub_ncols-1)
        table_data.append(sub_row)
        row_idx += 1

    tbl = Table(table_data, colWidths=col_widths, repeatRows=1)

    ts = [
        ('BACKGROUND',  (0,0),  (-1,0),  C_HEADER_BG),
        ('TEXTCOLOR',   (0,0),  (-1,0),  colors.white),
        ('FONTNAME',    (0,0),  (-1,0),  'Helvetica-Bold'),
        ('VALIGN',      (0,0),  (-1,-1), 'MIDDLE'),
        ('GRID',        (0,0),  (-1,-1), 0.3, C_BORDER),
        ('FONTSIZE',    (0,0),  (-1,-1), 7),
        ('TOPPADDING',  (0,0),  (-1,-1), 2),
        ('BOTTOMPADDING',(0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0),  (-1,-1), 2),
        ('RIGHTPADDING',(0,0),  (-1,-1), 2),
    ]
    # Bulan header rows & subtotal rows styling
    for i, row in enumerate(table_data):
        if i == 0: continue
        if len(row) > 0:
            val = row[0]
            if hasattr(val, 'text'):
                txt = val.text if isinstance(val.text, str) else ''
                for bln in ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER']:
                    if bln in txt.upper():
                        if 'TOTAL' in txt.upper():
                            ts.append(('BACKGROUND', (0,i),(-1,i), C_HEADER_BG))
                            ts.append(('TEXTCOLOR',  (0,i),(-1,i), colors.white))
                        else:
                            ts.append(('BACKGROUND', (0,i),(-1,i), C_TITLE_BG))
                            ts.append(('TEXTCOLOR',  (0,i),(-1,i), C_TITLE_FG))
                        ts.append(('SPAN', (0,i),(-1,i)))

    tbl.setStyle(TableStyle(ts))
    return [tbl]


# ══════════════════════════════════════════════════════════════
# MAIN BUILD PDF
# ══════════════════════════════════════════════════════════════
def build_pdf(db, periode_label, only_nama=None, monitoring_only=False):
    buf      = io.BytesIO()
    settings = db.get('settings', {})
    po_list  = db.get('poList', [])
    entitas  = db.get('entitas', [])

    # Helper
    def get_all_loss_item_names(pl):
        names = []; seen = set()
        for po in pl:
            for log in (po.get('lossLog') or []):
                for item in (log.get('items') or []):
                    nm = item.get('nama','')
                    if nm and nm not in seen:
                        names.append(nm); seen.add(nm)
        return names

    def get_all_souvenir_names(pl):
        names = []; seen = set()
        for po in pl:
            for sv in (po.get('souvenir') or []):
                nm = sv.get('nama','')
                if nm and nm not in seen:
                    names.append(nm); seen.add(nm)
        return names

    loss_item_names = get_all_loss_item_names(po_list)
    souvenir_names  = get_all_souvenir_names(po_list)

    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=10*mm, rightMargin=10*mm,
        topMargin=12*mm,  bottomMargin=10*mm,
        title=f'Laporan {periode_label}',
        author=settings.get('perusahaan', {}).get('nama', 'IGP')
    )

    elements = []

    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 6)
        canvas.setFillColor(hex2color('888888'))
        canvas.drawCentredString(
            doc.pagesize[0]/2, 6*mm,
            f'Dicetak oleh sistem IGP · {datetime.now().strftime("%d/%m/%Y %H:%M")} · Hal {doc.page}'
        )
        canvas.restoreState()

    if monitoring_only:
        elements += build_kop(settings, 'MONITORING GLOBAL', periode_label)
        elements += build_monitoring_section(db, periode_label)
    else:
        # Sales sheets
        sales_list = [e for e in entitas if e.get('peran') == 'Sales'
                      and (not only_nama or e.get('nama') == only_nama)]
        for i, e in enumerate(sales_list):
            if i > 0: elements.append(PageBreak())
            elements += build_kop(settings, f'LAPORAN SALES — {e.get("nama","").upper()}', periode_label)
            elements += build_sales_nego_section(
                db, e, 'Sales', po_list, settings, periode_label,
                loss_item_names, souvenir_names)

        # Nego sheets
        nego_list = [e for e in entitas if e.get('peran') == 'Nego'
                     and (not only_nama or e.get('nama') == only_nama)]
        for e in nego_list:
            elements.append(PageBreak())
            elements += build_kop(settings, f'LAPORAN NEGO — {e.get("nama","").upper()}', periode_label)
            elements += build_sales_nego_section(
                db, e, 'Nego', po_list, settings, periode_label,
                loss_item_names, souvenir_names)

        # Monitoring global (hanya kalau bukan filter individu)
        if not only_nama:
            elements.append(PageBreak())
            elements += build_kop(settings, 'MONITORING GLOBAL', periode_label)
            elements += build_monitoring_section(db, periode_label)

    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
    buf.seek(0)
    return buf.getvalue()


# ── Entry point ───────────────────────────────────────────────
if __name__ == '__main__':
    payload = json.load(sys.stdin)
    db      = payload.get('db', payload)
    periode = payload.get('periode', 'Semua Periode')

    filter_nama     = payload.get('filterEntitasNama') or None
    monitoring_only = bool(payload.get('monitoringOnly', False))

    if not filter_nama and not monitoring_only:
        if periode.startswith('__filter__'):
            rest        = periode[len('__filter__'):]
            parts       = rest.split('__', 1)
            filter_nama = parts[0]
            periode     = parts[1] if len(parts) > 1 else 'Semua Periode'
        elif periode.startswith('__monitoring__'):
            monitoring_only = True
            periode         = periode[len('__monitoring__'):]

    print(f'[PDF] filter={filter_nama!r} monitoring={monitoring_only!r} periode={periode!r}', file=sys.stderr)

    result = build_pdf(db, periode, only_nama=filter_nama, monitoring_only=monitoring_only)
    sys.stdout.buffer.write(result)