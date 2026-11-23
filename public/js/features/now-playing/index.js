// Reproductor a pantalla completa: se abre pulsando la carátula o el título del reproductor, o deslizando hacia arriba.
import { h } from '../../core/dom.js';
import { icon, registerIcons } from '../../core/icons.js';
import { onSwipe } from '../../core/gestures.js';
import { onAudioReady } from '../../players/audio-hooks.js';
import { audioControls } from '../../players/audio-player.js';
import { openNowPlaying } from './view.js';

registerIcons({
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  expand: '<path d="M7 14.5 12 9.5l5 5"/>',
});

onAudioReady((audio, bar) => {
  const info = bar.querySelector('.audio-info');
  info.classList.add('openable');
  info.setAttribute('role', 'button');
  info.setAttribute('tabindex', '0');
  info.setAttribute('aria-label', 'Abrir el reproductor a pantalla completa');
  const open = () => openNowPlaying(audio, bar);
  info.addEventListener('click', open);
  info.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  // Gestos sobre la barra (útiles sobre todo en móvil): ← siguiente, → anterior, ↑ abrir.
  onSwipe(bar, { left: () => audioControls.next(), right: () => audioControls.prev(), up: open });
  bar.querySelector('.audio-volume')?.prepend(h('button', { class: 'btn btn-icon hide-mobile', type: 'button', 'aria-label': 'Pantalla completa', title: 'Pantalla completa', onclick: open }, icon('expand')));
});
