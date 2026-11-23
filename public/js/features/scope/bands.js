// Matemática del osciloscopio. Sin DOM.

/** Agrupa el espectro (0-255 por bin) en `count` bandas de reparto logarítmico, con valores 0-1 ya multiplicados por `gain`. */
export function bandsFromSpectrum(freq, count, gain = 1) {
  const top = Math.floor(freq.length * 0.7); // por encima de ~15 kHz casi no hay nada que ver
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const lo = 1 + Math.floor((top - 1) * (i / count) ** 2);
    const hi = Math.max(lo + 1, 1 + Math.floor((top - 1) * ((i + 1) / count) ** 2));
    let sum = 0;
    for (let k = lo; k < hi; k += 1) sum += freq[k];
    out.push(Math.min(1, (sum / (hi - lo) / 255) * gain * (1 + i / count))); // los agudos suenan más flojos: se realzan un poco
  }
  return out;
}

/** Punto del goniómetro (vista Lissajous): L y R en 0-255 → x,y (≈ -1,4..1,4 con sensibilidad 1; mono = línea vertical). */
export function goniometer(l, r, gain = 1) {
  const a = (l - 128) / 128; const b = (r - 128) / 128;
  return [((a - b) / Math.SQRT2) * gain, ((a + b) / Math.SQRT2) * gain];
}
