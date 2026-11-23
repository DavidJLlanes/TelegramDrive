// Picos de una canción para dibujar su forma de onda. Sin DOM.

/** Reduce las muestras a `count` valores 0-255 (máximo absoluto por tramo, normalizado y con curva suave). */
export function peaksFromChannel(samples, count) {
  const out = new Array(count).fill(0);
  const size = Math.max(1, Math.floor(samples.length / count));
  let top = 0;
  for (let i = 0; i < count; i += 1) {
    let max = 0;
    const end = Math.min(samples.length, (i + 1) * size);
    for (let j = i * size; j < end; j += Math.max(1, size >> 6)) { const v = Math.abs(samples[j]); if (v > max) max = v; }
    out[i] = max; if (max > top) top = max;
  }
  return out.map((v) => (top ? Math.round(Math.sqrt(v / top) * 255) : 0));
}
