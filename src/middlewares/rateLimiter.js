const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos por defecto
    max: 100, // límite de solicitudes por ventana
    message: {
      error: 'Demasiadas solicitudes, por favor intente más tarde.'
    },
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP ${req.ip}`);
      res.status(429).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};

// Limitador específico para formularios
const formLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Demasiados intentos de envío de formulario. Por favor, espere 15 minutos.'
  }
});

module.exports = {
  createRateLimiter,
  formLimiter
};