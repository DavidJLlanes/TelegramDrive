// Despacha cada archivo al visor adecuado según su tipo.
import { download } from '../ui/download.js';
import { openLightbox } from './lightbox.js';
import { openVideo } from './video-player.js';
import { playAudio, extendQueue } from './audio-player.js';
import { api } from '../core/api.js';
import { appState } from '../core/store.js';

/** La lista cargada es solo una página: pide la carpeta entera de audio para que "siguiente" no se corte. */
async function expandAudioQueue(file) {
  const { results, sort } = appState.get();
  if (results !== null) return;
  try {
    const { files } = await api.list(file.parent, { kind: 'audio', sort, limit: 5000 });
    extendQueue(files);
  } catch { /* se sigue con la cola parcial */ }
}

export function openFile(file, siblings = [file]) {
  const same = (kind) => siblings.filter((f) => f.kind === kind);
  switch (file.kind) {
    case 'image': return openLightbox(file, same('image'));
    case 'video': return openVideo(file, same('video'));
    case 'audio': playAudio(file, same('audio')); return expandAudioQueue(file);
    default: return download(file);
  }
}
