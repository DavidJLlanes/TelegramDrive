// Lectura del audio que suena para el osciloscopio: onda y espectro (mezcla mono) y canales izquierdo/derecho por separado.
import { getGraph } from '../../players/web-audio.js';

/** Devuelve { read(), release() } o null si el navegador no tiene Web Audio. `read()` rellena y devuelve { time, freq, left, right }. */
export function createAnalyser(audio) {
  const graph = getGraph(audio);
  if (!graph) return null;
  const { ctx } = graph;
  const make = () => Object.assign(ctx.createAnalyser(), { fftSize: 2048, smoothingTimeConstant: 0.78 });
  const mix = make(); const left = make(); const right = make();
  const splitter = ctx.createChannelSplitter(2);
  splitter.connect(left, 0); splitter.connect(right, 1);
  graph.addTap(mix); graph.addTap(splitter);
  const data = {
    time: new Uint8Array(mix.fftSize), freq: new Uint8Array(mix.frequencyBinCount),
    left: new Uint8Array(left.fftSize), right: new Uint8Array(right.fftSize),
  };
  return {
    read() {
      mix.getByteTimeDomainData(data.time); mix.getByteFrequencyData(data.freq);
      left.getByteTimeDomainData(data.left); right.getByteTimeDomainData(data.right);
      return data;
    },
    release() { graph.removeTap(mix); graph.removeTap(splitter); },
  };
}
