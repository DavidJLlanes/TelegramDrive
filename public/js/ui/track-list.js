// Lista de canciones (álbum, lista de reproducción, sin conexión): número, título, artista, duración y menú.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { trackTitle } from '../core/tags.js';
import { formatTime, formatBytes } from '../core/format.js';
import { isSaved } from '../core/offline.js';
import { playList } from '../players/audio-player.js';
import { fileMenu } from './actions.js';
import { openMenu } from './menu.js';
import { moreButton } from './more-button.js';

const eq = () => h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));

/** `extraMenu(file, index)`: elementos de menú adicionales (p. ej. "Quitar de la lista"). */
function row(file, list, playingId, extraMenu) {
  const t = file.tags ?? {};
  const open = () => playList(list, { startId: file.id });
  const items = () => [...(extraMenu ? [...extraMenu(file), 'sep'] : []), ...fileMenu(file, list)];
  return h('div', {
    class: `track${file.id === playingId ? ' playing' : ''}`, tabindex: 0, role: 'button', onclick: open, onkeydown: (e) => e.key === 'Enter' && open(),
    oncontextmenu: (e) => { e.preventDefault(); openMenu(e.currentTarget, items()); },
  },
  h('span', { class: 'track-no' }, file.id === playingId ? eq() : t.track || ''),
  h('span', { class: 'track-main' },
    h('span', { class: 'track-title' }, trackTitle(file), isSaved(file.id) ? h('span', { class: 'track-saved', title: 'Disponible sin conexión' }, icon('cloud')) : null),
    h('span', { class: 'track-artist' }, t.artist ?? '')),
  h('span', { class: 'track-meta' }, t.duration ? formatTime(t.duration) : formatBytes(file.size)),
  moreButton(items));
}

export function trackList(tracks, { playingId, extraMenu } = {}) {
  const discs = new Set(tracks.map((t) => t.tags?.disc ?? 0));
  const out = [];
  let lastDisc = null;
  for (const file of tracks) {
    const disc = file.tags?.disc ?? 0;
    if (discs.size > 1 && disc !== lastDisc) { out.push(h('h2', { class: 'section-title' }, disc ? `Disco ${disc}` : 'Otras')); lastDisc = disc; }
    out.push(row(file, tracks, playingId, extraMenu));
  }
  return h('div', { class: 'track-list' }, out);
}
