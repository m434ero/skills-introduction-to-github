'use strict';

const crypto = require('node:crypto');
const config = require('./config');

const DAY = 24 * 60 * 60 * 1000;
const NAMES = {
  csrf: config.cookieName('es_csrf'),
  consent: config.cookieName('es_consent'),
  theme: config.cookieName('es_tema'),
};

function cookieOptions(maxAge) {
  const opts = { httpOnly: true, sameSite: 'lax', secure: config.prod, path: '/' };
  if (maxAge) opts.maxAge = maxAge;
  return opts;
}

/* ---------- CSRF: doble envío con token firmado ---------- */

function sign(value) {
  return crypto.createHmac('sha256', config.secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function validToken(token) {
  if (typeof token !== 'string' || token.length > 200) return false;
  const [nonce, mac] = token.split('.');
  return Boolean(nonce && mac) && safeEqual(mac, sign(nonce));
}

/** Garantiza que cada visitante tenga un token y lo deja en res.locals.csrf. */
function csrfToken(req, res, next) {
  let token = req.cookies[NAMES.csrf];
  if (!validToken(token)) {
    const nonce = crypto.randomBytes(24).toString('base64url');
    token = `${nonce}.${sign(nonce)}`;
    res.cookie(NAMES.csrf, token, cookieOptions());
  }
  res.locals.csrf = token;
  next();
}

/** Rechaza peticiones que cambian estado si vienen de otro sitio o sin token válido. */
function csrfProtect(req, res, next) {
  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return deny(res, next);

  const origin = req.get('origin');
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch { /* origen inválido */ }
    if (host !== req.get('host')) return deny(res, next);
  }

  const cookie = req.cookies[NAMES.csrf];
  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (!validToken(cookie) || typeof sent !== 'string' || !safeEqual(cookie, sent)) return deny(res, next);
  next();
}

function deny(res, next) {
  const err = new Error('Token de seguridad inválido o caducado.');
  err.status = 403;
  next(err);
}

/* ---------- Consentimiento de cookies ---------- */

function readConsent(req) {
  const m = /^v1:p([01])$/.exec(req.cookies[NAMES.consent] || '');
  return m ? { preferencias: m[1] === '1' } : null;
}

function writeConsent(res, preferencias) {
  res.cookie(NAMES.consent, `v1:p${preferencias ? 1 : 0}`, cookieOptions(180 * DAY));
  if (!preferencias) res.clearCookie(NAMES.theme, cookieOptions());
}

/* ---------- Preferencia de tema ---------- */

const THEMES = ['claro', 'oscuro'];

function readTheme(req) {
  const t = req.cookies[NAMES.theme];
  return THEMES.includes(t) ? t : null;
}

function writeTheme(res, theme) {
  if (THEMES.includes(theme)) res.cookie(NAMES.theme, theme, cookieOptions(180 * DAY));
  else res.clearCookie(NAMES.theme, cookieOptions());
}

/** Solo acepta rutas internas para redirigir; evita redirecciones abiertas. */
function safeReturnPath(value) {
  if (typeof value !== 'string' || value.length > 200) return '/';
  return /^\/(?![/\\])[\w\-./?=&%#]*$/.test(value) ? value : '/';
}

module.exports = {
  NAMES,
  csrfToken,
  csrfProtect,
  readConsent,
  writeConsent,
  readTheme,
  writeTheme,
  safeReturnPath,
};
