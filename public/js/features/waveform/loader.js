// Carga los picos de una canción: descarga el archivo, lo decodifica fuera de la salida de audio (OfflineAudioContext, no
// afecta a la reproducción) y guarda el resultado en el dispositivo para no repetirlo.
import { contentUrl } from '../../core/api.js';
import { peaksFromChannel } from './peaks.js';

const STORE = 'tgd.peaks';
const MAX_BYTES = 14 * 1024 * 1024; // más grande: sin onda (decodificar tanto gasta datos y memoria)
const MAX_SAVED = 150;
const BARS = 120;

const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };
function remember(id, peaks) {
  const all = readStore();
  all[id] = peaks.join(',');
  const keys = Object.keys(all);
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_SAVED))) delete all[old];
  try { localStorage.setItem(STORE, JSON.stringify(all)); } catch { /* sin espacio */ }
}

export const canWave = (file) => file?.kind === 'audio' && file.size > 0 && file.size <= MAX_BYTES && !navigator.connection?.saveData;

export function savedPeaks(id) {
  const raw = readStore()[id];
  return raw ? raw.split(',').map(Number) : null;
}

function decode(buffer) {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Offline(1, 1, 44100);
  // Forma con callbacks (Safari antiguo); en los navegadores actuales además devuelve una promesa que también se rechaza: se silencia.
  return new Promise((resolve, reject) => { ctx.decodeAudioData(buffer, resolve, reject)?.catch?.(() => {}); });
}

const undecodable = new Set(); // archivos que el navegador no sabe decodificar: no se vuelven a descargar en esta sesión

/** Picos 0-255 de `file` (o null). `signal` cancela la descarga si la canción cambia. */
export async function loadPeaks(file, signal) {
  if (!canWave(file) || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) return null;
  const saved = savedPeaks(file.id);
  if (saved) return saved;
  if (undecodable.has(file.id)) return null;
  try {
    const res = await fetch(contentUrl(file.id), { credentials: 'same-origin', signal });
    if (!res.ok) return null;
    const audio = await decode(await res.arrayBuffer()).catch(() => { undecodable.add(file.id); return null; });
    if (!audio) return null;
    const peaks = peaksFromChannel(audio.getChannelData(0), BARS);
    remember(file.id, peaks);
    return peaks;
  } catch { return null; }
}
