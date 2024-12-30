require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Importar servicios y middlewares
const logger = require('./src/utils/logger');
const sheetService = require('./src/services/sheetService');
const { formLimiter } = require('./src/middlewares/rateLimiter');
const { validateInput } = require('./src/middlewares/validation');
const { createQueue } = require('./src/config/queueConfig');

// Verificar variables de entorno críticas
const requiredEnvVars = [
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'SPREADSHEET_ID',
  'REDIS_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    logger.error(`Error: Variable de entorno ${varName} no está definida`);
    process.exit(1);
  }
});

// Inicializar la aplicación
const app = express();
const PORT = process.env.PORT || 10000;

// Crear cola para formularios
const formQueue = createQueue('form-submissions');

// Configurar middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://code.jquery.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Configurar compresión
app.use(compression({
  level: 6,
  threshold: 100 * 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Middlewares de parseo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar caché y archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      // Cache para archivos estáticos por 1 año
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Procesar trabajos de la cola
formQueue.process(async (job) => {
  try {
    const { name, phone, timestamp } = job.data;
    await sheetService.appendRow([name, phone, 'Lipoxin', timestamp]);
    logger.info(`Datos procesados correctamente para: ${name}`);
    return { success: true };
  } catch (error) {
    logger.error('Error procesando trabajo:', error);
    throw error;
  }
});

// Rutas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/policy.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'policy.html'));
});

// Ruta del formulario con validación y rate limiting
app.post('/submit', formLimiter, validateInput, async (req, res) => {
  try {
    const { name, phone } = req.sanitizedData;
    const timestamp = new Date().toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil'
    });

    // Añadir a la cola
    await formQueue.add({
      name,
      phone,
      timestamp
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true
    });

    logger.info(`Formulario encolado para: ${name}`);
    return res.status(200).json({
      message: 'Formulario recibido con éxito'
    });

  } catch (error) {
    logger.error('Error en /submit:', error);
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Error al enviar los datos. Intente de nuevo más tarde.'
        : error.message
    });
  }
});

// Manejo de errores 404
app.use((req, res) => {
  logger.warn(`Ruta no encontrada: ${req.path}`);
  res.status(404).json({ error: 'No encontrado' });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(`Servidor escuchando en el puerto ${PORT}`);
});

// Manejo de señales para shutdown graceful
const gracefulShutdown = async () => {
  try {
    logger.info('Iniciando shutdown graceful...');
    
    // Cerrar la cola
    await formQueue.close();
    logger.info('Cola cerrada correctamente');

    // Cerrar el servidor
    server.close(() => {
      logger.info('Servidor cerrado correctamente');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error durante el shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('uncaughtException', (err) => {
  logger.error('Excepción no capturada:', err);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', reason);
  gracefulShutdown();
});