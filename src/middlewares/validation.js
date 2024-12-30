const logger = require('../utils/logger');

const validateInput = (req, res, next) => {
  const { name, phone } = req.body;

  // Sanitización básica
  const sanitizedName = name?.trim();
  const sanitizedPhone = phone?.trim();

  // Validación de nombre
  const namePattern = /^[A-Za-zÀ-ÿ\s]{2,50}$/;
  if (!sanitizedName || !namePattern.test(sanitizedName)) {
    logger.warn(`Invalid name attempted: ${sanitizedName}`);
    return res.status(400).json({
      error: 'El nombre debe contener solo letras y espacios, entre 2 y 50 caracteres.'
    });
  }

  // Validación de teléfono
  const phonePattern = /^\+593\d{9}$/;
  if (!phonePattern.test(sanitizedPhone)) {
    logger.warn(`Invalid phone attempted: ${sanitizedPhone}`);
    return res.status(400).json({
      error: 'El número debe tener el formato: +593XXXXXXXXX'
    });
  }

  // Guardar datos sanitizados
  req.sanitizedData = {
    name: sanitizedName,
    phone: sanitizedPhone
  };

  next();
};

module.exports = {
  validateInput
};