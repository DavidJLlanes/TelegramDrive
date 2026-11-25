import { Router } from 'express';
import { wrap } from '../../utils/async-handler.js';
import { notFound } from '../../utils/errors.js';
import { getCachedImage } from '../../services/image-cache/images.js';
import { getThumbnail } from '../../services/thumbnails.js';
import { pruneCache } from '../../services/image-cache/prune.js';
import { migrateLegacyThumbs } from '../../services/image-cache/legacy.js';

export default {
  name: 'image-cache',
  create({ catalog, tg }) {
    const router = Router();
    const serve = (kind) => wrap(async (req, res) => {
      const entry = catalog.getFile(req.params.id);
      if (entry.kind !== 'image') {
        // Audio y vídeo: la miniatura es la carátula extraída o la de Telegram, sin conversión.
        const bytes = kind === 'thumb' ? await getThumbnail(tg, entry.id) : null;
        if (!bytes) throw notFound(kind === 'thumb' ? 'Sin miniatura' : 'No es una fotografía');
        // no-cache + ETag: si se cambia la carátula, todos los dispositivos la ven al momento (y si no cambió, responde 304)
        return res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-cache' }).send(bytes);
      }
      const result = await getCachedImage(tg, entry, kind);
      if (!result) throw notFound('Vista previa no disponible');
      res.set({ 'Content-Type': result.type, 'Cache-Control': 'private, max-age=604800' });
      if (result.path) res.sendFile(result.path);
      else res.end(result.bytes);
    });
    router.get('/files/:id/thumb', serve('thumb'));
    router.get('/files/:id/preview', serve('preview'));
    let first; let timer;
    const sweep = () => migrateLegacyThumbs(catalog).then(() => pruneCache())
      .catch((err) => console.warn('[caché]', err.message));
    return {
      router,
      start() {
        first = setTimeout(sweep, 20_000); first.unref?.();
        timer = setInterval(sweep, 30 * 60_000); timer.unref?.();
      },
      stop() { clearTimeout(first); clearInterval(timer); },
    };
  },
};
