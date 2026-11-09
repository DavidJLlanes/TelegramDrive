import { h, fill } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { BANDS, GAIN_RANGE, PRESETS } from './presets.js';
import { FADE_CHOICES } from './settings.js';

const isIos = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Panel flotante del ecualizador y el fundido. `ctl`: { get(), update(patch), setBand(i, db), supported }. */
export function createFxPanel(ctl) {
  let root = null;
  const close = () => { root?.remove(); root = null; };

  function paint() {
    const s = ctl.get();
    const sliders = BANDS.map((band, i) => {
      const input = h('input', { class: 'range fx-band', type: 'range', min: -GAIN_RANGE, max: GAIN_RANGE, step: 1, value: s.gains[i], 'aria-label': `${band.label}`, disabled: !s.eq });
      input.addEventListener('input', () => ctl.setBand(i, Number(input.value)));
      return h('label', { class: 'fx-col' }, h('span', { class: 'fx-hz' }, band.label), input, h('span', { class: 'fx-db' }, `${s.gains[i] > 0 ? '+' : ''}${s.gains[i]} dB`));
    });
    const preset = h('select', { class: 'fl-select', 'aria-label': 'Preajuste', disabled: !s.eq, onchange: (e) => ctl.update({ preset: e.target.value, gains: [...PRESETS[e.target.value].gains] }) },
      s.preset === 'custom' ? h('option', { value: 'custom', selected: true }, 'Personalizado') : null,
      Object.entries(PRESETS).map(([key, p]) => h('option', { value: key, selected: s.preset === key }, p.label)));
    const fade = h('select', { class: 'fl-select', 'aria-label': 'Fundido', onchange: (e) => ctl.update({ fade: Number(e.target.value) }) },
      FADE_CHOICES.map((n) => h('option', { value: n, selected: s.fade === n }, n ? `${n} segundos` : 'Desactivado')));
    fill(root.querySelector('.fx-body'),
      h('section', {}, h('label', { class: 'fx-switch' }, h('input', { type: 'checkbox', checked: s.eq, onchange: (e) => ctl.update({ eq: e.target.checked }) }), h('strong', {}, 'Ecualizador')), preset,
        h('div', { class: 'fx-bands' }, sliders),
        isIos ? h('p', { class: 'fx-note' }, 'En iPhone y iPad el ecualizador puede cortar la música al bloquear la pantalla. Si te pasa, desactívalo.') : null,
        ctl.supported ? null : h('p', { class: 'fx-note' }, 'Este navegador no admite el ecualizador.')),
      h('section', {}, h('strong', {}, 'Fundido entre canciones'), fade,
        h('p', { class: 'fx-note' }, 'La canción baja de volumen al final y la siguiente sube al empezar. En iPhone no tiene efecto (el sistema controla el volumen).')));
  }

  return {
    toggle() {
      if (root) { close(); return; }
      root = h('aside', { class: 'fx-panel', 'aria-label': 'Sonido' },
        h('div', { class: 'ly-head' }, h('strong', {}, 'Sonido'), h('button', { class: 'btn btn-icon btn-ghost', type: 'button', 'aria-label': 'Cerrar', onclick: close }, icon('close'))),
        h('div', { class: 'fx-body' }));
      document.body.append(root);
      paint();
    },
    repaint: () => root && paint(),
  };
}
