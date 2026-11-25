// Niveles de graves, medios y agudos a partir del espectro (bytes 0-255) de un analizador de fftSize 1024 a ~44-48 kHz (≈ 45 Hz por barra).
// Cada banda se normaliza con su propio pico reciente (ganancia automática): así las tres barras se mueven con su parte de la música,
// no todas a la vez, y se ven igual con la música baja o alta.
export const BANDS = [[1, 5], [5, 32], [32, 150]]; // ~45-225 Hz · 225 Hz-1,4 kHz · 1,4-6,8 kHz

export function createLevels() {
  const peak = BANDS.map(() => 60);
  return function levels(freq) {
    return BANDS.map(([from, to], i) => {
      let avg = 0; // el valor más alto de la banda (no la media: en agudos, que abarcan muchas barras, una media diluiría los golpes)
      for (let k = from; k < to; k += 1) avg = Math.max(avg, freq[k] ?? 0);
      peak[i] = Math.max(avg, peak[i] * 0.992, 40);
      return Math.max(0, avg / peak[i] - 0.45) / 0.55; // el espectro viene en escala logarítmica: se descuenta el suelo (45 % del pico) para que lo que no destaca baje de verdad
    });
  };
}
