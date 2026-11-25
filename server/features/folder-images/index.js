import { Router } from 'express';
import { wrap } from '../../utils/async-handler.js';
import { notFound, HttpError } from '../../utils/errors.js';
import { normalizePath } from '../../utils/paths.js';
import { ROOT } from '../../db/folder-tree.js';
import * as images from '../../services/folder-images.js';
import { receiveCover } from '../cover-assign/receive.js';

export default {
  name: 'folder-images',
  create({ catalog }) {
    const router = Router();
    const idsOf = (paths) => [...new Set((Array.isArray(paths) ? paths : []).slice(0, 2000).map((p) => catalog.tree.resolve(normalizePath(String(p)))))]
      .filter((id) => id !== null && id !== ROOT);

    /** GET /api/folder-image/:id?v=… → la imagen (la URL lleva la versión, así que se cachea para siempre) */
    router.get('/folder-image/:id', wrap(async (req, res) => {
      const file = images.file(req.params.id);
      if (!file) throw notFound('Esta carpeta no tiene imagen');
      res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' }).sendFile(file);
    }));

    /** POST /api/folders/image (multipart: image, paths, replace) → { updated, skipped } */
    router.post('/folders/image', wrap(async (req, res) => {
      const { ids: paths, image, replace } = await receiveCover(req, 'paths');
      const bytes = await images.prepare(image);
      if (!bytes) throw new HttpError(422, 'No se pudo leer la imagen (usa JPG, PNG o WebP)');
      let updated = 0; let skipped = 0;
      for (const id of idsOf(paths)) {
        if (images.stamp(id) !== null && !replace) { skipped += 1; continue; }
        images.save(id, bytes); updated += 1;
      }
      res.json({ updated, skipped });
    }));

    /** DELETE /api/folders/image { paths } → quita la imagen (la carpeta vuelve a su color e icono) */
    router.delete('/folders/image', wrap(async (req, res) => {
      let removed = 0;
      for (const id of idsOf(req.body?.paths)) if (images.stamp(id) !== null) { images.drop(id); removed += 1; }
      res.json({ removed });
    }));
    return { router };
  },
};
