import { h, clear } from '../core/dom.js';
import { icon, kindIcon } from '../core/icons.js';
import { thumbUrl, contentUrl } from '../core/api.js';
import { formatBytes, formatDate } from '../core/format.js';
import { navigate } from '../core/router.js';
import { appState } from '../core/store.js';
import { openMenu } from './menu.js';
import { fileMenu, folderMenu } from './actions.js';
import { sortFiles, sortFolders } from './sorting.js';
import { openFile } from '../players/viewer.js';

const MAX_FULL_FALLBACK = 6 * 1024 * 1024;
const noThumb = new Set(); // ids sin miniatura: evita repetir la petición en cada repintado

function thumbnail(file) {
  if (file.kind !== 'image') return icon(kindIcon(file.kind));
  const useFull = noThumb.has(file.id);
  if (useFull && file.size > MAX_FULL_FALLBACK) return icon('image');
  const img = h('img', { src: useFull ? contentUrl(file.id) : thumbUrl(file.id), alt: '', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => {
    if (img.dataset.fallback || file.size > MAX_FULL_FALLBACK) { noThumb.add(file.id); img.replaceWith(icon('image')); return; }
    img.dataset.fallback = '1';
    noThumb.add(file.id);
    img.src = contentUrl(file.id);
  });
  return img;
}

function moreButton(items) {
  return h('button', {
    class: 'item-more', 'aria-label': 'Más opciones', 'aria-haspopup': 'menu',
    onclick: (e) => { e.stopPropagation(); openMenu(e.currentTarget, items); },
  }, icon('more'));
}

function folderCard(folder) {
  const open = () => navigate(folder.path);
  return h('div', {
    class: 'item is-folder', tabindex: 0, role: 'button', 'aria-label': `Carpeta ${folder.name}`, onclick: open,
    onkeydown: (e) => e.key === 'Enter' && open(),
    oncontextmenu: (e) => { e.preventDefault(); openMenu(e.currentTarget, folderMenu(folder)); },
  },
  h('div', { class: 'item-thumb' }, icon('folder')),
  h('div', { class: 'item-meta' }, h('div', { class: 'item-name', title: folder.name }, folder.name), h('div', { class: 'item-sub' }, 'Carpeta')),
  moreButton(folderMenu(folder)));
}

function fileCard(file, siblings, playingId) {
  const open = () => openFile(file, siblings);
  return h('div', {
    class: `item kind-${file.kind}${file.id === playingId ? ' playing' : ''}`, tabindex: 0, role: 'button',
    dataset: { id: file.id }, 'aria-label': file.name, onclick: open,
    onkeydown: (e) => e.key === 'Enter' && open(),
    oncontextmenu: (e) => { e.preventDefault(); openMenu(e.currentTarget, fileMenu(file, siblings)); },
  },
  h('div', { class: 'item-thumb' }, thumbnail(file)),
  h('div', { class: 'item-meta' }, h('div', { class: 'item-name', title: file.name }, file.name),
    h('div', { class: 'item-sub' }, `${formatBytes(file.size)} · ${formatDate(file.date)}`)),
  moreButton(fileMenu(file, siblings)));
}

export function renderExplorer(container) {
  const s = appState.get();
  clear(container);
  if (s.loading) {
    container.append(h('div', { class: 'items' }, Array.from({ length: 8 }, () => h('div', { class: 'skeleton' }))));
    return;
  }
  const searching = s.results !== null;
  const files = sortFiles(searching ? s.results : s.files, s.sort);
  const folders = searching ? [] : sortFolders(s.folders);
  if (!files.length && !folders.length) {
    container.append(h('div', { class: 'empty' }, icon(searching ? 'search' : 'folder'),
      h('strong', {}, searching ? 'Sin resultados' : 'Carpeta vacía'),
      h('span', {}, searching ? 'Prueba con otro nombre.' : 'Sube archivos o arrástralos aquí.')));
    return;
  }
  container.append(h('div', { class: `items view-${s.view}`, role: 'list' },
    folders.map(folderCard), files.map((f) => fileCard(f, files, s.playingId))));
}
