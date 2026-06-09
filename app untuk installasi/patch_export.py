#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Jalankan: python patch_export.py"""
import sys, os, ast, re

fname = 'export_entitas.py'
if not os.path.exists(fname):
    print('ERROR: ' + fname + ' tidak ditemukan'); sys.exit(1)

# Read with explicit utf-8, fallback to cp1252
try:
    content = open(fname, encoding='utf-8').read()
except UnicodeDecodeError:
    content = open(fname, encoding='cp1252').read()

# Normalize line endings
content = content.replace('\r\n', '\n').replace('\r', '\n')

# Backup
open(fname + '.bak', 'w', encoding='utf-8').write(content)
print('Backup: ' + fname + '.bak')

changed = 0

# 1. build_excel signature
if 'def build_excel(db, periode_label):' in content:
    content = content.replace(
        'def build_excel(db, periode_label):',
        'def build_excel(db, periode_label, only_nama=None):'
    ); changed += 1; print('1. build_excel signature updated')
else:
    print('1. build_excel signature - skipped')

# 2. sales_list
OLD_S = "    sales_list = [e for e in entitas if e.get('peran') == 'Sales']"
NEW_S = "    sales_list = [e for e in entitas if e.get('peran') == 'Sales' and (not only_nama or e.get('nama') == only_nama)]"
if OLD_S in content:
    content = content.replace(OLD_S, NEW_S); changed += 1; print('2. sales_list updated')
else:
    print('2. sales_list - skipped')

# 3. nego_list
OLD_N = "    nego_list = [e for e in entitas if e.get('peran') == 'Nego']"
NEW_N = "    nego_list = [e for e in entitas if e.get('peran') == 'Nego' and (not only_nama or e.get('nama') == only_nama)]"
if OLD_N in content:
    content = content.replace(OLD_N, NEW_N); changed += 1; print('3. nego_list updated')
else:
    print('3. nego_list - skipped')

# 4. Skip monitoring when only_nama
OLD_MON = '    build_global_monitoring_sheet(wb, db, periode_label)\n\n    # Freeze'
NEW_MON = '    if not only_nama:\n        build_global_monitoring_sheet(wb, db, periode_label)\n\n    # Freeze'
if OLD_MON in content and 'if not only_nama' not in content:
    content = content.replace(OLD_MON, NEW_MON); changed += 1; print('4. monitoring conditional updated')
else:
    print('4. monitoring conditional - skipped')

# 5. Force replace __main__ - read BOTH filterEntitasNama AND __filter__ prefix
idx = content.rfind("if __name__ == '__main__':")
if idx == -1:
    print('ERROR: __main__ not found'); sys.exit(1)

NEW_MAIN = r"""if __name__ == '__main__':
    payload = json.load(sys.stdin)
    db      = payload.get('db', payload)
    periode = payload.get('periode', 'Semua Periode')

    # Baca filter dari dua sumber:
    # 1. Field langsung dari server baru (filterEntitasNama, monitoringOnly)
    # 2. Prefix di periode string dari features.js (__filter__, __monitoring__)
    filter_nama     = payload.get('filterEntitasNama') or None
    monitoring_only = bool(payload.get('monitoringOnly', False))

    if not filter_nama and not monitoring_only:
        # Cek prefix di periode (fallback)
        if periode.startswith('__filter__'):
            rest        = periode[len('__filter__'):]
            parts       = rest.split('__', 1)
            filter_nama = parts[0]
            periode     = parts[1] if len(parts) > 1 else 'Semua Periode'
        elif periode.startswith('__monitoring__'):
            monitoring_only = True
            periode         = periode[len('__monitoring__'):]

    import sys as _sys
    print('[Python] filter=' + repr(filter_nama) + ' monitoring=' + repr(monitoring_only) + ' periode=' + repr(periode), file=_sys.stderr)

    if monitoring_only:
        from openpyxl import Workbook as _WB
        import io as _io
        _wb = _WB()
        _wb.remove(_wb.active)
        build_global_monitoring_sheet(_wb, db, periode)
        _wb.active = _wb.worksheets[0]
        _out = _io.BytesIO()
        _wb.save(_out)
        _out.seek(0)
        result = _out.getvalue()
    else:
        result = build_excel(db, periode, only_nama=filter_nama)

    sys.stdout.buffer.write(result)
"""

content = content[:idx] + NEW_MAIN
changed += 1; print('5. __main__ replaced')

try:
    ast.parse(content)
    print('Python syntax OK')
except SyntaxError as e:
    print('ERROR syntax line ' + str(e.lineno) + ': ' + str(e.msg))
    lines = content.split('\n')
    for i in range(max(0,e.lineno-3), min(len(lines),e.lineno+3)):
        print('  ' + str(i+1) + ': ' + lines[i])
    sys.exit(1)

open(fname, 'w', encoding='utf-8', newline='\n').write(content)
print('SELESAI - ' + str(changed) + ' perubahan')