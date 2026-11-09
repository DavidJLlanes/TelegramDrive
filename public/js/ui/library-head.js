// Cabecera de la biblioteca: migas, título, subtítulo y botones de reproducción según la vista.
import { h } from '../core/dom.js';
import { navigateLib } from '../core/router.js';
import { playList } from '../players/audio-player.js';
import { playTagged } from '../core/playback.js';
import { playButtons } from './play-buttons.js';

const plural = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;
const crumb = (label, view, a) => h('button', { class: 'crumb', onclick: () => navigateLib(view, a) }, label);
const nav = (...nodes) => h('nav', { class: 'crumbs', 'aria-label': 'Ruta' }, nodes.flatMap((n, i) => (i ? [h('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, '/'), n] : [n])));

const TITLES = { albums: 'Álbumes', artists: 'Artistas', genres: 'Géneros' };
const COUNTS = { albums: ['álbum', 'álbumes'], artists: ['artista', 'artistas'], genres: ['género', 'géneros'] };

export function libraryHead({ view, a, b, items, tracks, loading }) {
  const count = (key) => (loading ? '' : plural(items.length, ...COUNTS[key]));
  switch (view) {
    case 'artist':
      return { crumbs: nav(crumb('Artistas', 'artists')), title: a, sub: loading ? '' : plural(items.length, 'álbum', 'álbumes'), tools: playButtons((o) => playTagged({ artist: a }, o)) };
    case 'genre':
      return { crumbs: nav(crumb('Géneros', 'genres')), title: a, sub: loading ? '' : plural(items.length, 'álbum', 'álbumes'), tools: playButtons((o) => playTagged({ genre: a }, o)) };
    case 'album':
      return {
        crumbs: nav(crumb('Artistas', 'artists'), crumb(a, 'artist', a)), title: b || 'Sin álbum',
        sub: loading ? '' : plural(tracks.length, 'canción', 'canciones'),
        tools: tracks.length ? playButtons((o) => playList(tracks, o)) : null,
      };
    default:
      return { crumbs: null, title: TITLES[view] ?? 'Álbumes', sub: count(view in COUNTS ? view : 'albums'), tools: null };
  }
}
