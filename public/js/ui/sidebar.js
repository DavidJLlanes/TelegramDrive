import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState } from '../core/store.js';
import { formatBytes } from '../core/format.js';
import { navigate } from '../core/router.js';
import { compareNames } from '../core/text.js';

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

export function createSidebar() {
  const tree = h('nav', { class: 'tree', 'aria-label': 'Carpetas' });
  const foot = h('div', { class: 'side-foot' });
  const el = h('aside', { class: 'sidebar' },
    h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, icon('plane')), 'Telegram Drive'), tree, foot);

  const paint = (s) => {
    const current = s.results !== null ? null : s.path;
    tree.replaceChildren(item('/', 'Inicio', 'home', 0, current),
      ...visibleTree(s.folderPaths, s.path).map((n) => item(n.path, n.path.split('/').pop(), 'folder', n.depth, current)));
    const sync = s.stats?.sync;
    foot.replaceChildren(
      h('strong', {}, s.stats ? formatBytes(s.stats.bytes) : '—'),
      h('span', {}, sync?.running ? `Sincronizando: ${sync.scanned} mensajes` : s.stats ? `${s.stats.files} archivos en Telegram` : ''));
  };
  appState.subscribe(paint);
  paint(appState.get());
  return el;
}
