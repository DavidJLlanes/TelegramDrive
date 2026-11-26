import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { leave } from '../core/motion.js';

let current = null;
let currentAnchor = null;
let closedFrom = null; // botón cuyo menú se acaba de cerrar al pulsarlo: ese mismo clic no debe volver a abrirlo
const closeMenu = () => { leave(current); current = null; currentAnchor = null; };
document.addEventListener('pointerdown', (e) => {
  if (!current || current.contains(e.target)) return;
  closedFrom = currentAnchor?.contains(e.target) ? currentAnchor : null; // volver a pulsar los puntitos = cerrar
  closeMenu();
}, true);
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
window.addEventListener('scroll', closeMenu, true);
window.addEventListener('resize', closeMenu);

/** items: [{ label, icon, run, danger }] | 'sep'. Se ancla al botón `anchor`. */
export function openMenu(anchor, items) {
  if (closedFrom === anchor) { closedFrom = null; return; }
  closedFrom = null;
  closeMenu();
  currentAnchor = anchor;
  const menu = h('div', { class: 'menu', role: 'menu' }, items.map((item) => (item === 'sep'
    ? h('div', { class: 'menu-sep' })
    : h('button', {
      class: `menu-item${item.danger ? ' danger' : ''}`, role: 'menuitem', type: 'button',
      onclick: () => { closeMenu(); item.run(); },
    }, icon(item.icon), item.label))));
  document.body.append(menu);
  const a = anchor.getBoundingClientRect();
  const m = { width: menu.offsetWidth, height: menu.offsetHeight }; // tamaño real: el rectángulo visual sale menor por la animación de entrada (escala)
  const left = Math.max(8, Math.min(a.right - m.width, innerWidth - m.width - 8));
  const top = a.bottom + m.height + 8 > innerHeight ? Math.max(8, a.top - m.height - 4) : a.bottom + 4;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.transformOrigin = `${a.left + a.width / 2 - left}px ${a.top + a.height / 2 - top}px`; // crece desde su botón
  [...menu.children].forEach((item, i) => item.style.setProperty('--i', Math.min(i, 10)));
  menu.querySelector('button')?.focus();
  current = menu;
}
