// Retomar los vídeos donde se dejaron.
import { onVideoLoad } from '../../players/video-hooks.js';
import { toast } from '../../ui/toast.js';
import { resumePoint, savePosition } from './store.js';

const SAVE_EVERY_MS = 5000;

onVideoLoad((video, file) => {
  let last = 0;
  const save = () => savePosition(file.id, video.currentTime, video.duration);
  video.addEventListener('loadedmetadata', () => {
    const t = resumePoint(file.id, video.duration);
    if (!t) return;
    video.currentTime = t;
    toast(`Retomando donde lo dejaste (${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')})`);
  }, { once: true });
  video.addEventListener('timeupdate', () => { if (Date.now() - last > SAVE_EVERY_MS) { last = Date.now(); save(); } });
  video.addEventListener('pause', save);
  video.addEventListener('ended', () => savePosition(file.id, 0, video.duration));
});
