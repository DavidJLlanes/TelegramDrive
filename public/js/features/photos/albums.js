import { h, fill } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { navigateView } from '../../core/views.js';
import { reload } from '../../core/drive.js';
import { thumbUrl } from '../../core/api.js';
import { confirmDialog, promptText } from '../../ui/modal.js';
import { toast, toastError } from '../../ui/toast.js';
import { photosApi } from './api.js';
import { photoGrid } from './grid.js';
import { createAlbum } from './album-picker.js';

export async function loadAlbums([id]) {
  return id ? { open: await photosApi.album(id) } : { albums: await photosApi.albums() };
}

const card = (album) => {
  const open = () => navigateView('albumes-fotos', album.id);
  const cover = h('div', { class: 'ph-album-cover' }, icon('image'));
  if (album.cover) {
    const img = h('img', { src: thumbUrl(album.cover), alt: '', loading: 'lazy' });
    fill(cover, img);
    img.addEventListener('error', () => fill(cover, icon('image')));
  }
  return h('div', { class: 'ph-album', tabindex: 0, role: 'link', 'aria-label': album.name, onclick: open, onkeydown: (e) => e.key === 'Enter' && open() },
    cover, h('strong', {}, album.name), h('span', {}, `${album.count} ${album.count === 1 ? 'foto' : 'fotos'}`));
};

export function albumTools(page) {
  const open = page.data?.open;
  if (!open) return [h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => { if (await createAlbum()) reload(); } }, icon('plus'), 'Nuevo álbum')];
  const { album } = open;
  return [
    h('button', { class: 'btn', type: 'button', onclick: async () => {
      const name = await promptText({ title: 'Renombrar álbum', label: 'Nombre', value: album.name });
      if (name && name !== album.name) { try { await photosApi.renameAlbum(album.id, name); reload(); } catch (err) { toastError(err); } }
    } }, icon('edit'), 'Renombrar'),
    h('button', { class: 'btn btn-danger', type: 'button', onclick: async () => {
      if (!await confirmDialog({ title: 'Eliminar álbum', message: `Se eliminará el álbum «${album.name}». Las fotos no se borran.` })) return;
      try { await photosApi.deleteAlbum(album.id); toast('Álbum eliminado', { type: 'ok' }); navigateView('albumes-fotos'); } catch (err) { toastError(err); }
    } }, icon('trash'), 'Eliminar')];
}

export function renderAlbums(el, { data }) {
  if (data.open) {
    const { album, photos } = data.open;
    const menuExtra = (p) => [{ label: 'Quitar de este álbum', icon: 'close', run: async () => { try { await photosApi.removeFromAlbum(album.id, [p.id]); reload(); } catch (err) { toastError(err); } } }];
    fill(el, h('button', { class: 'btn btn-ghost ph-back', type: 'button', onclick: () => navigateView('albumes-fotos') }, icon('chevronLeft'), 'Álbumes'),
      ...(photos.length ? photoGrid(photos, { menuExtra }) : [h('div', { class: 'empty' }, h('strong', {}, 'Álbum vacío'), h('span', {}, 'Abre el menú de una foto y elige «Añadir a un álbum de fotos…».'))]));
    return;
  }
  fill(el, data.albums.length ? h('div', { class: 'ph-albums' }, data.albums.map(card))
    : h('div', { class: 'empty' }, icon('image'), h('strong', {}, 'Todavía no tienes álbumes'), h('span', {}, 'Crea uno y añade fotos desde su menú. Los álbumes no mueven ni duplican las fotos.')));
}
