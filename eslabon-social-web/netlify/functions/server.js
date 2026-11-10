'use strict';

// Adaptador para Netlify: ejecuta la misma aplicación Express como función.
// Las variables de netlify.toml solo existen durante la construcción, así que
// los valores por defecto de ejecución se fijan aquí.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.TRUST_PROXY = process.env.TRUST_PROXY || '1';
process.env.SERVERLESS = '1';
// En Netlify solo se puede escribir en /tmp, y su contenido no se conserva.
process.env.DATA_DIR = process.env.DATA_DIR || '/tmp/eslabon';

const serverless = require('serverless-http');

let handler;
let bootError;
try {
  handler = serverless(require('../../src/app').createApp());
} catch (err) {
  bootError = err;
  console.error(err);
}

exports.handler = async (event, context) => {
  if (bootError) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: 'El sitio no pudo arrancar. Revisa que la variable SESSION_SECRET (32 caracteres o más) esté definida en Netlify: Site configuration > Environment variables.',
    };
  }
  return handler(event, context);
};
