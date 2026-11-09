import { Router } from 'express';

const text = (v) => (typeof v === 'string' ? v : undefined);

/** Reproducción por carpeta y biblioteca por etiquetas. */
export function libraryRoutes({ catalog }) {
  const router = Router();
  const { library } = catalog;

  router.get('/queue', (req, res) => {
    res.json({ files: library.queue(req.query.path ?? '/', { recursive: req.query.recursive === '1' }) });
  });
  router.get('/library/artists', (_req, res) => res.json({ artists: library.artists() }));
  router.get('/library/genres', (_req, res) => res.json({ genres: library.genres() }));
  router.get('/library/albums', (req, res) => {
    res.json({ albums: library.albums({ band: text(req.query.artist), genre: text(req.query.genre) }) });
  });
  router.get('/library/tracks', (req, res) => {
    res.json({ files: library.tracks({ band: text(req.query.artist), album: text(req.query.album), genre: text(req.query.genre) }) });
  });
  return router;
}
