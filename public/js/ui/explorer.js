import { h, clear } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { tint } from '../core/color.js';
import { formatBytes, formatDate } from '../core/format.js';
import { navigate } from '../core/router.js';
import { appState } from '../core/store.js';
import { loadMore } from '../core/drive.js';
import { openMenu } from './menu.js';
import { fileMenu, folderMenu } from './actions.js';
import { sortFiles } from './sorting.js';
import { fileCover } from './covers.js';
import { openFile } from '../players/viewer.js';

function moreButton(getItems) {
  return h('button', {
    class: 'more', 'aria-label': 'Más opciones', 'aria-haspopup': 'menu',
    onclick: (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.setAttribute('aria-expanded', 'true');
      openMenu(btn, getItems());
      setTimeout(() => btn.removeAttribute('aria-expanded'), 0);
    },
  }, icon('more'));
}

function sleeve(folder) {
  const open = () => navigate(folder.path);
  return tint(h('div', {
    class: 'sleeve', tabindex: 0, role: 'link', 'aria-label': `Carpeta ${folder.name}`, onclick: open,
    onkeydown: (e) => e.key === 'Enter' && open(),
    oncontextmenu: (e) => { e.preventDefault(); openMenu(e.currentTarget, folderMenu(folder)); },
  }, h('span', { class: 'sleeve-name', title: folder.name }, folder.name), icon('folder'), moreButton(() => folderMenu(folder))), folder.name);
}

function tile(file, siblings, playingId) {
  const open = () => openFile(file, siblings);
  return h('div', {
    class: `tile kind-${file.kind}${file.id === playingId ? ' playing' : ''}`, tabindex: 0, role: 'button', 'aria-label': file.name,
    dataset: { id: file.id }, onclick: open, onkeydown: (e) => e.key === 'Enter' && open(),
    oncontextmenu: (e) => { e.preventDefault(); openMenu(e.currentTarget, fileMenu(file, siblings)); },
  },
  fileCover(file),
  h('div', { class: 'tile-body' }, h('div', { class: 'tile-name', title: file.name }, file.name),
    h('div', { class: 'tile-meta' }, h('span', {}, formatBytes(file.size)), h('span', {}, formatDate(file.date)))),
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
