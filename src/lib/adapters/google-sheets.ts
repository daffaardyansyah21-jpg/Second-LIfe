// ============================================================================
// SECOND LIFE — Google Sheets / Google Apps Script Data-Access Adapter
// ============================================================================
// Designed per Section 10: allows introducing a low-cost Google Sheets /
// Google Apps Script integration without rebuilding the frontend.
// Never pretends the external integration is connected when unconfigured.

export interface ExternalIntegrationStatus {
  provider: string;
  configured: boolean;
  statusLabel: 'CONNECTED_READY' | 'NOT_CONFIGURED';
  webhookUrlMasked: string | null;
  spreadsheetIdMasked: string | null;
  setupInstructions: string[];
}

export function getGoogleSheetsIntegrationStatus(): ExternalIntegrationStatus {
  const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL?.trim() || '';
  const sharedSecret = process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET?.trim() || '';
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || '';

  const configured = Boolean(webhookUrl && sharedSecret && spreadsheetId);

  return {
    provider: 'Google Sheets & Google Apps Script Bridge',
    configured,
    statusLabel: configured ? 'CONNECTED_READY' : 'NOT_CONFIGURED',
    webhookUrlMasked: webhookUrl ? webhookUrl.slice(0, 36) + '...' : null,
    spreadsheetIdMasked: spreadsheetId ? spreadsheetId.slice(0, 8) + '...' : null,
    setupInstructions: [
      '1. Copy database/google-apps-script-bridge.gs into your Google Sheet Extensions -> Apps Script.',
      '2. Set Script Properties SHARED_SECRET and SPREADSHEET_ID in Google Apps Script.',
      '3. Deploy as a Web App and set GOOGLE_APPS_SCRIPT_WEBHOOK_URL, GOOGLE_APPS_SCRIPT_SHARED_SECRET, and GOOGLE_SHEETS_SPREADSHEET_ID in .env.',
      '4. Until configured, SECOND LIFE uses its local/primary relational SQL database as the single source of truth.'
    ]
  };
}

export async function syncRecordToGoogleSheetsIfConfigured(
  table: string,
  headers: string[],
  row: (string | number | null)[]
): Promise<{ attempted: boolean; success: boolean; detail: string }> {
  const status = getGoogleSheetsIntegrationStatus();
  if (!status.configured) {
    return {
      attempted: false,
      success: false,
      detail: 'Google Apps Script integration is not configured; stored in relational SQL database only.'
    };
  }

  try {
    const res = await fetch(process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET,
        table,
        headers,
        row
      })
    });
    if (!res.ok) {
      return { attempted: true, success: false, detail: `HTTP ${res.status}` };
    }
    return { attempted: true, success: true, detail: 'Synced to Google Sheets' };
  } catch (err) {
    return { attempted: true, success: false, detail: String(err) };
  }
}
