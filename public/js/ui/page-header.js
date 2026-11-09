import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, prefs } from '../core/store.js';
import { reload } from '../core/drive.js';
import { navigate } from '../core/router.js';
import { playFolder } from '../core/playback.js';
import { openMenu } from './menu.js';
import { playButtons } from './play-buttons.js';
import { libraryHead } from './library-head.js';

const SORT_LABELS = { name: 'Nombre', date: 'Fecha', size: 'Tamaño' };
const plural = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;

function crumbs(path) {
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return null;
  const nodes = [h('button', { class: 'crumb', onclick: () => navigate('/') }, 'Inicio')];
  parts.slice(0, -1).forEach((part, i) => {
    nodes.push(h('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, '/'));
    nodes.push(h('button', { class: 'crumb', onclick: () => navigate(`/${parts.slice(0, i + 1).join('/')}`) }, part));
  });
  return h('nav', { class: 'crumbs', 'aria-label': 'Ruta' }, nodes);
}

function subtitle(s) {
  if (s.loading) return '';
  if (s.results !== null) return `${plural(s.results.length, 'archivo encontrado', 'archivos encontrados')} para “${s.query.trim()}”`;
  const parts = [];
  if (s.folders.length) parts.push(plural(s.folders.length, 'carpeta', 'carpetas'));
  if (s.total) parts.push(plural(s.total, 'archivo', 'archivos'));
  return parts.length ? parts.join(' y ') : 'Sin contenido todavía';
}

function tools(s) {
  const sortBtn = h('button', {
    class: 'btn', 'aria-haspopup': 'menu', onclick: (e) => {
      const make = (sort) => ({
        label: `${appState.get().sort === sort ? '✓  ' : '     '}${SORT_LABELS[sort]}`, icon: 'sort',
        run: () => { prefs.save('sort', sort); appState.set({ sort }); if (appState.get().results === null) reload(); },
      });
      openMenu(e.currentTarget, Object.keys(SORT_LABELS).map(make));
    },
  }, icon('sort'), SORT_LABELS[s.sort]);
  const viewBtn = h('button', {
    class: 'btn btn-icon', 'aria-label': s.view === 'grid' ? 'Ver como lista' : 'Ver como cuadrícula',
    onclick: () => { const view = appState.get().view === 'grid' ? 'list' : 'grid'; prefs.save('view', view); appState.set({ view }); },
  }, icon(s.view === 'grid' ? 'list' : 'grid'));
  const mayHaveMusic = s.results === null && (s.folders.length > 0 || s.files.some((f) => f.kind === 'audio'));
  return h('div', { class: 'page-tools' }, mayHaveMusic ? playButtons((o) => playFolder(s.path, o)) : null, sortBtn, viewBtn);
}

function folderHead(s) {
  return {
    crumbs: s.results !== null ? null : crumbs(s.path),
    title: s.results !== null ? 'Resultados' : s.path === '/' ? 'Inicio' : s.path.split('/').pop(),
    sub: subtitle(s), tools: tools(s),
  };
}

export function createPageHeader() {
  const el = h('header', { class: 'page-head' });
  const paint = (s) => {
    const head = s.section === 'library' && s.results === null ? libraryHead(s.lib) : folderHead(s);
    const tools = head.tools && (head.tools instanceof Node ? head.tools : h('div', { class: 'page-tools' }, head.tools));
    el.replaceChildren(...[h('div', { class: 'page-title' }, head.crumbs, h('h1', {}, head.title), h('p', {}, head.sub)), tools].filter(Boolean));
  };
  appState.subscribe(paint);
  paint(appState.get());
  return el;
}
