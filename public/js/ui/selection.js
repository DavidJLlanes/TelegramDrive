// Selección múltiple de archivos y carpetas, con barra de acciones (mover, papelera, ZIP, añadir a lista).
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { appState, watch } from '../core/store.js';
import { reload, refreshStats, loadMore } from '../core/drive.js';
import { applyFileFilters } from '../core/explorer-ext.js';
import { pickFolder, dialog } from './modal.js';
import { openMenu } from './menu.js';
import { downloadZip } from './download.js';
import { addToPlaylist } from './playlist-picker.js';
import { editTagsBulk } from './tag-editor.js';
import { chooseCover } from './cover-assign.js';
import { toast, toastError } from './toast.js';

export const fileKey = (f) => `f:${f.id}`;
export const folderKey = (f) => `d:${f.path}`;
export const isSelected = (key) => appState.get().selected.includes(key);
export const clearSelection = () => appState.get().selected.length && appState.set({ selected: [] });

export function toggleSelected(key) {
  const { selected } = appState.get();
  appState.set({ selected: selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key] });
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.querySelector('.overlay, .menu')) clearSelection(); });

function split(s) {
  const files = new Map([...s.files, ...(s.results ?? [])].map((f) => [fileKey(f), f]));
  return {
    files: s.selected.filter((k) => k.startsWith('f:')).map((k) => files.get(k)).filter(Boolean),
    folders: s.selected.filter((k) => k.startsWith('d:')).map((k) => k.slice(2)),
  };
}

async function bulk(action, parent) {
  const { files, folders } = split(appState.get());
  try {
    const r = await api.bulk({ action, files: files.map((f) => f.id), folders, parent });
    const text = action === 'trash' ? 'enviados a la papelera (puedes restaurarlos desde ahí)'
      : action === 'delete' ? 'eliminados definitivamente' : 'movidos';
    toast(r.failed.length ? `${r.done} ${text}; ${r.failed.length} con error: ${r.failed[0].error}` : `${r.done} ${r.done === 1 ? 'elemento' : 'elementos'} ${text}`, { type: r.failed.length ? 'error' : 'ok' });
  } catch (err) { toastError(err); }
  clearSelection();
  await reload();
  refreshStats();
}

const count = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;

/** Eliminación definitiva (también en Telegram), con confirmación y recuento. */
async function confirmDelete() {
  const { files, folders } = split(appState.get());
  const parts = [];
  if (files.length) parts.push(count(files.length, 'archivo', 'archivos'));
  if (folders.length) parts.push(count(folders.length, 'carpeta', 'carpetas') + ' con todo su contenido');
  const ok = await dialog({
    title: 'Eliminar definitivamente', confirmLabel: 'Eliminar definitivamente', danger: true,
    content: h('p', {}, `Se eliminarán ${parts.join(' y ')}, también de Telegram. No se puede deshacer.`),
  });
  if (ok) bulk('delete');
}

/** Marca (o desmarca si ya lo estaba todo) los elementos visibles de la carpeta; antes carga las páginas que falten. */
export async function selectAll() {
  for (let i = 0; i < 100; i += 1) {
    const s = appState.get();
    if (s.results !== null || s.files.length >= s.total) break;
    await loadMore();
    if (appState.get().files.length === s.files.length) break;
  }
  const s = appState.get();
  const visible = applyFileFilters(s.results ?? s.files, s);
  const keys = [...(s.results === null ? s.folders.map(folderKey) : []), ...visible.map(fileKey)];
  const all = keys.length > 0 && keys.every((k) => s.selected.includes(k));
  appState.set({ selected: all ? [] : keys });
}

function zip() {
  const { files, folders } = split(appState.get());
  if (files.length) downloadZip({ ids: files.map((f) => f.id) });
  else if (folders.length === 1) downloadZip({ path: folders[0] });
  else toast('Selecciona archivos, o una sola carpeta, para descargar un ZIP');
  if (files.length && folders.length) toast('El ZIP incluye solo los archivos seleccionados; las carpetas se descargan de una en una');
}

export function createSelectionBar() {
  const count = h('strong', {});
  const btn = (label, name, fn, extra = '') => h('button', { class: `btn ${extra}`, type: 'button', onclick: fn }, icon(name), h('span', { class: 'hide-mobile' }, label));
  const bar = h('div', { class: 'selection-bar', role: 'toolbar', 'aria-label': 'Acciones sobre la selección' },
    h('button', { class: 'btn btn-icon btn-ghost', type: 'button', 'aria-label': 'Cancelar selección', onclick: clearSelection }, icon('close')), count,
    h('span', { class: 'toolbar-spacer' }),
    btn('Mover', 'move', async () => { const to = await pickFolder({ title: 'Mover selección' }); if (to !== null) bulk('move', to); }),
    btn('ZIP', 'archive', zip),
    btn('Etiquetas', 'tag', async () => { const picked = split(appState.get()); await editTagsBulk(picked); clearSelection(); }),
    btn('Carátula', 'image', async () => { if (await chooseCover(split(appState.get()).files)) clearSelection(); }),
    btn('Añadir a lista', 'playlist', () => addToPlaylist(split(appState.get()).files.filter((f) => f.kind === 'audio').map((f) => f.id))),
    h('button', { class: 'btn btn-danger', type: 'button', 'aria-haspopup': 'menu', onclick: (e) => openMenu(e.currentTarget, [
      { label: 'Enviar a la papelera', icon: 'trash', run: () => bulk('trash') },
      { label: 'Eliminar definitivamente', icon: 'close', danger: true, run: confirmDelete },
    ]) }, icon('trash'), h('span', { class: 'hide-mobile' }, 'Eliminar')));
  const paint = (s) => { bar.hidden = s.selected.length === 0; count.textContent = `${s.selected.length} seleccionado${s.selected.length === 1 ? '' : 's'}`; };
  watch(appState, bar, paint);
  paint(appState.get());
  return bar;
}
