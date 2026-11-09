// Textos de una pista a partir de sus etiquetas (con el nombre de archivo como alternativa).
import { stripExtension } from './format.js';

export const trackTitle = (file) => file.tags?.title || stripExtension(file.name);

export function trackSubtitle(file) {
  const t = file.tags;
  return [t?.artist, t?.album].filter(Boolean).join(' · ');
}

export const trackNumber = (file) => {
  if (file.tags?.track) return String(file.tags.track).padStart(2, '0');
  const m = /^\s*(\d{1,3})(?=\D)/.exec(file.name);
  return m ? m[1].padStart(2, '0') : null;
};
