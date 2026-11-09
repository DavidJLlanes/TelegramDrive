import { h } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { openFile } from '../../players/viewer.js';
import { openMenu } from '../../ui/menu.js';
import { fileMenu } from '../../ui/actions.js';
import { fileCover } from '../../ui/covers.js';
import { groupByMonth, mapUrl } from './group.js';

/** Cuadrícula de miniaturas agrupada por mes. `menuExtra(photo)` añade entradas al menú de cada foto. */
export function photoGrid(photos, { menuExtra = () => [] } = {}) {
  const cell = (photo) => {
    const open = () => openFile(photo, photos);
    const menu = (anchor) => openMenu(anchor, [...fileMenu(photo, photos), ...menuExtra(photo)]);
    return h('div', { class: 'ph-cell', tabindex: 0, role: 'button', 'aria-label': photo.name, onclick: open, onkeydown: (e) => e.key === 'Enter' && open(),
      oncontextmenu: (e) => { e.preventDefault(); menu(e.currentTarget); } },
    fileCover(photo),
    photo.lat !== null && photo.lon !== null ? h('a', {
      class: 'ph-pin', href: mapUrl(photo.lat, photo.lon), target: '_blank', rel: 'noopener noreferrer', title: 'Ver dónde se hizo en OpenStreetMap', 'aria-label': 'Ver ubicación en el mapa',
      onclick: (e) => e.stopPropagation(),
    }, icon('pin')) : null);
  };
  return groupByMonth(photos).map((g) => h('section', { class: 'ph-month' }, h('h2', {}, g.label, h('span', {}, ` · ${g.items.length}`)),
    h('div', { class: 'ph-grid' }, g.items.map(cell))));
}
