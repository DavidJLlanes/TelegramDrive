// Datos sintéticos para la vista previa del osciloscopio en Configuración (se ve sin necesidad de música). Sin DOM.
export function previewData(t) {
  const freq = new Uint8Array(1024); const time = new Uint8Array(2048); const left = new Uint8Array(2048); const right = new Uint8Array(2048);
  for (let i = 0; i < freq.length; i += 1) freq[i] = Math.max(0, Math.min(255, 235 * Math.exp(-i / 110) * (0.6 + 0.4 * Math.sin(t * 3 + i * 0.13)) + 18));
  for (let i = 0; i < time.length; i += 1) {
    time[i] = 128 + 62 * Math.sin(i * 0.045 + t * 4) + 26 * Math.sin(i * 0.19 + t * 7);
    left[i] = 128 + 92 * Math.sin(i * 0.031 + t * 2);
    right[i] = 128 + 92 * Math.sin(i * 0.047 + t * 2.4 + 1);
  }
  return { time, freq, left, right };
}
