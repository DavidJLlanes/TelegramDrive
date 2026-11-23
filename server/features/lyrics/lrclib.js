// Cliente de LRCLIB (lrclib.net): base de letras abierta, sin clave. Solo habla con ese servidor (la dirección es fija:
// nada que venga de la petición decide a dónde se conecta) y solo le envía título, artista, álbum y duración.
import { HttpError } from '../../utils/errors.js';

const BASE = 'https://lrclib.net/api';
const MAX_BYTES = 2 * 1024 * 1024;
const USER_AGENT = 'TelegramDrive/1.0 (https://github.com/DavidJLlanes/TelegramDrive)';
/** Fallo de LRCLIB: no es un error nuestro, y su mensaje sí se enseña al usuario. */
const upstream = (status, message) => Object.assign(new HttpError(status, message), { expose: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `gapMs`: pausa mínima entre peticiones (LRCLIB es un servicio gratuito: se le pide poco y despacio). */
export function createLrclib({ base = BASE, gapMs = 250, timeoutMs = 12_000 } = {}) {
  let chain = Promise.resolve();

  async function call(path, params) {
    const url = new URL(base + path);
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '' && v !== 0) url.searchParams.set(k, String(v));
    let res;
    try {
      res = await globalThis.fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
    } catch { throw upstream(502, 'No se pudo contactar con LRCLIB (servicio de letras)'); }
    if (res.status === 404) return null;
    if (res.status === 429) throw upstream(503, 'LRCLIB pide esperar un poco: inténtalo de nuevo en unos minutos');
    if (!res.ok) throw upstream(502, 'LRCLIB no respondió correctamente');
    if (Number(res.headers.get('content-length') || 0) > MAX_BYTES) throw upstream(502, 'Respuesta de LRCLIB demasiado grande');
    const text = await res.text();
    if (text.length > MAX_BYTES) throw upstream(502, 'Respuesta de LRCLIB demasiado grande');
    try { return JSON.parse(text); } catch { throw upstream(502, 'Respuesta de LRCLIB no válida'); }
  }

  /** Cola de una en una, con pausa entre peticiones, aunque haya varias búsquedas a la vez. */
  const request = (path, params) => {
    const run = chain.then(() => call(path, params));
    chain = run.catch(() => {}).then(() => sleep(gapMs));
    return run;
  };

  const shape = (r) => ({
    id: Number(r.id), title: String(r.trackName ?? r.name ?? ''), artist: String(r.artistName ?? ''), album: String(r.albumName ?? ''),
    duration: Math.round(Number(r.duration) || 0), instrumental: Boolean(r.instrumental),
    synced: Boolean(r.syncedLyrics && String(r.syncedLyrics).trim()), text: String(r.syncedLyrics || r.plainLyrics || '').trim(),
  });
  const valid = (r) => r && Number.isSafeInteger(Number(r.id));

  return {
    /** Coincidencia exacta por metadatos (con duración, tolera ±2 s). */
    async exact({ title, artist, album, duration }) {
      const r = await request('/get', { track_name: title, artist_name: artist, album_name: album, duration });
      return valid(r) ? shape(r) : null;
    },
    async search({ title, artist, q }) {
      const list = await request('/search', q ? { q } : { track_name: title, artist_name: artist });
      return Array.isArray(list) ? list.filter(valid).slice(0, 20).map(shape) : [];
    },
    async byId(id) {
      const r = await request(`/get/${Number(id)}`);
      return valid(r) ? shape(r) : null;
    },
  };
}
