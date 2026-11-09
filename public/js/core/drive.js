// Controlador de datos: sincroniza la API con el estado de la aplicación.
import { api } from './api.js';
import { appState } from './store.js';
import { toastError } from '../ui/toast.js';

let token = 0;

export async function loadPath(path = appState.get().path) {
  const mine = ++token;
  appState.set({ path, loading: true, query: '', results: null });
  try {
    const data = await api.list(path);
    if (mine !== token) return;
    appState.set({ path: data.path, folders: data.folders, files: data.files, loading: false });
  } catch (err) {
    if (mine !== token) return;
    appState.set({ loading: false, folders: [], files: [] });
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

/** Archivos de la vista actual (resultados de búsqueda o carpeta), ordenados como se muestran. */
export function visibleFiles() {
  const { results, files } = appState.get();
  return results ?? files;
}
