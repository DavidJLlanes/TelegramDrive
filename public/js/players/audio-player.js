import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { contentUrl, thumbUrl } from '../core/api.js';
import { appState, prefs } from '../core/store.js';
import { formatTime } from '../core/format.js';
import { trackTitle, trackSubtitle } from '../core/tags.js';
import { download } from '../ui/download.js';
import { tint } from '../core/color.js';
import { createQueue } from './audio-queue.js';

const queue = createQueue();
let bar = null;
let audio = null;
const ui = {};

const REPEAT_ICON = { off: 'repeat', all: 'repeat', one: 'repeatOne' };
const REPEAT_LABEL = { off: 'Repetir: desactivado', all: 'Repetir toda la lista', one: 'Repetir esta canción' };
const fill = (input, fraction) => input.style.setProperty('--p', `${(fraction * 100).toFixed(1)}%`);

function toggleButton(label, name, onclick) {
  return h('button', { class: 'btn btn-icon toggle', 'aria-label': label, 'aria-pressed': 'false', onclick }, icon(name));
}

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
  ui.shuffle = toggleButton('Orden aleatorio', 'shuffle', () => { queue.toggleShuffle(); syncModes(); });
  ui.repeat = toggleButton(REPEAT_LABEL.off, 'repeat', () => { queue.cycleRepeat(); syncModes(); });

  ui.seek.addEventListener('input', () => { fill(ui.seek, ui.seek.value / 1000); if (audio.duration) audio.currentTime = (ui.seek.value / 1000) * audio.duration; });
  ui.vol.addEventListener('input', () => { fill(ui.vol, Number(ui.vol.value)); audio.volume = Number(ui.vol.value); audio.muted = false; prefs.save('volume', ui.vol.value); syncVolume(); });
  fill(ui.vol, prefs.volume);

  bar = h('section', { class: 'audio-bar', 'aria-label': 'Reproductor de música' },
    h('div', { class: 'audio-info' }, ui.art, h('div', { class: 'audio-text' }, ui.title, ui.sub)),
    h('div', { class: 'audio-controls' }, ui.shuffle,
      h('button', { class: 'btn btn-icon', 'aria-label': 'Anterior', onclick: () => go(queue.prev()) }, icon('prev')), ui.play,
      h('button', { class: 'btn btn-icon', 'aria-label': 'Siguiente', onclick: () => go(queue.next()) }, icon('next')), ui.repeat),
    h('div', { class: 'audio-seek' }, ui.cur, ui.seek, ui.dur),
    h('div', { class: 'audio-volume' }, ui.mute, ui.vol,
      h('button', { class: 'btn btn-icon', 'aria-label': 'Descargar', onclick: () => download(queue.current()) }, icon('download')),
      h('button', { class: 'btn btn-icon', 'aria-label': 'Cerrar reproductor', onclick: stop }, icon('close'))));
  document.body.append(bar);

  audio.addEventListener('play', () => syncPlay(true));
  audio.addEventListener('pause', () => syncPlay(false));
  audio.addEventListener('ended', () => { const next = queue.next(true); if (next) go(next); else syncPlay(false); });
  audio.addEventListener('loadedmetadata', () => { ui.dur.textContent = formatTime(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    ui.cur.textContent = formatTime(audio.currentTime);
    if (audio.duration) { ui.seek.value = Math.round((audio.currentTime / audio.duration) * 1000); fill(ui.seek, audio.currentTime / audio.duration); }
  });
  audio.addEventListener('error', () => { ui.sub.textContent = 'No se pudo reproducir este archivo'; });
  setupMediaSession();
  syncModes();
}

const syncPlay = (playing) => {
  ui.play.replaceChildren(icon(playing ? 'pause' : 'play'));
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
};
const syncVolume = () => ui.mute.replaceChildren(icon(audio.muted || audio.volume === 0 ? 'mute' : 'volume'));
const toggle = () => (audio.paused ? audio.play().catch(() => {}) : audio.pause());

function syncModes() {
  ui.shuffle.setAttribute('aria-pressed', String(queue.shuffle));
  ui.repeat.setAttribute('aria-pressed', String(queue.repeat !== 'off'));
  ui.repeat.setAttribute('aria-label', REPEAT_LABEL[queue.repeat]);
  ui.repeat.replaceChildren(icon(REPEAT_ICON[queue.repeat]));
}

function paintArt(file) {
  tint(ui.art, file.parent);
  ui.art.replaceChildren(icon('music'));
  if (!file.thumb) return;
  const img = h('img', { src: thumbUrl(file.id), alt: '' });
  img.addEventListener('error', () => img.remove());
  ui.art.append(img);
}

function go(file) {
  if (!file) return;
  audio.src = contentUrl(file.id);
  ui.title.textContent = trackTitle(file);
  ui.sub.textContent = trackSubtitle(file) || `${queue.position} de ${queue.length}`;
  ui.seek.value = 0; fill(ui.seek, 0); ui.cur.textContent = '0:00'; ui.dur.textContent = '0:00';
  paintArt(file);
  appState.set({ playingId: file.id });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: trackTitle(file), artist: file.tags?.artist || 'Telegram Drive', album: file.tags?.album || '',
      artwork: file.thumb ? [{ src: thumbUrl(file.id), sizes: '512x512' }] : [],
    });
  }
  audio.play().catch(() => {});
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch { /* no soportado */ } };
  set('play', () => audio.play()); set('pause', () => audio.pause());
  set('previoustrack', () => go(queue.prev())); set('nexttrack', () => go(queue.next()));
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
  if (queue.extend(list) && !queue.current()?.tags) ui.sub.textContent = `${queue.position} de ${queue.length}`;
}

/** Reproduce `files` empezando por `startId` (o la primera); `shuffle` fuerza el modo aleatorio. */
export function playList(files, { startId, shuffle } = {}) {
  if (!files.length) return;
  if (!bar) build();
  bar.hidden = false;
  document.body.classList.add('has-player');
  const start = startId ?? (shuffle ? files[Math.floor(Math.random() * files.length)].id : files[0].id);
  queue.set(files, start, shuffle === undefined ? {} : { shuffle });
  syncModes();
  syncVolume();
  go(queue.current());
}

export const playAudio = (file, list) => playList(list.length ? list : [file], { startId: file.id });
