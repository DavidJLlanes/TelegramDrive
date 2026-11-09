import { Router } from 'express';
import { wrap } from '../../utils/async-handler.js';

/** /api/photo-albums — álbumes de fotos (aparte de las listas de reproducción, que son de música). */
export function createRoutes(service) {
  const router = Router();
  router.get('/photo-albums', (_req, res) => res.json({ albums: service.list() }));
  router.post('/photo-albums', wrap((req, res) => res.status(201).json({ album: service.create(req.body?.name, req.body?.ids) })));
  router.get('/photo-albums/:id', wrap((req, res) => res.json(service.open(req.params.id))));
  router.patch('/photo-albums/:id', wrap((req, res) => res.json({ album: service.rename(req.params.id, req.body?.name) })));
  router.delete('/photo-albums/:id', wrap((req, res) => res.json({ removed: service.remove(req.params.id) })));
  router.post('/photo-albums/:id/items', wrap((req, res) => res.json(service.add(req.params.id, req.body?.ids))));
  router.delete('/photo-albums/:id/items', wrap((req, res) => res.json(service.removeItems(req.params.id, req.body?.ids))));
  return router;
}
