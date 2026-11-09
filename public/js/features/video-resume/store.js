// Posición de cada vídeo, guardada en este navegador. Se conservan los últimos MAX para no crecer sin límite.
const KEY = 'tgd.videopos';
const MAX = 200;
export const MIN_SECONDS = 15;      // menos que esto: se empieza desde el principio
export const END_MARGIN = 20;       // a menos de esto del final: se considera visto

const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
const write = (data) => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* modo privado */ } };

export const getPosition = (id) => { const t = Number(read()[id]?.t); return Number.isFinite(t) ? t : 0; };

export function savePosition(id, seconds, duration, now = Date.now()) {
  const data = read();
  if (!Number.isFinite(duration) || seconds < MIN_SECONDS || duration - seconds < END_MARGIN) delete data[id];
  else data[id] = { t: Math.floor(seconds), at: now };
  const keep = Object.entries(data).sort((a, b) => b[1].at - a[1].at).slice(0, MAX);
  write(Object.fromEntries(keep));
}

/** ¿Merece la pena retomar? (hay posición guardada y todavía queda un buen trozo). */
export const resumePoint = (id, duration) => {
  const t = getPosition(id);
  return t >= MIN_SECONDS && duration - t >= END_MARGIN ? t : 0;
};
