// Retomar los vídeos donde se dejaron.
import { onVideoLoad } from '../../players/video-hooks.js';
import { toast } from '../../ui/toast.js';
import { resumePoint, savePosition } from './store.js';

const SAVE_EVERY_MS = 5000;
const active = new WeakMap(); // el mismo <video> se reutiliza al pasar al siguiente: hay que soltar al anterior

onVideoLoad((video, file) => {
  active.get(video)?.finish(); // guarda el último punto del vídeo anterior y deja de escucharlo
  const ac = new AbortController();
  const on = (type, fn, opts = {}) => video.addEventListener(type, fn, { ...opts, signal: ac.signal });
  let last = 0;
  // Última posición real: al cerrar el reproductor el vídeo se descarga (currentTime = 0) antes de que llegue el evento 'pause'.
  let seen = { t: 0, d: NaN };
  const look = () => { if (video.readyState > 0 && Number.isFinite(video.duration)) seen = { t: video.currentTime, d: video.duration }; };
  const save = () => { look(); savePosition(file.id, seen.t, seen.d); };
  active.set(video, { finish: () => { savePosition(file.id, seen.t, seen.d); ac.abort(); } });

  on('loadedmetadata', () => {
    const t = resumePoint(file.id, video.duration);
    if (!t) return;
    video.currentTime = t;
    toast(`Retomando donde lo dejaste (${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')})`);
  }, { once: true });
  on('timeupdate', () => { look(); if (Date.now() - last > SAVE_EVERY_MS) { last = Date.now(); save(); } });
  on('pause', save);
  on('ended', () => { seen = { t: 0, d: video.duration }; savePosition(file.id, 0, video.duration); });
});
