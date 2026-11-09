import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { appState } from '../core/store.js';
import { search, watchSync } from '../core/drive.js';
import { onInstallAvailable, promptInstall, isStandalone } from '../pwa/register.js';
import { createFolder } from './actions.js';
import { pickFiles } from './uploader.js';
import { openMenu } from './menu.js';
import { toast, toastError } from './toast.js';
import { manageShares } from './share-dialog.js';

export function renderTopbar({ onLogout }) {
  const searchInput = h('input', {
    class: 'input', type: 'search', placeholder: 'Buscar por nombre…', 'aria-label': 'Buscar en todo el almacenamiento',
    oninput: (e) => search(e.target.value),
  });
  let canInstall = false;
  onInstallAvailable((available) => { canInstall = available && !isStandalone(); });

  const sync = async () => {
    try { await api.refresh(); toast('Sincronizando con Telegram…'); watchSync(); } catch (e) { toastError(e); }
  };
  const overflow = (e) => openMenu(e.currentTarget, [
    { label: 'Sincronizar con Telegram', icon: 'refresh', run: sync },
    { label: 'Enlaces compartidos', icon: 'link', run: manageShares },
    ...(canInstall ? [{ label: 'Instalar aplicación', icon: 'install', run: promptInstall }] : []),
    'sep',
    { label: 'Cerrar sesión', icon: 'logout', run: onLogout },
  ]);

  appState.subscribe((s) => { if (s.query === '' && searchInput.value) searchInput.value = ''; });
  return h('header', { class: 'topbar' },
    h('span', { class: 'brand-mark' }, icon('plane')),
    h('div', { class: 'search' }, icon('search'), searchInput),
    h('div', { class: 'toolbar-spacer' }),
    h('button', { class: 'btn', onclick: createFolder }, icon('folderPlus'), h('span', { class: 'hide-mobile' }, 'Nueva carpeta')),
    h('button', { class: 'btn btn-primary', 'aria-haspopup': 'menu', onclick: (e) => openMenu(e.currentTarget, [
      { label: 'Subir archivos', icon: 'upload', run: () => pickFiles() },
      { label: 'Subir carpeta', icon: 'folderPlus', run: () => pickFiles({ directory: true }) },
    ]) }, icon('upload'), 'Subir'),
    h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Más opciones', 'aria-haspopup': 'menu', onclick: overflow }, icon('more')));
}
