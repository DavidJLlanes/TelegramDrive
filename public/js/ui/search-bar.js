// Buscador, bajo la barra superior.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, watch } from '../core/store.js';
import { search } from '../core/drive.js';

export function renderSearchBar() {
  const input = h('input', {
    class: 'input', type: 'search', placeholder: 'Buscar por nombre…', 'aria-label': 'Buscar en todo el almacenamiento',
    oninput: (e) => search(e.target.value),
  });
  const bar = h('div', { class: 'searchbar' }, h('div', { class: 'search' }, icon('search'), input));
  watch(appState, bar, (s) => { if (s.query === '' && input.value) input.value = ''; });
  return bar;
}
