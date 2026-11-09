import { badRequest, notFound } from '../../utils/errors.js';
import { extractLyrics } from './embedded.js';

const normalize = (text) => String(text).replace(/\r\n?/g, '\n').replace(/\0/g, '').trim();

export function createService({ repo, catalog, tg, settings }) {
  const audio = (id) => {
    const file = catalog.getFile(id);
    if (file.kind !== 'audio') throw badRequest('Solo las canciones tienen letra');
    return file;
  };

  return {
    get(id) { audio(id); return repo.get(Number(id)); },
    set(id, text) {
      audio(id);
      const clean = normalize(text);
      if (!clean) throw badRequest('La letra está vacía');
      if (clean.length > settings.maxChars) throw badRequest(`La letra supera los ${settings.maxChars} caracteres`);
      repo.upsert(Number(id), clean, 'manual');
      return repo.get(Number(id));
    },
    remove(id) { audio(id); return repo.remove(Number(id)); },
    /** Copia la letra que lleve el propio archivo. */
    async importEmbedded(id) {
      const file = audio(id);
      const message = await tg.getMessage(Number(id));
      const end = Math.min(file.size, settings.embeddedReadBytes) - 1;
      const parts = [];
      for await (const chunk of tg.readRange(message, 0, end)) parts.push(chunk);
      const text = (await extractLyrics(Buffer.concat(parts), file.name, file.size)).slice(0, settings.maxChars);
      if (!text) throw notFound('Este archivo no trae la letra en sus etiquetas');
      repo.upsert(Number(id), text, 'file');
      return repo.get(Number(id));
    },
    purgeOrphans: () => repo.purgeOrphans(),
  };
}
