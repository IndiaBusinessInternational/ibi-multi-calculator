#!/usr/bin/env python3
"""Rebuild catalogue.json from the IBI product master held in Google Drive.

The master (IBI_Complete_Product_Master_HSN_GST.xlsx) is link-shared, so no
credentials are needed -- the plain `uc?export=download` endpoint returns the
workbook bytes. Run by .github/workflows/sync-catalogue.yml; it only rewrites
catalogue.json, and the workflow only commits when the content actually changed.

Every sanity check below is a hard failure on purpose: if Drive serves an error
page, a sign-in page or a truncated file, this must exit non-zero rather than
publish a short or empty catalogue that would wipe the picker in the app.
"""

import io
import json
import os
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone

FILE_ID = '1UmQZSCrJcmMeMKHh41B-Xl2jfx25bTSr'
SOURCE_NAME = 'IBI_Complete_Product_Master_HSN_GST.xlsx'
SHEET_NAME = 'IBI Product Master'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'catalogue.json')

MIN_PRODUCTS = 200      # the master has 268; a big drop means something went wrong
MAX_PRODUCTS = 600


def download(file_id):
    url = 'https://drive.google.com/uc?export=download&id=' + file_id
    req = urllib.request.Request(url, headers={'User-Agent': 'ibi-catalogue-sync'})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = r.read()
    if not data.startswith(b'PK'):
        sys.exit('ERROR: Drive did not return an xlsx (first bytes: %r). '
                 'Is the file still shared with "anyone with the link"?' % data[:40])
    if not zipfile.is_zipfile(io.BytesIO(data)):
        sys.exit('ERROR: downloaded bytes are not a readable zip/xlsx.')
    return data


def norm_hsn(v):
    """HSN codes are 8 digits. Excel stores some as numbers, which silently eats
    a leading zero (07099990 -> 7099990); 34 of the 268 codes start with one."""
    if v is None:
        return ''
    if isinstance(v, float) and v == int(v):
        v = int(v)
    s = str(v).strip()
    if s.isdigit() and len(s) % 2 == 1:
        s = '0' + s
    return s


def parse(data):
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True, read_only=True)
    if SHEET_NAME not in wb.sheetnames:
        sys.exit('ERROR: sheet %r not found. Sheets: %s' % (SHEET_NAME, wb.sheetnames))
    ws = wb[SHEET_NAME]
    out = []
    for row in ws.iter_rows(values_only=True):
        if not row or row[0] is None:
            continue
        try:                                    # data rows carry a numeric S.No;
            int(float(str(row[0]).strip()))     # title lines and the "> CATEGORY"
        except (TypeError, ValueError):         # banner rows do not
            continue
        name = str(row[1]).strip() if len(row) > 1 and row[1] else ''
        if not name:
            continue
        gst = str(row[3]).strip() if len(row) > 3 and row[3] else '0'
        digits = ''.join(ch for ch in gst.split('%')[0] if ch.isdigit())
        out.append({
            'n': name,
            'h': norm_hsn(row[2] if len(row) > 2 else None),
            'g': int(digits or 0),
            'c': (str(row[4]).strip() if len(row) > 4 and row[4] else ''),
        })
    return out


def main():
    products = parse(download(FILE_ID))

    if not MIN_PRODUCTS <= len(products) <= MAX_PRODUCTS:
        sys.exit('ERROR: parsed %d products, expected %d-%d. Refusing to publish.'
                 % (len(products), MIN_PRODUCTS, MAX_PRODUCTS))
    names = [p['n'] for p in products]
    dupes = sorted({n for n in names if names.count(n) > 1})
    if dupes:
        sys.exit('ERROR: duplicate product names in the master: %s' % dupes[:5])
    odd = [p for p in products if p['h'] and len(p['h']) != 8]
    if odd:
        print('WARNING: %d HSN codes are not 8 digits, e.g. %s'
              % (len(odd), [(p['n'][:40], p['h']) for p in odd[:3]]))

    products.sort(key=lambda p: p['n'].lower())
    payload = {
        'generated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'source': SOURCE_NAME,
        'fileId': FILE_ID,
        'count': len(products),
        'products': products,
    }

    old = None
    if os.path.exists(OUT):
        try:
            with io.open(OUT, encoding='utf-8') as f:
                old = json.load(f)
        except (ValueError, OSError):
            old = None

    # `generated` moves on every run, so rewriting unconditionally would produce
    # a commit every five minutes. Only touch the file when a product changed.
    changed = not old or old.get('products') != products
    if not changed:
        print('%d products, no change — catalogue.json left untouched' % len(products))
        return

    tmp = OUT + '.tmp'
    with io.open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(payload, ensure_ascii=False, indent=1) + '\n')
    os.replace(tmp, OUT)

    print('%d products -> catalogue.json UPDATED' % len(products))
    if old:
        was, now = {p['n'] for p in old.get('products', [])}, set(names)
        for n in sorted(now - was)[:20]:
            print('   + %s' % n)
        for n in sorted(was - now)[:20]:
            print('   - %s' % n)


if __name__ == '__main__':
    main()
