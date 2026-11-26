// Media Session: controles y progreso en la pantalla de bloqueo, el centro de control y los auriculares.
const supported = () => 'mediaSession' in navigator;
const SEEK_STEP = 10;
const FALLBACK_ART = [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }];

const ART_SIZES = [512, 256, 96];
let current = 0; // turno de la canción actual: una carátula que llega tarde no pisa la de la siguiente

/**
 * Carátula para el sistema en JPEG y en varios tamaños, como data: URL generada aquí mismo. Así no depende de que el sistema
 * pueda pedir la imagen con la sesión iniciada ni de que admita WebP (Android y algunos iOS mostraban el icono de la app).
 */
async function artworkFor(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(String(res.status));
  const bitmap = await createImageBitmap(await res.blob());
  const side = Math.min(bitmap.width, bitmap.height);
  const out = ART_SIZES.map((size) => {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size); // recorte cuadrado centrado
    return { src: canvas.toDataURL('image/jpeg', 0.86), sizes: `${size}x${size}`, type: 'image/jpeg' };
  });
  bitmap.close?.();
  return out;
}

export function setMetadata({ title, artist, album, artUrl }) {
  if (!supported()) return;
  const turn = ++current;
  const meta = (artwork) => { navigator.mediaSession.metadata = new MediaMetadata({ title, artist: artist || 'Telegram Drive', album: album || '', artwork }); };
  meta(FALLBACK_ART); // al instante (con el icono de la app); la carátula llega en cuanto se prepara
  if (!artUrl) return;
  // Con carátula se envía SOLO la carátula: Chrome para Android, ante dos imágenes del mismo tamaño, prefiere la PNG
  // (el icono de la app) a la JPEG, y la pantalla de bloqueo mostraba siempre el logo.
  artworkFor(artUrl).then((art) => { if (turn === current) meta(art); })
    .catch(() => { if (turn === current) meta([{ src: artUrl, sizes: '480x480', type: 'image/webp' }]); });
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
