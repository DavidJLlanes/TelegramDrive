import { Router } from 'express';
import { badRequest } from '../../utils/errors.js';

/** POST /api/files/check { parent, items: [{ dir?, name, size }] } → { same: [índices], differs: [índices] }. */
export function createRoutes(service, settings) {
  const router = Router();
  router.post('/files/check', (req, res, next) => {
    try {
      const { parent, items } = req.body ?? {};
      if (!Array.isArray(items) || items.length > settings.maxItems) throw badRequest(`Indica entre 1 y ${settings.maxItems} elementos`);
      if (items.some((i) => !i || typeof i.name !== 'string' || !Number.isFinite(Number(i.size)))) throw badRequest('Cada elemento necesita nombre y tamaño');
      res.json(service.check({ parent: typeof parent === 'string' ? parent : '/', items }));
    } catch (err) { next(err); }
  });
  return router;
}
