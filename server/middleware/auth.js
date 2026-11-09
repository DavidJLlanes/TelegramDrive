import { config } from '../config/index.js';
import { sign, safeEqual } from '../utils/crypto.js';
import { unauthorized } from '../utils/errors.js';
import { isRevoked, revoke } from './session-revocation.js';

const { cookieName, secret, ttlDays } = config.auth;

export function issueSession(res, secure) {
  const exp = Date.now() + ttlDays * 86400_000;
  const token = `${exp}.${sign(String(exp), secret)}`;
  res.cookie(cookieName, token, {
    httpOnly: true, sameSite: 'lax', secure, path: config.basePath, maxAge: ttlDays * 86400_000,
  });
}

export const clearSession = (res) => res.clearCookie(cookieName, { path: config.basePath });

function readCookie(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === cookieName) return v.join('=');
  }
  return '';
}

export function isAuthenticated(req) {
  const [exp, sig] = readCookie(req).split('.');
  if (!exp || !sig || !(Number(exp) >= Date.now()) || isRevoked(sig)) return false; // «>=» rechaza también NaN
  return safeEqual(sig, sign(exp, secret));
}

/** Cierra la sesión: borra la cookie y deja inservible la copia que ya existiera. */
export function endSession(req, res) {
  if (isAuthenticated(req)) { const [exp, sig] = readCookie(req).split('.'); revoke(sig, exp); }
  clearSession(res);
}

export function requireAuth(req, _res, next) {
  next(isAuthenticated(req) ? undefined : unauthorized());
}
