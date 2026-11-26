// Botón flotante de la app (abajo a la derecha): Inicio, carpeta superior, subir archivo y nueva carpeta.
import { appState, watch } from '../core/store.js';
import { navigate } from '../core/router.js';
import { pickFiles } from '../features/uploads/index.js';
import { createFolder } from './actions.js';
import { createFan } from './fan.js';

/** '/a/b' → '/a'; '/a' → '/'. */
const parentOf = (path) => path.replace(/\/[^/]+\/?$/, '') || '/';

export function createFab() {
  const fan = createFan({ items: [
    { id: 'home', label: 'Inicio', icon: 'home', run: () => navigate('/') },
    { id: 'up', label: 'Subir un nivel', icon: 'levelUp', run: () => navigate(parentOf(appState.get().path)) },
    { id: 'upload', label: 'Subir archivo', icon: 'upload', run: () => pickFiles() },
    { id: 'folder', label: 'Nueva carpeta', icon: 'folderPlus', run: () => createFolder() },
  ] });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fan.toggle(false); });
  const up = fan.item('up');
  watch(appState, fan.el, (s) => { // se aparta mientras se seleccionan elementos (la barra de selección ocupa ese sitio)
    up.disabled = s.section !== 'files' || s.path === '/'; // en la raíz (o fuera de Archivos) no hay nivel superior
    const busy = s.selected.length > 0;
    fan.el.classList.toggle('away', busy);
    if (busy) fan.toggle(false);
  });
  return fan.el;
}
