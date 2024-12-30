// queueService.js
const Queue = require('bull');
const { google } = require('googleapis');

// Crear cola con Redis
const formQueue = new Queue('form-submissions', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Configurar Google Sheets
const initializeGoogleSheets = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
};

// Procesar trabajos en la cola
formQueue.process(async (job) => {
  try {
    const { name, phone, timestamp } = job.data;
    const sheets = await initializeGoogleSheets();
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Cliente!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[name, phone, 'Lipoxin', timestamp]],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error procesando formulario:', error);
    throw error;
  }
});

// Manejar errores
formQueue.on('error', (error) => {
  console.error('Error en la cola:', error);
});

formQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} falló:`, error);
});

module.exports = formQueue;