import { Router } from 'express';
import { wrap } from '../../utils/async-handler.js';

/** /api/lyrics/:id  — GET (letra o null), PUT { text }, DELETE, POST …/import (desde las etiquetas del archivo). */
export function createRoutes(service) {
  const router = Router();
  router.get('/lyrics/:id', wrap((req, res) => res.json({ lyrics: service.get(req.params.id) })));
  router.put('/lyrics/:id', wrap((req, res) => res.json({ lyrics: service.set(req.params.id, req.body?.text ?? '') })));
  router.delete('/lyrics/:id', wrap((req, res) => res.json({ removed: service.remove(req.params.id) })));
  router.post('/lyrics/:id/import', wrap(async (req, res) => res.json({ lyrics: await service.importEmbedded(req.params.id) })));
  return router;
}
