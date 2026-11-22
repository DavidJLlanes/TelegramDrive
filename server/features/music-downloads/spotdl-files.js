import fs from 'node:fs/promises';
import path from 'node:path';
import { safePart } from './metadata.js';

const EXTENSIONS = new Set(['mp3', 'm4a', 'opus']);
export const MAX_SPOTDL_SONGS = 150;
export const MAX_SPOTDL_BYTES = 1024 ** 3;

/** SpotDL renders {artist}/{album}/{title}.{output-ext}; only regular audio files are imported. */
export async function spotdlFiles(root) {
  const results = [];
  async function walk(folder, segments) {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('SpotDL generó un enlace simbólico inesperado');
      if (entry.isDirectory()) {
        if (segments.length >= 3) throw new Error('La estructura de salida de SpotDL es demasiado profunda');
        await walk(path.join(folder, entry.name), [...segments, entry.name]);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (!EXTENSIONS.has(ext)) continue;
        if (segments.length !== 2) throw new Error('La música no tiene las carpetas artista y álbum');
        const info = await fs.stat(path.join(folder, entry.name));
        if (!info.isFile() || info.size < 128 || info.size > MAX_SPOTDL_BYTES) {
          throw new Error('Pista de SpotDL vacía o superior a 1 GB');
        }
        results.push({
          path: path.join(folder, entry.name), size: info.size,
          artist: safePart(segments[0], 'Por revisar'), album: safePart(segments[1], 'Singles'),
          name: safePart(path.basename(entry.name, path.extname(entry.name)), 'Canción sin título') + '.' + ext,
        });
        if (results.length > MAX_SPOTDL_SONGS) throw new Error('Límite de 150 canciones por descarga');
      }
    }
  }
  await walk(root, []);
  if (!results.length) throw new Error('SpotDL no produjo ninguna canción');
  return results;
}

export function manifestCount(content) {
  let data;
  try { data = JSON.parse(content); } catch { throw new Error('SpotDL devolvió metadatos inválidos'); }
  const songs = Array.isArray(data) ? data : data?.songs;
  if (!Array.isArray(songs) || !songs.length) throw new Error('SpotDL no encontró canciones');
  if (songs.length > MAX_SPOTDL_SONGS) throw new Error('Máximo de 150 canciones por lista o álbum');
  return songs.length;
}

/** SpotDL guarda el nombre de la lista o álbum de origen en cada pista del manifiesto (list_name). */
export function manifestListName(content) {
  try {
    const data = JSON.parse(content);
    const songs = Array.isArray(data) ? data : data?.songs;
    return safePart(songs?.find((song) => song?.list_name)?.list_name);
  } catch { return ''; }
}
