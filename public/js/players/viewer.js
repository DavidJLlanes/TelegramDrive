// Despacha cada archivo al visor adecuado según su tipo.
import { download } from '../ui/download.js';
import { openLightbox } from './lightbox.js';
import { openVideo } from './video-player.js';
import { playAudio } from './audio-player.js';

export function openFile(file, siblings = [file]) {
  const same = (kind) => siblings.filter((f) => f.kind === kind);
  switch (file.kind) {
    case 'image': return openLightbox(file, same('image'));
    case 'video': return openVideo(file, same('video'));
    case 'audio': return playAudio(file, same('audio'));
    default: return download(file);
  }
}
