import { normalizeOptions } from './options.js';

const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const optionsOf = (job) => normalizeOptions(JSON.parse(job.optionsJson || '{}'));

/**
 * ¿Ya se descargó esta fuente y sigue en la biblioteca? Si se pide ahora otra carpeta propia distinta,
 * no cuenta como repetida: se puede volver a descargar en otro sitio.
 */
export function alreadyDownloaded(previous, options, catalog) {
  if (!previous?.fileId) return false;
  try { catalog.getFile(previous.fileId); } catch { return false; }
  return same(optionsOf(previous).folder, options.folder);
}

/** En un reintento: ¿esta canción ya está subida en el destino? (mismo nombre y, si ya está etiquetada, mismo artista). */
export function songAlreadyUploaded(catalog, destination, song) {
  const row = catalog.fileOps.existing(destination, song.name);
  if (!row) return false;
  if (row.tagged !== 1) return true;
  return same(row.artist, song.artist) || same(row.band, song.artist);
}
