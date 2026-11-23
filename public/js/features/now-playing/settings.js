// Ajustes de aspecto del reproductor (se guardan en este dispositivo). Cada cambio avisa a quien escuche.
const KEY = 'tgd.look';
const DEFAULTS = { disc: false, wave: true, tint: true, scope: 'bars', scopeHue: 'auto', scopeGain: 1.3, scopeOn: true, panel: 'art', lyricsAuto: true };
const listeners = new Set();

const read = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } };
let state = read();

export const look = {
  get: (key) => state[key],
  set(key, value) {
    state = { ...state, [key]: value };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
    listeners.forEach((fn) => fn(key, value));
  },
  toggle(key) { this.set(key, !state[key]); },
  /** `fn(clave, valor)` en cada cambio; devuelve la función para dejar de escuchar. */
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
