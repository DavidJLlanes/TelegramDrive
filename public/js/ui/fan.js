// Botón flotante redondeado que se despliega en abanico (un cuarto de círculo) con varias acciones. Lo usan la app
// (Inicio, subir un nivel, subir archivo, nueva carpeta) y el visor de imágenes (descargar, cerrar).
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pop } from './pop.js';

/** items: [{ id, label, icon, run }]. Devuelve { el, toggle, item(id) }. */
export function createFan({ items, label = 'Acciones', className = '' }) {
  const scrim = h('div', { class: 'fab-scrim', hidden: true });
  const main = h('button', { class: 'fab-main', type: 'button', 'aria-label': label, 'aria-haspopup': 'true', 'aria-expanded': 'false' }, icon('plus'));
  const radius = items.length > 3 ? 104 : 86; // separación suficiente para que no se pisen
  const buttons = items.map((it, i) => {
    const b = h('button', {
      class: `fab-item pop-fx fab-${it.id}`, type: 'button', 'aria-label': it.label, title: it.label, tabindex: -1,
      onclick: (e) => pop(e.currentTarget, () => { toggle(false); it.run(); }, 220),
    }, icon(it.icon));
    const angle = (items.length === 1 ? 90 : 90 - (i * 90) / (items.length - 1)) * (Math.PI / 180); // de arriba (90°) a la izquierda (0°)
    b.style.setProperty('--x', `${-Math.round(Math.cos(angle) * radius)}px`);
    b.style.setProperty('--y', `${-Math.round(Math.sin(angle) * radius)}px`);
    b.style.setProperty('--d', `${i * 55}ms`);
    return b;
  });
  const el = h('div', { class: `fab ${className}`.trim() }, scrim, ...buttons, main);

  function toggle(open = !el.classList.contains('open')) {
    el.classList.toggle('open', open);
    main.setAttribute('aria-expanded', String(open));
    scrim.hidden = !open;
    buttons.forEach((b) => { b.tabIndex = open ? 0 : -1; });
  }
  main.addEventListener('click', () => toggle());
  scrim.addEventListener('click', () => toggle(false));
  return { el, main, toggle, item: (id) => el.querySelector(`.fab-${id}`) };
}
