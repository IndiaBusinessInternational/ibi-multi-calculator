// ══════════════════════════════════════════════════════════════════════
//  IBI Multi-Platform Pricing Calculator — Google Apps Script v4.0
//  India Business International · Dr. T. Sasimurugan
//  ─────────────────────────────────────────────────────────────────────
//  FEATURES:
//  • Auto-creates separate tabs per platform (Amazon, Flipkart, etc.)
//  • Builds platform-wise headers with branded styling
//  • Master "📊 Summary" tab with live aggregate stats
//  • Validates all incoming data — never crashes on bad input
//  • Logs all activity for debugging
//  • Returns proper JSON responses for the calculator to parse
//  • NEW v4: AI product-name extraction proxy — DeepSeek, Google Gemini,
//    OpenAI & Claude. API keys are stored HERE (Script Properties on your
//    Google account), never in the browser. Each provider works
//    independently; the calculator selects one (or ALL OFF).
// ══════════════════════════════════════════════════════════════════════
//
//  SETUP INSTRUCTIONS:
//  1. Open your Google Sheet (or create new) → name it 'IBI Pricing Data'
//  2. Click Extensions → Apps Script
//  3. Delete any existing code → paste this entire file
//  4. Click Save (Ctrl+S)
//  5. Click Deploy → New deployment
//      • Type: Web App
//      • Description: IBI Pricing Calculator v3
//      • Execute as: Me
//      • Who has access: Anyone
//  6. Click Deploy → Authorize → Allow
//  7. Copy the Web App URL
//  8. Paste it in the calculator's Setup panel → Save URL
//
//  AI API KEYS (v4) — stored in Google Drive → this Apps Script project →
//  Script Properties. Two ways to add them:
//    A) From the calculator: AI panel → paste key → "Save Key → Apps Script"
//    B) Manually here: ⚙ Project Settings → Script Properties →
//       Add script property, with these EXACT names:
//         AI_KEY_DEEPSEEK   AI_KEY_GEMINI   AI_KEY_OPENAI   AI_KEY_CLAUDE
//  Keys never leave your Google account; the web app only sends the OCR
//  text and receives cleaned product data back.
//
// ══════════════════════════════════════════════════════════════════════

// ──────────────── CONFIG ────────────────
var SUMMARY_TAB    = '📊 Summary';
var BRAND_COLOR    = '#7c3aed';      // purple
var BRAND_LIGHT    = '#ede9fe';      // tint for even rows
var HEADER_FONT    = '#ffffff';
var PROFIT_GREEN   = '#16a34a';
var LOSS_RED       = '#dc2626';

// ──────────────── MAIN ENDPOINTS ────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── AI actions (v4) ──
    if (data && data.action) return handleAiAction(data);

    if (!data || !data.headers || !data.values) {
      return jsonResponse({ status: 'error', message: 'Missing headers or values' });
    }

    var platform = (data.platform || 'Unknown').toString().trim();
    var ss       = SpreadsheetApp.getActiveSpreadsheet();
    var sheet    = getOrCreatePlatformSheet(ss, platform, data.headers);

    // Append the data row
    sheet.appendRow(data.values);
    var newRow = sheet.getLastRow();

    // Apply alternating row styling
    styleDataRow(sheet, newRow, data.values.length);

    // Color the Net Profit cell green/red
    colorProfitCell(sheet, newRow, data.headers, data.values);

    // Auto-resize columns
    sheet.autoResizeColumns(1, data.headers.length);

    // Update the Summary tab
    updateSummaryTab(ss);

    return jsonResponse({
      status   : 'ok',
      platform : platform,
      tab      : sheet.getName(),
      row      : newRow,
      message  : 'Row added to "' + sheet.getName() + '" tab'
    });

  } catch(err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var info = {
    status     : 'ok',
    message    : 'IBI Pricing Calculator endpoint active',
    timestamp  : new Date().toISOString(),
    spreadsheet: ss.getName(),
    tabs       : ss.getSheets().map(function(s) {
      return { name: s.getName(), rows: s.getLastRow() };
    })
  };
  return jsonResponse(info);
}

// ──────────────── HELPERS ────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get or create a sheet/tab for the given platform.
 * If new, writes the header row with brand styling and freezes it.
 */
function getOrCreatePlatformSheet(ss, platform, headers) {
  var sheet = ss.getSheetByName(platform);

  if (!sheet) {
    // Create new tab — try to insert before Summary tab if it exists
    var summary = ss.getSheetByName(SUMMARY_TAB);
    if (summary) {
      sheet = ss.insertSheet(platform, summary.getIndex());
    } else {
      sheet = ss.insertSheet(platform);
    }
  }

  // Write header row if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setFontWeight('bold')
      .setBackground(BRAND_COLOR)
      .setFontColor(HEADER_FONT)
      .setFontFamily('Roboto')
      .setFontSize(10)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrap(true);

    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 40);

    // Tab color = brand purple
    sheet.setTabColor(BRAND_COLOR);
  }

  return sheet;
}

/**
 * Apply alternating row styling.
 * Even rows get the light brand tint.
 */
function styleDataRow(sheet, row, cols) {
  var rowRange = sheet.getRange(row, 1, 1, cols);
  rowRange.setFontFamily('Roboto Mono').setFontSize(10);

  if (row % 2 === 0) {
    rowRange.setBackground(BRAND_LIGHT);
  }
}

/**
 * Find the "Net Profit per Unit (₹)" column and color the cell green or red.
 */
function colorProfitCell(sheet, row, headers, values) {
  var profitColIdx = -1;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().indexOf('Net Profit') !== -1) {
      profitColIdx = i + 1;
      break;
    }
  }
  if (profitColIdx === -1) return;

  var profitVal = parseFloat(values[profitColIdx - 1]);
  if (isNaN(profitVal)) return;

  var cell = sheet.getRange(row, profitColIdx);
  if (profitVal < 0) {
    cell.setFontColor(LOSS_RED).setFontWeight('bold');
  } else {
    cell.setFontColor(PROFIT_GREEN).setFontWeight('bold');
  }
}

/**
 * Build / update the master Summary tab with platform-wise aggregates.
 * Shows: platform name, # calculations, total profit, average ROI, last updated.
 */
function updateSummaryTab(ss) {
  var summary = ss.getSheetByName(SUMMARY_TAB);
  if (!summary) {
    summary = ss.insertSheet(SUMMARY_TAB, 0);  // insert as first tab
    summary.setTabColor('#16a34a');
  }
  summary.clear();

  // Title row
  summary.getRange('A1:F1').merge()
    .setValue('📊 IBI Pricing Calculator — Live Summary')
    .setFontWeight('bold').setFontSize(14)
    .setBackground(BRAND_COLOR).setFontColor(HEADER_FONT)
    .setHorizontalAlignment('center');
  summary.setRowHeight(1, 32);

  // Subtitle / timestamp
  summary.getRange('A2:F2').merge()
    .setValue('Last refreshed: ' + new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'}))
    .setFontSize(9).setFontColor('#666666')
    .setHorizontalAlignment('center');

  // Header row
  var headers = ['Platform', '# Calcs', 'Avg Net Profit (₹)', 'Total Net Profit (₹)', 'Avg ROI (%)', 'Last Updated'];
  summary.getRange(4, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f3eeff').setFontColor(BRAND_COLOR)
    .setFontFamily('Roboto').setFontSize(10).setHorizontalAlignment('center');

  // Iterate through all sheets (skip the summary itself)
  var sheets = ss.getSheets();
  var rowIdx = 5;
  var grandCount = 0, grandProfit = 0, grandRoiSum = 0, grandRoiCount = 0;

  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var name = sh.getName();
    if (name === SUMMARY_TAB) continue;
    if (sh.getLastRow() < 2) continue;

    var headerVals = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var profitColIdx = findColIdx(headerVals, 'Net Profit');
    var roiColIdx    = findColIdx(headerVals, 'ROI');
    var dateColIdx   = findColIdx(headerVals, 'Date');

    if (profitColIdx === -1) continue;

    var dataRows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    var count = 0, totalProfit = 0, roiSum = 0, roiCount = 0, lastDate = '';

    for (var r = 0; r < dataRows.length; r++) {
      var profitVal = parseFloat(dataRows[r][profitColIdx]);
      var roiVal    = parseFloat(dataRows[r][roiColIdx]);

      if (!isNaN(profitVal)) {
        count++;
        totalProfit += profitVal;
      }
      if (!isNaN(roiVal)) {
        roiSum += roiVal;
        roiCount++;
      }
      if (dateColIdx !== -1 && dataRows[r][dateColIdx]) {
        lastDate = dataRows[r][dateColIdx].toString();
      }
    }

    if (count === 0) continue;

    var avgProfit = totalProfit / count;
    var avgRoi    = roiCount > 0 ? roiSum / roiCount : 0;

    summary.getRange(rowIdx, 1, 1, 6).setValues([[
      name, count,
      avgProfit.toFixed(2),
      totalProfit.toFixed(2),
      avgRoi.toFixed(1) + '%',
      lastDate
    ]]);

    // Color the profit columns
    var profitCell = summary.getRange(rowIdx, 4);
    profitCell.setFontColor(totalProfit >= 0 ? PROFIT_GREEN : LOSS_RED).setFontWeight('bold');

    rowIdx++;
    grandCount += count;
    grandProfit += totalProfit;
    grandRoiSum += roiSum;
    grandRoiCount += roiCount;
  }

  // Totals row
  if (grandCount > 0) {
    summary.getRange(rowIdx, 1, 1, 6).setValues([[
      '── TOTAL ──', grandCount,
      (grandProfit / grandCount).toFixed(2),
      grandProfit.toFixed(2),
      (grandRoiCount > 0 ? (grandRoiSum / grandRoiCount).toFixed(1) : '0.0') + '%',
      ''
    ]]).setFontWeight('bold').setBackground('#f0f1f6').setFontColor(BRAND_COLOR);

    summary.getRange(rowIdx, 4)
      .setFontColor(grandProfit >= 0 ? PROFIT_GREEN : LOSS_RED);
  }

  // Auto-resize summary columns
  summary.autoResizeColumns(1, 6);
  summary.setColumnWidth(1, 160);
  summary.setColumnWidth(6, 180);

  // Add a note at the bottom
  summary.getRange(rowIdx + 2, 1).setValue(
    'ℹ️ This summary refreshes automatically every time a new calculation is sent from the IBI Calculator.'
  ).setFontSize(9).setFontColor('#888888').setFontStyle('italic');
}

/**
 * Find a column index by header substring (case-insensitive).
 */
function findColIdx(headerRow, search) {
  var s = search.toLowerCase();
  for (var i = 0; i < headerRow.length; i++) {
    if (headerRow[i] && headerRow[i].toString().toLowerCase().indexOf(s) !== -1) {
      return i;
    }
  }
  return -1;
}

// ──────────────── MANUAL UTILITIES ────────────────

/**
 * Run this manually from the Apps Script editor to refresh the Summary tab.
 * Useful if you've manually edited any platform tab.
 */
function refreshSummaryNow() {
  updateSummaryTab(SpreadsheetApp.getActiveSpreadsheet());
}

/**
 * Run this manually to verify the deployment is working.
 */
function testEndpoint() {
  var sample = {
    platform: 'Amazon',
    headers : ['Product Name','Platform','Date & Time','Net Profit per Unit (₹)','ROI / Markup (%)'],
    values  : ['TEST PRODUCT','Amazon',new Date().toLocaleString(),'42.50','35.5']
  };
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreatePlatformSheet(ss, sample.platform, sample.headers);
  sheet.appendRow(sample.values);
  styleDataRow(sheet, sheet.getLastRow(), sample.values.length);
  updateSummaryTab(ss);
  Logger.log('✓ Test row added to "Amazon" tab. Check your sheet.');
}

// ══════════════════════════════════════════════════════════════════════
//  AI PRODUCT-NAME EXTRACTION PROXY (v4)
//  Keys live in Script Properties on YOUR Google account — the web app
//  never sees or stores them. Each provider is independent; the web app
//  sends { action:'ai_extract', provider:'deepseek|gemini|openai|claude',
//  text:'<OCR text>' } and gets back cleaned product data.
// ══════════════════════════════════════════════════════════════════════

var AI_PROVIDERS = {
  deepseek: 'AI_KEY_DEEPSEEK',
  gemini  : 'AI_KEY_GEMINI',
  openai  : 'AI_KEY_OPENAI',
  claude  : 'AI_KEY_CLAUDE'
};

function handleAiAction(data) {
  try {
    if (data.action === 'save_ai_key') return saveAiKey_(data);
    if (data.action === 'ai_status')   return aiStatus_();
    if (data.action === 'ai_extract')  return aiExtract_(data);
    return jsonResponse({ status: 'error', message: 'Unknown action: ' + data.action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function saveAiKey_(d) {
  var prop = AI_PROVIDERS[d.provider];
  if (!prop) return jsonResponse({ status: 'error', message: 'Unknown provider' });
  var sp = PropertiesService.getScriptProperties();
  if (!d.key) {
    sp.deleteProperty(prop);
    return jsonResponse({ status: 'ok', message: d.provider + ' key removed' });
  }
  sp.setProperty(prop, String(d.key).trim());
  return jsonResponse({ status: 'ok', message: d.provider + ' key saved securely in Apps Script' });
}

function aiStatus_() {
  var sp = PropertiesService.getScriptProperties(), keys = {};
  for (var k in AI_PROVIDERS) keys[k] = !!sp.getProperty(AI_PROVIDERS[k]);
  return jsonResponse({ status: 'ok', keys: keys });
}

function aiExtract_(d) {
  var prop = AI_PROVIDERS[d.provider];
  if (!prop) return jsonResponse({ status: 'error', message: 'Unknown provider' });
  var key = PropertiesService.getScriptProperties().getProperty(prop);
  if (!key) return jsonResponse({ status: 'error', message: 'No ' + d.provider + ' API key saved. Save it in the AI settings first.' });

  var prompt =
    'You are given OCR text captured from an Indian e-commerce seller dashboard ' +
    '(Amazon Seller Central inventory or order page, Flipkart/Shopsy Seller Hub, ' +
    'Meesho Supplier Panel, or ShopClues Store Manager). The OCR interleaves table ' +
    'columns, so product names may be broken across lines and mixed with other data. ' +
    'Extract EVERY distinct product listing. Respond with ONLY a JSON array — no ' +
    'markdown fences, no commentary. Each element: ' +
    '{"title":"<full clean product name, OCR errors fixed>",' +
    '"id":"<ASIN / FSN / Product ID if visible, else empty string>",' +
    '"price":<main selling or listing price as number, or null>,' +
    '"fees":<total fees / charges as number, or null>,' +
    '"settlement":<bank settlement / net payout as number, or null>}\n\nOCR TEXT:\n' +
    String(d.text || '').slice(0, 6000);

  var out;
  if (d.provider === 'gemini')      out = callGemini_(key, prompt);
  else if (d.provider === 'claude') out = callClaude_(key, prompt);
  else if (d.provider === 'deepseek')
    out = callOpenAiCompat_('https://api.deepseek.com/chat/completions', 'deepseek-chat', key, prompt);
  else
    out = callOpenAiCompat_('https://api.openai.com/v1/chat/completions', 'gpt-4o-mini', key, prompt);

  var m = String(out).match(/\[[\s\S]*\]/);
  if (!m) return jsonResponse({ status: 'error', message: 'AI response contained no JSON array' });
  return jsonResponse({ status: 'ok', provider: d.provider, products: JSON.parse(m[0]) });
}

function callOpenAiCompat_(url, model, key, prompt) {
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + key },
    payload: JSON.stringify({ model: model, temperature: 0, messages: [{ role: 'user', content: prompt }] })
  });
  var j = JSON.parse(res.getContentText());
  if (j.error) throw new Error(j.error.message || 'API error');
  return j.choices[0].message.content;
}

function callGemini_(key, prompt) {
  var res = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(key), {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  var j = JSON.parse(res.getContentText());
  if (j.error) throw new Error(j.error.message || 'Gemini API error');
  return j.candidates[0].content.parts[0].text;
}

function callClaude_(key, prompt) {
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
  });
  var j = JSON.parse(res.getContentText());
  if (j.error) throw new Error(j.error.message || 'Claude API error');
  return j.content[0].text;
}
