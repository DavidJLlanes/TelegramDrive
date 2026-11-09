// Cabecera de la biblioteca: migas, título, subtítulo y botones (reproducir, más acciones) según la vista.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { reload } from '../core/drive.js';
import { navigateLib } from '../core/router.js';
import { playList } from '../players/audio-player.js';
import { playTagged } from '../core/playback.js';
import { offlineTracks, isSaved } from '../core/offline.js';
import { formatBytes } from '../core/format.js';
import { playButtons } from './play-buttons.js';
import { openMenu } from './menu.js';
import { confirmDialog, promptText } from './modal.js';
import { addToPlaylist, createPlaylistWith } from './playlist-picker.js';
import { editAlbumTags, editArtistName } from './tag-editor.js';
import { toggleOffline } from './audio-actions.js';
import { downloadZip } from './download.js';
import { toast, toastError } from './toast.js';

const plural = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;
const crumb = (label, view, a) => h('button', { class: 'crumb', onclick: () => navigateLib(view, a) }, label);
const nav = (...nodes) => h('nav', { class: 'crumbs', 'aria-label': 'Ruta' }, nodes.flatMap((n, i) => (i ? [h('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, '/'), n] : [n])));
const more = (items) => h('button', { class: 'btn btn-icon', 'aria-label': 'Más acciones', 'aria-haspopup': 'menu', onclick: (e) => openMenu(e.currentTarget, items) }, icon('more'));
const withMore = (play, items) => [...play, more(items)];

const TITLES = { albums: 'Álbumes', artists: 'Artistas', genres: 'Géneros', playlists: 'Listas', offline: 'Sin conexión' };
const COUNTS = { albums: ['álbum', 'álbumes'], artists: ['artista', 'artistas'], genres: ['género', 'géneros'], playlists: ['lista', 'listas'] };

/** Acciones comunes de un conjunto de canciones ya cargado (álbum, lista, sin conexión). */
function trackSetItems(tracks) {
  const ids = tracks.map((t) => t.id);
  return [
    { label: 'Añadir a una lista…', icon: 'playlist', run: () => addToPlaylist(ids) },
    { label: tracks.every((t) => isSaved(t.id)) ? 'Quitar de sin conexión' : 'Guardar sin conexión', icon: 'cloud', run: () => toggleOffline(tracks) },
    { label: 'Descargar como ZIP', icon: 'archive', run: () => downloadZip({ ids }) },
  ];
}

function playlistItems(id, name, tracks) {
  return [
    ...trackSetItems(tracks), 'sep',
    { label: 'Renombrar lista', icon: 'edit', run: async () => {
      const next = await promptText({ title: 'Renombrar lista', label: 'Nombre', value: name });
      if (next && next !== name) { try { await api.updatePlaylist(id, { name: next }); navigateLib('playlist', id); reload(); } catch (err) { toastError(err); } }
    } },
    { label: 'Eliminar lista', icon: 'trash', danger: true, run: async () => {
      if (!(await confirmDialog({ title: 'Eliminar lista', message: `«${name}» se eliminará. Las canciones no se borran.` }))) return;
      try { await api.deletePlaylist(id); toast('Lista eliminada', { type: 'ok' }); navigateLib('playlists'); } catch (err) { toastError(err); }
    } },
  ];
}

export function libraryHead({ view, a, b, items, tracks, loading, name }) {
  const count = (key) => (loading ? '' : plural(items.length, ...COUNTS[key]));
  switch (view) {
    case 'artist':
      return { crumbs: nav(crumb('Artistas', 'artists')), title: a, sub: loading ? '' : plural(items.length, 'álbum', 'álbumes'),
        tools: withMore(playButtons((o) => playTagged({ artist: a }, o)), [{ label: 'Renombrar o fusionar artista…', icon: 'edit', run: () => editArtistName(a) }]) };
    case 'genre':
      return { crumbs: nav(crumb('Géneros', 'genres')), title: a, sub: loading ? '' : plural(items.length, 'álbum', 'álbumes'), tools: playButtons((o) => playTagged({ genre: a }, o)) };
    case 'album':
      return {
        crumbs: nav(crumb('Artistas', 'artists'), crumb(a, 'artist', a)), title: b || 'Sin álbum',
        sub: loading ? '' : plural(tracks.length, 'canción', 'canciones'),
        tools: tracks.length ? withMore(playButtons((o) => playList(tracks, o)), [
          ...trackSetItems(tracks), 'sep', { label: 'Editar álbum…', icon: 'edit', run: () => editAlbumTags({ artist: a, album: b, tracks }) },
        ]) : null,
      };
    case 'playlist':
      return { crumbs: nav(crumb('Listas', 'playlists')), title: name || 'Lista', sub: loading ? '' : plural(tracks.length, 'canción', 'canciones'),
        tools: withMore(tracks.length ? playButtons((o) => playList(tracks, o)) : [], playlistItems(a, name, tracks)) };
    case 'playlists':
      return { crumbs: null, title: 'Listas', sub: count('playlists'), tools: [h('button', { class: 'btn btn-primary', onclick: () => createPlaylistWith() }, icon('plus'), 'Nueva lista')] };
    case 'offline': {
      const saved = offlineTracks();
      return { crumbs: null, title: 'Sin conexión', sub: saved.length ? `${plural(saved.length, 'canción', 'canciones')} · ${formatBytes(saved.reduce((s, t) => s + t.size, 0))}` : 'Música guardada en este dispositivo',
        tools: saved.length ? withMore(playButtons((o) => playList(saved, o)), trackSetItems(saved).slice(1, 2)) : null };
    }
    default:
      return { crumbs: null, title: TITLES[view] ?? 'Álbumes', sub: count(view in COUNTS ? view : 'albums'), tools: null };
  }
}
