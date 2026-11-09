import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, watch } from '../core/store.js';
import { formatBytes } from '../core/format.js';
import { navigate, navigateLib, navigateTrash } from '../core/router.js';
import { compareNames } from '../core/text.js';
import { menuViews, navigateView } from '../core/views.js';

const parentOf = (p) => p.slice(0, p.lastIndexOf('/')) || '/';

/** Árbol visible: hijos de la raíz y de la carpeta actual con sus ancestros (acotado aunque haya miles de carpetas). */
export function visibleTree(paths, current) {
  const open = new Set(['/']);
  for (let p = current; p && p !== '/'; p = parentOf(p)) open.add(p);
  const kids = new Map();
  for (const p of paths) {
    const parent = parentOf(p);
    if (!kids.has(parent)) kids.set(parent, []);
    kids.get(parent).push(p);
  }
  const out = [];
  const walk = (parent, depth) => {
    for (const p of (kids.get(parent) ?? []).sort((a, b) => compareNames(a, b))) {
      out.push({ path: p, depth });
      if (open.has(p)) walk(p, depth + 1);
    }
  };
  walk('/', 0);
  return out;
}

function item(path, label, iconName, depth, current) {
  const el = h('button', { class: 'tree-item', 'aria-current': path === current ? 'page' : null, onclick: () => navigate(path) },
    icon(iconName), h('span', { title: label }, label));
  el.style.setProperty('--depth', depth);
  return el;
}

const LIBRARY = [
  { view: 'albums', label: 'Álbumes', icon: 'disc', also: ['album'] },
  { view: 'artists', label: 'Artistas', icon: 'user', also: ['artist'] },
  { view: 'genres', label: 'Géneros', icon: 'tag', also: ['genre'] },
  { view: 'playlists', label: 'Listas', icon: 'playlist', also: ['playlist'] },
  { view: 'offline', label: 'Sin conexión', icon: 'cloud', also: [] },
];

function libraryItem(entry, s) {
  const active = s.section === 'library' && s.results === null && [entry.view, ...entry.also].includes(s.lib.view);
  return h('button', { class: 'tree-item', 'aria-current': active ? 'page' : null, onclick: () => navigateLib(entry.view) },
    icon(entry.icon), h('span', {}, entry.label));
}

const pageItem = (view, s) => h('button', { class: 'tree-item', 'aria-current': s.section === 'page' && s.page.id === view.id ? 'page' : null, onclick: () => navigateView(view.id) },
  icon(view.icon), h('span', {}, view.label));

/** Navegación en móvil (donde la barra lateral está oculta): biblioteca, carpetas y papelera en una fila deslizable. */
export function createMobileNav() {
  const el = h('nav', { class: 'mobile-nav', 'aria-label': 'Secciones' });
  const chip = (label, iconName, active, go) => h('button', { class: 'chip', 'aria-current': active ? 'page' : null, onclick: go }, icon(iconName), label);
  const paint = (s) => {
    const lib = s.section === 'library' && s.results === null;
    el.replaceChildren(
      chip('Archivos', 'folder', s.section === 'files' || s.results !== null, () => navigate('/')),
      ...LIBRARY.map((e) => chip(e.label, e.icon, lib && [e.view, ...e.also].includes(s.lib.view), () => navigateLib(e.view))),
      ...[...menuViews('library'), ...menuViews('more')].map((v) => chip(v.label, v.icon, s.section === 'page' && s.page.id === v.id, () => navigateView(v.id))),
      chip('Papelera', 'trash', s.section === 'trash', navigateTrash));
  };
  watch(appState, el, paint);
  paint(appState.get());
  return el;
}

export function createSidebar() {
  const tree = h('nav', { class: 'tree', 'aria-label': 'Carpetas y biblioteca' });
  const foot = h('div', { class: 'side-foot' });
  const el = h('aside', { class: 'sidebar' },
    h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, h('img', { src: 'icons/icon-96.png', alt: '', width: 38, height: 38 })), 'Telegram Drive'), tree, foot);

  const paint = (s) => {
    const current = s.results !== null || s.section !== 'files' ? null : s.path;
    tree.replaceChildren(
      h('div', { class: 'tree-heading' }, 'Biblioteca'), ...LIBRARY.map((e) => libraryItem(e, s)), ...menuViews('library').map((v) => pageItem(v, s)),
      h('div', { class: 'tree-heading' }, 'Carpetas'),
      item('/', 'Inicio', 'home', 0, current),
      ...visibleTree(s.folderPaths, s.path).map((n) => item(n.path, n.path.split('/').pop(), 'folder', n.depth, current)),
      h('div', { class: 'tree-heading' }, 'Más'),
      ...menuViews('more').map((v) => pageItem(v, s)),
      h('button', { class: 'tree-item', 'aria-current': s.section === 'trash' ? 'page' : null, onclick: navigateTrash }, icon('trash'), h('span', {}, 'Papelera')));
    const sync = s.stats?.sync;
    foot.replaceChildren(
      h('strong', {}, s.stats ? formatBytes(s.stats.bytes) : '—'),
      h('span', {}, sync?.running ? `Sincronizando: ${sync.scanned} mensajes` : s.stats ? `${s.stats.files} archivos en Telegram` : ''));
  };
  watch(appState, el, paint);
  paint(appState.get());
  return el;
}
