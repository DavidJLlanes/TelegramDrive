import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { reload } from '../core/drive.js';
import { appState } from '../core/store.js';
import { dialog, promptText } from './modal.js';
import { toast, toastError } from './toast.js';

/** Crea una lista nueva (pide el nombre) con las canciones indicadas. */
export async function createPlaylistWith(ids = []) {
  const name = await promptText({ title: 'Nueva lista', label: 'Nombre de la lista', confirmLabel: 'Crear' });
  if (!name) return null;
  try {
    const created = await api.createPlaylist(name, ids);
    toast(ids.length ? `Lista «${created.name}» creada con ${created.tracks} canciones` : `Lista «${created.name}» creada`, { type: 'ok' });
    if (appState.get().section === 'library') reload();
    return created;
  } catch (err) { toastError(err); return null; }
}

/** Añade las canciones `ids` a una lista existente o a una nueva. */
export async function addToPlaylist(ids) {
  if (!ids.length) return;
  let lists = [];
  try { ({ playlists: lists } = await api.playlists()); } catch (err) { toastError(err); return; }
  let chosen;
  const options = [
    h('button', { type: 'button', class: 'folder-option', onclick: () => { chosen = { fresh: true }; document.querySelector('form.dialog')?.requestSubmit(); } }, icon('plus'), h('span', {}, 'Nueva lista…')),
    ...lists.map((l) => h('button', { type: 'button', class: 'folder-option', onclick: () => { chosen = l; document.querySelector('form.dialog')?.requestSubmit(); } }, icon('playlist'), h('span', {}, l.name))),
  ];
  const picked = await dialog({
    title: 'Añadir a una lista', hideCancel: false, confirmLabel: 'Añadir',
    content: h('div', { class: 'folder-picker' }, options),
    onConfirm: () => chosen ?? undefined,
  });
  if (!picked) return;
  if (picked.fresh) { await createPlaylistWith(ids); return; }
  try {
    const r = await api.updatePlaylist(picked.id, { add: ids });
    toast(`Añadido a «${r.name}»`, { type: 'ok' });
    if (appState.get().section === 'library') reload();
  } catch (err) { toastError(err); }
}
