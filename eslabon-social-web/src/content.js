'use strict';

const fs = require('node:fs');
const config = require('./config');

const CERTEZAS = ['confirmado', 'fuente-unica', 'por-confirmar'];

function fail(msg) {
  throw new Error(`content/sitio.json inválido: ${msg}`);
}

function need(obj, path, keys) {
  if (!obj || typeof obj !== 'object') fail(`falta "${path}"`);
  for (const k of keys) {
    if (obj[k] === undefined || obj[k] === null || obj[k] === '') fail(`falta "${path}.${k}"`);
  }
}

function list(value, path, min) {
  if (!Array.isArray(value) || value.length < min) fail(`"${path}" debe tener al menos ${min} elementos`);
  return value;
}

function certeza(items, path) {
  items.forEach((it, i) => {
    if (!CERTEZAS.includes(it.certeza)) fail(`"${path}[${i}].certeza" no es válida`);
  });
}

/** Comprueba la forma del contenido al arrancar, para fallar pronto y con un mensaje claro. */
function validate(c) {
  need(c, 'raiz', ['meta', 'inicio', 'historia', 'personas', 'proyectos', 'financiamiento', 'lugares', 'verificacion', 'preguntas', 'fuentes']);
  need(c.meta, 'meta', ['nombre', 'sigla', 'lema', 'descripcion', 'aviso', 'actualizado']);
  need(c.inicio, 'inicio', ['titular', 'bajada']);
  certeza(list(c.inicio.cifras, 'inicio.cifras', 1), 'inicio.cifras');
  list(c.inicio.resumen, 'inicio.resumen', 1);
  need(c.historia, 'historia', ['intro']);
  certeza(list(c.historia.hitos, 'historia.hitos', 1), 'historia.hitos');
  need(c.personas, 'personas', ['intro', 'gobernanza']);
  certeza(list(c.personas.fundadores, 'personas.fundadores', 1), 'personas.fundadores');
  list(c.personas.gobernanza.puntos, 'personas.gobernanza.puntos', 1);
  need(c.proyectos, 'proyectos', ['intro']);
  certeza(list(c.proyectos.areas, 'proyectos.areas', 1), 'proyectos.areas');
  c.proyectos.areas.forEach((a, i) => {
    need(a, `proyectos.areas[${i}]`, ['id', 'titulo', 'resumen', 'texto']);
    if (!/^[a-z-]+$/.test(a.id)) fail(`"proyectos.areas[${i}].id" solo admite minúsculas y guiones`);
    list(a.puntos, `proyectos.areas[${i}].puntos`, 1);
  });
  need(c.financiamiento, 'financiamiento', ['intro', 'casitaBelga', 'asuntoAbierto']);
  certeza(list(c.financiamiento.fuentes, 'financiamiento.fuentes', 1), 'financiamiento.fuentes');
  list(c.financiamiento.casitaBelga.puntos, 'financiamiento.casitaBelga.puntos', 1);
  list(c.financiamiento.asuntoAbierto.puntos, 'financiamiento.asuntoAbierto.puntos', 1);
  certeza(list(c.lugares, 'lugares', 1), 'lugares');
  need(c.verificacion, 'verificacion', ['intro']);
  for (const k of ['confirmado', 'porConfirmar', 'comoVerificar', 'noConfundir']) list(c.verificacion[k], `verificacion.${k}`, 1);
  list(c.preguntas, 'preguntas', 1);
  list(c.fuentes, 'fuentes', 1).forEach((f, i) => {
    need(f, `fuentes[${i}]`, ['titulo', 'url', 'idioma', 'nota']);
    if (!/^https?:\/\//.test(f.url)) fail(`"fuentes[${i}].url" debe empezar por http(s)://`);
  });
  return c;
}

function load(file = config.contentFile) {
  return validate(JSON.parse(fs.readFileSync(file, 'utf8')));
}

module.exports = { load, validate, CERTEZAS };
