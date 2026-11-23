export const lyricsConfig = Object.freeze({
  maxChars: 20000,          // una letra larga ronda los 3 000
  embeddedReadBytes: 2 * 1024 * 1024, // las letras incrustadas viven en la cabecera ID3
  retryAfterMs: 30 * 86_400_000, // una canción sin resultado no se vuelve a buscar sola hasta pasado este tiempo
  bulkLimit: 5000,
  candidates: 8,
});
