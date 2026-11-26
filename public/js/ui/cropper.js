// Recortador de imágenes: marco con la proporción exacta del destino (1:1 canciones, 3:2 carpetas). Se arrastra con un dedo o el ratón,
// se acerca con el deslizador, la rueda o el gesto de pellizcar. Con solo elegir la imagen ya queda centrada y recortada: el ajuste es opcional.
// La foto se reduce una vez al cargarla (las del móvil pesan 12 Mpx) para que arrastrar sea fluido; `toBlob()` devuelve el JPEG recortado.
import { h } from '../core/dom.js';

const VIEW_W = 320;
const MAX_ZOOM = 4;
const WORK_MAX = 2400; // lado mayor de la copia de trabajo: da margen para el zoom máximo con salidas de 480-640 px

export function createCropper({ ratio = 1, outWidth = 600 }) {
  const viewH = Math.round(VIEW_W / ratio);
  const canvas = h('canvas', { class: 'crop-canvas', width: VIEW_W * 2, height: viewH * 2, 'aria-label': 'Arrastra la imagen para encuadrarla' }); // ×2: nítido en retina
  const zoom = h('input', { class: 'range', type: 'range', min: 1, max: MAX_ZOOM, step: 0.01, value: 1, 'aria-label': 'Zoom' });
  const reset = h('button', { class: 'btn', type: 'button', onclick: () => { zoom.value = 1; state.cx = 0.5; state.cy = 0.5; schedule(); } }, 'Centrar');
  const el = h('div', { class: 'crop', hidden: true }, canvas, h('div', { class: 'crop-tools' }, zoom, reset));
  const state = { img: null, cx: 0.5, cy: 0.5 }; // cx, cy: punto de la imagen (0-1) que queda en el centro del marco

  /** Rectángulo de la imagen que se ve en el marco, en píxeles de la copia de trabajo (ya acotado a la imagen). */
  function source() {
    const { img } = state;
    const base = Math.min(img.width / ratio, img.height); // alto de origen que cubre el marco sin zoom
    const sh = base / Number(zoom.value);
    const sw = sh * ratio;
    const sx = Math.min(Math.max(state.cx * img.width - sw / 2, 0), img.width - sw);
    const sy = Math.min(Math.max(state.cy * img.height - sh / 2, 0), img.height - sh);
    return { sx, sy, sw, sh };
  }

  function draw() {
    if (!state.img) return;
    const { sx, sy, sw, sh } = source();
    state.cx = (sx + sw / 2) / state.img.width; state.cy = (sy + sh / 2) / state.img.height; // se guarda ya acotado: arrastrar contra un borde no «acumula»
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgb(255 255 255 / 0.3)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(canvas.width * f, 0); ctx.lineTo(canvas.width * f, canvas.height); ctx.moveTo(0, canvas.height * f); ctx.lineTo(canvas.width, canvas.height * f); }
    ctx.stroke();
  }
  let frame = 0;
  const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); }; // como mucho un dibujo por fotograma

  const setZoom = (value) => { zoom.value = Math.min(MAX_ZOOM, Math.max(1, value)); };
  /** Mueve la vista `dx`/`dy` píxeles de pantalla: el contenido sigue exactamente al dedo. */
  function pan(dx, dy) {
    const { sw, sh } = source(); const box = canvas.getBoundingClientRect();
    state.cx -= (dx / box.width) * (sw / state.img.width);
    state.cy -= (dy / box.height) * (sh / state.img.height);
  }

  const pointers = new Map(); let pinch = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.img) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: Number(zoom.value) }; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const last = pointers.get(e.pointerId);
    if (!last || !state.img) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { pointers.clear(); pinch = null; return; } // se soltó fuera de la ventana
    const now = { x: e.clientX, y: e.clientY };
    if (pointers.size === 2 && pinch) {
      pointers.set(e.pointerId, now);
      const [a, b] = [...pointers.values()];
      setZoom(pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist));
    } else if (pointers.size === 1) {
      pan(now.x - last.x, now.y - last.y);
      pointers.set(e.pointerId, now);
    }
    schedule();
  });
  const release = (e) => {
    pointers.delete(e.pointerId); pinch = null;
    if (pointers.size === 1) { const [id, p] = [...pointers][0]; pointers.set(id, p); } // el dedo que queda sigue arrastrando desde donde está
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, release);
  canvas.addEventListener('wheel', (e) => {
    if (!state.img) return;
    e.preventDefault();
    setZoom(Number(zoom.value) * Math.exp(-e.deltaY * 0.0015)); schedule();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => { zoom.value = 1; state.cx = 0.5; state.cy = 0.5; schedule(); });
  zoom.addEventListener('input', schedule);

  return {
    el,
    get ready() { return Boolean(state.img); },
    /** Rectángulo visible (para pruebas). */
    get rect() { return state.img ? source() : null; },
    /** Carga el archivo elegido; devuelve false si no es una imagen que el navegador pueda leer. */
    async load(file) {
      state.img = null; el.hidden = true;
      if (!file) return false;
      try {
        const bitmap = await createImageBitmap(file); // respeta la orientación EXIF de las fotos del móvil
        const k = Math.min(1, WORK_MAX / Math.max(bitmap.width, bitmap.height));
        const work = h('canvas', { width: Math.round(bitmap.width * k), height: Math.round(bitmap.height * k) });
        work.getContext('2d').drawImage(bitmap, 0, 0, work.width, work.height);
        bitmap.close?.();
        Object.assign(state, { img: work, cx: 0.5, cy: 0.5 }); zoom.value = 1; el.hidden = false; draw();
        return true;
      } catch { return false; }
    },
    toBlob() {
      const { sx, sy, sw, sh } = source();
      const out = h('canvas', { width: outWidth, height: Math.round(outWidth / ratio) });
      out.getContext('2d').drawImage(state.img, sx, sy, sw, sh, 0, 0, out.width, out.height);
      return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.92));
    },
  };
}
