// Ecualizador de 5 bandas. Ganancias en dB por banda, de graves a agudos.
export const BANDS = [
  { hz: 60, label: '60 Hz', type: 'lowshelf' },
  { hz: 230, label: '230 Hz', type: 'peaking' },
  { hz: 910, label: '910 Hz', type: 'peaking' },
  { hz: 3600, label: '3,6 kHz', type: 'peaking' },
  { hz: 14000, label: '14 kHz', type: 'highshelf' },
];
export const GAIN_RANGE = 12;

// `group` agrupa los preajustes en el desplegable. Bandas: 60 Hz (bombo/sub), 230 Hz (cuerpo del bajo), 910 Hz (medios),
// 3,6 kHz (presencia/ataque) y 14 kHz (aire, hi-hats).
export const PRESETS = {
  flat: { label: 'Plano', group: 'Básicos', gains: [0, 0, 0, 0, 0] },
  bass: { label: 'Graves', group: 'Básicos', gains: [6, 4, 0, 0, 0] },
  treble: { label: 'Agudos', group: 'Básicos', gains: [0, 0, 0, 4, 6] },
  vocal: { label: 'Voces', group: 'Básicos', gains: [-2, 0, 4, 3, 0] },
  loudness: { label: 'Sonoridad', group: 'Básicos', gains: [5, 1, -1, 1, 4] },
  night: { label: 'Noche (suave)', group: 'Básicos', gains: [-3, 0, 2, 0, -3] },

  techno: { label: 'Techno', group: 'Electrónica', gains: [7, 1, -3, 2, 4] },
  house: { label: 'House', group: 'Electrónica', gains: [5, 3, -1, 1, 3] },
  deephouse: { label: 'Deep house', group: 'Electrónica', gains: [6, 3, 0, -1, 1] },
  trance: { label: 'Trance', group: 'Electrónica', gains: [4, 0, -2, 3, 5] },
  progressive: { label: 'Progressive', group: 'Electrónica', gains: [5, 2, -1, 2, 3] },
  dance: { label: 'Dance', group: 'Electrónica', gains: [5, 2, 0, 3, 4] },
  minimal: { label: 'Minimal', group: 'Electrónica', gains: [6, 0, -2, 1, 3] },
  dnb: { label: 'Drum & bass', group: 'Electrónica', gains: [7, 2, -2, 2, 5] },
  dubstep: { label: 'Dubstep', group: 'Electrónica', gains: [8, 3, -2, 0, 2] },
  electronic: { label: 'Electrónica', group: 'Electrónica', gains: [5, 1, -1, 2, 5] },

  pop: { label: 'Pop', group: 'Otros estilos', gains: [-1, 2, 4, 2, -1] },
  rock: { label: 'Rock', group: 'Otros estilos', gains: [5, 2, -2, 3, 5] },
  hiphop: { label: 'Hip hop', group: 'Otros estilos', gains: [6, 4, 0, 1, 2] },
  reggaeton: { label: 'Reguetón', group: 'Otros estilos', gains: [6, 3, 0, 2, 2] },
  jazz: { label: 'Jazz', group: 'Otros estilos', gains: [3, 2, -1, 2, 3] },
  classical: { label: 'Clásica', group: 'Otros estilos', gains: [3, 1, 0, 2, 3] },
  acoustic: { label: 'Acústica', group: 'Otros estilos', gains: [3, 1, 1, 2, 2] },
  podcast: { label: 'Podcast / voz', group: 'Otros estilos', gains: [-4, -1, 4, 4, 0] },
};

/** Atenuación previa (dB) para que los realces no saturen: la mitad de la mayor subida. */
export const headroom = (gains) => Math.max(0, ...gains) / 2;

export const clampGain = (v) => Math.max(-GAIN_RANGE, Math.min(GAIN_RANGE, Number.isFinite(Number(v)) ? Number(v) : 0));
