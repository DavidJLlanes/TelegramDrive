// Controlador de la biblioteca de música (artistas, álbumes, géneros) basada en las etiquetas.
import { api } from './api.js';
import { appState } from './store.js';
import { nextToken, isCurrent } from './drive.js';
import { offlineTracks } from './offline.js';
import { toastError } from '../ui/toast.js';

async function fetchView({ view, a, b }) {
  switch (view) {
    case 'artists': return { items: (await api.artists()).artists };
    case 'genres': return { items: (await api.genres()).genres };
    case 'artist': return { items: (await api.albums({ artist: a })).albums };
    case 'genre': return { items: (await api.albums({ genre: a })).albums };
    case 'playlists': return { items: (await api.playlists()).playlists };
    case 'playlist': { const p = await api.playlist(a); return { tracks: p.files, name: p.name }; }
    case 'offline': return { tracks: offlineTracks() };
    case 'album': return { tracks: (await api.tracks({ artist: a, album: b })).files };
    default: return { items: (await api.albums()).albums };
  }
}

export async function loadLibrary(route) {
  const mine = nextToken();
  const { view = 'albums', a, b } = route;
  appState.set({ section: 'library', selected: [], query: '', results: null, lib: { view, a, b, loading: true, items: [], tracks: [] } });
  try {
    const data = await fetchView({ view, a, b });
    if (!isCurrent(mine)) return;
    appState.set({ lib: { view, a, b, loading: false, items: [], tracks: [], ...data } });
    if (!appState.get().folderPaths.length) api.folders().then(({ folders }) => appState.set({ folderPaths: folders })).catch(() => {});
  } catch (err) {
    if (!isCurrent(mine)) return;
    appState.set({ lib: { view, a, b, loading: false, items: [], tracks: [] } });
    toastError(err);
  }
}
