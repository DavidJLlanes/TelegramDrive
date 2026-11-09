// Ajustes del ecualizador y del fundido, guardados en este navegador.
import { PRESETS, clampGain } from './presets.js';

const KEY = 'tgd.audiofx';
export const FADE_CHOICES = [0, 2, 4, 6];
export const DEFAULTS = Object.freeze({ eq: false, preset: 'flat', gains: [0, 0, 0, 0, 0], fade: 0 });

/** Normaliza lo leído (puede venir corrupto o de una versión anterior). */
export function sanitize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const gains = Array.isArray(r.gains) && r.gains.length === 5 ? r.gains.map(clampGain) : [...DEFAULTS.gains];
  return {
    eq: r.eq === true,
    preset: r.preset in PRESETS || r.preset === 'custom' ? r.preset : 'flat',
    gains,
    fade: FADE_CHOICES.includes(r.fade) ? r.fade : 0,
  };
}

export function loadSettings() {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { return sanitize(null); }
}
export function saveSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* modo privado */ }
}
