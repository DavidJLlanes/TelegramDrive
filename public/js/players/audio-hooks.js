// Puntos de extensión del reproductor de audio: las funciones (ecualizador, letras…) se enganchan aquí
// sin que audio-player.js las conozca.
const readyHooks = [];

/** `fn(audio, bar)` se ejecuta cuando se crea el reproductor (o enseguida si ya existe). */
export function onAudioReady(fn) {
  readyHooks.push(fn);
  if (current) fn(current.audio, current.bar);
}

let current = null;
export function emitAudioReady(audio, bar) {
  current = { audio, bar };
  for (const fn of readyHooks) { try { fn(audio, bar); } catch (err) { console.warn('[audio]', err); } }
}
