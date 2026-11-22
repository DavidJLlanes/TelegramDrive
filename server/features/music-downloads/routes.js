import { Router } from 'express';
import { wrap } from '../../utils/async-handler.js';

export function createRoutes(service) {
  const router = Router();
  router.get('/music-downloads', wrap(async (_req, res) => res.json(await service.status())));
  router.post('/music-downloads/direct', wrap(async (req, res) => res.status(202).json(service.enqueueDirect(req.body?.url, req.body?.folder))));
  router.post('/music-downloads/spotify', wrap(async (req, res) => res.status(202).json(service.enqueueSpotify(req.body?.url, req.body?.folder))));
  router.post('/music-downloads/inspect', wrap(async (req, res) => res.json(await service.inspect(req.body?.url, req.body?.offset))));
  router.post('/music-downloads', wrap(async (req, res) => res.status(202).json(service.enqueue(req.body?.items))));
  router.post('/music-downloads/:id/pause', wrap(async (req, res) => res.json(service.pause(req.params.id))));
  router.post('/music-downloads/:id/resume', wrap(async (req, res) => res.json(service.resume(req.params.id))));
  router.post('/music-downloads/:id/priority', wrap(async (req, res) => res.json(service.prioritize(req.params.id, req.body?.priority))));
  router.post('/music-downloads/:id/retry', wrap(async (req, res) => res.json(service.retry(req.params.id))));
  router.post('/music-downloads/:id/cancel', wrap(async (req, res) => res.json(service.cancel(req.params.id))));
  router.delete('/music-downloads/:id', wrap(async (req, res) => res.json(service.remove(req.params.id))));
  return router;
}
