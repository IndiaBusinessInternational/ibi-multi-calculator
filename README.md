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

Scan listings straight from your seller dashboards. Take a screenshot (`Win+Shift+S`), then **paste (`Ctrl+V`) anywhere on the page**, drag & drop it onto the scan panel, or click the panel to upload. Multiple images are supported. OCR (Tesseract.js) runs fully in the browser — the first scan downloads the engine, so internet is needed. The dashboard type is **detected automatically**:

- **Amazon Seller Central → Manage Inventory**: extracts Product title, ASIN, SKU, Price (Featured offer), Total fees, FBA fee, Min/Max price, Units sold, Sales rank. Multiple products per screenshot supported. *Apply* switches to **Amazon · Mode 2** and fills name, selling price and platform fee.
- **Flipkart / Shopsy Seller Hub → Listing Details panel** (click a listing to open it): extracts Product title, SKU ID, FSN ID, **Bank Settlement** (current pricing — not the pending input), **Listing Price**, Average Fees & Taxes, Seller Price, Customer Logistics Fees. Shopsy is recognised by its "Shopsy Budget" tab. *Apply* switches to **Flipkart/Shopsy · Mode 2** and fills name, listing price and bank settlement.
- **Meesho Supplier Panel → Price calculator popup** (Calculate your selling price): extracts Product name, **Selling price**, GST rate, Commission, GST/TCS/TDS deductions and **Bank settlement amount**. Meesho's settlement is already net of GST, so *Apply* auto-unchecks "Deduct GST payable" to avoid double-counting, sets the GST rate, and fills selling price + settlement in **Meesho · Mode 2**.

After applying, enter your own product/packaging/shipping costs and confirm the GST rate to get true profitability.

Tips for best OCR accuracy: screenshot at 100% browser zoom or larger, PNG format. For Amazon include the full row from title through the "Total fees" column; for Flipkart/Shopsy capture the Listing Details panel (cropping to just the panel improves accuracy).

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
