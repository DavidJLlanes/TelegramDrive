/** Multiplicador de volumen (0–1) según la posición: sube al empezar y baja al acabar. Sin DOM. */
export function fadeGain(position, duration, seconds) {
  if (!seconds || !Number.isFinite(duration) || duration <= 0) return 1;
  const span = Math.min(seconds, duration / 2);
  const gain = Math.min(position / span, (duration - position) / span, 1);
  return Math.max(0, Math.min(1, gain));
}

/**
 * Aplica el fundido al elemento de audio. El volumen del usuario se respeta: se recuerda el último valor que no puso el fundido.
 * (En iPhone el volumen del elemento es de solo lectura: el fundido simplemente no tiene efecto.)
 */
export function createFader(audio, getSeconds) {
  let base = audio.volume;
  let own = false;
  audio.addEventListener('volumechange', () => { if (own) own = false; else base = audio.volume; });
  audio.addEventListener('timeupdate', () => {
    const seconds = getSeconds();
    const target = seconds ? base * fadeGain(audio.currentTime, audio.duration, seconds) : base;
    if (Math.abs(audio.volume - target) > 0.01) { own = true; audio.volume = target; }
  });
}
