import { h, fill } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { hueOf } from '../../core/color.js';
import { coverHue } from '../../core/cover-color.js';
import { thumbUrl } from '../../core/api.js';
import { appState, watch } from '../../core/store.js';
import { formatTime } from '../../core/format.js';
import { trackTitle, trackSubtitle } from '../../core/tags.js';
import { onSwipe } from '../../core/gestures.js';
import { leave } from '../../core/motion.js';
import { queueTracks, audioControls } from '../../players/audio-player.js';
import { createLyricsView } from './lyrics-view.js';
import { createQueueView } from './queue-view.js';
import { createScopeView } from '../scope/view.js';
import { openAspectMenu } from './aspect-menu.js';
import { look } from './settings.js';
import { attachWave } from '../waveform/seek.js';
import { followPeaks } from '../waveform/follow.js';

let root = null;
const TABS = [['art', 'Carátula'], ['lyrics', 'Letra'], ['queue', 'Cola'], ['scope', 'Onda']];
const narrow = window.matchMedia('(max-width: 860px)');
const currentFile = () => queueTracks().find((f) => f.id === appState.get().playingId) ?? null;

/** Pulsa el botón equivalente de la barra: así hay una sola lógica de reproducción. */
const proxy = (bar, label) => () => bar.querySelector(`[aria-label^="${label}"]`)?.click();
const control = (bar, label, name, extra = '') => h('button', { class: `btn btn-icon np-btn ${extra}`.trim(), type: 'button', 'aria-label': label, onclick: proxy(bar, label) }, icon(name));

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
  const panes = { lyrics: h('div', { class: 'np-lyrics', tabindex: 0, 'aria-label': 'Letra' }), queue: h('div', { class: 'np-queue-box' }), scope: h('div', { class: 'np-scope-box' }) };
  const lyricsView = createLyricsView(panes.lyrics, { audio, onEdit: () => { close(); document.querySelector('.audio-bar [aria-label="Letra"]')?.click(); } });
  const queueView = createQueueView(panes.queue);
  const scopeView = createScopeView(panes.scope, { audio });
  const tabs = TABS.map(([id, label]) => h('button', { class: 'np-tab', type: 'button', role: 'tab', onclick: () => select(id) }, label));
  let shownId = null; let tab = narrow.matches ? 'art' : 'lyrics';

  function select(id) {
    tab = id; root?.setAttribute('data-tab', id);
    tabs.forEach((b, i) => b.setAttribute('aria-selected', String(TABS[i][0] === id)));
    Object.entries(panes).forEach(([key, el]) => { el.hidden = key !== id; });
    scopeView.setActive(id === 'scope');
    if (id === 'queue') queueView.paint(); else if (id === 'lyrics') lyricsView.tick();
  }
  const sync = () => { fill(play, icon(audio.paused ? 'play' : 'pause')); root?.classList.toggle('is-playing', !audio.paused); };
  const tick = () => {
    cur.textContent = formatTime(audio.currentTime); dur.textContent = formatTime(audio.duration || 0);
    const p = audio.duration ? audio.currentTime / audio.duration : 0;
    seek.value = Math.round(p * 1000); seek.style.setProperty('--p', `${(p * 100).toFixed(1)}%`);
    lyricsView.tick();
  };
  seek.addEventListener('input', () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; });

  /** Tono de la pantalla: el de la carátula si está activado y se puede leer; si no, el de la carpeta. */
  async function applyTint(file) {
    root.style.setProperty('--h', hueOf(file.parent));
    if (!look.get('tint') || !file.thumb) return;
    const hue = await coverHue(thumbUrl(file.id));
    if (hue !== null && currentFile()?.id === file.id) root?.style.setProperty('--h', hue);
  }

  function paint() {
    const file = currentFile();
    if (!file || file.id === shownId) return;
    shownId = file.id;
    title.textContent = trackTitle(file); sub.textContent = trackSubtitle(file);
    for (const el of [art, title, sub]) { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); }
    fill(art, icon('music', 'big'));
    bg.style.backgroundImage = '';
    if (file.thumb) {
      const url = thumbUrl(file.id);
      const img = h('img', { src: url, alt: '' });
      img.addEventListener('error', () => img.remove());
      art.append(img);
      bg.style.backgroundImage = `url("${url}")`; // CSSOM: la CSP no admite el atributo style
    }
    applyTint(file);
    lyricsView.show(file);
    if (tab === 'queue') queueView.paint();
  }

  const onNarrow = () => { if (!narrow.matches && tab === 'art') select('lyrics'); else if (narrow.matches && tab === 'lyrics') select('art'); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const stopLook = look.onChange((key, value) => {
    if (key === 'disc') root.classList.toggle('disc', value);
    if (key === 'tint') { const file = currentFile(); if (file) applyTint(file); }
  });
  function close() {
    for (const ev of ['timeupdate', 'loadedmetadata']) audio.removeEventListener(ev, tick);
    for (const ev of ['play', 'pause']) audio.removeEventListener(ev, sync);
    document.removeEventListener('keydown', onKey); narrow.removeEventListener('change', onNarrow); stopLook(); follow.stop(); scopeView.destroy();
    leave(root); root = null;
    if (previous?.isConnected) previous.focus();
  }

  const closeBtn = h('button', { class: 'btn btn-icon np-btn', type: 'button', 'aria-label': 'Cerrar pantalla completa', onclick: close }, icon('chevronDown'));
  root = h('section', { class: `np${look.get('disc') ? ' disc' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reproduciendo' }, bg,
    h('header', { class: 'np-top' }, closeBtn, h('span', { class: 'np-top-label' }, 'Reproduciendo'),
      h('button', { class: 'btn btn-icon np-btn', type: 'button', 'aria-label': 'Aspecto del reproductor', onclick: (e) => openAspectMenu(e.currentTarget, { leave: close, stop: () => { close(); proxy(bar, 'Cerrar reproductor')(); } }) }, icon('palette'))),
    h('div', { class: 'np-main' },
      h('div', { class: 'np-left' }, h('div', { class: 'np-art-box' }, art), h('div', { class: 'np-text' }, title, sub),
        h('div', { class: 'np-seek' }, cur, seek, dur),
        h('div', { class: 'np-controls' }, control(bar, 'Orden aleatorio', 'shuffle', 'np-small'), control(bar, 'Anterior', 'prev'), play,
          control(bar, 'Siguiente', 'next'), control(bar, 'Repetir', 'repeat', 'np-small'))),
      h('div', { class: 'np-right' }, h('div', { class: 'np-tabs', role: 'tablist' }, ...tabs), panes.lyrics, panes.queue, panes.scope)));
  const follow = followPeaks(attachWave(seek, audio, { height: 40 }));
  onSwipe(art, { left: () => audioControls.next(), right: () => audioControls.prev() });
  document.body.append(root);
  document.addEventListener('keydown', onKey); narrow.addEventListener('change', onNarrow);
  audio.addEventListener('timeupdate', tick); audio.addEventListener('loadedmetadata', tick);
  audio.addEventListener('play', sync); audio.addEventListener('pause', sync);
  watch(appState, root, () => { paint(); follow.refresh(); });
  select(tab); sync(); tick(); paint();
  closeBtn.focus();
}
