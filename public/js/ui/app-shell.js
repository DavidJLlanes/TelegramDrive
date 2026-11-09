import { h } from '../core/dom.js';
import { appState } from '../core/store.js';
import { formatBytes } from '../core/format.js';
import { renderTopbar } from './topbar.js';
import { createSidebar } from './sidebar.js';
import { createPageHeader } from './page-header.js';
import { renderExplorer } from './explorer.js';

export function renderShell(root, { onLogout }) {
  const syncNote = h('p', { class: 'sync-note', role: 'status' });
  const explorer = h('div');
  const foot = h('div', { class: 'foot-stats' });
  const main = h('main', { class: 'main' }, syncNote, createPageHeader(), explorer, foot);
  root.replaceChildren(h('div', { class: 'shell' }, createSidebar(), h('div', { class: 'column' }, renderTopbar({ onLogout }), main)));

  const paint = (s) => {
    const sync = s.stats?.sync;
    syncNote.hidden = !(sync?.running || sync?.error);
    syncNote.textContent = sync?.error ? `Error de sincronización: ${sync.error}`
      : `Sincronizando con Telegram… ${sync?.scanned ?? 0} mensajes revisados. Puedes seguir usando la aplicación.`;
    renderExplorer(explorer);
    foot.textContent = s.stats ? `${s.stats.files} archivos en Telegram (${formatBytes(s.stats.bytes)})` : '';
  };
  appState.subscribe(paint);
  paint(appState.get());
}
