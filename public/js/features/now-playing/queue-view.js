// «Cola» dentro de la pantalla completa: lo que viene, con carátulas; clic para saltar y arrastrar para reordenar.
import { h, fill } from '../../core/dom.js';
import { queueApi, queueTracks } from '../../players/audio-player.js';
import { centerIn } from '../../core/scroll.js';
import { queueRow } from '../../ui/queue-rows.js';

const AHEAD = 100;

export function createQueueView(box) {
  const ops = {
    jump: (position) => queueApi.jump(position),
    move: (from, to) => { queueApi.move(from, to); paint(); },
    remove: (position) => { queueApi.remove(position); paint(); },
  };
  function paint() {
    const { queue } = queueApi;
    const list = queueTracks();
    if (!list.length) { fill(box, h('p', { class: 'np-hint' }, 'La cola está vacía.')); return; }
    const from = Math.max(0, queue.index - 1);
    const to = Math.min(list.length, queue.index + AHEAD);
    fill(box, h('ol', { class: 'queue-list np-queue' }, list.slice(from, to).map((f, i) => queueRow(f, from + i, { ops, current: queue.index, last: list.length - 1 }))),
      to < list.length ? h('p', { class: 'queue-note' }, `y ${list.length - to} más`) : null);
    const playing = box.querySelector('.queue-row.playing');
    if (playing) centerIn(playing, box, { fallback: box.closest('.np-main'), block: 'start', smooth: false });
  }
  return { paint };
}
