'use strict';

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => MAP[c]);

/** Marca HTML ya seguro. Todo lo demás se escapa al interpolar. */
class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

function render(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

/** Plantilla etiquetada con escape automático: html`<p>${textoNoConfiable}</p>` */
function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += render(values[i]);
  });
  return new Raw(out);
}

const raw = (s) => new Raw(s);

/** Convierte texto plano con párrafos separados por línea en blanco en <p>. */
const paragraphs = (text) => String(text).split(/\n{2,}/).filter(Boolean).map((p) => html`<p>${p}</p>`);

module.exports = { html, raw, esc, paragraphs, Raw };
