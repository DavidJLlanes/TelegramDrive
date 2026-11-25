// Las tres barras del indicador «suena» de las tarjetas y filas siguen la música: graves, medios y agudos por separado.
// Si el navegador no puede (o en iPhone, donde Web Audio puede cortar la música con la pantalla bloqueada), siguen con una animación suelta.
import { onAudioReady } from '../../players/audio-hooks.js';
import { getGraph, webAudioActive, webAudioSupported } from '../../players/web-audio.js';
import { createLevels } from './levels.js';

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STEP_MS = 1000 / 30;

onAudioReady((audio) => {
  let analyser = null; let freq = null; let levels = null; let raf = 0; let last = 0;

  function connect() {
    if (analyser) return true;
    if (!webAudioSupported() || (isIOS() && !webAudioActive())) return false;
    const graph = getGraph(audio);
    if (!graph) return false;
    analyser = Object.assign(graph.ctx.createAnalyser(), { fftSize: 1024, smoothingTimeConstant: 0.55 });
    graph.addTap(analyser);
    freq = new Uint8Array(analyser.frequencyBinCount); levels = createLevels();
    return true;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < STEP_MS || document.visibilityState === 'hidden') return;
    last = now;
    analyser.getByteFrequencyData(freq);
    const values = levels(freq);
    for (const eq of document.querySelectorAll('.eq')) {
      eq.querySelectorAll('i').forEach((bar, i) => bar.style.setProperty('--lv', (0.12 + 0.88 * values[i]).toFixed(3)));
    }
  }

  const start = () => {
    if (raf || !connect()) return;
    document.body.classList.add('eq-live');
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; document.body.classList.remove('eq-live'); };

  audio.addEventListener('play', start);
  for (const ev of ['pause', 'ended', 'emptied']) audio.addEventListener(ev, stop);
  if (!audio.paused) start();
});
