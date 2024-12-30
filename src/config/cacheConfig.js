// cacheConfig.js
const express = require('express');
const path = require('path');

const cacheConfig = (app) => {
  // Configuración de caché por tipo de archivo
  const cacheTime = {
    images: 86400 * 7, // 7 días para imágenes
    css: 86400 * 3,    // 3 días para CSS
    js: 86400 * 3,     // 3 días para JS
    html: 0            // Sin caché para HTML
  };

  // Middleware para servir archivos estáticos con caché
  app.use('/img', express.static(path.join(__dirname, 'public/img'), {
    maxAge: cacheTime.images * 1000,
    etag: true,
    lastModified: true
  }));

  app.use('/css', express.static(path.join(__dirname, 'public/css'), {
    maxAge: cacheTime.css * 1000,
    etag: true,
    lastModified: true
  }));

  app.use('/js', express.static(path.join(__dirname, 'public/js'), {
    maxAge: cacheTime.js * 1000,
    etag: true,
    lastModified: true
  }));

  // Middleware para configurar headers de caché
  app.use((req, res, next) => {
    // No cachear HTML
    if (req.path.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
    next();
  });
};

module.exports = cacheConfig;