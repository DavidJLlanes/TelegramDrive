import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { contentUrl } from '../core/api.js';
import { formatBytes } from '../core/format.js';
import { saveAs } from '../ui/save-as.js';

let box = null;
const SWIPE = 60;

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
    box?.remove(); box = null;
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
  box = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Visor de imágenes' },
    h('div', { class: 'viewer-bar' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Cerrar', onclick: close }, icon('close')), title,
      h('button', { class: 'btn btn-icon', 'aria-label': 'Guardar como…', title: 'Guardar como…', onclick: () => saveAs(queue[index]) }, icon('download'))),
    stage, foot,
    queue.length > 1 && h('button', { class: 'lb-nav lb-prev', 'aria-label': 'Anterior', onclick: () => step(-1) }, icon('chevronLeft')),
    queue.length > 1 && h('button', { class: 'lb-nav lb-next', 'aria-label': 'Siguiente', onclick: () => step(1) }, icon('chevronRight')));
  document.addEventListener('keydown', onKey);
  document.body.append(box);
  show(index);
}
