// Cabecera de la vista de lista: columnas Nombre, Tipo, Tamaño y Fecha; pulsar una ordena por ella.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, prefs } from '../core/store.js';
import { reload } from '../core/drive.js';

const KIND_LABEL = { audio: 'Audio', video: 'Vídeo', image: 'Imagen' };
export const kindLabel = (file) => file.tags?.artist || KIND_LABEL[file.kind] || 'Documento';

function sortBy(sort) {
  prefs.save('sort', sort);
  appState.set({ sort });
  if (appState.get().results === null) reload();
}

export function listHead(current) {
  const col = (label, sort, extra = '') => {
    const active = sort && sort === current;
    return h('button', { type: 'button', class: `lh-col${active ? ' active' : ''} ${extra}`.trim(), disabled: !sort,
      'aria-label': sort ? `Ordenar por ${label.toLowerCase()}` : label, 'aria-pressed': sort ? String(Boolean(active)) : null,
      onclick: sort ? () => sortBy(sort) : null }, label, active ? icon(sort === 'name' ? 'arrowUp' : 'arrowDown') : null);
  };
  return h('div', { class: 'list-head', role: 'presentation' },
    h('span', {}), col('Nombre', 'name', 'lh-name'), col('Tipo', null), col('Tamaño', 'size', 'lh-num'), col('Fecha', 'date', 'lh-num'), h('span', {}));
}
