// Tarjetas de la biblioteca (álbumes, artistas, géneros, listas) con portada, color propio y botón de reproducir.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { tint } from '../core/color.js';
import { thumbUrl } from '../core/api.js';
import { navigateLib } from '../core/router.js';
import { playTagged } from '../core/playback.js';
import { playList } from '../players/audio-player.js';
import { api } from '../core/api.js';
import { toastError } from './toast.js';

export const plural = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;

/** Imagen de portada: oculta el dibujo de relleno al cargar y se retira si falla. */
export function coverImage(art, id, attrs = {}) {
  const img = h('img', { src: thumbUrl(id), alt: '', decoding: 'async', ...attrs });
  img.addEventListener('load', () => art.classList.add('has-img'));
  img.addEventListener('error', () => img.remove());
  return img;
}

export function card({ title, sub, cover, seed, glyph, round, open, play }) {
  const art = tint(h('div', { class: `card-art${round ? ' round' : ''}` }, glyph), seed);
  if (cover) art.prepend(coverImage(art, cover, { loading: 'lazy' }));
  art.append(h('button', { class: 'card-play', 'aria-label': `Reproducir ${title}`, onclick: (e) => { e.stopPropagation(); play(); } }, icon('play')));
  return h('div', {
    class: 'card', tabindex: 0, role: 'link', 'aria-label': title, onclick: open, onkeydown: (e) => e.key === 'Enter' && open(),
  }, art, h('div', { class: 'card-title', title }, title), h('div', { class: 'card-sub' }, sub));
}

export const albumCard = (a, { showArtist = true } = {}) => card({
  title: a.album || 'Sin álbum', seed: `${a.band}|${a.album}`, cover: a.cover, glyph: icon('disc', 'big'),
  sub: [showArtist ? a.band : null, a.year || null, plural(a.tracks, 'canción', 'canciones')].filter(Boolean).join(' · '),
  open: () => navigateLib('album', a.band, a.album),
  play: () => playTagged({ artist: a.band, album: a.album }),
});

export const artistCard = (a) => card({
  title: a.name, seed: a.name, cover: a.cover, round: true, glyph: h('span', { class: 'card-initial' }, a.name.trim()[0]?.toUpperCase() ?? '?'),
  sub: `${plural(a.albums, 'álbum', 'álbumes')} · ${plural(a.tracks, 'canción', 'canciones')}`,
  open: () => navigateLib('artist', a.name), play: () => playTagged({ artist: a.name }),
});

export const genreCard = (g) => card({
  title: g.name, seed: g.name, glyph: icon('tag', 'big'), sub: plural(g.tracks, 'canción', 'canciones'),
  open: () => navigateLib('genre', g.name), play: () => playTagged({ genre: g.name }),
});

export const playlistCard = (p) => card({
  title: p.name, seed: `lista|${p.name}`, cover: p.cover, glyph: icon('playlist', 'big'), sub: plural(p.tracks, 'canción', 'canciones'),
  open: () => navigateLib('playlist', p.id),
  play: async () => { try { const { files } = await api.playlist(p.id); playList(files); } catch (err) { toastError(err); } },
});
