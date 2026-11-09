import { Router } from 'express';
import { wrap } from '../../utils/async-handler.js';

/** /api/backup/* (con sesión). */
export function createRoutes(service) {
  const router = Router();
  router.get('/backup/status', (_req, res) => res.json(service.status()));
  router.post('/backup/run', wrap(async (_req, res) => res.json(await service.run())));
  return router;
}
