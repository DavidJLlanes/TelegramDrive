import { h } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { appState } from '../../core/store.js';
import { KINDS, DATES, SIZES, DEFAULT_FILTERS, isActive } from './predicates.js';

const select = (label, options, value, onChange) => h('select', { class: 'fl-select', 'aria-label': label, onchange: (e) => onChange(e.target.value) },
  options.map(([v, text]) => h('option', { value: v, selected: v === value }, text)));

/** Barra de filtros sobre la lista: chips por tipo y selectores de fecha y tamaño. */
export function filterBar(state, set) {
  const f = state.filters;
  const chips = KINDS.map(([kind, text]) => h('button', {
    class: `fl-chip${f.kind === kind ? ' on' : ''}`, type: 'button', 'aria-pressed': String(f.kind === kind), onclick: () => set({ kind }),
  }, text));
  const shown = state.visibleCount;
  return h('div', { class: 'fl-bar', role: 'group', 'aria-label': 'Filtros' }, h('div', { class: 'fl-chips' }, chips),
    h('div', { class: 'fl-extra' },
      select('Fecha', DATES, f.date, (date) => set({ date })), select('Tamaño', SIZES, f.size, (size) => set({ size })),
      isActive(f) ? h('button', { class: 'btn btn-ghost fl-clear', type: 'button', onclick: () => appState.set({ filters: { ...DEFAULT_FILTERS } }) }, icon('close'), shown === undefined ? 'Quitar filtros' : `Quitar filtros · ${shown}`) : null));
}
