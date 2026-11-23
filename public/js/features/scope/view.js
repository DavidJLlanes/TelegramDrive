// Pestaña «Osciloscopio» de la pantalla completa: lienzo + ajustes (tipo, color, sensibilidad). Solo dibuja mientras se ve y suena.
import { h, fill } from '../../core/dom.js';
import { webAudioActive } from '../../players/web-audio.js';
import { look } from '../now-playing/settings.js';
import { createAnalyser } from './analyser.js';
import { drawFrame, MODES } from './modes.js';

const HUES = [10, 45, 95, 150, 195, 250, 300, 340];
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const QUIET_FRAMES = 45; // con la música en pausa se deja de dibujar pasado un instante

export function createScopeView(box, { audio }) {
  const canvas = h('canvas', { class: 'scope-canvas', 'aria-label': 'Osciloscopio' });
  const stage = h('div', { class: 'scope-stage' }, canvas);
  let analyser = null; let consented = false; let active = false; let raf = 0; let quiet = 0; let size = { w: 0, h: 0 };

  const chips = MODES.map(([id, label]) => h('button', { class: 'scope-chip', type: 'button', onclick: () => { look.set('scope', id); clear(); paintControls(); } }, label));
  const swatch = (hue) => {
    const el = h('button', { class: `swatch${hue === 'auto' ? ' auto' : ''}`, type: 'button', title: hue === 'auto' ? 'Color de la carátula' : 'Color', 'aria-label': hue === 'auto' ? 'Color de la carátula' : `Tono ${hue}`, onclick: () => { look.set('scopeHue', hue); paintControls(); } });
    if (hue !== 'auto') el.style.setProperty('--h', hue);
    return el;
  };
  const swatches = ['auto', ...HUES].map(swatch);
  const gain = h('input', { class: 'range', type: 'range', min: 0.5, max: 3, step: 0.1, value: look.get('scopeGain'), 'aria-label': 'Sensibilidad', oninput: (e) => look.set('scopeGain', Number(e.target.value)) });
  box.append(stage, h('div', { class: 'scope-controls' }, h('div', { class: 'scope-chips' }, ...chips), h('div', { class: 'scope-swatches' }, ...swatches), h('label', { class: 'scope-gain' }, 'Sensibilidad', gain)));

  function paintControls() {
    chips.forEach((c, i) => c.setAttribute('aria-pressed', String(MODES[i][0] === look.get('scope'))));
    swatches.forEach((s, i) => s.setAttribute('aria-checked', String(['auto', ...HUES][i] === look.get('scopeHue'))));
  }

  const clear = () => canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
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
  paintControls();

  return {
    setActive(value) { active = value; update(); },
    destroy() {
      cancelAnimationFrame(raf); raf = 0; resize.disconnect();
      audio.removeEventListener('play', update); document.removeEventListener('visibilitychange', update);
      analyser?.release(); analyser = null;
    },
  };
}
