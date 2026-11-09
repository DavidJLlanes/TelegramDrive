import { Router } from 'express';
import { wrap } from '../utils/async-handler.js';

/** Listas de reproducción. */
export function playlistRoutes({ catalog }) {
  const router = Router();
  const { playlists } = catalog;

  router.get('/playlists', (_req, res) => res.json({ playlists: playlists.list() }));
  router.get('/playlists/:id', (req, res) => res.json(playlists.get(req.params.id)));
  router.post('/playlists', wrap(async (req, res) => res.status(201).json(await playlists.create(req.body ?? {}))));
  router.patch('/playlists/:id', wrap(async (req, res) => res.json(await playlists.update(req.params.id, req.body ?? {}))));
  router.delete('/playlists/:id', wrap(async (req, res) => { await playlists.delete(req.params.id); res.status(204).end(); }));
  return router;
}
