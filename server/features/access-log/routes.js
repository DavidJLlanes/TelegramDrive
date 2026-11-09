import { Router } from 'express';

/** /api/security/* (requiere sesión). */
export function createRoutes(service) {
  const router = Router();
  router.get('/security/log', (req, res) => res.json({ entries: service.list(req.query.limit, ['login', 'share'].includes(req.query.event) ? req.query.event : undefined) }));
  router.get('/security/summary', (_req, res) => res.json(service.summary()));
  router.post('/security/devices/ack', (_req, res) => { service.ackDevices(); res.json(service.summary()); });
  return router;
}
