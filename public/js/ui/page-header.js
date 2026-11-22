import { h, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { appState, prefs } from '../core/store.js';
import { reload } from '../core/drive.js';
import { navigate } from '../core/router.js';
import { playFolder } from '../core/playback.js';
import { watchScreen } from '../core/motion.js';
import { openMenu } from './menu.js';
import { playButtons } from './play-buttons.js';
import { libraryHead } from './library-head.js';
import { emptyTrash } from './trash-view.js';
import { selectAll } from './selection.js';
import { pageHead } from './page-view.js';

const SORT_LABELS = { name: 'Nombre', date: 'Fecha', size: 'Tamaño' };
const plural = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;

/** Pulsar la casa: rebote + onda y, un instante después, navega (la animación se aprecia antes del cambio de vista). */
function goHome(e) {
  const btn = e.currentTarget;
  btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
  setTimeout(() => navigate('/'), 220);
}

const homeButton = (cls) => h('button', { class: cls, type: 'button', title: 'Inicio', 'aria-label': 'Inicio', onclick: goHome }, icon('home'));

function crumbs(path) {
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return null;
  const nodes = [homeButton('crumb crumb-home')];
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
  const selectBtn = (s.results === null ? s.folders.length || s.files.length : s.results.length)
    ? h('button', { class: 'btn', type: 'button', title: 'Seleccionar todo', 'aria-label': 'Seleccionar todo', onclick: selectAll },
      icon('check'), h('span', { class: 'hide-mobile' }, 'Seleccionar todo')) : null;
  const mayHaveMusic = s.results === null && (s.folders.some((f) => f.music !== false) || s.files.some((f) => f.kind === 'audio'));
  return h('div', { class: 'page-tools' }, mayHaveMusic ? playButtons((o) => playFolder(s.path, o)) : null, sortBtn, viewBtn, selectBtn);
}

function folderHead(s) {
  return {
    crumbs: s.results !== null ? null : crumbs(s.path),
    title: s.results !== null ? 'Resultados' : s.path === '/' ? homeButton('home-title') : s.path.split('/').pop(),
    sub: subtitle(s), tools: tools(s),
  };
}

function trashHead(s) {
  const n = s.trash.files.length + s.trash.folders.length;
  return {
    crumbs: null, title: 'Papelera', sub: s.trash.loading ? '' : `Se borra definitivamente a los ${s.trash.days} días · ${plural(n, 'elemento', 'elementos')}`,
    tools: n ? [h('button', { class: 'btn btn-danger', type: 'button', onclick: emptyTrash }, icon('trash'), 'Vaciar papelera')] : null,
  };
}

export function createPageHeader() {
  const el = h('header', { class: 'page-head' });
  const paint = (s) => {
    let head;
    if (s.results !== null) head = folderHead(s);
    else if (s.section === 'library') head = libraryHead(s.lib);
    else if (s.section === 'trash') head = trashHead(s);
    else if (s.section === 'page') head = pageHead(s);
    else head = folderHead(s);
    const tools = head.tools && (head.tools instanceof Node ? head.tools : h('div', { class: 'page-tools' }, head.tools));
    fill(el, ...[h('div', { class: 'page-title' }, head.crumbs, h('h1', {}, head.title), h('p', {}, head.sub)), tools].filter(Boolean));
  };
  watchScreen(el, paint);
  return el;
}
