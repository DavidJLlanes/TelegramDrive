import { Router } from 'express';
import { normalizePath } from '../../utils/paths.js';

/** POST /api/covers/rescan → relee etiquetas y carátulas; GET /api/covers/rescan → estado. */
export function createRoutes(service) {
  const router = Router();
  router.get('/covers/rescan', (_req, res) => res.json(service.state()));
  router.post('/covers/rescan', (req, res) => {
    const folder = normalizePath(String(req.body?.folder ?? '/'));
    const started = service.start({ folder, lookup: req.body?.lookup !== false });
    res.status(started ? 202 : 409).json(service.state());
  });
  return router;
}
