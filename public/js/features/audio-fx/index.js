// Ecualizador de 5 bandas y fundido entre canciones, con botón en el reproductor.
import { h } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { onAudioReady } from '../../players/audio-hooks.js';
import { loadSettings, saveSettings } from './settings.js';
import { createEq } from './eq.js';
import { createFader } from './fade.js';
import { createFxPanel } from './panel.js';

let settings = loadSettings();

onAudioReady((audio, bar) => {
  const eq = createEq(audio);
  createFader(audio, () => settings.fade);
  const apply = () => { if (settings.eq && !eq.apply(true, settings.gains)) settings = { ...settings, eq: false }; else if (!settings.eq) eq.apply(false, settings.gains); };
  const panel = createFxPanel({
    get: () => settings,
    supported: eq.supported,
    update(patch) { settings = { ...settings, ...patch }; saveSettings(settings); apply(); panel.repaint(); },
    setBand(i, db) { const gains = settings.gains.map((g, k) => (k === i ? db : g)); settings = { ...settings, gains, preset: 'custom' }; saveSettings(settings); apply(); },
  });
  bar.querySelector('.audio-volume')?.prepend(h('button', { class: 'btn btn-icon hide-mobile', type: 'button', 'aria-label': 'Sonido', title: 'Ecualizador y fundido', onclick: panel.toggle }, icon('sliders')));
  if (settings.eq) apply();
});
