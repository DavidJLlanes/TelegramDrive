// Buscar la letra de una canción en LRCLIB: candidatos para elegir, adopción de uno y modo automático.
import { badRequest, notFound } from '../../utils/errors.js';
import { queryFor, score } from './query.js';

const PREVIEW_LINES = 3;
const stripStamps = (text) => text.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, '').split('\n').map((l) => l.trim()).filter((l) => l && !/^\[[a-z]{2,}:/i.test(l));

export function createFinder({ repo, catalog, client, settings }) {
  const audio = (id) => {
    const file = catalog.getFile(id);
    if (file.kind !== 'audio') throw badRequest('Solo las canciones tienen letra');
    return file;
  };
  const preview = (text) => stripStamps(text).slice(0, PREVIEW_LINES).join(' / ');
  const rank = (query, list) => list.filter((c) => c.text || c.instrumental)
    .map((c) => ({ ...c, ...score(query, c) })).sort((a, b) => b.value - a.value);

  /** Respuestas de LRCLIB ordenadas de mejor a peor. `q`: texto libre para afinar la búsqueda a mano. */
  async function candidates(file, q) {
    const query = queryFor(file);
    if (!q && !query.title) return { query, list: [] };
    const found = new Map();
    const add = (list) => list.forEach((c) => found.set(c.id, c));
    if (q) add(await client.search({ q: String(q).slice(0, 200) }));
    else {
      if (query.artist) { const exact = await client.exact(query); if (exact) add([exact]); }
      add(await client.search(query));
    }
    return { query, list: rank(query, [...found.values()]).slice(0, settings.candidates) };
  }

  return {
    async search(id, q) {
      const { query, list } = await candidates(audio(id), q);
      return {
        query: { title: query.title, artist: query.artist },
        candidates: list.map((c) => ({ id: c.id, title: c.title, artist: c.artist, album: c.album, duration: c.duration, synced: c.synced, instrumental: c.instrumental, preview: preview(c.text), confident: c.confident })),
      };
    },

    /** Guarda la letra elegida. El texto lo pide el servidor a LRCLIB: no se acepta del cliente. */
    async adopt(id, lrclibId) {
      audio(id);
      if (!Number.isSafeInteger(Number(lrclibId))) throw badRequest('Letra no válida');
      const c = await client.byId(lrclibId);
      if (!c) throw notFound('Esa letra ya no está en LRCLIB');
      if (!c.text) throw badRequest(c.instrumental ? 'LRCLIB marca esta pista como instrumental' : 'Esa letra está vacía');
      repo.upsert(Number(id), c.text.replace(/\r\n?/g, '\n').replace(/\0/g, '').slice(0, settings.maxChars), 'lrclib');
      repo.markTried(Number(id), 'found');
      return repo.get(Number(id));
    },

    /**
     * Modo automático (al sonar una pista o en la búsqueda masiva): guarda la mejor respuesta solo si es segura.
     * → { state: 'found' | 'none' | 'skipped', lyrics }
     */
    async auto(id) {
      const file = audio(id);
      const existing = repo.get(Number(id));
      if (existing) return { state: 'skipped', lyrics: existing };
      const past = repo.lookup(Number(id));
      if (past && (past.result === 'removed' || Date.now() - past.triedAt < settings.retryAfterMs)) return { state: 'skipped', lyrics: null };
      const { list } = await candidates(file);
      const best = list.find((c) => c.confident && c.text);
      if (!best) { repo.markTried(Number(id), list.some((c) => c.instrumental && c.confident) ? 'instrumental' : 'none'); return { state: 'none', lyrics: null }; }
      repo.upsert(Number(id), best.text.replace(/\r\n?/g, '\n').replace(/\0/g, '').slice(0, settings.maxChars), 'lrclib');
      repo.markTried(Number(id), 'found');
      return { state: 'found', lyrics: repo.get(Number(id)) };
    },
  };
}
