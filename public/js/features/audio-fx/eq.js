import { BANDS } from './presets.js';

/**
 * Ecualizador con Web Audio. El grafo se crea la primera vez que se activa (no antes): en iPhone, pasar el audio por Web Audio
 * puede cortar la música con la pantalla bloqueada, así que quien no lo use no se ve afectado.
 */
export function createEq(audio) {
  let ctx = null;
  let filters = [];

  function build() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return false;
    ctx = new Context();
    const source = ctx.createMediaElementSource(audio);
    filters = BANDS.map(({ hz, type }) => Object.assign(ctx.createBiquadFilter(), { type }));
    filters.forEach((f, i) => { f.frequency.value = BANDS[i].hz; f.Q.value = 1; });
    [source, ...filters, ctx.destination].reduce((a, b) => { a.connect(b); return b; });
    // Si el reproductor se creó sin gesto del usuario (al restaurar la cola) el contexto nace suspendido y no sonaría nada.
    audio.addEventListener('play', () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); });
    return true;
  }

  return {
    get supported() { return Boolean(window.AudioContext || window.webkitAudioContext); },
    /** `gains`: dB por banda; con `enabled` false queda plano (el grafo sigue conectado, sin cambiar el sonido). */
    apply(enabled, gains) {
      if (!ctx && enabled && !build()) return false;
      if (!ctx) return true;
      filters.forEach((f, i) => { f.gain.value = enabled ? gains[i] : 0; });
      if (enabled && ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    },
  };
}
