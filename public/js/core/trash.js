// Controlador de la papelera.
import { api } from './api.js';
import { appState } from './store.js';
import { nextToken, isCurrent } from './drive.js';
import { toastError } from '../ui/toast.js';

export async function loadTrash() {
  const mine = nextToken();
  appState.set({ section: 'trash', query: '', results: null, selected: [], trash: { loading: true, folders: [], files: [], days: 30 } });
  try {
    const data = await api.trash();
    if (isCurrent(mine)) appState.set({ trash: { loading: false, ...data } });
  } catch (err) {
    if (!isCurrent(mine)) return;
    appState.set({ trash: { loading: false, folders: [], files: [], days: 30 } });
    toastError(err);
  }
}
