import { h } from '../core/dom.js';
import { appState } from '../core/store.js';
import { formatBytes } from '../core/format.js';
import { renderTopbar } from './topbar.js';
import { renderBreadcrumbs } from './breadcrumbs.js';
import { renderExplorer } from './explorer.js';

export function renderShell(root, { onLogout }) {
  const crumbs = h('div', { class: 'crumbs-row' });
  const explorer = h('div');
  const stats = h('div', { class: 'stats' });
  root.replaceChildren(h('div', { class: 'shell' }, renderTopbar({ onLogout }), h('main', { class: 'main' }, crumbs, explorer, stats)));

  const paint = (s) => {
    crumbs.replaceChildren(s.results !== null
      ? h('strong', {}, `Resultados para "${s.query.trim()}"`)
      : renderBreadcrumbs(s.path));
    renderExplorer(explorer);
    stats.textContent = s.stats ? `${s.stats.files} archivos · ${s.stats.folders} carpetas · ${formatBytes(s.stats.bytes)} en Telegram` : '';
  };
  appState.subscribe(paint);
  paint(appState.get());
}
