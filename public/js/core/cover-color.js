// Color dominante de una carátula, como tono OKLCH (0-359) para teñir el reproductor. La parte pura no toca el DOM.

/** Tono OKLCH de un color sRGB (0-255). */
export function oklchHue(r, g, b) {
  const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

/** Tono dominante entre los colores vivos de `data` (RGBA); null si la imagen es casi gris, muy oscura o muy clara. */
export function dominantHue(data, step = 4) {
  const bins = new Array(24).fill(0);
  const sums = bins.map(() => [0, 0, 0]);
  for (let i = 0; i < data.length; i += 4 * step) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    const max = Math.max(r, g, b); const min = Math.min(r, g, b);
    const v = max / 255; const sat = max ? (max - min) / max : 0;
    if (a < 200 || sat < 0.25 || v < 0.2 || v > 0.97) continue;
    const hue = max === min ? 0 : (max === r ? ((g - b) / (max - min) + 6) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4) * 60;
    const bin = Math.floor(hue / 15) % 24;
    const w = sat * v;
    bins[bin] += w; sums[bin][0] += r * w; sums[bin][1] += g * w; sums[bin][2] += b * w;
  }
  const best = bins.indexOf(Math.max(...bins));
  if (bins[best] < 1) return null;
  const [r, g, b] = sums[best].map((x) => x / bins[best]);
  return Math.round(oklchHue(r, g, b));
}

const cache = new Map();
/** Tono dominante de la imagen en `url` (misma procedencia); null si no se puede leer. */
export function coverHue(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, 32, 32);
          resolve(dominantHue(ctx.getImageData(0, 0, 32, 32).data, 1));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    }));
  }
  return cache.get(url);
}
