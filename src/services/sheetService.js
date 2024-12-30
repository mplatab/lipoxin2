const { google } = require('googleapis');
const logger = require('../utils/logger');

class SheetService {
  constructor() {
    this.sheets = null;
  }

  async initialize() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      logger.info('Google Sheets service initialized');
    } catch (error) {
      logger.error('Error initializing Google Sheets:', error);
      throw new Error('Failed to initialize Google Sheets service');
    }
  }

  async appendRow(data) {
    if (!this.sheets) await this.initialize();

    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Cliente!A:D',
        valueInputOption: 'RAW',
        resource: {
          values: [data],
        },
      });

      logger.info(`Data appended successfully to row ${response.data.updates.updatedRows}`);
      return response;
    } catch (error) {
      logger.error('Error appending data to sheet:', error);
      throw new Error('Failed to append data to sheet');
    }
  }
}

module.exports = new SheetService();