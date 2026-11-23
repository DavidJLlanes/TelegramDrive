// Búsqueda automática de la letra de la canción que suena. Una sola petición por canción aunque la pidan a la vez
// la barra del reproductor, la pantalla completa y el panel de letras.
import { lyricsApi } from './api.js';

const inFlight = new Map();

/** → la letra (guardada ahora o ya existente) o null. Nunca lanza: sin conexión o sin resultado es simplemente null. */
export function ensureLyrics(file) {
  if (!file || file.kind !== 'audio') return Promise.resolve(null);
  if (!inFlight.has(file.id)) {
    inFlight.set(file.id, lyricsApi.auto(file.id).then((r) => r.lyrics ?? null).catch(() => null).finally(() => inFlight.delete(file.id)));
  }
  return inFlight.get(file.id);
}
