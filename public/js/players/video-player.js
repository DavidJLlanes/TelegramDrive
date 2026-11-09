import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { contentUrl } from '../core/api.js';
import { saveAs } from '../ui/save-as.js';
import { emitVideoLoad } from './video-hooks.js';

let modal = null;

export function openVideo(file, list) {
  const queue = list.length ? list : [file];
  let index = Math.max(queue.findIndex((f) => f.id === file.id), 0);
  const previous = document.activeElement;
  const video = h('video', { controls: true, autoplay: true, playsinline: true, preload: 'metadata' });
  const title = h('div', { class: 'title' });
  const counter = h('span', { class: 'count hide-mobile' });

  const load = (i) => {
    index = i;
    video.src = contentUrl(queue[index].id);
    emitVideoLoad(video, queue[index]);
    title.textContent = queue[index].name;
    counter.textContent = queue.length > 1 ? `${index + 1}/${queue.length}` : '';
    video.play().catch(() => {});
  };
  const step = (d) => { const n = index + d; if (n >= 0 && n < queue.length) load(n); };
  const close = () => {
    video.pause(); video.removeAttribute('src'); video.load();
    modal?.remove(); modal = null;
    document.removeEventListener('keydown', onKey);
    previous?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight' && e.shiftKey) step(1);
    else if (e.key === 'ArrowLeft' && e.shiftKey) step(-1);
  };

  modal?.remove();
  modal = h('div', { class: 'video-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reproductor de vídeo' },
    h('div', { class: 'viewer-bar' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Cerrar', onclick: close }, icon('close')), title, counter,
      h('button', { class: 'btn btn-icon', 'aria-label': 'Anterior (Shift+←)', onclick: () => step(-1) }, icon('prev')),
      h('button', { class: 'btn btn-icon', 'aria-label': 'Siguiente (Shift+→)', onclick: () => step(1) }, icon('next')),
      h('button', { class: 'btn btn-icon', 'aria-label': 'Guardar como…', title: 'Guardar como…', onclick: () => saveAs(queue[index]) }, icon('download'))),
    h('div', { class: 'video-stage' }, video));
  video.addEventListener('ended', () => step(1));
  video.addEventListener('error', () => { title.textContent = `${queue[index].name} — formato no compatible con el navegador, descárgalo`; });
  document.addEventListener('keydown', onKey);
  document.body.append(modal);
  load(index);
}
