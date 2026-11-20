import { h } from '../../core/dom.js';

export function playlistControls(result, load) {
  if (!result.playlist) return null;
  const page = Number(result.offset || 0) / 50 + 1;
  const previous = h('button', {
    type: 'button', class: 'btn btn-ghost', disabled: result.previousOffset === null,
    onclick: () => load(result.previousOffset),
  }, 'Anterior');
  const next = h('button', {
    type: 'button', class: 'btn btn-ghost', disabled: result.nextOffset === null,
    onclick: () => load(result.nextOffset),
  }, 'Siguiente');
  return h('div', { class: 'md-pagination' }, previous,
    h('span', {}, 'Página ' + page + ' · elementos ' + (result.offset + 1) +
      '–' + (result.offset + result.items.length)), next);
}
