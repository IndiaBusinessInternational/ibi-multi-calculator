# IBI Multi-Platform Pricing Calculator

Internal seller tool for **India Business International (IBI) · iINTELLIGENCEi**.
**Live:** https://calculator.indiabusinessinternational.online/ · installable as a PWA (works offline).

**Current version: v4.4** — shown in the top-left badge. Versioning: minor patches bump the decimal (v3.1), big features bump the major (v4). On each release also bump `APP_VERSION` in `index.html` and `CACHE` in `sw.js`.

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
- **Amazon Seller Central → Order details page** (Easy Ship / ATS orders): extracts item price, subtotal, tax (the **GST rate is auto-derived** from tax ÷ subtotal), the real **ATS courier charge** (Easy Ship Fee / Total shipping cost), ASIN, SKU and Order ID. *Apply* fills price, **shipping cost** and GST rate in **Amazon · Mode 2** — you then add the listing's Total fees and your own costs.
- **Flipkart / Shopsy Seller Hub → Listing Details panel** (click a listing to open it): extracts Product title, SKU ID, FSN ID, **Bank Settlement** (current pricing — not the pending input), **Listing Price**, Average Fees & Taxes, Seller Price, Customer Logistics Fees. Shopsy is recognised by its "Shopsy Budget" tab. *Apply* switches to **Flipkart/Shopsy · Mode 2** and fills name, listing price and bank settlement.
- **Meesho Supplier Panel → Price calculator popup** (Calculate your selling price): extracts Product name, **Selling price**, GST rate, Commission, GST/TCS/TDS deductions and **Bank settlement amount**. Meesho's settlement is already net of GST, so *Apply* auto-unchecks "Deduct GST payable" to avoid double-counting, sets the GST rate, and fills selling price + settlement in **Meesho · Mode 2**.
- **ShopClues Store Manager → Payout Calculator popup** (📊 icon in Manage Products): extracts Product title, Product ID, Category, **Selling Price**, Selling/Fulfillment service fees, TCS, Order Processing Fee and **Expected Net Payout**. ShopClues does not deduct output GST from the payout, so the GST-payable toggle stays ON. *Apply* fills selling price + payout in **ShopClues · Mode 2**.

**Persistence:** scanned screenshots (thumbnail + extracted data) are saved locally and survive page refresh — remove them with the **✕ Clear Off** button on the scan panel.

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

## v4.4 — Scan-drift safeguard

After a screenshot is applied, the calculator remembers the values it wrote into the price / fee / settlement fields. If any of those fields is later changed by more than 2%, an amber banner appears at the top of the Inputs panel — e.g. *"Changed since the scan — check for a typo: Selling price ₹21,350 (scanned ₹1,350); Platform fee ₹3,376.42 (scanned ₹376.42)."* This catches accidental stray-digit typos (a common cause of absurd profit/ROI results). Dismiss with ✕, or it clears automatically on reset, history restore, or switching platform. The calculation engine itself was verified correct — this guards the *inputs*.

## v4.3 — Amazon fee auto-estimate (fee schedule 10 Jun 2026)

For **Amazon / Amazon Bazaar**, pick the product's **fee category** (23 of the account's categories, most 0% referral ≤ ₹1,000) and **fulfilment channel** (Easy Ship / Self-Ship / Seller Flex / FBA) — the platform fee is then calculated automatically as *referral % + closing fee + 18% GST* and filled into the Platform-fee field, with the breakdown shown. In Mode 1 the fee/price interdependency is solved iteratively (slab-consistent). FBA weight-handling fees are **not** included — enter them in the Shipping-cost field. Select "✍ Manual" to type the Total fees from Seller Central as before. Verified against live listings: Easy Ship ≤₹300 closing ₹1 → the ₹1.18 "Total fees" seen on FBM listings; FBA ₹689 → ₹31.86 (= ₹241.90 shown − ₹210.04 FBA fee). Fee tables live in `AMAZON_CATS` / `amazonClosingFee` in `index.html` — update on Amazon's next revision. Note: claims for incorrect referral/closing fees must be filed within 30 days of the order.

## v4.2 — Flipkart listing-price estimate (Fixed Fee rate card)

For **Flipkart · Mode 1 (New Listing)** the calculator now also suggests the **listing price**: required settlement + Fixed Fee + 18% GST on the fee. A **Seller tier** selector (Bronze/Silver/Gold/Diamond, remembered) picks the fee slab from the account's Rate Card of **02 Jul 2026** (reflects the Fixed Fee revision effective that date; account category has 0% commission and ₹0 collection fee). Slab boundaries are resolved self-consistently (a settlement near ₹300 automatically moves to the ₹301–500 fee). When Flipkart next revises fees, update the `FLIPKART_FIXED_FEE` table at the top of the script in `index.html`.

## v4.0 — AI Product-Name Extraction (optional)

OCR titles from wide dashboard tables are often mangled. The **🤖 AI Product-Name Extraction** panel fixes this using an AI model of your choice: **DeepSeek, Google Gemini, OpenAI or Claude**.

- **Keys live in your Google Drive — inside the Apps Script project, under Script Properties** — never in the browser. The web app proxies AI calls through your GAS web app. Add keys either from the calculator's AI panel (Save Key → Apps Script) or manually in Apps Script via **⚙ Project Settings → Script Properties** with the exact names `AI_KEY_DEEPSEEK`, `AI_KEY_GEMINI`, `AI_KEY_OPENAI`, `AI_KEY_CLAUDE`.
- **Each provider is independent** — only the currently selected provider is ever called.
- **Master OFF**: select "🚫 All APIs OFF" to disable AI completely (pure OCR extraction, the default).
- The key field is **paste-only** (copy/cut disabled) with no reveal eye, and clears after saving.
- Setup: paste the latest `IBI_Calculator_GAS.gs` into Apps Script → **Deploy → Manage deployments → Edit (✏) → Version: New version → Deploy**. Then pick a provider in the AI panel, paste its API key, click **Save Key → Apps Script**.
- When enabled, each scan shows "✨ AI cleaning product names…" after OCR; if the AI call fails, the scan falls back to OCR titles automatically.

## v3.0 additions

- **PWA install**: install banner (re-appears 24 h after dismissal), ⬇ Install button in the header, and an Install entry inside the ⚙ Settings menu. Service worker caches the app shell for offline use.
- **Entry Date & Time** field — live clock displayed as `28 May 2026, Thursday, 01:38:00 PM`; 📅 Edit opens a calendar picker for manual entry; the chosen timestamp is recorded in History and Google Sheets.
- **Backup & Restore** (⚙ Settings menu): download all local data (history, scans, settings) as JSON; restore from a backup file.
- **Branding**: panel headings in #00c5ff on black (Roboto), IBI favicon + PWA icons, company logo banner at the top, dark/light **toggle switch**, version badge top-left.
- **Mobile**: edge-to-edge layout (no side padding) for maximum screen area.
- **Open Graph + Twitter Card** meta tags with a branded preview banner (`assets/og-banner.png`).
- Local history: up to 24 saved calculations with per-item delete and Clear-all (existing feature, retained).
- No API keys are used in this app (the Google Apps Script URL is a webhook, not a secret key).

## Keyboard shortcuts

`Ctrl+S` save to history · `Ctrl+Enter` send to Sheets · `Ctrl+Shift+C` copy · `Ctrl+V` paste screenshot to scan · `Ctrl+R` reset · `Alt+1`/`Alt+2` switch mode · `?` help.

## Files

- `index.html` — the entire app (UI + logic + scanner).
- `IBI_Calculator_GAS.gs` — Google Apps Script backend for the Sheets integration.
- `ibi-logo.png`, `assets/logo.png` — branding.
- `IBI Amazon Pricing Calculator/` — older single-platform (Amazon-only) version, kept for reference; superseded by this multi-platform calculator.
