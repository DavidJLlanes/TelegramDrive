// Pestaña «Osciloscopio» de la pantalla completa: solo el lienzo (los ajustes están en Configuración). Solo dibuja mientras se ve y suena.
import { h, fill } from '../../core/dom.js';
import { webAudioActive } from '../../players/web-audio.js';
import { look } from '../now-playing/settings.js';
import { createAnalyser } from './analyser.js';
import { drawFrame } from './modes.js';

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const QUIET_FRAMES = 45; // con la música en pausa se deja de dibujar pasado un instante

export function createScopeView(box, { audio }) {
  const canvas = h('canvas', { class: 'scope-canvas', 'aria-label': 'Osciloscopio' });
  const stage = h('div', { class: 'scope-stage' }, canvas);
  let analyser = null; let consented = false; let active = false; let raf = 0; let quiet = 0; let size = { w: 0, h: 0 };

  box.append(stage);

  const color = () => {
    const hue = look.get('scopeHue') === 'auto' ? parseFloat(getComputedStyle(box.closest('.np') ?? box).getPropertyValue('--h')) || 230 : look.get('scopeHue');
    return `oklch(0.82 0.16 ${hue})`;
  };

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!analyser || !size.w) return;
    if (audio.paused) { quiet += 1; if (quiet > QUIET_FRAMES) { cancelAnimationFrame(raf); raf = 0; } } else quiet = 0;
    drawFrame(canvas.getContext('2d'), look.get('scope'), { ...size, color: color(), gain: look.get('scopeGain') }, analyser.read());
  }

  function showGate() {
    fill(stage, h('div', { class: 'scope-gate' },
      h('p', {}, 'En iPhone y iPad el osciloscopio hace pasar el sonido por Web Audio, y la música puede cortarse con la pantalla bloqueada. Para volver a la reproducción normal tendrás que recargar la aplicación.'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { consented = true; update(); } }, 'Activar de todos modos')));
  }

  function update() {
    const should = active && document.visibilityState === 'visible';
    if (should && !analyser) {
      if (IOS && !webAudioActive() && !consented) { showGate(); return; }
      analyser = createAnalyser(audio);
      if (!analyser) { fill(stage, h('p', { class: 'np-hint' }, 'Este navegador no admite el osciloscopio.')); return; }
      fill(stage, canvas);
    }
    if (should && analyser && !raf) { quiet = 0; raf = requestAnimationFrame(frame); }
    if (!should && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  const resize = new ResizeObserver(() => {
    const dpr = window.devicePixelRatio || 1;
    size = { w: Math.round(stage.clientWidth * dpr), h: Math.round(stage.clientHeight * dpr) };
    if (canvas.width !== size.w || canvas.height !== size.h) { canvas.width = size.w; canvas.height = size.h; }
  });
  resize.observe(stage);
  audio.addEventListener('play', update);
  document.addEventListener('visibilitychange', update);

  return {
    setActive(value) { active = value; update(); },
    destroy() {
      cancelAnimationFrame(raf); raf = 0; resize.disconnect();
      audio.removeEventListener('play', update); document.removeEventListener('visibilitychange', update);
      analyser?.release(); analyser = null;
    },
  };
}
