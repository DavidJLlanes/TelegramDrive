// Controlador de datos: sincroniza la API con el estado de la aplicación.
import { api } from './api.js';
import { appState } from './store.js';
import { toastError } from '../ui/toast.js';

let token = 0;

const PAGE = 300;

export async function loadPath(path = appState.get().path) {
  const mine = ++token;
  appState.set({ path, loading: true, loadingMore: false, query: '', results: null });
  try {
    const data = await api.list(path, { sort: appState.get().sort, limit: PAGE });
    if (mine !== token) return;
    appState.set({ path: data.path, folders: data.folders, files: data.files, total: data.total, loading: false });
    api.folders().then(({ folders }) => appState.set({ folderPaths: folders })).catch(() => {});
  } catch (err) {
    if (mine !== token) return;
    appState.set({ loading: false, folders: [], files: [], total: 0 });
    toastError(err);
  }
}

/** Siguiente página de la carpeta actual (scroll infinito). */
export async function loadMore() {
  const s = appState.get();
  if (s.loading || s.loadingMore || s.results !== null || s.files.length >= s.total) return;
  const mine = token;
  appState.set({ loadingMore: true });
  try {
    const data = await api.list(s.path, { sort: s.sort, offset: s.files.length, limit: PAGE });
    if (mine !== token) return;
    appState.set({ files: [...appState.get().files, ...data.files], total: data.total, loadingMore: false });
  } catch (err) {
    appState.set({ loadingMore: false });
    toastError(err);
  }
}

export const reload = () => loadPath();

let searchTimer;
export function search(query) {
  clearTimeout(searchTimer);
  const q = query.trim();
  appState.set({ query });
  if (q.length < 2) { appState.set({ results: null }); return; }
  searchTimer = setTimeout(async () => {
    try {
      const { files } = await api.search(q);
      if (appState.get().query.trim() === q) appState.set({ results: files });
    } catch (err) { toastError(err); }
  }, 250);
}

export async function refreshStats() {
  try { appState.set({ stats: await api.stats() }); } catch { /* opcional */ }
}

let watching = false;
/** Mientras Telegram se está indexando, consulta el progreso y recarga la lista al terminar. */
export async function watchSync() {
  if (watching) return;
  watching = true;
  let was = false;
  try {
    for (;;) {
      const stats = await api.stats();
      appState.set({ stats });
      const running = Boolean(stats.sync?.running);
      if (was && !running) await reload();
      was = running;
      if (!running) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  } catch { /* se reintentará en la siguiente acción */ } finally { watching = false; }
}

/** Archivos de la vista actual (resultados de búsqueda o carpeta), ordenados como se muestran. */
export function visibleFiles() {
  const { results, files } = appState.get();
  return results ?? files;
}
