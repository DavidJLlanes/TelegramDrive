import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';

export function renderBreadcrumbs(path) {
  const parts = path.split('/').filter(Boolean);
  const nodes = [h('button', { class: 'crumb', onclick: () => navigate('/'), 'aria-label': 'Inicio' }, icon('home'))];
  parts.forEach((part, i) => {
    const target = `/${parts.slice(0, i + 1).join('/')}`;
    nodes.push(h('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, '/'));
    nodes.push(h('button', { class: 'crumb', onclick: () => navigate(target) }, part));
  });
  return h('nav', { class: 'crumbs', 'aria-label': 'Ruta' }, nodes);
}
