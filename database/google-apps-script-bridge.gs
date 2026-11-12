/**
 * ============================================================================
 * SECOND LIFE — Google Apps Script / Google Sheets Bridge (Code.gs)
 * ============================================================================
 * Optional low-cost institutional mirror for schools or administrators wishing
 * to sync verified SECOND LIFE records into a Google Spreadsheet.
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet and copy its Spreadsheet ID from the URL.
 * 2. Open Extensions -> Apps Script and paste this file into Code.gs.
 * 3. In Project Settings -> Script Properties, add:
 *    - SHARED_SECRET: match GOOGLE_APPS_SCRIPT_SHARED_SECRET in .env
 *    - SPREADSHEET_ID: match GOOGLE_SHEETS_SPREADSHEET_ID in .env
 * 4. Click Deploy -> New deployment -> Web app (Execute as: Me, Access: Anyone).
 * 5. Copy the Web App URL into GOOGLE_APPS_SCRIPT_WEBHOOK_URL in .env.
 */

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var expectedSecret = props.getProperty('SHARED_SECRET');
    var spreadsheetId = props.getProperty('SPREADSHEET_ID');

    var payload = JSON.parse(e.postData.contents);
    if (!expectedSecret || payload.secret !== expectedSecret) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheetName = payload.table || 'AuditMirror';
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    if (sheet.getLastRow() === 0 && payload.headers) {
      sheet.appendRow(payload.headers);
    }
    if (payload.row) {
      sheet.appendRow(payload.row);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true, syncedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
