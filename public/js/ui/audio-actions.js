// Acciones específicas de música en los menús: cola, listas, sin conexión y etiquetas.
import { appState } from '../core/store.js';
import { isSaved, saveOffline, removeOffline, offlineSupported } from '../core/offline.js';
import { enqueueTrack } from '../players/audio-player.js';
import { addToPlaylist } from './playlist-picker.js';
import { editTrackTags } from './tag-editor.js';
import { toast, toastError } from './toast.js';

/** Guarda o quita de "sin conexión" las canciones indicadas (si todas están guardadas, las quita). */
export async function toggleOffline(files) {
  const audio = files.filter((f) => f.kind === 'audio');
  if (!audio.length) return;
  try {
    if (audio.every((f) => isSaved(f.id))) {
      await removeOffline(audio.map((f) => f.id));
      toast('Quitado de la música sin conexión');
    } else {
      toast(`Guardando ${audio.length === 1 ? '1 canción' : `${audio.length} canciones`} para escuchar sin conexión…`, { timeout: 6000 });
      await saveOffline(audio);
      toast('Disponible sin conexión', { type: 'ok' });
    }
    appState.set({ offlineTick: Date.now() });   // repinta los marcadores
  } catch (err) { toastError(err); }
}

export function audioItems(file) {
  return [
    { label: 'Reproducir a continuación', icon: 'play', run: () => { if (enqueueTrack(file)) toast('Sonará a continuación'); } },
    { label: 'Añadir al final de la cola', icon: 'queue', run: () => { if (enqueueTrack(file, { last: true })) toast('Añadida a la cola'); } },
    { label: 'Añadir a una lista…', icon: 'playlist', run: () => addToPlaylist([file.id]) },
    offlineSupported() && { label: isSaved(file.id) ? 'Quitar de sin conexión' : 'Guardar sin conexión', icon: 'cloud', run: () => toggleOffline([file]) },
    { label: 'Editar etiquetas…', icon: 'tag', run: () => editTrackTags(file) },
  ].filter(Boolean);
}
