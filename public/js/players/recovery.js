// Recuperación del streaming: si la conexión se corta o la descarga se atasca (típico con la pantalla apagada o en segundo
// plano), vuelve a pedir la pista y continúa desde donde iba. Sin DOM: recibe un elemento de audio (o algo equivalente).
const MAX_RETRIES = 3;

export function createRecovery(audio, { stallMs = 10000 } = {}) {
  let tries = 0;
  let timer = null;
  const clear = () => { clearTimeout(timer); timer = null; };

  function retry() {
    clear();
    if (!audio.src || tries >= MAX_RETRIES) return false;
    tries += 1;
    const time = audio.currentTime;
    const wasPlaying = !audio.paused;
    audio.addEventListener('loadedmetadata', () => {
      if (time > 0) audio.currentTime = time;
      if (wasPlaying) audio.play().catch(() => {});
    }, { once: true });
    audio.load();
    return true;
  }

  // Atasco: «waiting» sin que llegue «playing» en stallMs
  audio.addEventListener('waiting', () => { clear(); timer = setTimeout(retry, stallMs); });
  for (const event of ['playing', 'pause', 'emptied', 'ended']) audio.addEventListener(event, clear);

  return {
    /** Llamar al fallar la carga: true si se está reintentando (no mostrar el error todavía). */
    onError: retry,
    /** Llamar al cambiar de pista. */
    reset() { tries = 0; clear(); },
  };
}
