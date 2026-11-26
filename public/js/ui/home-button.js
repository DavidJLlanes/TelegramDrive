// Botón «Inicio» (casita): rebote + onda al pulsar y, un instante después, navega a la raíz.
// `variant` 'chip' = versión de la barra de secciones; 'fab' = la del botón flotante (la crea fab.js con su propia clase).
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, watch } from '../core/store.js';
import { navigate } from '../core/router.js';
import { pop } from './pop.js';

export function homeButton(cls = 'home-btn', after) {
  const btn = h('button', { class: `${cls} pop-fx`, type: 'button', title: 'Inicio', 'aria-label': 'Inicio', onclick: (e) => pop(e.currentTarget, () => { navigate('/'); after?.(); }) }, icon('home'));
  watch(appState, btn, (s) => {
    const here = s.section === 'files' && s.path === '/' && s.results === null; // estamos en la raíz
    btn.classList.toggle('active', here);
    if (here) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
  });
  return btn;
}
