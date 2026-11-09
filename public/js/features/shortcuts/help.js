import { h } from '../../core/dom.js';
import { dialog } from '../../ui/modal.js';

const pretty = (keys) => keys.split(' ').map((step) => step.split('+').map((k) => ({ space: 'Espacio', arrowright: '→', arrowleft: '←', arrowup: '↑', arrowdown: '↓', ctrl: 'Ctrl', shift: 'Mayús', alt: 'Alt' }[k] ?? k.toUpperCase())).join(' + ')).join(' luego ');

/** Diálogo con todos los atajos registrados, agrupados. */
export function showHelp(keymap) {
  const groups = new Map();
  for (const item of keymap.list()) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  const content = h('div', { class: 'sc-help' }, [...groups].map(([name, items]) => h('section', {}, h('h3', {}, name),
    h('dl', {}, items.flatMap((i) => [h('dt', {}, h('kbd', {}, pretty(i.keys))), h('dd', {}, i.label)])))));
  return dialog({ title: 'Atajos de teclado', content, confirmLabel: 'Cerrar', hideCancel: true });
}
