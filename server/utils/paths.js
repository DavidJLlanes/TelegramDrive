import { badRequest } from './errors.js';

const MAX_NAME = 120;
const MAX_PATH = 400;
const FORBIDDEN = /[\\/\u0000-\u001f]/;
// Invisibles y marcas de dirección (U+202E invierte el texto: «foto\u202Egpj.exe» se vería «fotoexe.jpg»): se eliminan del nombre.
const INVISIBLE = /[\u007f-\u009f\u00ad\u200b\u200e\u200f\u2028\u2029\u202a-\u202e\u2060-\u206f\ufeff]/g;

/** Normaliza una ruta virtual: "/a/b". Rechaza "..", vacíos y caracteres de control. */
export function normalizePath(input = '/') {
  const parts = String(input).split('/').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part === '.' || part === '..') throw badRequest('Ruta no válida');
    if (part.length > MAX_NAME) throw badRequest('Nombre demasiado largo');
  }
  const result = `/${parts.join('/')}`;
  if (result.length > MAX_PATH) throw badRequest('Ruta demasiado larga');
  return result;
}

export function validateName(name) {
  const clean = String(name ?? '').normalize('NFC').replace(INVISIBLE, '').trim(); // NFC: «é» y «e + ´» son el mismo nombre
  if (!clean || clean === '.' || clean === '..') throw badRequest('Nombre no válido');
  if (FORBIDDEN.test(clean)) throw badRequest('El nombre contiene caracteres no permitidos');
  if (clean.length > MAX_NAME) throw badRequest('Nombre demasiado largo');
  return clean;
}

export const joinPath = (parent, name) => (parent === '/' ? `/${name}` : `${parent}/${name}`);

export function parentOf(path) {
  if (path === '/') return '/';
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

export const baseName = (path) => path.slice(path.lastIndexOf('/') + 1);

/** true si `path` es `root` o cuelga de él. */
export const isWithin = (path, root) => root === '/' || path === root || path.startsWith(`${root}/`);

export function replacePrefix(path, from, to) {
  if (path === from) return to;
  return joinPath(to, path.slice(from.length + 1)).replace(/^\/\//, '/');
}

export function ancestorsOf(path) {
  const out = [];
  let cur = path;
  while (cur !== '/') {
    out.push(cur);
    cur = parentOf(cur);
  }
  return out;
}

/** Variante numerada de un nombre: ("foto.jpg", 1) -> "foto (1).jpg". */
export function suffixed(name, n) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
}
