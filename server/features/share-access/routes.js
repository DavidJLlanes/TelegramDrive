import express, { Router } from 'express';
import { config } from '../../config/index.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { wrap } from '../../utils/async-handler.js';
import { HttpError } from '../../utils/errors.js';
import { emitSafe } from '../../core/events.js';
import { renderGate } from './page.js';

const cookieName = (token) => `tgd_su_${token.slice(0, 10)}`;
const grantName = (token) => `tgd_sg_${token.slice(0, 10)}`;
function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}
const who = (req) => ({ ip: req.ip, ua: req.get('user-agent') });

/** Montado en /share ANTES del manejador del núcleo: filtra por contraseña y cupo y deja pasar el resto. */
export function createPublicRouter({ service, shares }) {
  const router = Router();
  const unlockLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10 });
  const gate = (res, share, error = '', status = 200) =>
    res.status(status).set({ 'Cache-Control': 'no-store' }).type('html').send(renderGate({ base: config.basePath === '/' ? '' : config.basePath, token: share.token, label: share.label, error }));

  router.get('/:token', (req, res, next) => {
    const share = shares.resolve(req.params.token);
    if (!share) return next();
    const verdict = service.evaluate(share.token, { unlockedCookie: readCookie(req, cookieName(share.token)), grantCookie: readCookie(req, grantName(share.token)), range: req.headers.range, method: req.method });
    if (verdict.state === 'locked') { emitSafe('share:access', { ...who(req), token: share.token, ok: false, reason: 'pide contraseña' }); return gate(res, share); }
    if (verdict.state === 'exhausted') { emitSafe('share:access', { ...who(req), token: share.token, ok: false, reason: 'límite alcanzado' }); return next(new HttpError(410, 'Este enlace ha alcanzado su límite de descargas')); }
    if (verdict.counted) emitSafe('share:access', { ...who(req), token: share.token, ok: true });
    if (verdict.grant) res.cookie(grantName(share.token), service.grant(share.token), { httpOnly: true, sameSite: 'lax', secure: req.secure, path: `${config.basePath === '/' ? '' : config.basePath}/share/${share.token}`, maxAge: 6 * 3_600_000 });
    return next();
  });

  router.post('/:token/unlock', express.urlencoded({ extended: false, limit: '4kb' }), unlockLimiter, (req, res, next) => {
    const share = shares.resolve(req.params.token);
    if (!share) return next();
    try {
      const value = service.unlock(share.token, req.body?.password);
      if (value) {
        res.cookie(cookieName(share.token), value, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: `${config.basePath === '/' ? '' : config.basePath}/share/${share.token}`, maxAge: 3_600_000 });
      }
      return res.redirect(303, `${config.basePath === '/' ? '' : config.basePath}/share/${share.token}`);
    } catch (err) {
      emitSafe('share:access', { ...who(req), token: share.token, ok: false, reason: 'contraseña incorrecta' });
      return gate(res, share, err.message, err.status ?? 401);
    }
  });
  return router;
}

/** /api/shares/* (con sesión): fijar y consultar contraseña y límite de un enlace. */
export function createAdminRouter(service) {
  const router = Router();
  router.get('/shares/policy', (_req, res) => res.json({ policies: service.list() }));
  router.put('/shares/:token/policy', wrap(async (req, res) => res.json(service.setPolicy(req.params.token, req.body ?? {}))));
  return router;
}
