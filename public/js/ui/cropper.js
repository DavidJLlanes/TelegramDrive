// Recortador de imágenes: marco con la proporción exacta del destino (1:1 canciones, 3:2 carpetas); se arrastra y se acerca con zoom o rueda.
// Con solo elegir la imagen ya queda centrada y recortada: el ajuste manual es opcional. `toBlob()` devuelve el JPEG recortado.
import { h } from '../core/dom.js';

const VIEW_W = 320;
const MAX_ZOOM = 4;

export function createCropper({ ratio = 1, outWidth = 600 }) {
  const viewH = Math.round(VIEW_W / ratio);
  const canvas = h('canvas', { class: 'crop-canvas', width: VIEW_W, height: viewH, 'aria-label': 'Arrastra la imagen para encuadrarla' });
  const zoom = h('input', { class: 'range', type: 'range', min: 1, max: MAX_ZOOM, step: 0.01, value: 1, 'aria-label': 'Zoom' });
  const reset = h('button', { class: 'btn', type: 'button', onclick: () => { zoom.value = 1; state.cx = 0.5; state.cy = 0.5; draw(); } }, 'Centrar');
  const el = h('div', { class: 'crop', hidden: true }, canvas, h('div', { class: 'crop-tools' }, zoom, reset));
  const state = { img: null, cx: 0.5, cy: 0.5 }; // cx, cy: punto de la imagen (0-1) que queda en el centro del marco

  /** Rectángulo de la imagen que se ve en el marco, en píxeles de la imagen original. */
  function source() {
    const { img } = state;
    const cover = Math.min(img.width / ratio, img.height); // alto de origen que cubre el marco sin zoom
    const sh = cover / Number(zoom.value);
    const sw = sh * ratio;
    const sx = Math.min(Math.max(state.cx * img.width - sw / 2, 0), img.width - sw);
    const sy = Math.min(Math.max(state.cy * img.height - sh / 2, 0), img.height - sh);
    return { sx, sy, sw, sh };
  }
  function draw() {
    if (!state.img) return;
    const { sx, sy, sw, sh } = source();
    state.cx = (sx + sw / 2) / state.img.width; state.cy = (sy + sh / 2) / state.img.height; // ya acotado
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.img, sx, sy, sw, sh, 0, 0, VIEW_W, viewH);
    ctx.strokeStyle = 'rgb(255 255 255 / 0.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(VIEW_W * f, 0); ctx.lineTo(VIEW_W * f, viewH); ctx.moveTo(0, viewH * f); ctx.lineTo(VIEW_W, viewH * f); }
    ctx.stroke();
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { if (!state.img) return; canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { sw, sh } = source(); const box = canvas.getBoundingClientRect();
    state.cx -= ((e.clientX - drag.x) / box.width) * (sw / state.img.width);
    state.cy -= ((e.clientY - drag.y) / box.height) * (sh / state.img.height);
    drag = { x: e.clientX, y: e.clientY }; draw();
  });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    if (!state.img) return;
    e.preventDefault();
    zoom.value = Math.min(MAX_ZOOM, Math.max(1, Number(zoom.value) - e.deltaY * 0.002)); draw();
  }, { passive: false });
  zoom.addEventListener('input', draw);

  return {
    el,
    get ready() { return Boolean(state.img); },
    /** Carga el archivo elegido; devuelve false si no es una imagen que el navegador pueda leer. */
    async load(file) {
      state.img = null; el.hidden = true;
      if (!file) return false;
      const url = URL.createObjectURL(file);
      try {
        const img = new Image(); img.src = url; await img.decode();
        Object.assign(state, { img, cx: 0.5, cy: 0.5 }); zoom.value = 1; el.hidden = false; draw();
        return true;
      } catch { return false; } finally { URL.revokeObjectURL(url); }
    },
    toBlob() {
      const { sx, sy, sw, sh } = source();
      const out = h('canvas', { width: outWidth, height: Math.round(outWidth / ratio) });
      out.getContext('2d').drawImage(state.img, sx, sy, sw, sh, 0, 0, out.width, out.height);
      return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.88));
    },
  };
}
