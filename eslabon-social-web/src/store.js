'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TIPOS = { correccion: 'Corregir un dato', aporte: 'Aportar información nueva', otro: 'Otro motivo' };

const file = () => path.join(config.dataDir, 'mensajes.jsonl');

/** Quita caracteres de control y espacios sobrantes. */
function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, max);
}

function validate(body) {
  const data = {
    nombre: clean(body.nombre, 200).replace(/\s+/g, ' '),
    correo: clean(body.correo, 200),
    tipo: clean(body.tipo, 20),
    mensaje: clean(body.mensaje, 5000),
    acepto: body.acepto === 'on' || body.acepto === true,
  };
  const errors = {};
  if (data.nombre.length < 2 || data.nombre.length > 80) errors.nombre = 'Escribe tu nombre (entre 2 y 80 caracteres).';
  if (data.correo && (data.correo.length > 120 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(data.correo))) {
    errors.correo = 'Revisa el correo: no parece válido. Puedes dejarlo vacío.';
  }
  if (!Object.hasOwn(TIPOS, data.tipo)) errors.tipo = 'Elige un motivo de la lista.';
  if (data.mensaje.length < 10 || data.mensaje.length > 2000) errors.mensaje = 'El mensaje debe tener entre 10 y 2000 caracteres.';
  if (!data.acepto) errors.acepto = 'Para enviar el mensaje debes aceptar la política de privacidad.';
  return { data, errors, ok: Object.keys(errors).length === 0 };
}

async function save(data) {
  await fs.promises.mkdir(config.dataDir, { recursive: true, mode: 0o700 });
  const stat = await fs.promises.stat(file()).catch(() => null);
  if (stat && stat.size > MAX_FILE_BYTES) {
    const err = new Error('El buzón está lleno por ahora. Inténtalo más tarde.');
    err.status = 503;
    throw err;
  }
  const record = {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    nombre: data.nombre,
    correo: data.correo,
    tipo: data.tipo,
    mensaje: data.mensaje,
  };
  await fs.promises.appendFile(file(), JSON.stringify(record) + '\n', { mode: 0o600 });
  return record.id;
}

async function readAll() {
  const raw = await fs.promises.readFile(file(), 'utf8').catch(() => '');
  return raw.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

module.exports = { validate, save, readAll, TIPOS };
