'use strict';

/** Minúsculas y sin tildes, carácter a carácter, para que los índices coincidan con el texto original. */
function normalize(text) {
  let out = '';
  for (const ch of String(text)) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out += base.length === ch.length ? base : ch.toLowerCase().slice(0, ch.length).padEnd(ch.length, ' ');
  }
  return out;
}

function buildIndex(c) {
  const docs = [];
  const add = (seccion, url, titulo, ...partes) => {
    const texto = partes.flat().filter(Boolean).join(' ');
    docs.push({ seccion, url, titulo, texto, nTitulo: normalize(titulo), nTexto: normalize(texto) });
  };

  c.inicio.resumen.forEach((r) => add('Inicio', '/', r.titulo, r.texto));
  c.historia.hitos.forEach((h) => add('Historia', '/historia', `${h.fecha}: ${h.titulo}`, h.texto));
  c.personas.fundadores.forEach((p) => add('Personas', '/personas', p.nombre, p.rol, p.texto));
  add('Personas', '/personas#gobernanza', c.personas.gobernanza.titulo, c.personas.gobernanza.texto, c.personas.gobernanza.puntos);
  c.proyectos.areas.forEach((a) => add('Proyectos', `/proyectos#${a.id}`, a.titulo, a.resumen, a.texto, a.puntos));
  c.financiamiento.fuentes.forEach((f) => add('Financiamiento', '/financiamiento', f.titulo, f.texto));
  const { casitaBelga: cb, asuntoAbierto: aa } = c.financiamiento;
  add('Financiamiento', '/financiamiento#casita-belga', cb.titulo, cb.texto, cb.puntos);
  add('Financiamiento', '/financiamiento#asunto-abierto', aa.titulo, aa.texto, aa.puntos);
  c.lugares.forEach((l) => add('Presencia', '/presencia', `${l.lugar} (${l.pais})`, l.texto));
  add('Verificación', '/verificacion', 'Lo que está confirmado', c.verificacion.confirmado);
  add('Verificación', '/verificacion#por-confirmar', 'Lo que falta confirmar', c.verificacion.porConfirmar);
  c.verificacion.comoVerificar.forEach((v) => add('Verificación', '/verificacion#como-verificar', v.titulo, v.texto));
  c.verificacion.noConfundir.forEach((n) => add('Verificación', '/verificacion#no-confundir', n.nombre, n.texto));
  c.preguntas.forEach((p) => add('Preguntas', '/preguntas', p.pregunta, p.respuesta));
  c.fuentes.forEach((f) => add('Fuentes', '/fuentes', f.titulo, f.nota));
  return docs;
}

function snippet(doc, term) {
  const at = doc.nTexto.indexOf(term);
  if (at < 0) return { antes: doc.texto.slice(0, 170), marca: '', despues: '', corte: doc.texto.length > 170 };
  const start = Math.max(0, at - 70);
  const end = Math.min(doc.texto.length, at + term.length + 100);
  return {
    antes: (start > 0 ? '…' : '') + doc.texto.slice(start, at),
    marca: doc.texto.slice(at, at + term.length),
    despues: doc.texto.slice(at + term.length, end),
    corte: end < doc.texto.length,
  };
}

function search(index, rawQuery, limit = 20) {
  const query = String(rawQuery || '').trim().slice(0, 80);
  const terms = normalize(query).split(/\s+/).filter((t) => t.length >= 2).slice(0, 6);
  if (!terms.length) return { query, results: [] };

  const results = [];
  for (const doc of index) {
    let score = 0;
    let all = true;
    for (const t of terms) {
      const inTitle = doc.nTitulo.includes(t);
      const inText = doc.nTexto.includes(t);
      if (!inTitle && !inText) { all = false; break; }
      score += (inTitle ? 3 : 0) + (inText ? 1 : 0);
    }
    if (all) results.push({ seccion: doc.seccion, url: doc.url, titulo: doc.titulo, score, extracto: snippet(doc, terms[0]) });
  }
  results.sort((a, b) => b.score - a.score);
  return { query, results: results.slice(0, limit) };
}

module.exports = { buildIndex, search, normalize };
