import { Router } from 'express';

/** /api/photos/* — línea de tiempo (por fecha EXIF), estado del análisis y relectura. */
export function createRoutes(service) {
  const router = Router();
  router.get('/photos/timeline', (req, res) => res.json(service.timeline({ offset: req.query.offset, limit: req.query.limit })));
  router.get('/photos/status', (_req, res) => res.json(service.status()));
  router.post('/photos/scan', (_req, res) => { service.scan(); res.status(202).json(service.status()); });
  return router;
}
