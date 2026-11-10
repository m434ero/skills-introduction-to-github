'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.CONTACT_LIMIT = '7';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'eslabon-'));
const { createApp } = require('../src/app');
const { readAll } = require('../src/store');

let server;
let base;

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

const get = (url, headers = {}) => fetch(base + url, { headers, redirect: 'manual' });

/** Abre una página y devuelve la cookie y el token CSRF, como haría un navegador. */
async function session() {
  const res = await get('/contacto');
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const token = /name="csrf-token" content="([^"]+)"/.exec(await res.text())[1];
  return { cookie, token };
}

function post(url, fields, cookie) {
  return fetch(base + url, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(cookie ? { Cookie: cookie } : {}) },
    body: new URLSearchParams(fields).toString(),
  });
}

test('todas las páginas responden 200 en HTML', async () => {
  const pages = ['/', '/historia', '/personas', '/proyectos', '/financiamiento', '/presencia', '/verificacion', '/preguntas', '/fuentes', '/contacto', '/buscar', '/cookies', '/privacidad'];
  for (const p of pages) {
    const res = await get(p);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const body = await res.text();
    assert.match(body, /<html lang="es"/);
    assert.match(body, /No es la página oficial/);
  }
});

test('envía las cabeceras de seguridad', async () => {
  const res = await get('/');
  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.match(res.headers.get('referrer-policy'), /strict-origin/);
  assert.ok(res.headers.get('permissions-policy'));
});

test('las páginas no usan estilos ni guiones en línea', async () => {
  const body = await (await get('/')).text();
  assert.doesNotMatch(body, /<script(?![^>]*\ssrc=)/);
  assert.doesNotMatch(body, /<style|\sstyle="|\son\w+="/);
});

test('la cookie CSRF es HttpOnly y SameSite', async () => {
  const res = await get('/');
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('es_csrf='));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
});

test('ruta inexistente devuelve 404', async () => {
  const res = await get('/no-existe');
  assert.equal(res.status, 404);
  assert.match(await res.text(), /Página no encontrada/);
});

test('el buscador encuentra contenido sin tildes y escapa la consulta', async () => {
  const ok = await (await get('/api/buscar?q=educacion')).json();
  assert.ok(ok.results.length > 0);
  const xss = await (await get('/buscar?q=' + encodeURIComponent('<script>alert(1)</script>'))).text();
  assert.doesNotMatch(xss, /<script>alert/);
  assert.match(xss, /&lt;script&gt;/);
});

test('el formulario rechaza envíos sin token o desde otro origen', async () => {
  const fields = { nombre: 'Ana', tipo: 'correccion', mensaje: 'Un mensaje de prueba válido.', acepto: 'on' };
  assert.equal((await post('/contacto', fields)).status, 403);
  const { cookie, token } = await session();
  assert.equal((await post('/contacto', { ...fields, _csrf: 'falso.token' }, cookie)).status, 403);
  const cross = await fetch(base + '/contacto', {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie, Origin: 'https://malo.example' },
    body: new URLSearchParams({ ...fields, _csrf: token }).toString(),
  });
  assert.equal(cross.status, 403);
});

test('el formulario valida los campos y guarda un mensaje correcto', async () => {
  const { cookie, token } = await session();
  const bad = await post('/contacto', { _csrf: token, nombre: 'A', correo: 'no-es-correo', tipo: 'x', mensaje: 'corto' }, cookie);
  assert.equal(bad.status, 422);
  assert.match(await bad.text(), /Revisa el formulario/);

  const good = await post('/contacto', { _csrf: token, nombre: 'Ana <b>Pérez</b>', correo: 'ana@example.org', tipo: 'aporte', mensaje: 'La escuela sigue abierta según su sitio.', acepto: 'on' }, cookie);
  assert.equal(good.status, 303);
  assert.equal(good.headers.get('location'), '/contacto?enviado=1');
  const saved = await readAll();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].correo, 'ana@example.org');
  assert.equal(saved[0].ip, undefined);
});

test('el campo trampa descarta robots sin guardar nada', async () => {
  const { cookie, token } = await session();
  const before = (await readAll()).length;
  const res = await post('/contacto', { _csrf: token, nombre: 'Robot', tipo: 'otro', mensaje: 'Publicidad no deseada.', acepto: 'on', empresa: 'spam' }, cookie);
  assert.equal(res.status, 303);
  assert.equal((await readAll()).length, before);
});

test('el consentimiento se guarda y el aviso desaparece', async () => {
  const { cookie, token } = await session();
  assert.match(await (await get('/', { Cookie: cookie })).text(), /id="aviso-cookies"/);
  const res = await post('/cookies/consentimiento', { _csrf: token, accion: 'rechazar', volver: 'https://malo.example' }, cookie);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/');
  const consent = res.headers.getSetCookie().find((c) => c.startsWith('es_consent='));
  assert.match(consent, /es_consent=v1%3Ap0/);
  assert.match(consent, /HttpOnly/);
  const all = `${cookie}; ${consent.split(';')[0]}`;
  assert.doesNotMatch(await (await get('/', { Cookie: all })).text(), /id="aviso-cookies"/);
});

test('el tema solo se recuerda con permiso de preferencias', async () => {
  const { cookie, token } = await session();
  const no = await post('/preferencias/tema', { _csrf: token, tema: 'oscuro' }, cookie);
  assert.equal(no.headers.get('location'), '/cookies?aviso=tema');
  assert.ok(!no.headers.getSetCookie().some((c) => c.startsWith('es_tema=oscuro')));

  const accept = await post('/cookies/consentimiento', { _csrf: token, accion: 'aceptar' }, cookie);
  const all = `${cookie}; ${accept.headers.getSetCookie().find((c) => c.startsWith('es_consent=')).split(';')[0]}`;
  const yes = await post('/preferencias/tema', { _csrf: token, tema: 'oscuro', volver: '/historia' }, all);
  assert.equal(yes.headers.get('location'), '/historia');
  assert.ok(yes.headers.getSetCookie().some((c) => c.startsWith('es_tema=oscuro')));
  assert.match(await (await get('/', { Cookie: `${all}; es_tema=oscuro` })).text(), /<html lang="es" data-theme="oscuro">/);
});

test('sitemap, robots y API responden', async () => {
  assert.match(await (await get('/sitemap.xml')).text(), /<loc>.*\/historia<\/loc>/);
  assert.match(await (await get('/robots.txt')).text(), /Sitemap:/);
  assert.deepEqual(await (await get('/api/salud')).json(), { ok: true });
  assert.equal((await (await get('/api/contenido')).json()).meta.sigla, 'FUNESEC');
});

test('el formulario limita los envíos repetidos', async () => {
  const { cookie, token } = await session();
  let last = 0;
  for (let i = 0; i < 8; i += 1) {
    last = (await post('/contacto', { _csrf: token, nombre: 'Robot', tipo: 'otro', mensaje: 'x', empresa: 'spam' }, cookie)).status;
  }
  assert.equal(last, 429);
});
