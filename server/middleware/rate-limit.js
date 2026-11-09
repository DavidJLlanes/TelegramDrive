import { HttpError } from '../utils/errors.js';

/** Limitador mínimo en memoria por IP (suficiente para un login personal). `limiter.reset(ip)` borra el contador. */
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  const limiter = (req, _res, next) => {
    const now = Date.now();
    const rec = hits.get(req.ip);
    if (!rec || rec.reset < now) {
      hits.set(req.ip, { count: 1, reset: now + windowMs });
      return next();
    }
    rec.count += 1;
    return next(rec.count > max ? new HttpError(429, 'Demasiados intentos. Espera unos minutos.') : undefined);
  };
  limiter.reset = (ip) => hits.delete(ip);
  return limiter;
}
