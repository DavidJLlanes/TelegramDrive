import { h, fill as setChildren } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { contentUrl, thumbUrl } from '../core/api.js';
import { appState, prefs } from '../core/store.js';
import { formatTime } from '../core/format.js';
import { trackTitle, trackSubtitle } from '../core/tags.js';
import { saveAs } from '../ui/save-as.js';
import { tint } from '../core/color.js';
import { createQueue } from './audio-queue.js';
import { saveResume, clearResume } from './resume.js';
import { emitAudioReady } from './audio-hooks.js';
import { toggleQueuePanel, refreshQueuePanel } from '../ui/queue-panel.js';

const queue = createQueue();
let bar = null;
let audio = null;
const ui = {};
let lastSave = 0;

/** Guarda la cola y la posición (solo ids) para retomar al volver a abrir la aplicación. */
const MAX_SAVED = 5000;
function persist() {
  lastSave = Date.now();
  if (!queue.length) return;
  // colas enormes: se guarda una ventana alrededor de la pista actual (el servidor limita la consulta al restaurar)
  const start = queue.length > MAX_SAVED ? Math.max(0, queue.index - 100) : 0;
  saveResume({ ids: queue.ordered.slice(start, start + MAX_SAVED).map((f) => f.id), pos: queue.index - start, time: audio?.currentTime ?? 0, shuffle: queue.shuffle, repeat: queue.repeat });
}

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
  ui.vol = h('input', { class: 'range hide-mobile', type: 'range', min: 0, max: 1, step: 0.02, value: prefs.volume, 'aria-label': 'Volumen' });
  ui.art = h('div', { class: 'audio-art' }, icon('music'));
  ui.mute = h('button', { class: 'btn btn-icon hide-mobile', 'aria-label': 'Silenciar', onclick: () => { audio.muted = !audio.muted; syncVolume(); } }, icon('volume'));
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
      h('button', { class: 'btn btn-icon', 'aria-label': 'Cola de reproducción', onclick: () => toggleQueuePanel(panelApi) }, icon('queue')),
      h('button', { class: 'btn btn-icon hide-mobile', 'aria-label': 'Guardar como…', title: 'Guardar como…', onclick: () => saveAs(queue.current()) }, icon('download')),
      h('button', { class: 'btn btn-icon', 'aria-label': 'Cerrar reproductor', onclick: stop }, icon('close'))));
  document.body.append(bar);

  audio.addEventListener('play', () => syncPlay(true));
  audio.addEventListener('pause', () => syncPlay(false));
  audio.addEventListener('ended', () => { const next = queue.next(true); if (next) go(next); else syncPlay(false); });
  audio.addEventListener('loadedmetadata', () => { ui.dur.textContent = formatTime(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    ui.cur.textContent = formatTime(audio.currentTime);
    if (audio.duration) { ui.seek.value = Math.round((audio.currentTime / audio.duration) * 1000); fill(ui.seek, audio.currentTime / audio.duration); }
    if (Date.now() - lastSave > 5000) persist();
  });
  audio.addEventListener('error', () => { ui.sub.textContent = 'No se pudo reproducir este archivo'; });
  setupMediaSession();
  syncModes();
  emitAudioReady(audio, bar);
}

const syncPlay = (playing) => {
  setChildren(ui.play, icon(playing ? 'pause' : 'play'));
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
};
const syncVolume = () => setChildren(ui.mute, icon(audio.muted || audio.volume === 0 ? 'mute' : 'volume'));
const toggle = () => (audio.paused ? audio.play().catch(() => {}) : audio.pause());

function syncModes() {
  ui.shuffle.setAttribute('aria-pressed', String(queue.shuffle));
  ui.repeat.setAttribute('aria-pressed', String(queue.repeat !== 'off'));
  ui.repeat.setAttribute('aria-label', REPEAT_LABEL[queue.repeat]);
  setChildren(ui.repeat, icon(REPEAT_ICON[queue.repeat]));
}

function paintArt(file) {
  tint(ui.art, file.parent);
  setChildren(ui.art, icon('music'));
  if (!file.thumb) return;
  const img = h('img', { src: thumbUrl(file.id), alt: '' });
  img.addEventListener('error', () => img.remove());
  ui.art.append(img);
}

function go(file, { autoplay = true } = {}) {
  if (!file) return;
  audio.src = contentUrl(file.id);
  ui.title.textContent = trackTitle(file);
  ui.sub.textContent = trackSubtitle(file) || `${queue.position} de ${queue.length}`;
  ui.seek.value = 0; fill(ui.seek, 0); ui.cur.textContent = '0:00'; ui.dur.textContent = '0:00';
  paintArt(file);
  appState.set({ playingId: file.id });
  persist();
  refreshQueuePanel();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: trackTitle(file), artist: file.tags?.artist || 'Telegram Drive', album: file.tags?.album || '',
      artwork: file.thumb ? [{ src: thumbUrl(file.id), sizes: '512x512' }] : [],
    });
  }
  if (autoplay) audio.play().catch(() => {});
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch { /* no soportado */ } };
  set('play', () => audio.play()); set('pause', () => audio.pause());
  set('previoustrack', () => go(queue.prev())); set('nexttrack', () => go(queue.next()));
  set('seekto', (d) => { audio.currentTime = d.seekTime; });
}

/** Operaciones que usa el panel de la cola. */
const panelApi = {
  queue,
  jump: (position) => go(queue.jump(position)),
  remove: (position) => { if (queue.removeAt(position)) { if (queue.current()) go(queue.current()); else stop(); } else { persist(); refreshQueuePanel(); } },
  move: (from, to) => { queue.move(from, to); persist(); refreshQueuePanel(); },
};

function stop() {
  audio.pause(); audio.removeAttribute('src'); audio.load();
  bar.hidden = true;
  document.body.classList.remove('has-player');
  clearResume();
  refreshQueuePanel(true);
  appState.set({ playingId: null });
}

/** Sustituye la cola por la lista completa de la carpeta, conservando la pista actual. */
export function extendQueue(list) {
  if (queue.extend(list) && !queue.current()?.tags) ui.sub.textContent = `${queue.position} de ${queue.length}`;
}

/** Reproduce `files` empezando por `startId` (o la primera); `shuffle` fuerza el modo aleatorio. */
export function playList(files, { startId, shuffle } = {}) {
  if (!files.length) return;
  ensureBar();
  const start = startId ?? (shuffle ? files[Math.floor(Math.random() * files.length)].id : files[0].id);
  queue.set(files, start, shuffle === undefined ? {} : { shuffle });
  syncModes();
  go(queue.current());
}

function ensureBar() {
  if (!bar) build();
  bar.hidden = false;
  document.body.classList.add('has-player');
  syncVolume();
}

/** Añade una canción justo después de la actual (o al final). Si no suena nada, empieza a reproducirla. */
export function enqueueTrack(file, { last = false } = {}) {
  if (!bar || !queue.length) { playList([file]); return false; }
  queue.enqueue(file, { last });
  persist();
  refreshQueuePanel();
  return true;
}

/** Deja preparada (en pausa) una cola guardada: el navegador no permite reproducir sin que el usuario pulse. */
export function restoreQueue(files, position, { time = 0, shuffle, repeat } = {}) {
  if (bar && !audio.paused) return;
  ensureBar();
  queue.restore(files, position, { shuffle, repeat });
  syncModes();
  const file = queue.current();
  go(file, { autoplay: false });
  audio.addEventListener('loadedmetadata', () => { if (time > 0 && time < audio.duration) audio.currentTime = time; }, { once: true });
}

/** Control desde fuera (atajos de teclado…). */
export const audioControls = {
  active: () => Boolean(bar && !bar.hidden && queue.current()),
  toggle: () => audio && toggle(),
  next: () => audio && go(queue.next()),
  prev: () => audio && go(queue.prev()),
  seekBy: (seconds) => { if (audio?.duration) audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration); },
  volumeBy: (delta) => { audio.volume = Math.min(Math.max(audio.volume + delta, 0), 1); audio.muted = false; ui.vol.value = audio.volume; fill(ui.vol, audio.volume); prefs.save('volume', audio.volume); syncVolume(); },
  mute: () => { audio.muted = !audio.muted; syncVolume(); },
};

export const queueTracks = () => queue.ordered;
export const playAudio = (file, list) => playList(list.length ? list : [file], { startId: file.id });
