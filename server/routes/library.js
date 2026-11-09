import { Router } from 'express';
import { wrap } from '../utils/async-handler.js';
import { cleanOverrides } from '../utils/tag-merge.js';
import { badRequest } from '../utils/errors.js';

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

  // Corrección de etiquetas (se guarda en Telegram, en el pie del mensaje; el archivo no se modifica).
  router.patch('/files/:id/tags', wrap(async (req, res) => {
    const row = await catalog.retag.track(req.params.id, req.body ?? {});
    res.json(catalog.toDto(row));
  }));
  router.post('/library/retag', (req, res) => {
    const { filter, set } = req.body ?? {};
    const where = { artist: text(filter?.artist), album: text(filter?.album), genre: text(filter?.genre) };
    const changes = cleanOverrides(set ?? {});
    if (!Object.values(where).some(Boolean)) throw badRequest('Indica artista, álbum o género a modificar');
    if (!Object.keys(changes).length) throw badRequest('No hay ningún cambio válido que aplicar');
    const started = catalog.retag.start(where, changes);
    res.status(started ? 202 : 409).json(catalog.retag.state());
  });
  return router;
}
