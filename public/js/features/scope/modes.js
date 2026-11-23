// Los cinco modos del osciloscopio. Cada uno dibuja un fotograma en un lienzo 2D (w × h en píxeles del lienzo).
import { bandsFromSpectrum, goniometer } from './bands.js';

export const HUES = [10, 45, 95, 150, 195, 250, 300, 340];
export const MODES = [['wave', 'Onda'], ['bars', 'Barras'], ['circle', 'Circular'], ['mirror', 'Espejo'], ['xy', 'Lissajous']];

const glow = (ctx, color, blur) => { ctx.shadowColor = color; ctx.shadowBlur = blur; };

function wave(ctx, { w, h, color, gain }, { time }) {
  ctx.lineWidth = Math.max(2, h / 140); ctx.lineJoin = 'round'; ctx.strokeStyle = color; glow(ctx, color, 14);
  ctx.beginPath();
  for (let i = 0; i < time.length; i += 2) {
    const x = (i / (time.length - 1)) * w; const y = h / 2 + ((time[i] - 128) / 128) * (h * 0.46) * gain;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

function bars(ctx, { w, h, color, gain }, { freq }) {
  const count = Math.max(20, Math.min(64, Math.floor(w / 26)));
  const values = bandsFromSpectrum(freq, count, gain); const slot = w / count; const bar = slot * 0.66;
  ctx.fillStyle = color; glow(ctx, color, 10);
  values.forEach((v, i) => { const bh = Math.max(4, v * h * 0.92); ctx.beginPath(); ctx.roundRect(i * slot + (slot - bar) / 2, h - bh, bar, bh, bar / 2); ctx.fill(); });
}

function circle(ctx, { w, h, color, gain }, { freq }) {
  const size = Math.min(w, h); const cx = w / 2; const cy = h / 2; const r0 = size * 0.24; const count = 96;
  const values = bandsFromSpectrum(freq, count / 2, gain);
  ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3, size / 90); glow(ctx, color, 10);
  for (let i = 0; i < count; i += 1) {
    const v = values[i < count / 2 ? i : count - 1 - i]; // simétrico: la mitad de las bandas, reflejada
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2; const len = size * 0.02 + v * size * 0.24;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0); ctx.lineTo(cx + Math.cos(angle) * (r0 + len), cy + Math.sin(angle) * (r0 + len)); ctx.stroke();
  }
  ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(cx, cy, r0 * 0.92, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}

function mirror(ctx, { w, h, color, gain }, { freq }) {
  const count = Math.max(14, Math.min(36, Math.floor(w / 36)));
  const values = bandsFromSpectrum(freq, count, gain); const slot = w / 2 / count; const bar = slot * 0.62;
  ctx.fillStyle = color; glow(ctx, color, 10);
  values.forEach((v, i) => {
    const bh = Math.max(4, v * h * 0.9); const y = (h - bh) / 2;
    ctx.beginPath(); ctx.roundRect(w / 2 + i * slot + (slot - bar) / 2, y, bar, bh, bar / 2); ctx.fill(); // derecha…
    ctx.beginPath(); ctx.roundRect(w / 2 - (i + 1) * slot + (slot - bar) / 2, y, bar, bh, bar / 2); ctx.fill(); // …e izquierda
  });
}

function xy(ctx, { w, h, color, gain }, { left, right }) {
  const size = Math.min(w, h) * 0.46;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, h / 200); glow(ctx, color, 8); ctx.globalAlpha = 0.9; ctx.beginPath();
  for (let i = 0; i < left.length; i += 2) {
    const [x, y] = goniometer(left[i], right[i], gain);
    if (i) ctx.lineTo(w / 2 + x * size, h / 2 - y * size); else ctx.moveTo(w / 2 + x * size, h / 2 - y * size);
  }
  ctx.stroke(); ctx.globalAlpha = 1;
}

const DRAW = { wave, bars, circle, mirror, xy };

/** Dibuja un fotograma. El modo Lissajous deja estela (no borra del todo); los demás limpian el lienzo. */
export function drawFrame(ctx, mode, view, data) {
  if (mode === 'xy') { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgb(0 0 0 / 0.22)'; ctx.fillRect(0, 0, view.w, view.h); ctx.globalCompositeOperation = 'source-over'; } else ctx.clearRect(0, 0, view.w, view.h);
  ctx.save(); (DRAW[mode] ?? bars)(ctx, view, data); ctx.restore();
}
