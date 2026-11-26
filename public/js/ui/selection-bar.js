// Barra de selección (abajo, flotante): contador, «todo», y una fila deslizable de acciones con icono y nombre.
// Solo aparecen las acciones que tienen sentido para lo seleccionado (canciones, carpetas o ambas).
import { h, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, watch } from '../core/store.js';
import { pickFolder } from './modal.js';
import { openMenu } from './menu.js';
import { addToPlaylist } from './playlist-picker.js';
import { editTagsBulk } from './tag-editor.js';
import { chooseCover, removeCovers } from './cover-assign.js';
import { chooseFolderImage, removeFolderImages } from './folder-image.js';
import { colorFolders, iconFolders, removeIconFolders, defaultIconFolders } from './folder-bulk.js';
import { split, bulk, confirmDelete, zip, clearSelection, selectAll } from './selection.js';
import { pop } from './pop.js';

const selected = () => split(appState.get());
const selectedFolders = () => { const s = appState.get(); const { folders } = split(s); return (s.folders ?? []).filter((f) => folders.includes(f.path)); };
const finish = (ok) => { if (ok) clearSelection(); };

/** Acciones según la selección. `menu` = abre opciones; `run` = acción directa. */
function actions({ files, folders }) {
  const audio = files.filter((f) => f.kind === 'audio');
  const list = [{ id: 'move', label: 'Mover', icon: 'move', run: async () => { const to = await pickFolder({ title: 'Mover selección' }); if (to !== null) bulk('move', to); } }];
  if (files.length || folders.length === 1) list.push({ id: 'zip', label: 'Descargar', icon: 'download', run: zip });
  if (audio.length) {
    list.push({ id: 'playlist', label: 'A una lista', icon: 'playlist', run: () => addToPlaylist(audio.map((f) => f.id)) });
    list.push({ id: 'cover', label: 'Carátula', icon: 'image', menu: () => [
      { label: 'Poner carátula…', icon: 'image', run: async () => finish(await chooseCover(selected().files)) },
      { label: 'Quitar carátula', icon: 'close', run: async () => finish(await removeCovers(selected().files)) },
    ] });
  }
  if (audio.length || folders.length) list.push({ id: 'tags', label: 'Etiquetas', icon: 'tag', run: async () => { await editTagsBulk(selected()); clearSelection(); } });
  if (folders.length) {
    list.push({ id: 'color', label: 'Color', icon: 'palette', run: async () => finish(await colorFolders(selectedFolders())) });
    list.push({ id: 'icon', label: 'Icono', icon: 'star', menu: () => [
      { label: 'Elegir icono…', icon: 'star', run: async () => finish(await iconFolders(selectedFolders())) },
      { label: 'Icono de carpeta normal', icon: 'folder', run: async () => finish(await defaultIconFolders(selectedFolders())) },
      { label: 'Quitar icono', icon: 'ban', run: async () => finish(await removeIconFolders(selectedFolders())) },
    ] });
    list.push({ id: 'bg', label: 'Fondo', icon: 'image', menu: () => [
      { label: 'Poner imagen de fondo…', icon: 'image', run: async () => finish(await chooseFolderImage(selectedFolders())) },
      { label: 'Quitar imagen de fondo', icon: 'close', run: async () => { await removeFolderImages(selectedFolders()); clearSelection(); } },
    ] });
  }
  list.push({ id: 'delete', label: 'Eliminar', icon: 'trash', danger: true, menu: () => [
    { label: 'Enviar a la papelera', icon: 'trash', run: () => bulk('trash') },
    { label: 'Eliminar definitivamente', icon: 'close', danger: true, run: confirmDelete },
  ] });
  return list;
}

export function createSelectionBar() {
  const count = h('strong', { class: 'sel-count', 'aria-live': 'polite' });
  const all = h('button', { class: 'sel-all', type: 'button', onclick: (e) => { pop(e.currentTarget); selectAll(); } }, icon('check'), h('span', {}, 'Todo'));
  const row = h('div', { class: 'sel-actions' });
  const bar = h('div', { class: 'selection-bar', role: 'toolbar', 'aria-label': 'Acciones sobre la selección' },
    h('div', { class: 'sel-head' },
      h('button', { class: 'sel-close', type: 'button', 'aria-label': 'Cancelar selección', onclick: clearSelection }, icon('close')),
      count, all),
    row);
  let shape = '';
  const paint = (s) => {
    bar.hidden = s.selected.length === 0;
    if (bar.hidden) { shape = ''; return; }
    count.textContent = `${s.selected.length.toLocaleString('es-ES')} seleccionado${s.selected.length === 1 ? '' : 's'}`;
    const picked = split(s);
    const list = actions(picked);
    const key = list.map((a) => a.id).join();
    if (key === shape) return; // mismas acciones: no se repinta (no se reinicia la animación ni el desplazamiento)
    shape = key;
    fill(row, ...list.map((a, i) => {
      const b = h('button', {
        class: `sel-act pop-fx${a.danger ? ' danger' : ''}`, type: 'button', 'aria-haspopup': a.menu ? 'menu' : null,
        onclick: (e) => { const el = e.currentTarget; pop(el); if (a.menu) openMenu(el, a.menu()); else a.run(); },
      }, h('span', { class: 'sel-ico' }, icon(a.icon)), h('span', { class: 'sel-label' }, a.label));
      b.style.setProperty('--i', i);
      return b;
    }));
  };
  watch(appState, bar, paint);
  paint(appState.get());
  return bar;
}
