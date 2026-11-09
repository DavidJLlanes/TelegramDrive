// Pantalla cuando no hay conexión con el servidor: permite escuchar la música guardada en el dispositivo.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { offlineTracks } from '../core/offline.js';
import { playList } from '../players/audio-player.js';
import { trackList } from './track-list.js';

export function renderOfflineHome(root, retry) {
  const tracks = offlineTracks();
  root.replaceChildren(h('div', { class: 'offline-home' },
    h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, icon('plane')), 'Telegram Drive'),
    h('h1', {}, 'No hay conexión con el servidor'),
    h('p', {}, tracks.length ? 'Puedes escuchar la música que guardaste en este dispositivo.' : 'Cuando vuelva la conexión podrás entrar de nuevo.'),
    h('div', { class: 'offline-actions' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: retry }, icon('refresh'), 'Reintentar'),
      tracks.length ? h('button', { class: 'btn', type: 'button', onclick: () => playList(tracks) }, icon('play'), 'Reproducir todo') : null),
    tracks.length ? trackList(tracks) : null));
}
