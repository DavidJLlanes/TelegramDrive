import { Router } from 'express';
import { wrap } from '../utils/async-handler.js';

/** Gestión (con sesión) de los enlaces compartidos; el acceso público está en routes/share.js. */
export function sharingRoutes({ catalog }) {
  const router = Router();
  router.get('/shares', (_req, res) => res.json({ shares: catalog.shares.list() }));
  router.post('/shares', wrap(async (req, res) => res.status(201).json(catalog.shares.create(req.body ?? {}))));
  router.delete('/shares/:token', (req, res) => { catalog.shares.revoke(req.params.token); res.status(204).end(); });
  return router;
}
