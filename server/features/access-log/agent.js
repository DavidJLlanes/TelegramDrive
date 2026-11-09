import { createHash } from 'node:crypto';

const BROWSERS = [[/Edg\//, 'Edge'], [/OPR\/|Opera/, 'Opera'], [/Firefox\//, 'Firefox'], [/Chrome\//, 'Chrome'], [/Safari\//, 'Safari']];
const SYSTEMS = [[/iPhone|iPad|iPod/, 'iPhone/iPad'], [/Android/, 'Android'], [/Windows/, 'Windows'], [/Mac OS X|Macintosh/, 'macOS'], [/CrOS/, 'ChromeOS'], [/Linux/, 'Linux']];
const pick = (table, ua, fallback) => table.find(([re]) => re.test(ua))?.[1] ?? fallback;

/** "Chrome en Windows": etiqueta corta y estable (no cambia con cada versión del navegador). */
export function describeAgent(ua = '') {
  return `${pick(BROWSERS, ua, 'Navegador')} en ${pick(SYSTEMS, ua, 'sistema desconocido')}`;
}

/** Identificador del dispositivo: misma etiqueta ⇒ mismo dispositivo. */
export const deviceId = (ua) => createHash('sha256').update(describeAgent(ua)).digest('hex').slice(0, 16);
