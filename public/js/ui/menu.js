import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { leave } from '../core/motion.js';

let current = null;
let currentAnchor = null;
let openedAt = 0;
let scrollAtOpen = 0;

function closeMenu() {
  if (!current) return;
  leave(current);
  currentAnchor?.setAttribute('aria-expanded', 'false');
  current = null; currentAnchor = null;
}
// Pulsar fuera cierra; pulsar el botón que lo abrió lo gestiona openMenu (interruptor), así que aquí se ignora.
document.addEventListener('pointerdown', (e) => {
  if (!current || current.contains(e.target) || currentAnchor?.contains(e.target)) return;
  closeMenu();
}, true);
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
// Desplazar o girar la pantalla cierra el menú; los pequeños ajustes que hace iOS justo al tocar, no.
window.addEventListener('scroll', () => { if (current && Date.now() - openedAt > 350 && Math.abs(scrollY - scrollAtOpen) > 12) closeMenu(); }, true);
window.addEventListener('resize', () => { if (current && Date.now() - openedAt > 350) closeMenu(); });

/** items: [{ label, icon, run, danger }] | 'sep'. Se ancla al botón `anchor`; volver a pulsar ese botón lo cierra. */
export function openMenu(anchor, items) {
  if (current && currentAnchor === anchor) { closeMenu(); return; }
  closeMenu();
  currentAnchor = anchor;
  anchor.setAttribute('aria-expanded', 'true');
  openedAt = Date.now(); scrollAtOpen = scrollY;
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
  menu.querySelector('button')?.focus({ preventScroll: true }); // sin desplazar la página (en iOS cerraba el menú)
  current = menu;
}
