import { h } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { dialog, promptText } from '../../ui/modal.js';
import { toast, toastError } from '../../ui/toast.js';
import { photosApi } from './api.js';

/** Crea un álbum (pide el nombre). Devuelve el álbum o null. */
export async function createAlbum(ids = []) {
  const name = await promptText({ title: 'Nuevo álbum de fotos', label: 'Nombre del álbum', confirmLabel: 'Crear' });
  if (!name) return null;
  try { const album = await photosApi.createAlbum(name, ids); toast(`Álbum «${album.name}» creado`, { type: 'ok' }); return album; } catch (err) { toastError(err); return null; }
}

/** Elegir un álbum (o crear uno) para las fotos `ids`. */
export async function addToAlbum(ids) {
  let albums = [];
  try { albums = await photosApi.albums(); } catch (err) { toastError(err); return; }
  let chosen;
  const pick = (value) => () => { chosen = value; document.querySelector('form.dialog')?.requestSubmit(); };
  const picked = await dialog({
    title: 'Añadir a un álbum', confirmLabel: 'Añadir',
    content: h('div', { class: 'folder-picker' },
      h('button', { type: 'button', class: 'folder-option', onclick: pick({ fresh: true }) }, icon('plus'), h('span', {}, 'Nuevo álbum…')),
      albums.map((a) => h('button', { type: 'button', class: 'folder-option', onclick: pick(a) }, icon('image'), h('span', {}, `${a.name} · ${a.count}`)))),
    onConfirm: () => chosen ?? undefined,
  });
  if (!picked) return;
  if (picked.fresh) { await createAlbum(ids); return; }
  try { const r = await photosApi.addToAlbum(picked.id, ids); toast(r.added ? `Añadida a «${picked.name}»` : `Ya estaba en «${picked.name}»`, { type: 'ok' }); } catch (err) { toastError(err); }
}

export const albumMenuItem = (photo) => ({ label: 'Añadir a un álbum de fotos…', icon: 'image', run: () => addToAlbum([photo.id]) });
