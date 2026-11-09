import { Router } from 'express';

/** GET /api/audit/library → informe de calidad de la biblioteca de música. */
export function createRoutes(service) {
  const router = Router();
  router.get('/audit/library', (_req, res) => res.json(service.report()));
  return router;
}
