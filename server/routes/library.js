import { Router } from 'express';
import { wrap } from '../utils/async-handler.js';
import { cleanOverrides, TAG_KEYS } from '../utils/tag-merge.js';
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
    const { filter, set, ids } = req.body ?? {};
    const where = { artist: text(filter?.artist), album: text(filter?.album), genre: text(filter?.genre) };
    const byIds = Array.isArray(ids);
    // un valor vacío quita la corrección de ese campo
    const cleared = Object.fromEntries(TAG_KEYS.filter((k) => set?.[k] === '').map((k) => [k, '']));
    const changes = { ...cleanOverrides(set ?? {}), ...cleared };
    if (!byIds && !Object.values(where).some(Boolean)) throw badRequest('Indica artista, álbum o género a modificar, o una lista de canciones');
    if (!Object.keys(changes).length) throw badRequest('No hay ningún cambio válido que aplicar');
    const started = byIds
      ? catalog.retag.startRows(catalog.repo.byIds(ids.map(Number).filter(Number.isInteger).slice(0, 5000)).filter((r) => r.kind === 'audio'), changes)
      : catalog.retag.start(where, changes);
    res.status(started ? 202 : 409).json(catalog.retag.state());
  });
  return router;
}
