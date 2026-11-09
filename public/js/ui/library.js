// Biblioteca de música: álbumes, artistas y géneros a partir de las etiquetas de los archivos.
import { h, clear } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { tint } from '../core/color.js';
import { thumbUrl } from '../core/api.js';
import { appState } from '../core/store.js';
import { formatBytes } from '../core/format.js';
import { navigateLib } from '../core/router.js';
import { playTagged } from '../core/playback.js';
import { playList } from '../players/audio-player.js';
import { trackTitle } from '../core/tags.js';
import { fileMenu } from './actions.js';
import { openMenu } from './menu.js';
import { moreButton } from './more-button.js';

const plural = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;

/** Imagen de portada: oculta el dibujo de relleno al cargar y se retira si falla. */
function coverImage(art, id, attrs = {}) {
  const img = h('img', { src: thumbUrl(id), alt: '', decoding: 'async', ...attrs });
  img.addEventListener('load', () => art.classList.add('has-img'));
  img.addEventListener('error', () => img.remove());
  return img;
}

function card({ title, sub, cover, seed, glyph, round, open, play }) {
  const art = tint(h('div', { class: `card-art${round ? ' round' : ''}` }, glyph), seed);
  if (cover) {
    art.prepend(coverImage(art, cover, { loading: 'lazy' }));
  }
  art.append(h('button', { class: 'card-play', 'aria-label': `Reproducir ${title}`, onclick: (e) => { e.stopPropagation(); play(); } }, icon('play')));
  return h('div', {
    class: 'card', tabindex: 0, role: 'link', 'aria-label': title, onclick: open, onkeydown: (e) => e.key === 'Enter' && open(),
  }, art, h('div', { class: 'card-title', title }, title), h('div', { class: 'card-sub' }, sub));
}

const albumCard = (a, { showArtist = true } = {}) => card({
  title: a.album || 'Sin álbum', seed: `${a.band}|${a.album}`, cover: a.cover, glyph: icon('disc', 'big'),
  sub: [showArtist ? a.band : null, a.year || null, plural(a.tracks, 'canción', 'canciones')].filter(Boolean).join(' · '),
  open: () => navigateLib('album', a.band, a.album),
  play: () => playTagged({ artist: a.band, album: a.album }),
});

const artistCard = (a) => card({
  title: a.name, seed: a.name, cover: a.cover, round: true, glyph: h('span', { class: 'card-initial' }, a.name.trim()[0]?.toUpperCase() ?? '?'),
  sub: `${plural(a.albums, 'álbum', 'álbumes')} · ${plural(a.tracks, 'canción', 'canciones')}`,
  open: () => navigateLib('artist', a.name), play: () => playTagged({ artist: a.name }),
});

const genreCard = (g) => card({
  title: g.name, seed: g.name, glyph: icon('tag', 'big'), sub: plural(g.tracks, 'canción', 'canciones'),
  open: () => navigateLib('genre', g.name), play: () => playTagged({ genre: g.name }),
});

function trackRow(file, list, playingId) {
  const t = file.tags ?? {};
  const open = () => playList(list, { startId: file.id });
  return h('div', {
    class: `track${file.id === playingId ? ' playing' : ''}`, tabindex: 0, role: 'button', onclick: open, onkeydown: (e) => e.key === 'Enter' && open(),
    oncontextmenu: (e) => { e.preventDefault(); openMenu(e.currentTarget, fileMenu(file, list)); },
  },
  h('span', { class: 'track-no' }, file.id === playingId ? h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')) : t.track || ''),
  h('span', { class: 'track-main' }, h('span', { class: 'track-title' }, trackTitle(file)), h('span', { class: 'track-artist' }, t.artist ?? '')),
  h('span', { class: 'track-meta' }, formatBytes(file.size)),
  moreButton(() => fileMenu(file, list)));
}

function trackList(tracks, playingId) {
  const discs = new Set(tracks.map((t) => t.disc));
  const out = [];
  let lastDisc = null;
  for (const file of tracks) {
    if (discs.size > 1 && file.disc !== lastDisc) { out.push(h('h2', { class: 'section-title' }, file.disc ? `Disco ${file.disc}` : 'Otras')); lastDisc = file.disc; }
    out.push(trackRow(file, tracks, playingId));
  }
  return h('div', { class: 'track-list' }, out);
}

function albumHero(tracks) {
  const first = tracks[0];
  const coverId = tracks.find((t) => t.thumb)?.id;
  const year = Math.max(...tracks.map((t) => t.tags?.year ?? 0));
  const genre = first.tags?.genre;
  const total = tracks.reduce((sum, t) => sum + t.size, 0);
  const art = tint(h('div', { class: 'card-art hero-art' }, icon('disc', 'big')), `${first.tags?.band}|${first.tags?.album}`);
  if (coverId) {
    art.prepend(coverImage(art, coverId));
  }
  const facts = [first.tags?.artist, year || null, genre, formatBytes(total)].filter(Boolean);
  return h('div', { class: 'album-hero' }, art, h('p', {}, facts.join(' · ')));
}

function emptyLibrary(tagging) {
  return h('div', { class: 'empty' }, icon('music'),
    h('strong', {}, tagging?.running ? 'Leyendo etiquetas…' : 'Todavía no hay música etiquetada'),
    h('span', {}, tagging?.running
      ? 'Estamos leyendo artista, álbum y género de tus canciones. Aparecerán aquí enseguida.'
      : 'Sube archivos de audio con etiquetas (artista, álbum…) o pulsa Sincronizar para indexar los que ya tienes.'));
}

export function renderLibrary(container) {
  const s = appState.get();
  const { lib } = s;
  clear(container);
  if (lib.loading) { container.append(h('div', { class: 'cards' }, Array.from({ length: 10 }, () => h('div', { class: 'skeleton' })))); return; }
  if (lib.view === 'album') {
    if (!lib.tracks.length) { container.append(emptyLibrary(s.stats?.tagging)); return; }
    container.append(albumHero(lib.tracks), trackList(lib.tracks, s.playingId));
    return;
  }
  if (!lib.items.length) { container.append(emptyLibrary(s.stats?.tagging)); return; }
  const make = { artists: artistCard, genres: genreCard, artist: (a) => albumCard(a, { showArtist: false }) }[lib.view] ?? albumCard;
  container.append(h('div', { class: 'cards' }, lib.items.map(make)));
}
