// Botón «Inicio» de la barra superior: rebote + onda al pulsar y, un instante después, navega a la raíz.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, watch } from '../core/store.js';
import { navigate } from '../core/router.js';

function goHome(e) {
  const btn = e.currentTarget;
  btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
  setTimeout(() => navigate('/'), 220);
}

export function homeButton() {
  const btn = h('button', { class: 'home-btn', type: 'button', title: 'Inicio', 'aria-label': 'Inicio', onclick: goHome }, icon('home'));
  watch(appState, btn, (s) => {
    const here = s.section === 'files' && s.path === '/' && s.results === null; // estamos en la raíz
    btn.classList.toggle('active', here);
    if (here) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
  });
  return btn;
}
