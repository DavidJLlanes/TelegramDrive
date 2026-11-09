// Al abrir la aplicación, deja preparada la última cola (en pausa) en la misma pista y segundo.
import { api } from '../core/api.js';
import { loadResume } from './resume.js';
import { restoreQueue } from './audio-player.js';

export async function resumeSession() {
  const saved = loadResume();
  if (!saved) return;
  try {
    const { files } = await api.lookup(saved.ids);
    if (!files.length) return;
    const currentId = saved.ids[saved.pos];
    const at = files.findIndex((f) => f.id === currentId);
    restoreQueue(files, at < 0 ? 0 : at, { time: at < 0 ? 0 : saved.time, shuffle: saved.shuffle, repeat: saved.repeat });
  } catch { /* sin red: se retomará más tarde */ }
}
