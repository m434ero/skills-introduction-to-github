'use strict';

const { html, raw, paragraphs } = require('./html');
const { TIPOS } = require('./store');
const pkg = require('../package.json');

const NAV = [
  ['/historia', 'Historia'],
  ['/personas', 'Personas'],
  ['/proyectos', 'Proyectos'],
  ['/financiamiento', 'Financiamiento'],
  ['/presencia', 'Presencia'],
  ['/verificacion', 'Verificación'],
];
const FOOT = [
  ['/preguntas', 'Preguntas frecuentes'],
  ['/fuentes', 'Fuentes'],
  ['/contacto', 'Contacto'],
  ['/buscar', 'Buscar'],
  ['/cookies', 'Cookies'],
  ['/privacidad', 'Privacidad'],
];

const CERTEZA = {
  confirmado: ['Confirmado', 'Lo dicen las fuentes propias de la organización o varias fuentes.'],
  'fuente-unica': ['Fuente única', 'Lo dice una sola fuente o un directorio comercial.'],
  'por-confirmar': ['Por confirmar', 'Dato dudoso o sin resolver.'],
};

/* ---------- Piezas ---------- */

const ICONS = {
  logo: '<svg class="logo__marca" viewBox="0 0 48 32" width="48" height="32" aria-hidden="true" focusable="false"><rect x="3" y="7" width="26" height="18" rx="9" fill="none" stroke="#e3a72f" stroke-width="5"/><rect x="19" y="7" width="26" height="18" rx="9" fill="none" stroke="currentColor" stroke-width="5"/><path d="M19 16a9 9 0 0 1 2.6-6.3" fill="none" stroke="#e3a72f" stroke-width="5"/></svg>',
  educacion: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v5"/></svg>',
  salud: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/><path d="M12 9v5M9.500 11.500h5"/></svg>',
  agricultura: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V10"/><path d="M12 13c-4 0-6-2-6-6 4 0 6 2 6 6z"/><path d="M12 10c0-3.500 2-5.500 6-5.500 0 3.500-2 5.500-6 5.500z"/><path d="M5 21h14"/></svg>',
  intercambio: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.500 2.600 3.800 5.600 3.800 9s-1.300 6.400-3.800 9c-2.500-2.600-3.800-5.600-3.800-9S9.500 5.600 12 3z"/></svg>',
  buscar: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/></svg>',
  tema: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z"/></svg>',
};
const icon = (name) => raw(ICONS[name] || '');

function badge(certeza) {
  const [label, title] = CERTEZA[certeza] || CERTEZA['por-confirmar'];
  return html`<span class="certeza certeza--${certeza}" title="${title}">${label}</span>`;
}

const bullets = (items, cls = 'lista') => html`<ul class="${cls}">${items.map((i) => html`<li>${i}</li>`)}</ul>`;

const csrfField = (ctx) => html`<input type="hidden" name="_csrf" value="${ctx.csrf}">`;

function pageHead(kicker, title, intro) {
  return html`<header class="cabecera">
    <div class="contenedor">
      <p class="antetitulo">${kicker}</p>
      <h1>${title}</h1>
      ${intro ? html`<div class="cabecera__intro">${paragraphs(intro)}</div>` : ''}
    </div>
  </header>`;
}

function cookieBanner(ctx) {
  if (ctx.consent || ctx.path === '/cookies') return '';
  return html`<section class="aviso-cookies" id="aviso-cookies" aria-label="Aviso de cookies">
    <div class="aviso-cookies__texto">
      <h2>Este sitio usa cookies</h2>
      <p>Usamos cookies necesarias para que el sitio funcione de forma segura. Con tu permiso, también una cookie de preferencias para recordar el tema claro u oscuro. No hay cookies de publicidad ni de seguimiento. <a href="/cookies">Más información y configuración</a>.</p>
    </div>
    <form class="aviso-cookies__acciones" method="post" action="/cookies/consentimiento" data-consentimiento>
      ${csrfField(ctx)}
      <input type="hidden" name="volver" value="${ctx.path}">
      <button class="boton boton--secundario" type="submit" name="accion" value="rechazar">Solo necesarias</button>
      <button class="boton" type="submit" name="accion" value="aceptar">Aceptar todas</button>
    </form>
  </section>`;
}

/* ---------- Plantilla base ---------- */

function layout(ctx, { title, description, body, noindex }) {
  const { meta } = ctx.content;
  const fullTitle = title ? `${title} · ${meta.nombre}` : `${meta.nombre} (${meta.sigla}) · Sitio informativo`;
  const desc = description || meta.descripcion;
  const canonical = ctx.siteUrl + (ctx.path === '/' ? '/' : ctx.path);
  const v = pkg.version;
  const themeAttr = ctx.theme ? raw(` data-theme="${ctx.theme}"`) : '';
  const nextTheme = ctx.theme === 'oscuro' ? 'claro' : 'oscuro';

  const navLink = ([href, label]) => html`<li><a href="${href}"${ctx.path === href ? raw(' aria-current="page"') : ''}>${label}</a></li>`;

  return html`<!doctype html>
<html lang="es"${themeAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
${noindex ? raw('<meta name="robots" content="noindex">') : ''}
<meta name="csrf-token" content="${ctx.csrf}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#0f4c4a">
<meta name="format-detection" content="telephone=no">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_EC">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ctx.siteUrl}/img/compartir.svg">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/styles.css?v=${v}">
<script src="/js/app.js?v=${v}" defer></script>
</head>
<body>
<a class="saltar" href="#contenido">Saltar al contenido</a>
<p class="franja">Sitio informativo independiente · No es la página oficial de la fundación</p>
<header class="encabezado">
  <div class="contenedor encabezado__fila">
    <a class="logo" href="/" aria-label="${meta.nombre}, inicio">
      ${icon('logo')}
      <span class="logo__texto"><strong>Eslabón Social</strong><span>Ecuador · ${meta.sigla}</span></span>
    </a>
    <div class="encabezado__acciones">
      <a class="icono-boton" href="/buscar" aria-label="Buscar en el sitio">${icon('buscar')}</a>
      <form method="post" action="/preferencias/tema" data-tema>
        ${csrfField(ctx)}
        <input type="hidden" name="volver" value="${ctx.path}">
        <button class="icono-boton" type="submit" name="tema" value="${nextTheme}" aria-label="Cambiar entre tema claro y oscuro">${icon('tema')}</button>
      </form>
      <a class="boton boton--pequeno" href="/contacto">Contacto</a>
    </div>
  </div>
  <nav class="navegacion" aria-label="Secciones">
    <div class="contenedor">
      <ul>${navLink(['/', 'Inicio'])}${NAV.map(navLink)}</ul>
    </div>
  </nav>
</header>
<main id="contenido" tabindex="-1">
${body}
</main>
<footer class="pie">
  <div class="contenedor pie__rejilla">
    <div>
      <p class="pie__titulo">${meta.nombre}</p>
      <p>${meta.lema}</p>
      <p class="pie__aviso">${meta.aviso}</p>
    </div>
    <nav aria-label="Secciones principales">
      <p class="pie__titulo">Secciones</p>
      <ul>${NAV.map(([h, l]) => html`<li><a href="${h}">${l}</a></li>`)}</ul>
    </nav>
    <nav aria-label="Más información">
      <p class="pie__titulo">Más</p>
      <ul>${FOOT.map(([h, l]) => html`<li><a href="${h}">${l}</a></li>`)}</ul>
    </nav>
  </div>
  <div class="contenedor pie__base">
    <p>Última revisión del contenido: <time datetime="${meta.actualizado}">${formatDate(meta.actualizado)}</time></p>
    <p><a href="#contenido">Volver arriba</a></p>
  </div>
</footer>
${cookieBanner(ctx)}
</body>
</html>`.toString();
}

function formatDate(iso) {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const [y, m, d] = String(iso).split('-').map(Number);
  return y && m && d ? `${d} de ${meses[m - 1]} de ${y}` : String(iso);
}

/* ---------- Páginas ---------- */

function inicio(ctx) {
  const c = ctx.content;
  const body = html`
  <section class="portada">
    <div class="contenedor portada__rejilla">
      <div>
        <p class="antetitulo antetitulo--claro">${c.meta.lema}</p>
        <h1>${c.inicio.titular}</h1>
        <p class="portada__bajada">${c.inicio.bajada}</p>
        <p class="portada__acciones">
          <a class="boton boton--acento" href="/historia">Conocer la historia</a>
          <a class="boton boton--fantasma" href="/verificacion">Qué está verificado</a>
        </p>
      </div>
      <div class="portada__dibujo" aria-hidden="true">
        <svg viewBox="0 0 360 260" focusable="false">
          <rect x="30" y="70" width="190" height="120" rx="60" fill="none" stroke="#e3a72f" stroke-width="26"/>
          <rect x="140" y="70" width="190" height="120" rx="60" fill="none" stroke="#f6efe0" stroke-width="26"/>
          <path d="M140 130a60 60 0 0 1 17.600-42.400" fill="none" stroke="#e3a72f" stroke-width="26"/>
          <text x="76" y="232" fill="#f6efe0" font-size="15" font-family="Georgia, serif" text-anchor="middle">Guayaquil</text>
          <text x="284" y="232" fill="#f6efe0" font-size="15" font-family="Georgia, serif" text-anchor="middle">Amberes</text>
          <circle cx="76" cy="40" r="5" fill="#e3a72f"/><circle cx="284" cy="40" r="5" fill="#f6efe0"/>
          <path d="M84 40h192" stroke="#f6efe0" stroke-width="1.500" stroke-dasharray="3 7" opacity=".6"/>
        </svg>
      </div>
    </div>
  </section>

  <section class="seccion seccion--ajustada" aria-label="Fechas y cifras clave">
    <div class="contenedor">
      <ul class="cifras">
        ${c.inicio.cifras.map((n) => html`<li class="cifra"><span class="cifra__valor">${n.valor}</span><span class="cifra__etiqueta">${n.etiqueta}</span>${badge(n.certeza)}</li>`)}
      </ul>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      <h2>En pocas palabras</h2>
      <div class="rejilla rejilla--3">
        ${c.inicio.resumen.map((r) => html`<article class="tarjeta"><h3>${r.titulo}</h3>${paragraphs(r.texto)}</article>`)}
      </div>
    </div>
  </section>

  <section class="seccion seccion--tinte">
    <div class="contenedor">
      <h2>Áreas de trabajo</h2>
      <p class="entradilla">${c.proyectos.intro.split(/\n{2,}/)[0]}</p>
      <div class="rejilla rejilla--4">
        ${c.proyectos.areas.map((a) => html`<a class="tarjeta tarjeta--enlace" href="/proyectos#${a.id}">
          <span class="tarjeta__icono">${icon(a.id)}</span>
          <h3>${a.titulo}</h3>
          <p>${a.resumen}</p>
          <span class="tarjeta__mas">Ver detalle</span>
        </a>`)}
      </div>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor rejilla rejilla--2">
      <div>
        <h2>Cómo leer este sitio</h2>
        <p>Cada dato lleva una etiqueta que indica cuánto respaldo tiene en las fuentes públicas.</p>
        <dl class="leyenda">
          ${Object.entries(CERTEZA).map(([k, [, desc]]) => html`<div><dt>${badge(k)}</dt><dd>${desc}</dd></div>`)}
        </dl>
      </div>
      <aside class="llamada">
        <h2>¿Conoces la fundación?</h2>
        <p>Si trabajas con ella, la visitaste o tienes un dato más reciente, ayúdanos a corregir y completar esta información.</p>
        <p><a class="boton" href="/contacto">Enviar una corrección</a></p>
      </aside>
    </div>
  </section>`;
  return layout(ctx, { body });
}

function historia(ctx) {
  const h = ctx.content.historia;
  const body = html`${pageHead('Historia', 'De una sola aula a una red de proyectos', h.intro)}
  <section class="seccion">
    <div class="contenedor contenedor--estrecho">
      <ol class="linea">
        ${h.hitos.map((x) => html`<li class="hito">
          <p class="hito__fecha">${x.fecha}</p>
          <div class="hito__cuerpo"><h2>${x.titulo}</h2>${paragraphs(x.texto)}${badge(x.certeza)}</div>
        </li>`)}
      </ol>
    </div>
  </section>`;
  return layout(ctx, { title: 'Historia', description: firstSentence(h.intro), body });
}

const initials = (name) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const firstSentence = (t) => String(t).split(/\n/)[0].slice(0, 158);

function personas(ctx) {
  const p = ctx.content.personas;
  const body = html`${pageHead('Personas', 'Quiénes la fundaron y cómo se dirige', p.intro)}
  <section class="seccion">
    <div class="contenedor">
      <h2>Fundadores</h2>
      <div class="rejilla rejilla--3">
        ${p.fundadores.map((f) => html`<article class="tarjeta persona">
          <span class="persona__sigla" aria-hidden="true">${initials(f.nombre)}</span>
          <h3>${f.nombre}</h3>
          <p class="persona__rol">${f.rol}</p>
          ${paragraphs(f.texto)}
          ${badge(f.certeza)}
        </article>`)}
      </div>
    </div>
  </section>
  <section class="seccion seccion--tinte" id="gobernanza">
    <div class="contenedor rejilla rejilla--2">
      <div><h2>${p.gobernanza.titulo}</h2>${paragraphs(p.gobernanza.texto)}</div>
      <div class="tarjeta">${bullets(p.gobernanza.puntos, 'lista lista--marcas')}</div>
    </div>
  </section>`;
  return layout(ctx, { title: 'Personas', description: firstSentence(p.intro), body });
}

function proyectos(ctx) {
  const p = ctx.content.proyectos;
  const body = html`${pageHead('Proyectos', 'Educación, salud, agricultura e intercambio', p.intro)}
  <section class="seccion">
    <div class="contenedor">
      <nav class="indice" aria-label="Áreas de trabajo">
        ${p.areas.map((a) => html`<a href="#${a.id}">${a.titulo}</a>`)}
      </nav>
      ${p.areas.map((a) => html`<article class="area" id="${a.id}">
        <div class="area__cabeza">
          <span class="tarjeta__icono">${icon(a.id)}</span>
          <div><h2>${a.titulo}</h2><p class="entradilla">${a.resumen}</p></div>
        </div>
        <div class="rejilla rejilla--2">
          <div>${paragraphs(a.texto)}${badge(a.certeza)}</div>
          <div class="tarjeta">${bullets(a.puntos, 'lista lista--marcas')}</div>
        </div>
      </article>`)}
    </div>
  </section>`;
  return layout(ctx, { title: 'Proyectos', description: firstSentence(p.intro), body });
}

function financiamiento(ctx) {
  const f = ctx.content.financiamiento;
  const body = html`${pageHead('Financiamiento', 'De dónde viene el dinero', f.intro)}
  <section class="seccion">
    <div class="contenedor">
      <h2>Fuentes de ingresos</h2>
      <div class="rejilla rejilla--3">
        ${f.fuentes.map((x) => html`<article class="tarjeta"><h3>${x.titulo}</h3>${paragraphs(x.texto)}${badge(x.certeza)}</article>`)}
      </div>
    </div>
  </section>
  <section class="seccion seccion--tinte" id="casita-belga">
    <div class="contenedor rejilla rejilla--2">
      <div><p class="antetitulo">El motor propio</p><h2>${f.casitaBelga.titulo}</h2>${paragraphs(f.casitaBelga.texto)}</div>
      <div class="tarjeta"><h3>Qué pagan sus ganancias</h3>${bullets(f.casitaBelga.puntos, 'lista lista--marcas')}</div>
    </div>
  </section>
  <section class="seccion" id="asunto-abierto">
    <div class="contenedor contenedor--estrecho">
      <aside class="nota nota--duda">
        <p class="antetitulo">Asunto abierto ${badge('por-confirmar')}</p>
        <h2>${f.asuntoAbierto.titulo}</h2>
        ${paragraphs(f.asuntoAbierto.texto)}
        ${bullets(f.asuntoAbierto.puntos)}
        <p><a href="/verificacion#no-confundir">Ver las organizaciones de nombre parecido</a></p>
      </aside>
    </div>
  </section>`;
  return layout(ctx, { title: 'Financiamiento', description: firstSentence(f.intro), body });
}

function hostOf(url) {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return url; }
}

const external = (url, label) => html`<a href="${url}" rel="noopener noreferrer external">${label || hostOf(url)}</a>`;

function presencia(ctx) {
  const c = ctx.content;
  const paises = [...new Set(c.lugares.map((l) => l.pais))];
  const propios = c.fuentes.filter((f) => /eslabonsocial\.|casitabelga\.be\/index/i.test(f.url));
  const body = html`${pageHead('Presencia', 'Dónde trabaja y dónde encontrarla', 'La fundación ejecuta sus proyectos en Ecuador y recibe apoyo desde Bélgica. Aquí están los lugares que mencionan las fuentes y los sitios web de la propia organización.')}
  <section class="seccion">
    <div class="contenedor rejilla rejilla--2">
      ${paises.map((pais) => html`<div>
        <h2>${pais}</h2>
        ${c.lugares.filter((l) => l.pais === pais).map((l) => html`<article class="tarjeta tarjeta--lugar"><h3>${l.lugar}</h3><p>${l.texto}</p>${badge(l.certeza)}</article>`)}
      </div>`)}
    </div>
  </section>
  <section class="seccion seccion--tinte">
    <div class="contenedor">
      <h2>Sitios web de la organización</h2>
      <p class="entradilla">Estos enlaces llevan a páginas externas, administradas por la organización y no por este sitio.</p>
      <div class="rejilla rejilla--3">
        ${propios.map((f) => html`<article class="tarjeta"><h3>${external(f.url)}</h3><p>${f.nota}</p><p class="etiqueta">${f.idioma}</p></article>`)}
      </div>
      <p class="nota">No se encontraron cuentas confirmadas de Facebook, Instagram ni LinkedIn de la Fundación Eslabón Social. Si ves una cuenta con ese nombre, revisa primero la sección <a href="/verificacion#no-confundir">No confundir con</a>.</p>
    </div>
  </section>`;
  return layout(ctx, { title: 'Presencia', description: 'Lugares de trabajo en Ecuador y Bélgica, y sitios web de la Fundación Eslabón Social Ecuador.', body });
}

function verificacion(ctx) {
  const v = ctx.content.verificacion;
  const body = html`${pageHead('Verificación', 'Qué está confirmado y qué no', v.intro)}
  <section class="seccion">
    <div class="contenedor rejilla rejilla--2">
      <article class="tarjeta tarjeta--ok"><h2>Lo que está confirmado</h2>${bullets(v.confirmado, 'lista lista--marcas')}</article>
      <article class="tarjeta tarjeta--duda" id="por-confirmar"><h2>Lo que falta confirmar</h2>${bullets(v.porConfirmar, 'lista lista--dudas')}</article>
    </div>
  </section>
  <section class="seccion seccion--tinte" id="como-verificar">
    <div class="contenedor">
      <h2>Cómo verificarlo tú mismo</h2>
      <ol class="pasos">
        ${v.comoVerificar.map((p) => html`<li class="tarjeta"><h3>${p.titulo}</h3><p>${p.texto}</p></li>`)}
      </ol>
    </div>
  </section>
  <section class="seccion" id="no-confundir">
    <div class="contenedor">
      <h2>No confundir con</h2>
      <div class="rejilla rejilla--2">
        ${v.noConfundir.map((n) => html`<article class="nota nota--duda"><h3>${n.nombre}</h3>${paragraphs(n.texto)}</article>`)}
      </div>
    </div>
  </section>`;
  return layout(ctx, { title: 'Verificación', description: firstSentence(v.intro), body });
}

function preguntas(ctx) {
  const body = html`${pageHead('Preguntas frecuentes', 'Respuestas rápidas', 'Lo que más suele preguntarse sobre la fundación, respondido con lo que dicen las fuentes públicas.')}
  <section class="seccion">
    <div class="contenedor contenedor--estrecho">
      ${ctx.content.preguntas.map((p) => html`<details class="pregunta"><summary>${p.pregunta}</summary><div>${paragraphs(p.respuesta)}</div></details>`)}
      <p class="nota">¿No encuentras tu pregunta? Prueba el <a href="/buscar">buscador</a> o <a href="/contacto">escríbenos</a>.</p>
    </div>
  </section>`;
  return layout(ctx, { title: 'Preguntas frecuentes', description: 'Preguntas frecuentes sobre la Fundación Eslabón Social Ecuador (FUNESEC).', body });
}

function fuentes(ctx) {
  const body = html`${pageHead('Fuentes', 'De dónde sale esta información', 'Todo el contenido de este sitio proviene de estas páginas públicas. Los enlaces llevan a sitios externos, que pueden haber cambiado desde la última revisión.')}
  <section class="seccion">
    <div class="contenedor contenedor--estrecho">
      <ol class="fuentes">
        ${ctx.content.fuentes.map((f) => html`<li>
          <h2>${external(f.url, f.titulo)}</h2>
          <p>${f.nota}</p>
          <p class="fuentes__meta"><span class="etiqueta">${f.idioma}</span> <span class="fuentes__url">${hostOf(f.url)}</span></p>
        </li>`)}
      </ol>
    </div>
  </section>`;
  return layout(ctx, { title: 'Fuentes', description: 'Lista de fuentes públicas usadas en este sitio sobre la Fundación Eslabón Social Ecuador.', body });
}

function field(errors, name) {
  return errors[name] ? html`<p class="campo__error" id="error-${name}">${errors[name]}</p>` : '';
}
const aria = (errors, name) => (errors[name] ? raw(` aria-invalid="true" aria-describedby="error-${name}"`) : '');

function contacto(ctx, { values = {}, errors = {}, sent = false } = {}) {
  const hasErrors = Object.keys(errors).length > 0;
  const body = html`${pageHead('Contacto', 'Corrige o completa un dato', 'Este formulario llega a quienes mantienen este sitio informativo, no a la fundación. Úsalo para avisar de un error o compartir información más reciente.')}
  <section class="seccion">
    <div class="contenedor rejilla rejilla--2">
      <div>
        ${sent ? html`<div class="alerta alerta--ok" role="status"><h2>Mensaje recibido</h2><p>Gracias. Revisaremos lo que nos enviaste y actualizaremos el sitio si corresponde.</p></div>` : ''}
        ${hasErrors ? html`<div class="alerta alerta--error" role="alert"><h2>Revisa el formulario</h2><p>Hay campos por corregir. Están señalados abajo.</p></div>` : ''}
        <form class="formulario" method="post" action="/contacto" novalidate data-contacto>
          ${csrfField(ctx)}
          <div class="campo">
            <label for="nombre">Nombre</label>
            <input id="nombre" name="nombre" type="text" required minlength="2" maxlength="80" autocomplete="name" value="${values.nombre || ''}"${aria(errors, 'nombre')}>
            ${field(errors, 'nombre')}
          </div>
          <div class="campo">
            <label for="correo">Correo electrónico <span class="campo__opcional">(opcional)</span></label>
            <input id="correo" name="correo" type="email" maxlength="120" autocomplete="email" inputmode="email" value="${values.correo || ''}"${aria(errors, 'correo')}>
            <p class="campo__ayuda">Solo si quieres que te respondamos.</p>
            ${field(errors, 'correo')}
          </div>
          <div class="campo">
            <label for="tipo">Motivo</label>
            <select id="tipo" name="tipo" required${aria(errors, 'tipo')}>
              ${Object.entries(TIPOS).map(([k, l]) => html`<option value="${k}"${values.tipo === k ? raw(' selected') : ''}>${l}</option>`)}
            </select>
            ${field(errors, 'tipo')}
          </div>
          <div class="campo">
            <label for="mensaje">Mensaje</label>
            <textarea id="mensaje" name="mensaje" rows="7" required minlength="10" maxlength="2000"${aria(errors, 'mensaje')}>${values.mensaje || ''}</textarea>
            <p class="campo__ayuda">Entre 10 y 2000 caracteres. Si puedes, incluye la fuente del dato.</p>
            ${field(errors, 'mensaje')}
          </div>
          <div class="campo campo--trampa" aria-hidden="true">
            <label for="empresa">No rellenes este campo</label>
            <input id="empresa" name="empresa" type="text" tabindex="-1" autocomplete="off">
          </div>
          <div class="campo campo--casilla">
            <input id="acepto" name="acepto" type="checkbox" required${values.acepto ? raw(' checked') : ''}${aria(errors, 'acepto')}>
            <label for="acepto">He leído la <a href="/privacidad">política de privacidad</a> y acepto que se guarde este mensaje.</label>
            ${field(errors, 'acepto')}
          </div>
          <button class="boton" type="submit">Enviar mensaje</button>
        </form>
      </div>
      <aside>
        <div class="nota">
          <h2>¿Quieres hablar con la fundación?</h2>
          <p>Este sitio no la representa. Para donar, hacer voluntariado o pedir información oficial, usa los canales de la propia organización.</p>
          <p><a href="/presencia">Ver sus sitios web</a></p>
        </div>
        <div class="nota">
          <h2>Qué pasa con tu mensaje</h2>
          <p>Se guarda en el servidor de este sitio, sin tu dirección IP, y solo se usa para revisar el contenido. No se comparte con terceros.</p>
        </div>
      </aside>
    </div>
  </section>`;
  return layout(ctx, { title: 'Contacto', description: 'Envía una corrección o un dato nuevo sobre la Fundación Eslabón Social Ecuador.', body });
}

function buscar(ctx, { query, results }) {
  const body = html`${pageHead('Buscar', 'Buscar en el sitio', '')}
  <section class="seccion">
    <div class="contenedor contenedor--estrecho">
      <form class="buscador" method="get" action="/buscar" role="search">
        <label for="q">Palabra o frase</label>
        <div class="buscador__fila">
          <input id="q" name="q" type="search" maxlength="80" value="${query}" placeholder="Por ejemplo: salud, Casita Belga, 2008" autocomplete="off">
          <button class="boton" type="submit">Buscar</button>
        </div>
      </form>
      ${query ? html`<p class="buscador__cuenta" role="status">${results.length === 0 ? `Sin resultados para «${query}». Prueba con otra palabra.` : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} para «${query}»`}</p>` : ''}
      <ol class="resultados">
        ${results.map((r) => html`<li>
          <p class="etiqueta">${r.seccion}</p>
          <h2><a href="${r.url}">${r.titulo}</a></h2>
          <p>${r.extracto.antes}${r.extracto.marca ? html`<mark>${r.extracto.marca}</mark>` : ''}${r.extracto.despues}${r.extracto.corte ? '…' : ''}</p>
        </li>`)}
      </ol>
    </div>
  </section>`;
  return layout(ctx, { title: query ? `Buscar: ${query}` : 'Buscar', body, noindex: true });
}

function cookies(ctx, { saved = false, themeNotice = false } = {}) {
  const prefs = Boolean(ctx.consent && ctx.consent.preferencias);
  const body = html`${pageHead('Cookies', 'Política de cookies', 'Este sitio usa muy pocas cookies, todas propias. Aquí se explica cuáles son y puedes cambiar tu elección cuando quieras.')}
  <section class="seccion">
    <div class="contenedor contenedor--estrecho">
      ${saved ? html`<div class="alerta alerta--ok" role="status"><h2>Preferencias guardadas</h2><p>Tu elección se aplicará durante 180 días o hasta que la cambies.</p></div>` : ''}
      ${themeNotice ? html`<div class="alerta alerta--error" role="alert"><h2>Falta tu permiso</h2><p>Para recordar el tema claro u oscuro hay que activar las cookies de preferencias.</p></div>` : ''}
      <h2>Tu elección</h2>
      <form class="formulario" method="post" action="/cookies/consentimiento">
        ${csrfField(ctx)}
        <input type="hidden" name="volver" value="/cookies?guardado=1">
        <div class="opcion">
          <input id="necesarias" type="checkbox" checked disabled>
          <label for="necesarias"><strong>Necesarias</strong> (siempre activas). Protegen los formularios y recuerdan tu elección sobre cookies.</label>
        </div>
        <div class="opcion">
          <input id="preferencias" name="preferencias" type="checkbox"${prefs ? raw(' checked') : ''}>
          <label for="preferencias"><strong>Preferencias</strong>. Recuerdan si elegiste el tema claro u oscuro.</label>
        </div>
        <button class="boton" type="submit" name="accion" value="guardar">Guardar mi elección</button>
      </form>

      <h2>Cookies que usa este sitio</h2>
      <div class="tabla-envoltura">
        <table class="tabla">
          <thead><tr><th scope="col">Cookie</th><th scope="col">Tipo</th><th scope="col">Para qué sirve</th><th scope="col">Duración</th></tr></thead>
          <tbody>
            <tr><td><code>${ctx.cookieNames.csrf}</code></td><td>Necesaria</td><td>Protege los formularios contra envíos falsificados desde otros sitios.</td><td>Sesión del navegador</td></tr>
            <tr><td><code>${ctx.cookieNames.consent}</code></td><td>Necesaria</td><td>Guarda tu elección sobre las cookies para no volver a preguntarte.</td><td>180 días</td></tr>
            <tr><td><code>${ctx.cookieNames.theme}</code></td><td>Preferencias</td><td>Recuerda el tema claro u oscuro. Solo se crea si das permiso.</td><td>180 días</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Lo que este sitio no hace</h2>
      ${bullets([
        'No usa cookies de publicidad ni de redes sociales.',
        'No usa herramientas de analítica ni rastrea tu navegación.',
        'No carga recursos de terceros: tipografías, guiones e imágenes salen de este mismo servidor.',
      ], 'lista lista--marcas')}
      <p>Todas las cookies se envían solo a este sitio, no son legibles por guiones de la página y, en producción, viajan únicamente por conexión cifrada. También puedes borrarlas desde la configuración de tu navegador.</p>
    </div>
  </section>`;
  return layout(ctx, { title: 'Cookies', description: 'Qué cookies usa este sitio y cómo cambiar tu elección.', body });
}

function privacidad(ctx) {
  const contacto = ctx.contactEmail
    ? html`escribiendo a <a href="mailto:${ctx.contactEmail}">${ctx.contactEmail}</a> o por el <a href="/contacto">formulario de contacto</a>`
    : html`por el <a href="/contacto">formulario de contacto</a>`;
  const body = html`${pageHead('Privacidad', 'Política de privacidad', 'Este sitio recoge la menor cantidad de datos posible. Aquí se explica qué se guarda y qué puedes pedir.')}
  <section class="seccion">
    <div class="contenedor contenedor--estrecho prosa">
      <h2>Quién es responsable</h2>
      <p>Este es un sitio informativo independiente. No pertenece a la Fundación Eslabón Social Ecuador ni la representa. Los responsables del sitio son quienes lo mantienen, y puedes contactarlos ${contacto}.</p>
      <h2>Qué datos se recogen</h2>
      ${bullets([
        'Formulario de contacto: tu nombre, tu correo si decides darlo, el motivo y el texto del mensaje, junto con la fecha de envío.',
        'Cookies: solo las descritas en la política de cookies.',
        'Registros técnicos: el servidor puede anotar la fecha y la página pedida para detectar fallos y abusos. No se guarda tu dirección IP junto a los mensajes.',
      ])}
      <h2>Para qué se usan</h2>
      <p>Los mensajes se usan únicamente para corregir o completar el contenido del sitio y, si dejaste tu correo, para responderte. No se venden ni se comparten con terceros, y no se usan para publicidad.</p>
      <h2>Cuánto tiempo se guardan</h2>
      <p>Los mensajes se conservan mientras sirvan para revisar el contenido y se eliminan cuando dejan de ser necesarios o cuando lo pidas.</p>
      <h2>Tus derechos</h2>
      <p>Puedes pedir acceso a tus datos, su corrección o su eliminación, y oponerte a su uso, conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador. Para ejercerlos, contáctanos ${contacto}.</p>
      <h2>Enlaces externos</h2>
      <p>Este sitio enlaza a páginas de terceros, como las de la propia fundación. Esas páginas tienen sus propias políticas, que este sitio no controla.</p>
      <p class="nota">Más detalles sobre las cookies en la <a href="/cookies">política de cookies</a>.</p>
    </div>
  </section>`;
  return layout(ctx, { title: 'Privacidad', description: 'Qué datos recoge este sitio informativo y cómo se usan.', body });
}

function error(ctx, { status, title, message }) {
  const body = html`<section class="seccion error">
    <div class="contenedor contenedor--estrecho">
      <p class="error__codigo">${status}</p>
      <h1>${title}</h1>
      <p>${message}</p>
      <p><a class="boton" href="/">Ir al inicio</a> <a class="boton boton--secundario" href="/buscar">Buscar en el sitio</a></p>
    </div>
  </section>`;
  return layout(ctx, { title, body, noindex: true });
}

module.exports = {
  NAV, FOOT, inicio, historia, personas, proyectos, financiamiento, presencia,
  verificacion, preguntas, fuentes, contacto, buscar, cookies, privacidad, error,
};
