import { Router } from 'express';
import { config } from '../config/index.js';
import { verifyPassword } from '../utils/crypto.js';
import { verifyTotp } from '../utils/totp.js';
import { HttpError } from '../utils/errors.js';
import { issueSession, clearSession, isAuthenticated } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

export function authRoutes({ tg }) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60_000, max: 10 });
  const { totpSecret } = config.auth;
  let lastStep = 0; // un código TOTP solo vale una vez

  router.get('/status', (req, res) => {
    res.json({ authenticated: isAuthenticated(req), telegram: tg.connected, totp: Boolean(totpSecret) });
  });

  router.post('/login', limiter, (req, res, next) => {
    if (!verifyPassword(req.body?.password ?? '', config.auth.passwordHash)) {
      return next(new HttpError(401, 'Contraseña incorrecta'));
    }
    if (totpSecret) {
      const step = verifyTotp(totpSecret, req.body?.code);
      if (step === null || step <= lastStep) return next(new HttpError(401, 'Código incorrecto o ya usado'));
      lastStep = step;
    }
    limiter.reset(req.ip); // un acceso correcto no cuenta para el límite
    issueSession(res, req.secure);
    return res.json({ authenticated: true });
  });

  router.post('/logout', (_req, res) => {
    clearSession(res);
    res.json({ authenticated: false });
  });

  return router;
}
