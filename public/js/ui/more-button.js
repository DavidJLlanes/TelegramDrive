import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { openMenu } from './menu.js';

/** Botón "⋮" que abre un menú contextual con los elementos que devuelve `getItems`. */
export function moreButton(getItems) {
  return h('button', {
    class: 'more', 'aria-label': 'Más opciones', 'aria-haspopup': 'menu',
    onclick: (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.setAttribute('aria-expanded', 'true');
      openMenu(btn, getItems());
      setTimeout(() => btn.removeAttribute('aria-expanded'), 0);
    },
  }, icon('more'));
}
