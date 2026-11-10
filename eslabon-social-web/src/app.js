'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');

const config = require('./config');
const security = require('./security');
const store = require('./store');
const views = require('./views');
const { load } = require('./content');
const { buildIndex, search } = require('./search');

const PAGES = {
  '/': views.inicio,
  '/historia': views.historia,
  '/personas': views.personas,
  '/proyectos': views.proyectos,
  '/financiamiento': views.financiamiento,
  '/presencia': views.presencia,
  '/verificacion': views.verificacion,
  '/preguntas': views.preguntas,
  '/fuentes': views.fuentes,
  '/privacidad': views.privacidad,
};
const SITEMAP = [...Object.keys(PAGES), '/contacto', '/cookies'];

function createApp() {
  const content = load();
  const index = buildIndex(content);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('query parser', 'simple');

  /* ---------- Cabeceras de seguridad ---------- */
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        formAction: ["'self'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        ...(config.prod ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    strictTransportSecurity: config.prod ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }));
  app.use((req, res, next) => {
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
    next();
  });

  if (config.forceHttps) {
    app.use((req, res, next) => {
      if (req.secure) return next();
      res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
    });
  }

  app.use(compression());

  /* ---------- Archivos estáticos ---------- */
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: config.prod ? '7d' : 0,
    index: false,
    dotfiles: 'ignore',
    setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
  }));
  app.get('/favicon.ico', (req, res) => res.redirect(301, '/img/favicon.svg'));

  /* ---------- Límites y lectura de peticiones ---------- */
  const limiter = (limit, windowMs) => rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) => {
      const err = new Error('Demasiadas peticiones. Espera unos minutos y vuelve a intentarlo.');
      err.status = 429;
      next(err);
    },
  });
  app.use(limiter(300, 15 * 60 * 1000));
  app.use(express.urlencoded({ extended: false, limit: '10kb', parameterLimit: 20 }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use(security.csrfToken);

  /* ---------- Contexto común de las vistas ---------- */
  app.use((req, res, next) => {
    res.locals.ctx = {
      content,
      path: req.path,
      csrf: res.locals.csrf,
      consent: security.readConsent(req),
      theme: security.readTheme(req),
      siteUrl: config.siteUrl,
      contactEmail: config.contactEmail,
      cookieNames: security.NAMES,
    };
    next();
  });

  const page = (res, markup, status = 200) => {
    res.status(status).set('Cache-Control', 'private, no-cache').type('html').send(markup);
  };
  const wantsJson = (req) => req.is('json') || (req.get('accept') || '').includes('application/json');

  /* ---------- Páginas ---------- */
  for (const [route, view] of Object.entries(PAGES)) {
    app.get(route, (req, res) => page(res, view(res.locals.ctx)));
  }

  app.get('/buscar', (req, res) => {
    page(res, views.buscar(res.locals.ctx, search(index, typeof req.query.q === 'string' ? req.query.q : '')));
  });

  app.get('/cookies', (req, res) => {
    page(res, views.cookies(res.locals.ctx, { saved: req.query.guardado === '1', themeNotice: req.query.aviso === 'tema' }));
  });

  app.get('/contacto', (req, res) => {
    page(res, views.contacto(res.locals.ctx, { sent: req.query.enviado === '1' }));
  });

  /* ---------- Acciones ---------- */
  app.post('/contacto', limiter(config.contactLimit, 60 * 60 * 1000), security.csrfProtect, async (req, res, next) => {
    try {
      // Campo trampa: los robots lo rellenan. Se responde como si todo fuera bien, sin guardar nada.
      if (req.body.empresa) return res.redirect(303, '/contacto?enviado=1');
      const { data, errors, ok } = store.validate(req.body);
      if (!ok) return page(res, views.contacto(res.locals.ctx, { values: data, errors }), 422);
      await store.save(data);
      res.redirect(303, '/contacto?enviado=1');
    } catch (err) {
      next(err);
    }
  });

  app.post('/cookies/consentimiento', security.csrfProtect, (req, res) => {
    const { accion, preferencias } = req.body;
    const allow = accion === 'aceptar' || (accion === 'guardar' && (preferencias === 'on' || preferencias === true));
    security.writeConsent(res, allow);
    if (wantsJson(req)) return res.json({ ok: true, preferencias: allow });
    res.redirect(303, security.safeReturnPath(req.body.volver));
  });

  app.post('/preferencias/tema', security.csrfProtect, (req, res) => {
    const consent = security.readConsent(req);
    const saved = Boolean(consent && consent.preferencias);
    if (saved) security.writeTheme(res, req.body.tema);
    if (wantsJson(req)) return res.json({ ok: true, guardado: saved });
    res.redirect(303, saved ? security.safeReturnPath(req.body.volver) : '/cookies?aviso=tema');
  });

  /* ---------- API pública de solo lectura ---------- */
  app.get('/api/salud', (req, res) => res.set('Cache-Control', 'no-store').json({ ok: true }));
  app.get('/api/contenido', (req, res) => res.set('Cache-Control', 'public, max-age=300').json(content));
  app.get('/api/buscar', (req, res) => {
    res.set('Cache-Control', 'no-store').json(search(index, typeof req.query.q === 'string' ? req.query.q : ''));
  });

  /* ---------- Buscadores ---------- */
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(`User-agent: *\nDisallow: /api/\nDisallow: /buscar\nSitemap: ${config.siteUrl}/sitemap.xml\n`);
  });
  app.get('/sitemap.xml', (req, res) => {
    const urls = SITEMAP.map((p) => `  <url><loc>${config.siteUrl}${p}</loc><lastmod>${content.meta.actualizado}</lastmod></url>`).join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  });

  /* ---------- Errores ---------- */
  app.use((req, res, next) => {
    const err = new Error('No encontrado');
    err.status = 404;
    next(err);
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    if (status < 400 || status > 599) status = 500;
    if (status >= 500) console.error(err);

    const TEXT = {
      400: ['Petición no válida', 'No pudimos entender la petición.'],
      403: ['Acción no permitida', 'El formulario caducó o la petición no vino de este sitio. Vuelve atrás, recarga la página e inténtalo otra vez.'],
      404: ['Página no encontrada', 'La dirección no existe o cambió de lugar.'],
      413: ['Mensaje demasiado grande', 'Lo que enviaste supera el tamaño permitido.'],
      429: ['Demasiadas peticiones', 'Espera unos minutos y vuelve a intentarlo.'],
      503: ['Servicio no disponible', 'El buzón está lleno por ahora. Inténtalo más tarde.'],
    };
    const [title, message] = TEXT[status] || ['Algo salió mal', 'Ocurrió un error inesperado. Inténtalo de nuevo en unos minutos.'];

    if (req.path.startsWith('/api/') || wantsJson(req)) {
      return res.status(status).set('Cache-Control', 'no-store').json({ ok: false, error: title });
    }
    const ctx = res.locals.ctx || {
      content, path: req.path, csrf: res.locals.csrf || '', consent: { preferencias: false }, theme: null,
      siteUrl: config.siteUrl, contactEmail: config.contactEmail, cookieNames: security.NAMES,
    };
    page(res, views.error(ctx, { status, title, message }), status);
  });

  return app;
}

module.exports = { createApp };
