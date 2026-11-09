import { h } from '../../core/dom.js';
import { navigate } from '../../core/router.js';
import { formatBytes } from '../../core/format.js';
import { usageApi } from './api.js';

export const loadUsage = () => usageApi.report();

const KIND = { audio: 'Música', image: 'Imágenes', video: 'Vídeo', file: 'Documentos y otros' };
const share = (part, total) => (total ? Math.max(part / total, part > 0 ? 0.01 : 0) : 0);
const pct = (f) => `${Math.round(f * 100)} %`;
const files = (n) => `${n.toLocaleString('es-ES')} ${n === 1 ? 'archivo' : 'archivos'}`;

/** Fila con barra proporcional: `fraction` entre 0 y 1. */
function barRow(main, sub, fraction, side, onOpen) {
  const bar = h('div', { class: 'pg-bar' }, h('i'));
  bar.firstChild.style.width = `${(fraction * 100).toFixed(1)}%`;
  return h('div', { class: 'pg-row us-row' },
    h('div', { class: 'pg-main' }, h('strong', {}, main), h('span', {}, sub), bar),
    h('div', { class: 'pg-side' }, side, onOpen ? h('button', { class: 'btn', type: 'button', onclick: onOpen }, 'Abrir') : null));
}

export function renderUsage(el, { data }) {
  const { total, kinds, folders, biggest, trash } = data;
  const top = Math.max(1, ...folders.map((f) => f.bytes));
  el.replaceChildren(
    h('section', { class: 'pg-panel' }, h('h2', {}, 'Por tipo'),
      h('p', { class: 'pg-hint' }, `${formatBytes(total.bytes)} en ${files(total.count)}${trash.count ? ` · ${formatBytes(trash.bytes)} más en la papelera` : ''}`),
      h('div', { class: 'pg-rows' }, kinds.map((k) => barRow(KIND[k.kind] ?? k.kind, files(k.count), share(k.bytes, total.bytes), `${formatBytes(k.bytes)} · ${pct(share(k.bytes, total.bytes))}`)))),
    h('section', { class: 'pg-panel' }, h('h2', {}, 'Carpetas que más ocupan'),
      h('p', { class: 'pg-hint' }, 'Cada carpeta suma lo que contienen sus subcarpetas.'),
      folders.length ? h('div', { class: 'pg-rows' }, folders.map((f) => barRow(f.path, files(f.count), f.bytes / top, formatBytes(f.bytes), () => navigate(f.path))))
        : h('p', { class: 'pg-hint' }, 'Aún no hay carpetas con archivos.')),
    h('section', { class: 'pg-panel' }, h('h2', {}, 'Archivos más grandes'),
      biggest.length ? h('div', { class: 'pg-rows' }, biggest.map((f) => h('div', { class: 'pg-row' },
        h('div', { class: 'pg-main' }, h('strong', {}, f.name), h('span', {}, f.path)),
        h('div', { class: 'pg-side' }, formatBytes(f.size), h('button', { class: 'btn', type: 'button', onclick: () => navigate(f.path) }, 'Ver carpeta')))))
        : h('p', { class: 'pg-hint' }, 'Todavía no hay archivos.')));
}
