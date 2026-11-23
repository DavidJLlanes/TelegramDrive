// Fila de la cola de reproducción (carátula, título, tiempo, subir/bajar/quitar y arrastrar). La usan el panel flotante y la pantalla completa.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { thumbUrl } from '../core/api.js';
import { trackTitle } from '../core/tags.js';
import { formatTime } from '../core/format.js';
import { tint } from '../core/color.js';

function thumb(file) {
  const box = h('span', { class: 'queue-thumb' }, icon('music'));
  tint(box, file.parent);
  if (file.thumb) {
    const img = h('img', { src: thumbUrl(file.id), alt: '', loading: 'lazy' });
    img.addEventListener('error', () => img.remove());
    box.append(img);
  }
  return box;
}

/** `ctx`: { ops: { jump, move, remove }, current, last } (posiciones dentro de la cola). */
export function queueRow(file, position, { ops, current, last }) {
  const playing = position === current;
  const btn = (label, name, fn, disabled) => h('button', { class: 'queue-btn', type: 'button', 'aria-label': label, disabled, onclick: (e) => { e.stopPropagation(); fn(); } }, icon(name));
  const row = h('li', {
    class: `queue-row${playing ? ' playing' : ''}`, draggable: 'true', onclick: () => ops.jump(position),
    ondragstart: (e) => { e.dataTransfer.setData('text/plain', String(position)); e.dataTransfer.effectAllowed = 'move'; row.classList.add('dragging'); },
    ondragend: () => row.classList.remove('dragging'),
    ondragover: (e) => { e.preventDefault(); row.classList.add('drag-over'); },
    ondragleave: () => row.classList.remove('drag-over'),
    ondrop: (e) => {
      e.preventDefault(); row.classList.remove('drag-over');
      const from = Number(e.dataTransfer.getData('text/plain'));
      if (Number.isInteger(from) && from !== position) ops.move(from, position);
    },
  },
  h('span', { class: 'queue-no' }, playing ? icon('play') : position + 1),
  thumb(file),
  h('span', { class: 'queue-main' }, h('span', { class: 'queue-title' }, trackTitle(file)), h('span', { class: 'queue-sub' }, file.tags?.artist || file.parent)),
  h('span', { class: 'queue-time' }, file.tags?.duration ? formatTime(file.tags.duration) : ''),
  btn('Subir', 'arrowUp', () => ops.move(position, position - 1), position === 0),
  btn('Bajar', 'arrowDown', () => ops.move(position, position + 1), position === last),
  btn('Quitar de la cola', 'close', () => ops.remove(position)));
  return row;
}
