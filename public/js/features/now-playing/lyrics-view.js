// Letra en la pantalla completa: si lleva marcas de tiempo (LRC) resalta y sigue la línea que suena; si no, texto normal.
import { h, fill } from '../../core/dom.js';
import { parseLrc, activeLine } from '../../core/lrc.js';
import { centerIn } from '../../core/scroll.js';
import { lyricsApi } from '../lyrics/api.js';

const hint = (...kids) => h('p', { class: 'np-hint' }, ...kids);
const MANUAL_PAUSE = 4000; // tras desplazar a mano, la letra no vuelve sola a la línea durante unos segundos

export function createLyricsView(box, { audio, onEdit }) {
  let lines = []; let nodes = []; let active = -1; let token = 0; let manualUntil = 0;
  const touch = () => { manualUntil = Date.now() + MANUAL_PAUSE; };
  box.addEventListener('wheel', touch, { passive: true }); box.addEventListener('touchmove', touch, { passive: true });

  function render(found) {
    lines = []; nodes = []; active = -1;
    if (!found) { fill(box, hint('Esta canción no tiene letra.', h('br'), h('button', { class: 'btn', type: 'button', onclick: onEdit }, 'Añadir letra'))); return; }
    const parsed = parseLrc(found.text);
    if (!parsed.synced) { fill(box, h('div', { class: 'np-lyrics-text' }, found.text)); return; }
    lines = parsed.lines;
    nodes = lines.map((l) => h('p', { class: `np-line${l.text ? '' : ' gap'}`, onclick: () => { audio.currentTime = l.t; manualUntil = 0; } }, l.text || '♪'));
    fill(box, h('div', { class: 'np-lines synced' }, nodes));
    tick();
  }

  function tick() {
    if (!lines.length) return;
    const index = activeLine(lines, audio.currentTime + 0.12);
    if (index === active) return;
    nodes[active]?.classList.remove('on');
    active = index;
    const node = nodes[index];
    if (!node) return;
    node.classList.add('on');
    if (Date.now() > manualUntil && box.offsetParent) centerIn(node, box, { fallback: box.closest('.np-main') });
  }

  async function show(file) {
    const mine = ++token;
    fill(box, hint('Cargando letra…'));
    try {
      const found = await lyricsApi.get(file.id);
      if (mine === token) render(found);
    } catch { if (mine === token) fill(box, hint('No se pudo cargar la letra.')); }
  }

  return { show, tick };
}
