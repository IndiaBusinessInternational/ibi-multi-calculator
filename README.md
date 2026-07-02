# IBI Multi-Platform Pricing Calculator

Internal seller tool for **India Business International (IBI) · iINTELLIGENCEi**.
Single-file web app — open `index.html` in any modern browser (Chrome/Edge recommended). No install needed.

## Platforms

| Group | Platforms | Model |
|-------|-----------|-------|
| A | Amazon, Amazon Bazaar, IBI Website | Costs + platform fee → selling price (fee entered in ₹ from Seller Central) |
| B | Flipkart, Shopsy, Meesho, ShopClues | Settlement-based — platform fee is opaque, works from bank settlement |
| C | Offline | Simple cost + GST + margin |

## Modes

- **Mode 1 — Find Selling Price / New Listing**: enter costs + target profit % → ideal selling price (Group A/C) or required bank settlement (Group B).
- **Mode 2 — Check Existing Listing**: enter current price (+ settlement for Group B) → real profit, gross margin, ROI, break-even.

## 📸 Screenshot Scanner (added July 2026)

Scan listings straight from the **Amazon Seller Central → Manage Inventory** page:

1. Take a screenshot of the inventory row(s) — `Win+Shift+S` works well.
2. In the calculator, either **paste (`Ctrl+V`) anywhere on the page**, drag & drop the image onto the scan panel, or click the panel to upload files. Multiple images and multiple products per image are supported.
3. OCR (Tesseract.js, runs fully in the browser — first scan downloads the engine, needs internet) reads each product block and extracts: **Product title, ASIN, SKU, Price (Featured offer), Total fees, FBA fee, Min/Max price, Units sold, Sales rank**.
4. Click **→ Apply to calculator** on a product: it switches to *Amazon · Mode 2*, fills the product name, current selling price and platform fee. You then enter your own product/packaging/shipping costs to get true profitability.

Tips for best OCR accuracy: screenshot at 100% browser zoom or larger, PNG format, include the full row from title through the "Total fees" column.

## Logic notes (re-verified July 2026)

- **Group A**: `SP (excl. GST) = (cost + packaging + carton + shipping + other) × (1 + profit%) + platform fee`; GST is treated as pass-through (collected from buyer, remitted to government).
- **Group B — GST payable on sale**: the bank settlement paid by Flipkart/Meesho/etc. *includes* the GST you must remit to the government. The calculator now deducts GST payable from the settlement by default (checkbox **"Deduct GST payable on sale from settlement"** — turn OFF to treat the settlement as final in-hand, the pre-July-2026 behaviour).
  - Mode 1: required settlement = `base cost × (1 + profit%) × (1 + GST%)` (assumes low/zero-commission platform).
  - Mode 2: net profit = `settlement − GST collected − base cost`; the implied platform deduction is `SP (incl. GST) − settlement`.
- **ROI** is computed on base cost (product + packaging + carton + shipping + other, excluding platform fee).
- Viability thresholds: ROI ≥ 30% good · 15–30% acceptable · < 15% caution · loss = bad.

## Google Sheets integration

- **Copy → Paste**: copies a tab-separated header + value row for manual pasting.
- **Send → Google Sheets**: POSTs to a Google Apps Script web app (URL configurable in the setup section). The GAS code (`IBI_Calculator_GAS.gs`, also embedded in the page) auto-creates one tab per platform plus a live 📊 Summary tab.

## Keyboard shortcuts

`Ctrl+S` save to history · `Ctrl+Enter` send to Sheets · `Ctrl+Shift+C` copy · `Ctrl+V` paste screenshot to scan · `Ctrl+R` reset · `Alt+1`/`Alt+2` switch mode · `?` help.

## Files

- `index.html` — the entire app (UI + logic + scanner).
- `IBI_Calculator_GAS.gs` — Google Apps Script backend for the Sheets integration.
- `ibi-logo.png`, `assets/logo.png` — branding.
- `IBI Amazon Pricing Calculator/` — older single-platform (Amazon-only) version, kept for reference; superseded by this multi-platform calculator.
