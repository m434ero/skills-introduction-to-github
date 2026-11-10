'use strict';

const config = require('./src/config');
const { createApp } = require('./src/app');

const server = createApp().listen(config.port, config.host, () => {
  console.log(`Sitio disponible en http://localhost:${config.port} (${config.prod ? 'producción' : 'desarrollo'})`);
});

// Límites contra conexiones lentas o colgadas.
server.headersTimeout = 15000;
server.requestTimeout = 30000;
server.keepAliveTimeout = 5000;

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
