const Queue = require('bull');
const { google } = require('googleapis');
const logger = require('../utils/logger');  // Asegúrate de tener la ruta correcta

// Opciones de conexión Redis
const redisOptions = {
  redis: {
    port: 6379,
    host: 'red-ctpijvij1k6c739k7md0',
    retryStrategy: function (times) {
      const delay = Math.min(times * 50, 2000);
      logger.info(`Intentando reconectar a Redis... Intento ${times}`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 10000
  }
};

// Crear cola con Redis y opciones de conexión
const formQueue = new Queue('form-submissions', process.env.REDIS_URL, redisOptions);

// Configurar Google Sheets
const initializeGoogleSheets = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    logger.error('Error inicializando Google Sheets:', error);
    throw error;
  }
};

// Procesar trabajos en la cola con mejor manejo de errores
formQueue.process(async (job) => {
  try {
    const { name, phone, timestamp } = job.data;
    logger.info(`Procesando trabajo para: ${name}`);

    const sheets = await initializeGoogleSheets();
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Cliente!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[name, phone, 'Lipoxin', timestamp]],
      },
    });

    logger.info(`Trabajo completado exitosamente para: ${name}`);
    return { success: true };
  } catch (error) {
    logger.error('Error procesando formulario:', error);
    throw error;
  }
});

// Mejorar el manejo de eventos de la cola
formQueue.on('error', (error) => {
  logger.error('Error en la cola:', error);
});

formQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} falló:`, error);
});

formQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completado exitosamente`);
});

formQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} está estancado`);
});

formQueue.on('waiting', (jobId) => {
  logger.info(`Job ${jobId} está en espera`);
});

// Evento de conexión exitosa
formQueue.on('ready', () => {
  logger.info('Cola conectada exitosamente a Redis');
});

module.exports = formQueue;