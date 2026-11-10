'use strict';

const crypto = require('node:crypto');
const path = require('node:path');

const prod = process.env.NODE_ENV === 'production';

let secret = process.env.SESSION_SECRET || '';
if (prod && secret.length < 32) {
  throw new Error('En producción, SESSION_SECRET es obligatorio y debe tener al menos 32 caracteres.');
}
if (!secret) secret = crypto.randomBytes(32).toString('hex');

function trustProxy() {
  const v = process.env.TRUST_PROXY;
  if (!v) return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v === 'true' ? 1 : v;
}

module.exports = {
  prod,
  secret,
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  siteUrl: (process.env.SITE_URL || process.env.DEPLOY_PRIME_URL || process.env.URL || 'http://localhost:3000').replace(/\/+$/, ''),
  contactEmail: process.env.CONTACT_EMAIL || '',
  contactLimit: Number(process.env.CONTACT_LIMIT) || 5,
  serverless: process.env.SERVERLESS === '1',
  forceHttps: process.env.FORCE_HTTPS === '1',
  trustProxy: trustProxy(),
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),
  // El prefijo __Host- obliga al navegador a aceptar la cookie solo con Secure, Path=/ y sin Domain.
  cookieName: (name) => (prod ? `__Host-${name}` : name),
};
