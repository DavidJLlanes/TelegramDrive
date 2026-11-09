import { h } from '../../core/dom.js';
import { navigate } from '../../core/router.js';
import { auditApi } from './api.js';

export const loadAudit = () => auditApi.library();

const plural = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;
const open = (path) => h('button', { class: 'btn', type: 'button', onclick: () => navigate(path) }, 'Abrir carpeta');
const row = (main, sub, side) => h('div', { class: 'pg-row' }, h('div', { class: 'pg-main' }, h('strong', {}, main), h('span', {}, sub)), h('div', { class: 'pg-side' }, side));
const more = (list) => (list.total > list.items.length ? h('p', { class: 'pg-hint' }, `Se muestran ${list.items.length} de ${list.total}.`) : null);

function panel(title, hint, list, makeRow) {
  return h('section', { class: 'pg-panel' }, h('h2', {}, title),
    list.total ? [h('p', { class: 'pg-hint' }, hint), h('div', { class: 'pg-rows' }, list.items.map(makeRow)), more(list)]
      : h('p', { class: 'pg-hint' }, h('span', { class: 'pg-badge ok' }, 'Todo en orden'), ' Nada que revisar aquí.'));
}

const trackNumbers = (missing) => missing.map((m) => (m.disc > 1 ? `${m.disc}-${m.track}` : m.track)).join(', ');

export function renderAudit(el, { data }) {
  const { totals } = data;
  el.replaceChildren(
    h('section', { class: 'pg-panel' }, h('h2', {}, 'Resumen'),
      h('p', { class: 'pg-hint' }, `${plural(totals.tracks, 'canción', 'canciones')} · ${plural(totals.albums, 'álbum', 'álbumes')} con etiquetas · ${plural(totals.untagged, 'sin etiquetas', 'sin etiquetas')}. Esta revisión solo lee: no cambia nada. Para corregir, usa «Etiquetas» en el menú de las canciones.`)),
    panel('Álbumes incompletos', 'Faltan números de pista entre la primera y la última.', data.incompleteAlbums,
      (a) => row(`${a.album} · ${a.artist || 'Artista desconocido'}`, `${a.path} · ${plural(a.tracks, 'canción', 'canciones')} · faltan ${trackNumbers(a.missing)}${a.missingCount > a.missing.length ? '…' : ''}`, open(a.path))),
    panel('Números de pista repetidos', 'Dos archivos del mismo álbum comparten número.', data.duplicateTracks,
      (a) => row(`${a.album} · ${a.artist || 'Artista desconocido'}`, `${a.path} · ${a.numbers.map((n) => `pista ${n.track}: ${n.files.join(' y ')}`).join(' · ')}`, open(a.path))),
    panel('Etiquetas incoherentes', 'Un mismo álbum con años o artistas distintos.', data.mixedAlbums,
      (a) => row(`${a.album} · ${a.path}`, [a.years.length > 1 ? `años ${a.years.join(', ')}` : '', a.artists.length ? `artistas ${a.artists.join(', ')}` : ''].filter(Boolean).join(' · '), open(a.path))),
    panel('Artistas escritos de varias formas', 'Parecen el mismo artista, pero aparecen separados en la biblioteca.', data.artistVariants,
      (variants) => row(variants.map((v) => v.name).join('  ≈  '), variants.map((v) => plural(v.tracks, 'canción', 'canciones')).join(' · '), null)),
    panel('Canciones sin etiquetas', 'Se ordenan por nombre y no aparecen en Artistas ni Álbumes.', data.untagged,
      (f) => row(f.name, f.pending ? `${f.path} · pendiente de leer` : f.path, open(f.path))));
}
