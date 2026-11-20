// Visor inmediato: miniatura -> WebP de 2560 px -> original solo al ampliar.
import { leave } from '../core/motion.js';
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { contentUrl, previewUrl, thumbUrl } from '../core/api.js';
import { formatBytes } from '../core/format.js';
import { saveAs } from '../ui/save-as.js';

let closeActive = null;
const SWIPE = 60;

export function openLightbox(file, list = []) {
  closeActive?.(true); // jamás dejar dos visores superpuestos
  const queue = list.length ? list : [file];
  let index = Math.max(0, queue.findIndex((f) => f.id === file.id));
  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  const placeholder = h('img', { class: 'lb-placeholder', alt: '', draggable: 'false' });
  const img = h('img', { class: 'lb-photo', alt: file.name, draggable: 'false' });
  const stage = h('div', { class: 'lb-stage loading' }, placeholder, img);
  const title = h('div', { class: 'title' });
  const foot = h('div', { class: 'lb-foot', role: 'status' });
  let full = false;
  let serial = 0;
  let startX = null;
  let swipedAt = 0;
  let preloaded = null;

  const close = (immediate = false) => {
    if (closeActive !== close) return;
    closeActive = null;
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = previousOverflow;
    preloaded && (preloaded.src = '');
    img.removeAttribute('src'); placeholder.removeAttribute('src');
    if (immediate) box.remove(); else leave(box);
    previousFocus?.focus?.();
  };
  const step = (delta) => { if (queue.length > 1) show(index + delta); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  };
  const preloadNext = () => {
    if (queue.length < 2) return;
    const next = queue[(index + 1) % queue.length];
    preloaded && (preloaded.src = '');
    preloaded = new Image();
    preloaded.src = previewUrl(next.id);
  };
  const show = (i) => {
    index = (i + queue.length) % queue.length;
    const f = queue[index];
    const ticket = ++serial;
    full = false;
    preloaded && (preloaded.src = ''); preloaded = null;
    stage.classList.add('loading'); stage.classList.remove('zoomed');
    img.classList.remove('ready'); placeholder.classList.remove('hidden');
    title.textContent = f.name;
    foot.textContent = (index + 1) + ' / ' + queue.length + ' · ' + formatBytes(f.size);
    img.alt = f.name;
    img.onload = () => {
      if (ticket !== serial) return;
      stage.classList.remove('loading'); img.classList.add('ready');
      placeholder.classList.add('hidden');
      if (!full) preloadNext();
    };
    img.onerror = () => {
      if (ticket !== serial) return;
      if (!full) { full = true; img.src = contentUrl(f.id); return; }
      stage.classList.remove('loading');
      title.textContent = f.name + ' — no se puede mostrar';
    };
    placeholder.src = thumbUrl(f.id);
    img.src = previewUrl(f.id);
  };
  img.onclick = () => {
    if (Date.now() - swipedAt < 400) return;
    const zooming = !stage.classList.contains('zoomed');
    stage.classList.toggle('zoomed', zooming);
    if (zooming && !full) {
      full = true;
      // Mantener la vista previa visible mientras llega el original.
      const original = new Image();
      const ticket = serial;
      original.onload = () => { if (ticket === serial && closeActive === close) img.src = original.src; };
      original.src = contentUrl(queue[index].id);
    }
  };
  stage.addEventListener('touchstart', (e) => {
    startX = stage.classList.contains('zoomed') ? null : e.touches[0]?.clientX;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > SWIPE) { swipedAt = Date.now(); step(dx < 0 ? 1 : -1); }
    startX = null;
  }, { passive: true });
  stage.addEventListener('click', (e) => { if (e.target === stage && Date.now() - swipedAt >= 400) close(); });

  const closeBtn = h('button', { class: 'btn btn-icon', 'aria-label': 'Cerrar', type: 'button', onclick: () => close() }, icon('close'));
  const box = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Visor de imágenes' },
    h('div', { class: 'viewer-bar' }, closeBtn, title,
      h('button', { class: 'btn btn-icon', type: 'button', 'aria-label': 'Guardar como…', title: 'Guardar como…', onclick: () => saveAs(queue[index]) }, icon('download'))),
    stage, foot,
    queue.length > 1 && h('button', { class: 'lb-nav lb-prev', type: 'button', 'aria-label': 'Anterior', onclick: () => step(-1) }, icon('chevronLeft')),
    queue.length > 1 && h('button', { class: 'lb-nav lb-next', type: 'button', 'aria-label': 'Siguiente', onclick: () => step(1) }, icon('chevronRight')));
  closeActive = close;
  document.body.append(box);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  closeBtn.focus({ preventScroll: true });
  show(index);
}
