// Controlador de las vistas registradas (core/views.js): carga sus datos y los deja en el estado (`section: 'page'`).
import { appState } from './store.js';
import { getView } from './views.js';
import { nextToken, isCurrent } from './drive.js';
import { toastError } from '../ui/toast.js';

export async function loadPage(id, parts = []) {
  const view = getView(id);
  const mine = nextToken();
  appState.set({ section: 'page', selected: [], query: '', results: null, page: { id, parts, loading: Boolean(view?.load), data: null, error: null } });
  if (!view?.load) return;
  try {
    const data = await view.load(parts);
    if (isCurrent(mine)) appState.set({ page: { id, parts, loading: false, data, error: null } });
  } catch (err) {
    if (!isCurrent(mine)) return;
    appState.set({ page: { id, parts, loading: false, data: null, error: err.message } });
    toastError(err);
  }
}
