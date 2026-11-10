'use strict';
// Muestra los mensajes recibidos por el formulario de contacto: npm run mensajes
const { readAll, TIPOS } = require('../src/store');

readAll().then((mensajes) => {
  if (!mensajes.length) return console.log('No hay mensajes.');
  for (const m of mensajes) {
    console.log(`\n[${m.fecha}] ${m.nombre}${m.correo ? ` <${m.correo}>` : ''} · ${TIPOS[m.tipo] || m.tipo}\n${m.mensaje}`);
  }
  console.log(`\nTotal: ${mensajes.length}`);
});
