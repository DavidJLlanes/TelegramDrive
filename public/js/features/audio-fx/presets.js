// Ecualizador de 5 bandas. Ganancias en dB por banda, de graves a agudos.
export const BANDS = [
  { hz: 60, label: '60 Hz', type: 'lowshelf' },
  { hz: 230, label: '230 Hz', type: 'peaking' },
  { hz: 910, label: '910 Hz', type: 'peaking' },
  { hz: 3600, label: '3,6 kHz', type: 'peaking' },
  { hz: 14000, label: '14 kHz', type: 'highshelf' },
];
export const GAIN_RANGE = 12;

export const PRESETS = {
  flat: { label: 'Plano', gains: [0, 0, 0, 0, 0] },
  bass: { label: 'Graves', gains: [6, 4, 0, 0, 0] },
  vocal: { label: 'Voces', gains: [-2, 0, 4, 3, 0] },
  treble: { label: 'Agudos', gains: [0, 0, 0, 4, 6] },
  rock: { label: 'Rock', gains: [5, 2, -2, 3, 5] },
  classical: { label: 'Clásica', gains: [3, 1, 0, 2, 3] },
  night: { label: 'Noche (suave)', gains: [-3, 0, 2, 0, -3] },
};

export const clampGain = (v) => Math.max(-GAIN_RANGE, Math.min(GAIN_RANGE, Number.isFinite(Number(v)) ? Number(v) : 0));
