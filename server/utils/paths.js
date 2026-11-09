import { badRequest } from './errors.js';

const MAX_NAME = 120;
const MAX_PATH = 400;
const FORBIDDEN = /[\\/\u0000-\u001f]/;

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
  const clean = String(name ?? '').trim();
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

/** Devuelve un nombre libre: "foto.jpg" -> "foto (1).jpg". */
export function uniqueName(name, taken) {
  if (!taken.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let n = 1; ; n += 1) {
    const candidate = `${stem} (${n})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
