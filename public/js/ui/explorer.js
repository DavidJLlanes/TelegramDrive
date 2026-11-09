import { h, clear } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { tint } from '../core/color.js';
import { formatBytes, formatDate } from '../core/format.js';
import { navigate } from '../core/router.js';
import { appState } from '../core/store.js';
import { loadMore } from '../core/drive.js';
import { openMenu } from './menu.js';
import { moreButton } from './more-button.js';
import { playFolder } from '../core/playback.js';
import { fileKey, folderKey, isSelected, toggleSelected } from './selection.js';
import { fileMenu, folderMenu } from './actions.js';
import { sortFiles } from './sorting.js';
import { fileCover } from './covers.js';
import { openFile } from '../players/viewer.js';

const checkbox = (key) => h('button', {
  class: 'check', type: 'button', role: 'checkbox', 'aria-checked': String(isSelected(key)), 'aria-label': 'Seleccionar',
  onclick: (e) => { e.stopPropagation(); toggleSelected(key); },
}, icon('check'));

/** Con elementos seleccionados, pulsar uno lo marca/desmarca en vez de abrirlo. */
const clickOr = (key, open) => () => (appState.get().selected.length ? toggleSelected(key) : open());

function sleeve(folder) {
  const key = folderKey(folder);
  const open = clickOr(key, () => navigate(folder.path));
  return tint(h('div', {
    class: `sleeve${isSelected(key) ? ' selected' : ''}`, tabindex: 0, role: 'link', 'aria-label': `Carpeta ${folder.name}`, onclick: open,
    onkeydown: (e) => e.key === 'Enter' && open(),
    oncontextmenu: (e) => { e.preventDefault(); openMenu(e.currentTarget, folderMenu(folder)); },
  }, h('span', { class: 'sleeve-name', title: folder.name }, folder.name), icon('folder'),
    checkbox(key),
    folder.music === false ? null : h('button', {
      class: 'sleeve-play', 'aria-label': `Reproducir ${folder.name}`, title: 'Reproducir la música de esta carpeta',
      onclick: (e) => { e.stopPropagation(); playFolder(folder.path); },
    }, icon('play')),
    moreButton(() => folderMenu(folder))), folder.name);
}

function tile(file, siblings, playingId) {
  const key = fileKey(file);
  const open = clickOr(key, () => openFile(file, siblings));
  return h('div', {
    class: `tile kind-${file.kind}${file.id === playingId ? ' playing' : ''}${isSelected(key) ? ' selected' : ''}`, tabindex: 0, role: 'button', 'aria-label': file.name,
    dataset: { id: file.id }, onclick: open, onkeydown: (e) => e.key === 'Enter' && open(),
    oncontextmenu: (e) => { e.preventDefault(); openMenu(e.currentTarget, fileMenu(file, siblings)); },
  },
  fileCover(file), checkbox(key),
  h('div', { class: 'tile-body' }, h('div', { class: 'tile-name', title: file.name }, file.name),
    h('div', { class: 'tile-meta' }, h('span', {}, file.tags?.artist || formatBytes(file.size)), h('span', {}, formatDate(file.date)))),
  moreButton(() => fileMenu(file, siblings)));
}

function emptyState(s, searching) {
  if (searching) return h('div', { class: 'empty' }, icon('search'), h('strong', {}, 'Sin resultados'), h('span', {}, 'Prueba con otro nombre o una parte del mismo.'));
  return h('div', { class: 'empty' }, icon('upload'),
    h('strong', {}, s.path === '/' ? 'Tu unidad está vacía' : 'Esta carpeta está vacía'),
    h('span', {}, 'Arrastra archivos aquí o usa Subir. También puedes crear una carpeta.'));
}

export function renderExplorer(container) {
  const s = appState.get();
  clear(container);
  container.classList.toggle('selecting', s.selected.length > 0);
  if (s.loading) {
    container.append(h('div', { class: `tiles view-${s.view}` }, Array.from({ length: 10 }, () => h('div', { class: 'skeleton' }))));
    return;
  }
  const searching = s.results !== null;
  const files = searching ? sortFiles(s.results, s.sort) : s.files; // en carpetas, el servidor ya ordena
  const folders = searching ? [] : s.folders;
  if (!files.length && !folders.length) { container.append(emptyState(s, searching)); return; }

  const both = folders.length > 0 && files.length > 0;
  if (folders.length) {
    if (both) container.append(h('h2', { class: 'section-title' }, 'Carpetas'));
    container.append(h('div', { class: 'sleeves' }, folders.map(sleeve)));
  }
  if (files.length) {
    if (both) container.append(h('h2', { class: 'section-title' }, 'Archivos'));
    container.append(h('div', { class: `tiles view-${s.view}`, role: 'list' }, files.map((f) => tile(f, files, s.playingId))));
  }
  if (!searching && files.length < s.total) container.append(sentinel(s));
}

let observer = null;
function sentinel(s) {
  const el = h('div', { class: 'load-more' }, s.loadingMore ? 'Cargando…' : `${s.files.length} de ${s.total}`);
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), { rootMargin: '600px' });
  observer.observe(el);
  return el;
}
