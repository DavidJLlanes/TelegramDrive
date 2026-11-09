// Lanzadores de reproducción: por carpeta (con subcarpetas) o por etiquetas.
import { api } from './api.js';
import { playList } from '../players/audio-player.js';
import { toast, toastError } from '../ui/toast.js';

async function start(loader, empty, options) {
  try {
    const { files } = await loader();
    if (!files.length) { toast(empty); return; }
    playList(files, options);
  } catch (err) { toastError(err); }
}

export const playFolder = (path, options = {}) =>
  start(() => api.queue(path, true), 'No hay música en esta carpeta', options);

/** filter: { artist?, album?, genre? } */
export const playTagged = (filter, options = {}) =>
  start(() => api.tracks(filter), 'No hay canciones con esas etiquetas', options);
