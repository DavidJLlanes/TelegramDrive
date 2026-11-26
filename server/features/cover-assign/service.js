import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/index.js';
import { shrinkCover } from '../../services/cover.js';
import { HttpError } from '../../utils/errors.js';
import { removeCover, clearNoCover } from '../../services/thumbnails.js';

/** Pone una misma imagen como carátula de varias pistas. Con `replace` falso respeta las que ya tienen una. */
export function createService({ catalog }) {
  return {
    async assign({ ids, image, replace = false }) {
      const small = await shrinkCover(image);
      if (!small) throw new HttpError(422, 'No se pudo leer la imagen (usa JPG, PNG o WebP)');
      let updated = 0; let skipped = 0;
      for (const id of [...new Set(ids.map(Number).filter(Number.isInteger))].slice(0, 5000)) {
        let entry;
        try { entry = catalog.getFile(id); } catch { skipped += 1; continue; }
        if (entry.kind !== 'audio' || (entry.thumb && !replace)) { skipped += 1; continue; }
        await fs.writeFile(path.join(config.thumbsDir, `${id}.jpg`), small);
        await clearNoCover(id);
        catalog.repo.markCover(id);
        updated += 1;
      }
      return { updated, skipped };
    },

    /** Quita la carátula de varias pistas (queda sin imagen y no vuelve a ponerse sola). */
    async remove({ ids }) {
      if (!Array.isArray(ids) || !ids.length) throw new HttpError(400, 'No hay nada seleccionado');
      let removed = 0;
      for (const id of [...new Set(ids.map(Number).filter(Number.isInteger))].slice(0, 5000)) {
        let entry;
        try { entry = catalog.getFile(id); } catch { continue; }
        if (entry.kind !== 'audio') continue;
        await removeCover(id);
        catalog.repo.unmarkCover(id);
        removed += 1;
      }
      return { removed };
    },
  };
}
