import { leave, morph } from '../core/motion.js';
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { contentUrl } from '../core/api.js';
import { formatBytes } from '../core/format.js';
import { saveAs } from '../ui/save-as.js';

let box = null;
const SWIPE = 60;
const tileImage = (id) => document.querySelector(`:is(.tile, .ph-cell)[data-id="${CSS.escape(String(id))}"] .cover > img.ready`);
const loaded = (img, ms) => Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
/** Durante la morfosis la imagen ocupa exactamente su rectángulo visible (no todo el escenario con bandas). */
function fit(img, stage) {
  const { width: W, height: H } = stage.getBoundingClientRect();
  const k = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  Object.assign(img.style, { width: `${img.naturalWidth * k}px`, height: `${img.naturalHeight * k}px` });
}
const unfit = (img) => Object.assign(img.style, { width: '', height: '' });

export function openLightbox(file, list) {
  const queue = list.length ? list : [file];
  let index = Math.max(queue.findIndex((f) => f.id === file.id), 0);
  const previous = document.activeElement;
  const img = h('img', { alt: '', draggable: 'false' });
  const stage = h('div', { class: 'lb-stage loading' }, img);
  const title = h('div', { class: 'title' });
  const foot = h('div', { class: 'lb-foot' });

  const preload = (i) => { if (queue[i]) new Image().src = contentUrl(queue[i].id); };
  const show = (i) => {
    index = (i + queue.length) % queue.length;
    const f = queue[index];
    stage.classList.add('loading'); stage.classList.remove('zoomed');
    img.alt = f.name;
    img.src = contentUrl(f.id);
    title.textContent = f.name;
    foot.textContent = `${index + 1} / ${queue.length} · ${formatBytes(f.size)}`;
    if (queue.length > 1) { preload(index + 1); preload(index - 1); }
  };
  const step = (d) => queue.length > 1 && show(index + d);
  const close = () => {
    const el = box; box = null;
    if (!el) return;
    const target = tileImage(queue[index].id);
    if (target && img.naturalWidth && !stage.classList.contains('zoomed')) {
      fit(img, stage);
      morph(img, (morphing) => (morphing ? el.remove() : leave(el)), () => target); // la foto vuelve a su miniatura
    } else leave(el);
    document.removeEventListener('keydown', onKey);
    previous?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  };

  img.addEventListener('load', () => stage.classList.remove('loading'));
  img.addEventListener('error', () => { title.textContent = `${queue[index].name} — no se puede mostrar, descárgalo`; stage.classList.remove('loading'); });
  img.addEventListener('click', () => stage.classList.toggle('zoomed'));

  let startX = null;
  stage.addEventListener('touchstart', (e) => { startX = stage.classList.contains('zoomed') ? null : e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > SWIPE) step(dx < 0 ? 1 : -1);
    startX = null;
  });
  stage.addEventListener('click', (e) => e.target === stage && close());

  box?.remove();
  const mine = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Visor de imágenes' },
    h('div', { class: 'viewer-bar' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Cerrar', onclick: close }, icon('close')), title,
      h('button', { class: 'btn btn-icon', 'aria-label': 'Guardar como…', title: 'Guardar como…', onclick: () => saveAs(queue[index]) }, icon('download'))),
    stage, foot,
    queue.length > 1 && h('button', { class: 'lb-nav lb-prev', 'aria-label': 'Anterior', onclick: () => step(-1) }, icon('chevronLeft')),
    queue.length > 1 && h('button', { class: 'lb-nav lb-next', 'aria-label': 'Siguiente', onclick: () => step(1) }, icon('chevronRight')));
  box = mine;
  document.addEventListener('keydown', onKey);
  // La miniatura pulsada «crece» hasta la foto (si el navegador lo permite y la imagen llega a tiempo).
  const done = morph(tileImage(file.id), async (morphing) => {
    document.body.append(mine);
    show(index);
    if (morphing) { await loaded(img, 650); if (img.naturalWidth) { stage.classList.remove('loading'); fit(img, stage); } }
  }, () => (img.naturalWidth ? img : null));
  done?.then(() => unfit(img));
}
