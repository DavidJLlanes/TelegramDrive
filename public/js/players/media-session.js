// Media Session: controles y progreso en la pantalla de bloqueo, el centro de control y los auriculares.
const supported = () => 'mediaSession' in navigator;
const SEEK_STEP = 10;
const FALLBACK_ART = [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }];

export function setMetadata({ title, artist, album, artUrl }) {
  if (!supported()) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title, artist: artist || 'Telegram Drive', album: album || '',
    artwork: artUrl ? [{ src: artUrl, sizes: '512x512' }, ...FALLBACK_ART] : FALLBACK_ART, // sin carátula: el icono de la aplicación
  });
}

export const setPlaying = (playing) => { if (supported()) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; };

/** Duración, posición y velocidad para el deslizador del sistema (ignora duraciones aún desconocidas o infinitas). */
export function syncPosition(audio) {
  if (!supported() || !navigator.mediaSession.setPositionState) return;
  const { duration, currentTime, playbackRate } = audio;
  if (!Number.isFinite(duration) || duration <= 0) return;
  try { navigator.mediaSession.setPositionState({ duration, position: Math.min(Math.max(currentTime, 0), duration), playbackRate: playbackRate || 1 }); } catch { /* valores no válidos */ }
}

export function setupSession(audio, { prev, next }) {
  if (!supported()) return;
  const set = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch { /* acción no soportada */ } };
  const seekBy = (delta) => { audio.currentTime = Math.min(Math.max(audio.currentTime + delta, 0), audio.duration || Infinity); syncPosition(audio); };
  set('play', () => audio.play().catch(() => {})); set('pause', () => audio.pause());
  set('stop', () => audio.pause());
  set('previoustrack', prev); set('nexttrack', next);
  set('seekto', (d) => { audio.currentTime = d.seekTime; syncPosition(audio); });
  set('seekbackward', (d) => seekBy(-(d.seekOffset || SEEK_STEP)));
  set('seekforward', (d) => seekBy(d.seekOffset || SEEK_STEP));
  for (const event of ['loadedmetadata', 'seeked', 'ratechange', 'play', 'pause']) audio.addEventListener(event, () => syncPosition(audio));
}
