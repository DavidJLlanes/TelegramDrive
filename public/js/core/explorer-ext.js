// Puntos de extensión del explorador: las funciones añaden filtros, barras y comportamiento a tarjetas
// sin que explorer.js las conozca.
const filters = [];
const bars = [];
const enhancers = [];

/** `fn(files, state) → files`: reduce la lista visible. */
export const addFileFilter = (fn) => { filters.push(fn); };
/** `fn(state) → Node|null`: barra que se pinta encima de la lista de archivos. */
export const addExplorerBar = (fn) => { bars.push(fn); };
/** `fn(el, item, kind)`: se llama con cada tarjeta recién creada; kind = 'file' | 'folder'. */
export const addCardEnhancer = (fn) => { enhancers.push(fn); };

export const applyFileFilters = (files, state) => filters.reduce((list, fn) => fn(list, state), files);
export const explorerBars = (state) => bars.map((fn) => fn(state)).filter(Boolean);
export function enhanceCard(el, item, kind) {
  for (const fn of enhancers) { try { fn(el, item, kind); } catch (err) { console.warn('[tarjeta]', err); } }
  return el;
}
