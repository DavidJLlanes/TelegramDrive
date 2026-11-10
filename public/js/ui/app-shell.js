import { h, fill } from '../core/dom.js';
import { appState, watch } from '../core/store.js';
import { formatBytes } from '../core/format.js';
import { renderTopbar } from './topbar.js';
import { createSidebar, createMobileNav } from './sidebar.js';
import { createPageHeader } from './page-header.js';
import { renderExplorer } from './explorer.js';
import { renderLibrary } from './library.js';
import { renderTrash } from './trash-view.js';
import { createSelectionBar } from './selection.js';
import { renderPage } from './page-view.js';
import { showPruneGuard } from './prune-guard.js';

export function renderShell(root, { onLogout }) {
  const syncNote = h('p', { class: 'sync-note', role: 'status' });
  const explorer = h('div');
  const foot = h('div', { class: 'foot-stats' });
  const banner = h('p', { class: 'sync-note warn', role: 'status', hidden: true });
  const main = h('main', { class: 'main' }, createMobileNav(), banner, syncNote, createPageHeader(), explorer, foot);
  fill(root, h('div', { class: 'shell' }, createSidebar(), h('div', { class: 'column' }, renderTopbar({ onLogout }), main), createSelectionBar()));

  const paint = (s) => {
    const sync = s.stats?.sync;
    syncNote.hidden = !(sync?.running || sync?.error);
    syncNote.textContent = sync?.error ? `Error de sincronización: ${sync.error}`
      : `Sincronizando con Telegram… ${sync?.scanned ?? 0} mensajes revisados. Puedes seguir usando la aplicación.`;
    if (!sync?.running && sync?.pruneBlocked) { syncNote.hidden = false; showPruneGuard(syncNote, sync.pruneBlocked); }
    if (!sync?.running && !sync?.error && !sync?.pruneBlocked && s.stats?.tagging?.running) {
      syncNote.hidden = false;
      syncNote.textContent = `Leyendo las etiquetas de tu música… quedan ${s.stats.tagging.pending}. La biblioteca se completa sola.`;
    }
    const offline = s.offline || s.stats?.health?.ok === false;
    banner.hidden = !offline;
    banner.textContent = s.offline ? 'Sin conexión: puedes escuchar la música guardada en este dispositivo.'
      : 'Telegram no responde ahora mismo. Se reintenta solo; mientras tanto no se podrán abrir archivos nuevos.';
    if (!sync?.running && !sync?.error && !sync?.pruneBlocked && s.stats?.retag?.running) {
      syncNote.hidden = false;
      syncNote.textContent = `Actualizando etiquetas… quedan ${s.stats.retag.pending ?? 0}.`;
    }
    const render = s.results !== null ? renderExplorer : s.section === 'library' ? renderLibrary : s.section === 'trash' ? renderTrash : s.section === 'page' ? renderPage : renderExplorer;
    render(explorer);
    foot.textContent = s.stats ? `${s.stats.files} archivos en Telegram (${formatBytes(s.stats.bytes)})` : '';
  };
  watch(appState, explorer, paint);
  paint(appState.get());
}
