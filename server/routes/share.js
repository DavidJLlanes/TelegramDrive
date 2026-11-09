import { Router } from 'express';
import { wrap } from '../utils/async-handler.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { streamEntry } from '../services/streamer.js';
import { notFound } from '../utils/errors.js';

/** Enlaces públicos (sin sesión): /share/<token>. Solo sirven el archivo o la carpeta compartidos, hasta que caducan. */
export function shareRoutes({ catalog, tg }) {
  const router = Router();
  router.use(rateLimit({ windowMs: 60_000, max: 120 }));
  router.use((_req, res, next) => { res.set({ 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' }); next(); });

  router.get('/:token', wrap(async (req, res) => {
    const share = catalog.shares.resolve(req.params.token);
    if (!share) throw notFound('Este enlace no existe o ha caducado');
    if (share.kind === 'file') {
      const entry = catalog.getFile(share.target);
      await streamEntry({ req, res, tg, entry, download: req.query.download === '1' });
    } else {
      const id = String(share.target).startsWith('/') ? catalog.tree.resolve(share.target) : share.target; // enlaces antiguos guardaban la ruta
      if (id === null || !catalog.tree.exists(id)) throw notFound('La carpeta ya no existe');
      catalog.archive.stream(res, catalog.archive.forFolder(catalog.tree.pathOf(id)));
    }
  }));
  return router;
}
