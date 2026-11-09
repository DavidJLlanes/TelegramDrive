import { Router } from 'express';

/** GET /api/usage → uso de espacio por tipo, por carpeta y archivos más grandes. */
export function createRoutes(service) {
  const router = Router();
  router.get('/usage', (_req, res) => res.json(service.report()));
  return router;
}
