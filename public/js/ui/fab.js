// Botón flotante (abajo a la derecha) que se despliega en abanico: Inicio, subir archivo y nueva carpeta.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, watch } from '../core/store.js';
import { navigate } from '../core/router.js';
import { pickFiles } from '../features/uploads/index.js';
import { createFolder } from './actions.js';
import { pop } from './pop.js';

const ITEMS = [
  { id: 'home', label: 'Inicio', icon: 'home', run: () => navigate('/') },
  { id: 'upload', label: 'Subir archivo', icon: 'upload', run: () => pickFiles() },
  { id: 'folder', label: 'Nueva carpeta', icon: 'folderPlus', run: () => createFolder() },
];

export function createFab() {
  const scrim = h('div', { class: 'fab-scrim', hidden: true });
  const main = h('button', { class: 'fab-main', type: 'button', 'aria-label': 'Acciones', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, icon('plus'));
  const root = h('div', { class: 'fab' }, scrim,
    ...ITEMS.map((it, i) => h('button', {
      class: `fab-item pop-fx fab-${it.id}`, type: 'button', 'aria-label': it.label, title: it.label, tabindex: -1,
      dataset: { i }, onclick: (e) => pop(e.currentTarget, () => { toggle(false); it.run(); }, 220),
    }, icon(it.icon))),
    main);

  function toggle(open = !root.classList.contains('open')) {
    root.classList.toggle('open', open);
    main.setAttribute('aria-expanded', String(open));
    scrim.hidden = !open;
    root.querySelectorAll('.fab-item').forEach((b) => { b.tabIndex = open ? 0 : -1; });
  }
  main.addEventListener('click', () => toggle());
  scrim.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  watch(appState, root, (s) => { // se aparta mientras se seleccionan elementos (la barra de selección ocupa ese sitio)
    const busy = s.selected.length > 0;
    root.classList.toggle('away', busy);
    if (busy) toggle(false);
  });
  return root;
}
