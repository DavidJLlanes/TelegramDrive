import { Router } from 'express';
import { wrap } from '../../utils/async-handler.js';

/**
 * /api/lyrics/:id  — GET (letra o null), PUT { text }, DELETE, POST …/import (desde las etiquetas del archivo).
 * Búsqueda en internet (LRCLIB): GET …/search?q=, POST …/adopt { lrclibId }, POST …/auto.
 * Toda la biblioteca: GET /lyrics/finder, POST /lyrics/finder/start y /cancel.
 */
export function createRoutes(service, finder, bulk) {
  const router = Router();
  // Antes que /lyrics/:id, para que «finder» no se tome por un id.
  router.get('/lyrics/finder', (_req, res) => res.json(bulk.status()));
  router.post('/lyrics/finder/start', (_req, res) => res.json(bulk.start()));
  router.post('/lyrics/finder/cancel', (_req, res) => { bulk.cancel(); res.json(bulk.status()); });

  router.get('/lyrics/:id', wrap((req, res) => res.json({ lyrics: service.get(req.params.id) })));
  router.put('/lyrics/:id', wrap((req, res) => res.json({ lyrics: service.set(req.params.id, req.body?.text ?? '') })));
  router.delete('/lyrics/:id', wrap((req, res) => res.json({ removed: service.remove(req.params.id) })));
  router.post('/lyrics/:id/import', wrap(async (req, res) => res.json({ lyrics: await service.importEmbedded(req.params.id) })));
  router.get('/lyrics/:id/search', wrap(async (req, res) => res.json(await finder.search(req.params.id, String(req.query.q ?? '').trim()))));
  router.post('/lyrics/:id/adopt', wrap(async (req, res) => res.json({ lyrics: await finder.adopt(req.params.id, req.body?.lrclibId) })));
  router.post('/lyrics/:id/auto', wrap(async (req, res) => res.json(await finder.auto(req.params.id))));
  return router;
}
