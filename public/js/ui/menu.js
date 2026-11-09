import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

let current = null;
const closeMenu = () => { current?.remove(); current = null; };
document.addEventListener('pointerdown', (e) => current && !current.contains(e.target) && closeMenu(), true);
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
window.addEventListener('scroll', closeMenu, true);
window.addEventListener('resize', closeMenu);

/** items: [{ label, icon, run, danger }] | 'sep'. Se ancla al botón `anchor`. */
export function openMenu(anchor, items) {
  closeMenu();
  const menu = h('div', { class: 'menu', role: 'menu' }, items.map((item) => (item === 'sep'
    ? h('div', { class: 'menu-sep' })
    : h('button', {
      class: `menu-item${item.danger ? ' danger' : ''}`, role: 'menuitem', type: 'button',
      onclick: () => { closeMenu(); item.run(); },
    }, icon(item.icon), item.label))));
  document.body.append(menu);
  const a = anchor.getBoundingClientRect();
  const m = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(a.right - m.width, innerWidth - m.width - 8))}px`;
  menu.style.top = `${a.bottom + m.height + 8 > innerHeight ? Math.max(8, a.top - m.height - 4) : a.bottom + 4}px`;
  menu.querySelector('button')?.focus();
  current = menu;
}
