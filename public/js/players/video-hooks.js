// Punto de extensión del reproductor de vídeo: las funciones (retomar posición…) se enganchan aquí.
const hooks = [];

/** `fn(video, file)` se ejecuta cada vez que el reproductor carga un vídeo. */
export const onVideoLoad = (fn) => { hooks.push(fn); };

export function emitVideoLoad(video, file) {
  for (const fn of hooks) { try { fn(video, file); } catch (err) { console.warn('[vídeo]', err); } }
}
