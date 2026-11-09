import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { appState, prefs } from '../core/store.js';
import { reload, search, refreshStats } from '../core/drive.js';
import { onInstallAvailable, promptInstall, isStandalone } from '../pwa/register.js';
import { createFolder } from './actions.js';
import { pickFiles } from './uploader.js';
import { openMenu } from './menu.js';
import { toast, toastError } from './toast.js';

export function renderTopbar({ onLogout }) {
  const searchInput = h('input', {
    class: 'input', type: 'search', placeholder: 'Buscar en todo el almacenamiento…', 'aria-label': 'Buscar',
    oninput: (e) => search(e.target.value),
  });
  const viewBtn = h('button', { class: 'btn btn-icon', 'aria-label': 'Cambiar vista', onclick: () => {
    const view = appState.get().view === 'grid' ? 'list' : 'grid';
    prefs.save('view', view); appState.set({ view });
  } });
  const syncView = () => viewBtn.replaceChildren(icon(appState.get().view === 'grid' ? 'list' : 'grid'));
  syncView();
  appState.subscribe(syncView);

  const installBtn = h('button', { class: 'btn btn-icon hide-mobile', 'aria-label': 'Instalar aplicación', onclick: promptInstall }, icon('install'));
  installBtn.hidden = true;
  onInstallAvailable((available) => { installBtn.hidden = !available || isStandalone(); });

  const sortBtn = h('button', { class: 'btn', 'aria-haspopup': 'menu', onclick: (e) => {
    const make = (label, sort) => ({ label: `${appState.get().sort === sort ? '✓ ' : ''}${label}`, icon: 'list', run: () => { prefs.save('sort', sort); appState.set({ sort }); } });
    openMenu(e.currentTarget, [make('Nombre', 'name'), make('Fecha', 'date'), make('Tamaño', 'size')]);
  } }, 'Ordenar');

  const uploadBtn = h('button', { class: 'btn btn-primary', 'aria-haspopup': 'menu', onclick: (e) => openMenu(e.currentTarget, [
    { label: 'Subir archivos', icon: 'upload', run: () => pickFiles() },
    { label: 'Subir carpeta', icon: 'folderPlus', run: () => pickFiles({ directory: true }) },
  ]) }, icon('upload'), h('span', { class: 'hide-mobile' }, 'Subir'));

  const refreshBtn = h('button', { class: 'btn btn-icon', 'aria-label': 'Sincronizar con Telegram', onclick: async () => {
    try { toast('Sincronizando con Telegram…'); await api.refresh(); await reload(); refreshStats(); toast('Sincronizado', { type: 'ok' }); } catch (e) { toastError(e); }
  } }, icon('refresh'));

  const header = h('header', { class: 'topbar' },
    h('div', { class: 'brand' }, icon('plane'), h('span', {}, 'Telegram Drive')),
    h('div', { class: 'search' }, icon('search'), searchInput),
    h('div', { class: 'toolbar-spacer' }),
    uploadBtn,
    h('button', { class: 'btn btn-icon', 'aria-label': 'Nueva carpeta', onclick: createFolder }, icon('folderPlus')),
    sortBtn, viewBtn, refreshBtn, installBtn,
    h('button', { class: 'btn btn-icon', 'aria-label': 'Cerrar sesión', onclick: onLogout }, icon('logout')));
  appState.subscribe((s) => { if (s.query === '' && searchInput.value) searchInput.value = ''; });
  return header;
}
