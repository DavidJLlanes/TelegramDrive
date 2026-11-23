import { BANDS } from './presets.js';
import { getGraph, webAudioSupported } from '../../players/web-audio.js';

/**
 * Ecualizador con Web Audio. El grafo se crea la primera vez que se activa (no antes): en iPhone, pasar el audio por Web Audio
 * puede cortar la música con la pantalla bloqueada, así que quien no lo use no se ve afectado. Comparte el grafo con el osciloscopio.
 */
export function createEq(audio) {
  let graph = null;
  let filters = [];

  function build() {
    graph = getGraph(audio);
    if (!graph) return false;
    filters = BANDS.map(({ hz, type }) => Object.assign(graph.ctx.createBiquadFilter(), { type }));
    filters.forEach((f, i) => { f.frequency.value = BANDS[i].hz; f.Q.value = 1; });
    graph.setInserts('eq', filters);
    return true;
  }

  return {
    get supported() { return webAudioSupported(); },
    /** `gains`: dB por banda; con `enabled` false queda plano (el grafo sigue conectado, sin cambiar el sonido). */
    apply(enabled, gains) {
      if (!graph && enabled && !build()) return false;
      if (!graph) return true;
      filters.forEach((f, i) => { f.gain.value = enabled ? gains[i] : 0; });
      if (enabled && graph.ctx.state === 'suspended') graph.ctx.resume().catch(() => {});
      return true;
    },
  };
}
