import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { contentUrl } from '../core/api.js';
import { appState, prefs } from '../core/store.js';
import { formatTime, stripExtension } from '../core/format.js';
import { download } from '../ui/download.js';
import { tint } from '../core/color.js';

let bar = null;
let audio = null;
let queue = [];
let index = -1;
const ui = {};

function build() {
  audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = prefs.volume;

  ui.title = h('div', { class: 'audio-title' });
  ui.sub = h('div', { class: 'audio-sub' });
  ui.play = h('button', { class: 'btn btn-icon play', 'aria-label': 'Reproducir/Pausar', onclick: toggle }, icon('play'));
  ui.seek = h('input', { class: 'range', type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Posición' });
  ui.cur = h('span', {}, '0:00');
  ui.dur = h('span', {}, '0:00');
  ui.vol = h('input', { class: 'range', type: 'range', min: 0, max: 1, step: 0.02, value: prefs.volume, 'aria-label': 'Volumen' });
  ui.art = h('div', { class: 'audio-art' }, icon('music'));
  ui.mute = h('button', { class: 'btn btn-icon', 'aria-label': 'Silenciar', onclick: () => { audio.muted = !audio.muted; syncVolume(); } }, icon('volume'));

  const fill = (input, fraction) => input.style.setProperty('--p', `${(fraction * 100).toFixed(1)}%`);
  ui.seek.addEventListener('input', () => { fill(ui.seek, ui.seek.value / 1000); if (audio.duration) audio.currentTime = (ui.seek.value / 1000) * audio.duration; });
  ui.vol.addEventListener('input', () => { fill(ui.vol, Number(ui.vol.value)); audio.volume = Number(ui.vol.value); audio.muted = false; prefs.save('volume', ui.vol.value); syncVolume(); });
  fill(ui.vol, prefs.volume);

  bar = h('section', { class: 'audio-bar', 'aria-label': 'Reproductor de música' },
    h('div', { class: 'audio-info' }, ui.art, h('div', { class: 'audio-text' }, ui.title, ui.sub)),
    h('div', { class: 'audio-controls' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Anterior', onclick: () => step(-1) }, icon('prev')), ui.play,
      h('button', { class: 'btn btn-icon', 'aria-label': 'Siguiente', onclick: () => step(1) }, icon('next'))),
    h('div', { class: 'audio-seek' }, ui.cur, ui.seek, ui.dur),
    h('div', { class: 'audio-volume' }, ui.mute, ui.vol,
      h('button', { class: 'btn btn-icon', 'aria-label': 'Descargar', onclick: () => download(queue[index]) }, icon('download')),
      h('button', { class: 'btn btn-icon', 'aria-label': 'Cerrar reproductor', onclick: stop }, icon('close'))));
  document.body.append(bar);

  audio.addEventListener('play', () => syncPlay(true));
  audio.addEventListener('pause', () => syncPlay(false));
  audio.addEventListener('ended', () => step(1, true));
  audio.addEventListener('loadedmetadata', () => { ui.dur.textContent = formatTime(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    ui.cur.textContent = formatTime(audio.currentTime);
    if (audio.duration) {
      ui.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
      ui.seek.style.setProperty('--p', `${(audio.currentTime / audio.duration) * 100}%`);
    }
  });
  audio.addEventListener('error', () => { ui.sub.textContent = 'No se pudo reproducir este archivo'; });
  setupMediaSession();
}

const syncPlay = (playing) => {
  ui.play.replaceChildren(icon(playing ? 'pause' : 'play'));
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
};
const syncVolume = () => ui.mute.replaceChildren(icon(audio.muted || audio.volume === 0 ? 'mute' : 'volume'));
const toggle = () => (audio.paused ? audio.play().catch(() => {}) : audio.pause());

function load(i) {
  index = i;
  const file = queue[index];
  audio.src = contentUrl(file.id);
  ui.title.textContent = stripExtension(file.name);
  ui.sub.textContent = `${index + 1} de ${queue.length}`;
  ui.seek.value = 0; ui.seek.style.setProperty('--p', '0%'); ui.cur.textContent = '0:00'; ui.dur.textContent = '0:00';
  tint(ui.art, file.parent);
  appState.set({ playingId: file.id });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: stripExtension(file.name), artist: 'Telegram Drive' });
  }
  audio.play().catch(() => {});
}

function step(delta, auto = false) {
  const next = index + delta;
  if (next < 0 || next >= queue.length) { if (auto) syncPlay(false); return; }
  load(next);
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch { /* no soportado */ } };
  set('play', () => audio.play()); set('pause', () => audio.pause());
  set('previoustrack', () => step(-1)); set('nexttrack', () => step(1));
  set('seekto', (d) => { audio.currentTime = d.seekTime; });
}

function stop() {
  audio.pause(); audio.removeAttribute('src'); audio.load();
  bar.hidden = true;
  document.body.classList.remove('has-player');
  appState.set({ playingId: null });
}

/** Sustituye la cola por la lista completa de la carpeta, conservando la pista actual. */
export function extendQueue(list) {
  const current = queue[index];
  const i = current ? list.findIndex((f) => f.id === current.id) : -1;
  if (i < 0) return;
  queue = list;
  index = i;
  ui.sub.textContent = `${index + 1} de ${queue.length}`;
}

export function playAudio(file, list) {
  if (!bar) build();
  bar.hidden = false;
  document.body.classList.add('has-player');
  queue = list.length ? list : [file];
  syncVolume();
  load(Math.max(queue.findIndex((f) => f.id === file.id), 0));
}
