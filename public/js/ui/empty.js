// Estados vacíos con ilustración y acciones, y esqueletos de carga con la forma del contenido real.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

/** Ilustración: icono grande sobre un "sello" con círculos decorativos (todo con CSS, sin imágenes). */
export function emptyBlock({ glyph, title, text, actions = [] }) {
  return h('div', { class: 'empty' },
    h('div', { class: 'empty-art', 'aria-hidden': 'true' }, h('i', { class: 'a' }), h('i', { class: 'b' }), icon(glyph)),
    h('strong', {}, title), h('span', {}, text),
    actions.length ? h('div', { class: 'empty-actions' }, actions.map((a) => h('button', { class: `btn${a.primary ? ' btn-primary' : ''}`, type: 'button', onclick: a.run }, a.icon ? icon(a.icon) : null, a.label))) : null);
}

const line = (w) => { const el = h('span', { class: 'sk-line' }); el.style.setProperty('--w', `${w}%`); return el; };

/** `kind`: 'tile' (cuadrícula con título y meta), 'row' (lista) o 'card'. */
export function skeletons(kind, n = 10) {
  return Array.from({ length: n }, (_, i) => (kind === 'row'
    ? h('div', { class: 'skeleton row' })
    : h('div', { class: 'sk-card' }, h('div', { class: 'skeleton' }), line(70 - (i % 3) * 10), line(40))));
}
