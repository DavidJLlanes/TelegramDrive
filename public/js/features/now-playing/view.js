import { h, fill } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { hueOf } from '../../core/color.js';
import { thumbUrl } from '../../core/api.js';
import { appState, watch } from '../../core/store.js';
import { formatTime } from '../../core/format.js';
import { trackTitle, trackSubtitle } from '../../core/tags.js';
import { onSwipe } from '../../core/gestures.js';
import { leave } from '../../core/motion.js';
import { queueTracks, audioControls } from '../../players/audio-player.js';
import { lyricsApi } from '../lyrics/api.js';

let root = null;

const currentFile = () => queueTracks().find((f) => f.id === appState.get().playingId) ?? null;

/** Pulsa el botón equivalente de la barra: así hay una sola lógica de reproducción. */
const proxy = (bar, label) => () => bar.querySelector(`[aria-label^="${label}"]`)?.click();

function control(bar, label, name, extra = '') {
  return h('button', { class: `btn btn-icon np-btn ${extra}`.trim(), type: 'button', 'aria-label': label, onclick: proxy(bar, label) }, icon(name));
}

export function openNowPlaying(audio, bar) {
  if (root) return;
  const previous = document.activeElement;
  const bg = h('div', { class: 'np-bg', 'aria-hidden': 'true' });
  const art = h('div', { class: 'np-art' }, icon('music', 'big'));
  const title = h('h2', { class: 'np-title' });
  const sub = h('p', { class: 'np-sub' });
  const seek = h('input', { class: 'range', type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Posición' });
  const cur = h('span', {}, '0:00'); const dur = h('span', {}, '0:00');
  const play = h('button', { class: 'btn btn-icon np-btn np-play', type: 'button', 'aria-label': 'Reproducir/Pausar', onclick: proxy(bar, 'Reproducir/Pausar') });
  const lyrics = h('div', { class: 'np-lyrics', tabindex: 0, 'aria-label': 'Letra' });
  let shownId = null;
  let lyricsToken = 0;

  const close = () => { audio.removeEventListener('timeupdate', tick); audio.removeEventListener('loadedmetadata', tick); audio.removeEventListener('play', sync); audio.removeEventListener('pause', sync); document.removeEventListener('keydown', onKey); leave(root); root = null; previous?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const sync = () => fill(play, icon(audio.paused ? 'play' : 'pause'));
  const tick = () => {
    cur.textContent = formatTime(audio.currentTime); dur.textContent = formatTime(audio.duration || 0);
    const p = audio.duration ? audio.currentTime / audio.duration : 0;
    seek.value = Math.round(p * 1000); seek.style.setProperty('--p', `${(p * 100).toFixed(1)}%`);
  };
  seek.addEventListener('input', () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; });

  async function paint() {
    const file = currentFile();
    if (!file || file.id === shownId) return;
    shownId = file.id;
    root.style.setProperty('--h', hueOf(file.parent));
    title.textContent = trackTitle(file);
    sub.textContent = trackSubtitle(file);
    fill(art, icon('music', 'big'));
    bg.style.backgroundImage = '';
    if (file.thumb) {
      const url = thumbUrl(file.id);
      const img = h('img', { src: url, alt: '' });
      img.addEventListener('error', () => img.remove());
      art.append(img);
      bg.style.backgroundImage = `url("${url}")`; // CSSOM: la CSP no admite el atributo style
    }
    const token = ++lyricsToken;
    fill(lyrics, h('p', { class: 'np-hint' }, 'Cargando letra…'));
    try {
      const found = await lyricsApi.get(file.id);
      if (token !== lyricsToken) return;
      fill(lyrics, found ? h('div', { class: 'np-lyrics-text' }, found.text)
        : h('p', { class: 'np-hint' }, 'Esta canción no tiene letra.', h('br'), h('button', { class: 'btn', type: 'button', onclick: () => { close(); document.querySelector('.audio-bar [aria-label="Letra"]')?.click(); } }, 'Escribir letra')));
    } catch { if (token === lyricsToken) fill(lyrics, h('p', { class: 'np-hint' }, 'No se pudo cargar la letra.')); }
  }

  const closeBtn = h('button', { class: 'btn btn-icon np-btn', type: 'button', 'aria-label': 'Cerrar pantalla completa', onclick: close }, icon('chevronDown'));
  root = h('section', { class: 'np', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reproduciendo' }, bg,
    h('header', { class: 'np-top' }, closeBtn, h('span', { class: 'np-top-label' }, 'Reproduciendo'),
      h('button', { class: 'btn btn-icon np-btn', type: 'button', 'aria-label': 'Cola de reproducción', onclick: () => { close(); bar.querySelector('[aria-label="Cola de reproducción"]')?.click(); } }, icon('queue'))),
    h('div', { class: 'np-main' },
      h('div', { class: 'np-left' }, art, h('div', { class: 'np-text' }, title, sub),
        h('div', { class: 'np-seek' }, cur, seek, dur),
        h('div', { class: 'np-controls' }, control(bar, 'Orden aleatorio', 'shuffle', 'np-small'), control(bar, 'Anterior', 'prev'), play,
          control(bar, 'Siguiente', 'next'), control(bar, 'Repetir', 'repeat', 'np-small'))),
      lyrics));
  onSwipe(art, { left: () => audioControls.next(), right: () => audioControls.prev() });
  onSwipe(root, { down: close });
  document.body.append(root);
  document.addEventListener('keydown', onKey);
  audio.addEventListener('timeupdate', tick); audio.addEventListener('loadedmetadata', tick);
  audio.addEventListener('play', sync); audio.addEventListener('pause', sync);
  watch(appState, root, paint);
  sync(); tick(); paint();
  closeBtn.focus();
}
