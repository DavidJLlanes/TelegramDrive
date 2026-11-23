// Ajustes del osciloscopio (tipo, color y sensibilidad) con vista previa animada. Se usa en Configuración.
import { h } from '../../core/dom.js';
import { look } from '../now-playing/settings.js';
import { drawFrame, MODES, HUES } from './modes.js';
import { previewData } from './preview.js';

const CHOICES = ['auto', ...HUES];

export function createScopeSettings() {
  const canvas = h('canvas', { class: 'scope-canvas', 'aria-label': 'Vista previa del osciloscopio' });
  const stage = h('div', { class: 'scope-stage set-preview' }, canvas);
  const chips = MODES.map(([id, label]) => h('button', { class: 'scope-chip', type: 'button', onclick: () => { look.set('scope', id); paint(); } }, label));
  const swatches = CHOICES.map((hue) => {
    const label = hue === 'auto' ? 'Color de la carátula' : `Tono ${hue}`;
    const el = h('button', { class: `swatch${hue === 'auto' ? ' auto' : ''}`, type: 'button', role: 'radio', title: label, 'aria-label': label, onclick: () => { look.set('scopeHue', hue); paint(); } });
    if (hue !== 'auto') el.style.setProperty('--h', hue);
    return el;
  });
  const gain = h('input', { class: 'range', type: 'range', min: 0.5, max: 3, step: 0.1, value: look.get('scopeGain'), 'aria-label': 'Sensibilidad', oninput: (e) => look.set('scopeGain', Number(e.target.value)) });

  function paint() {
    chips.forEach((c, i) => c.setAttribute('aria-pressed', String(MODES[i][0] === look.get('scope'))));
    swatches.forEach((s, i) => s.setAttribute('aria-checked', String(CHOICES[i] === look.get('scopeHue'))));
  }

  function frame(time) {
    if (!canvas.isConnected) return; // la pantalla cambió: se detiene sola
    requestAnimationFrame(frame);
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(stage.clientWidth * dpr); const hh = Math.round(stage.clientHeight * dpr);
    if (!w || !hh) return;
    if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
    const hue = look.get('scopeHue') === 'auto' ? 250 : look.get('scopeHue');
    drawFrame(canvas.getContext('2d'), look.get('scope'), { w, h: hh, color: `oklch(0.78 0.16 ${hue})`, gain: look.get('scopeGain') }, previewData(time / 1000));
  }

  paint();
  requestAnimationFrame(() => requestAnimationFrame(frame)); // tras insertarse en la página
  return h('div', { class: 'set-scope' }, stage,
    h('div', { class: 'scope-chips' }, ...chips),
    h('div', { class: 'scope-swatches', role: 'radiogroup', 'aria-label': 'Color' }, ...swatches),
    h('label', { class: 'scope-gain' }, 'Sensibilidad', gain));
}
