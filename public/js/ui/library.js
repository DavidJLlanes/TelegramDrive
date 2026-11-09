// Biblioteca de música: álbumes, artistas, géneros, listas y música sin conexión, a partir de las etiquetas.
import { h, clear } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { tint } from '../core/color.js';
import { api } from '../core/api.js';
import { appState } from '../core/store.js';
import { formatBytes, formatTime } from '../core/format.js';
import { reload } from '../core/drive.js';
import { albumCard, artistCard, genreCard, playlistCard, coverImage } from './cards.js';
import { trackList } from './track-list.js';
import { toastError } from './toast.js';

function albumHero(tracks) {
  const first = tracks[0];
  const coverId = tracks.find((t) => t.thumb)?.id;
  const year = Math.max(...tracks.map((t) => t.tags?.year ?? 0));
  const seconds = tracks.reduce((sum, t) => sum + (t.tags?.duration ?? 0), 0);
  const art = tint(h('div', { class: 'card-art hero-art' }, icon('disc', 'big')), `${first.tags?.band}|${first.tags?.album}`);
  if (coverId) art.prepend(coverImage(art, coverId));
  const facts = [first.tags?.artist, year || null, first.tags?.genre, seconds ? formatTime(seconds) : formatBytes(tracks.reduce((s, t) => s + t.size, 0))].filter(Boolean);
  return h('div', { class: 'album-hero' }, art, h('p', {}, facts.join(' · ')));
}

function emptyState(view, tagging) {
  const texts = {
    playlists: ['Todavía no tienes listas', 'Crea una con «Nueva lista» o añade canciones desde el menú ⋮ de cualquier canción.'],
    playlist: ['Esta lista está vacía', 'Añade canciones desde el menú ⋮ de cualquier canción o desde la cola de reproducción.'],
    offline: ['Nada guardado sin conexión', 'Usa «Guardar sin conexión» en el menú ⋮ de una canción, un álbum o una lista.'],
  };
  const [title, text] = texts[view] ?? (tagging?.running
    ? ['Leyendo etiquetas…', 'Estamos leyendo artista, álbum y género de tus canciones. Aparecerán aquí enseguida.']
    : ['Todavía no hay música etiquetada', 'Sube archivos de audio con etiquetas (artista, álbum…) o pulsa Sincronizar para indexar los que ya tienes.']);
  return h('div', { class: 'empty' }, icon('music'), h('strong', {}, title), h('span', {}, text));
}

/** Menú de cada canción dentro de una lista: quitar y reordenar. */
function playlistMenu(lib) {
  const save = async (ids) => { try { await api.updatePlaylist(lib.a, { ids }); reload(); } catch (err) { toastError(err); } };
  return (file) => {
    const ids = lib.tracks.map((t) => t.id);
    const i = ids.indexOf(file.id);
    return [
      { label: 'Quitar de la lista', icon: 'close', run: () => save(ids.filter((x) => x !== file.id)) },
      ...(i > 0 ? [{ label: 'Subir', icon: 'arrowUp', run: () => { ids.splice(i - 1, 2, ids[i], ids[i - 1]); save(ids); } }] : []),
      ...(i < ids.length - 1 ? [{ label: 'Bajar', icon: 'arrowDown', run: () => { ids.splice(i, 2, ids[i + 1], ids[i]); save(ids); } }] : []),
    ];
  };
}

export function renderLibrary(container) {
  const s = appState.get();
  const { lib } = s;
  clear(container);
  if (lib.loading) { container.append(h('div', { class: 'cards' }, Array.from({ length: 10 }, () => h('div', { class: 'skeleton' })))); return; }
  if (['album', 'playlist', 'offline'].includes(lib.view)) {
    if (!lib.tracks.length) { container.append(emptyState(lib.view, s.stats?.tagging)); return; }
    const extra = lib.view === 'playlist' ? playlistMenu(lib) : undefined;
    container.append(...(lib.view === 'album' ? [albumHero(lib.tracks)] : []), trackList(lib.tracks, { playingId: s.playingId, extraMenu: extra }));
    return;
  }
  if (!lib.items.length) { container.append(emptyState(lib.view, s.stats?.tagging)); return; }
  const make = { artists: artistCard, genres: genreCard, playlists: playlistCard, artist: (a) => albumCard(a, { showArtist: false }) }[lib.view] ?? albumCard;
  container.append(h('div', { class: 'cards' }, lib.items.map(make)));
}
