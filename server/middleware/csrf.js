import { HttpError } from '../utils/errors.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa CSRF para toda petición que modifica algo: SameSite=Lax no basta, porque otro subdominio del mismo sitio
 * (p. ej. otra app en *.tudominio.es) cuenta como «mismo sitio». El navegador indica de dónde viene la petición:
 * se rechaza si `Sec-Fetch-Site` no es el propio origen o, a falta de él, si `Origin` no coincide con `Host`.
 */
export function sameOriginOnly(req, _res, next) {
  if (SAFE.has(req.method)) return next();
  const site = req.get('sec-fetch-site');
  if (site) return next(site === 'same-origin' || site === 'none' ? undefined : new HttpError(403, 'Petición de otro origen rechazada'));
  const origin = req.get('origin');
  if (!origin) return next(); // clientes sin navegador (curl, pruebas): no hay cookie ajena que abusar
  let host = '';
  try { host = new URL(origin).host; } catch { /* origen ilegible */ }
  return next(host === req.get('host') ? undefined : new HttpError(403, 'Petición de otro origen rechazada'));
}
