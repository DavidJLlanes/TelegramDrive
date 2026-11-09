// Pintado y cabecera de las vistas registradas (core/views.js).
import { h } from '../core/dom.js';
import { appState } from '../core/store.js';
import { getView } from '../core/views.js';

export function renderPage(container) {
  const page = appState.get().page;
  const view = getView(page?.id);
  container.replaceChildren();
  if (!view) { container.append(h('p', { class: 'empty' }, 'Esta sección no existe.')); return; }
  if (page.error) { container.append(h('p', { class: 'empty' }, page.error)); return; }
  if (page.loading) { container.append(h('div', { class: 'skeleton page-skeleton' })); return; }
  view.render(container, page);
}

export function pageHead(s) {
  const view = getView(s.page?.id);
  return {
    crumbs: null, title: view?.title?.(s.page) ?? '', sub: s.page?.loading ? '' : (view?.sub?.(s.page) ?? ''),
    tools: view?.tools?.(s.page) ?? null,
  };
}
