// Panel "Cola de reproducción": ver lo que viene, saltar, reordenar, quitar y guardar como lista.
import { leave } from '../core/motion.js';
import { h, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { queueRow } from './queue-rows.js';
import { createPlaylistWith } from './playlist-picker.js';

const AHEAD = 150;   // canciones por delante que se dibujan (la cola puede tener miles)
let panel = null;
let ops = null;

function paint() {
  const { queue } = ops;
  const list = queue.ordered;
  const current = queue.index;
  const from = Math.max(0, current - 2);
  const to = Math.min(list.length, current + AHEAD);
  const body = h('ol', { class: 'queue-list' }, list.slice(from, to).map((f, i) => queueRow(f, from + i, { ops, current, last: list.length - 1 })));
  const notes = [from > 0 ? h('p', { class: 'queue-note' }, `${from} anteriores no se muestran`) : null, to < list.length ? h('p', { class: 'queue-note' }, `y ${list.length - to} más`) : null];
  fill(panel,
    h('div', { class: 'queue-head' }, h('strong', {}, 'Cola de reproducción'),
      h('button', { class: 'btn', type: 'button', onclick: () => createPlaylistWith(list.map((f) => f.id)) }, icon('playlist'), 'Guardar como lista'),
      h('button', { class: 'btn btn-icon btn-ghost', type: 'button', 'aria-label': 'Cerrar cola', onclick: () => close() }, icon('close'))),
    notes[0], body, notes[1]);
  panel.querySelector('.queue-row.playing')?.scrollIntoView({ block: 'nearest' });
}

function close() { leave(panel); panel = null; }

export function toggleQueuePanel(api) {
  if (panel) { close(); return; }
  ops = api;
  panel = h('aside', { class: 'queue-panel', 'aria-label': 'Cola de reproducción' });
  document.body.append(panel);
  paint();
}

/** Repinta si está abierto; `closeIt` lo cierra (al parar el reproductor). */
export function refreshQueuePanel(closeIt = false) {
  if (!panel) return;
  if (closeIt) close(); else paint();
}
