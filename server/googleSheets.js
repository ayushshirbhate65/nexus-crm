const { google } = require('googleapis');

/**
 * Google Sheets Service
 * Handles real-time synchronization of CRM data to a Google Sheet.
 */
class GoogleSheetsService {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    this.privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    this.auth = null;
    this.sheets = null;

    if (this.spreadsheetId && this.clientEmail && this.privateKey) {
      this.init();
    }
  }

  updateConfig(config) {
    this.spreadsheetId = config.spreadsheetId;
    this.clientEmail = config.clientEmail;
    this.privateKey = config.privateKey?.replace(/\\n/g, '\n');
    this.init();
  }

  init() {
    if (!this.spreadsheetId || !this.clientEmail || !this.privateKey) return;
    try {
      this.auth = new google.auth.JWT(
        this.clientEmail,
        null,
        this.privateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('📊 Google Sheets Service Initialized');
    } catch (err) {
      console.error('❌ Google Sheets Init Error:', err.message);
    }
  }

  async getSheetData(spreadsheetId) {
    if (!this.sheets) throw new Error('Google Sheets Service not initialized. Check your credentials in .env');
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'Sheet1!A:J',
      });
      return response.data.values || [];
    } catch (err) {
      console.error('❌ Google Sheets Fetch Error:', err.message);
      throw err;
    }
  }

  async syncCustomer(customer) {
    if (!this.sheets || !this.spreadsheetId) return;

    try {
      // 1. Get all values to find the row (simple implementation)
      const range = 'Sheet1!A:J';
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });

      const rows = response.data.values || [];
      const headers = ['ID', 'Code', 'Name', 'Contact', 'Service', 'Status', 'Assigned To', 'Follow Up', 'Done', 'Last Updated'];
      
      // If empty sheet, add headers
      if (rows.length === 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A1',
          valueInputOption: 'RAW',
          resource: { values: [headers] },
        });
      }

      const customerId = customer.id.toString();
      const rowIndex = rows.findIndex(row => row[0] === customerId);

      const customerData = [
        customerId,
        customer.customer_code || '',
        customer.name || '',
        customer.contact_number || '',
        customer.service_type || '',
        customer.call_status || '',
        customer.assigned_employee_name || '',
        customer.follow_up_date || '',
        customer.service_done ? 'Yes' : 'No',
        new Date().toLocaleString()
      ];

      if (rowIndex !== -1) {
        // Update existing row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Sheet1!A${rowIndex + 1}`,
          valueInputOption: 'RAW',
          resource: { values: [customerData] },
        });
      } else {
        // Append new row
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A:A',
          valueInputOption: 'RAW',
          resource: { values: [customerData] },
        });
      }
    } catch (err) {
      console.error('❌ Google Sheets Sync Error:', err.message);
    }
  }

  async fullSync(customers) {
    if (!this.sheets || !this.spreadsheetId) return;

    try {
      const headers = ['ID', 'Code', 'Name', 'Contact', 'Service', 'Status', 'Assigned To', 'Follow Up', 'Done', 'Last Updated'];
      const values = [headers, ...customers.map(c => [
        c.id.toString(),
        c.customer_code || '',
        c.name || '',
        c.contact_number || '',
        c.service_type || '',
        c.call_status || '',
        c.assigned_employee_name || '',
        c.follow_up_date || '',
        c.service_done ? 'Yes' : 'No',
        new Date().toLocaleString()
      ])];

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:J',
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        resource: { values },
      });
      
      console.log('✅ Google Sheets Full Sync Complete');
    } catch (err) {
      console.error('❌ Google Sheets Full Sync Error:', err.message);
    }
  }
}

module.exports = new GoogleSheetsService();
