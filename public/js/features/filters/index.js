// Filtros por tipo, fecha y tamaño sobre la lista de archivos de la carpeta (o de la búsqueda).
import { appState } from '../../core/store.js';
import { addFileFilter, addExplorerBar } from '../../core/explorer-ext.js';
import { loadMore } from '../../core/drive.js';
import { DEFAULT_FILTERS, isActive, filterFiles } from './predicates.js';
import { filterBar } from './bar.js';

appState.set({ filters: { ...DEFAULT_FILTERS } });

const MAX_AUTOLOAD = 3000;
let last = 0;
addFileFilter((files, s) => {
  const out = filterFiles(files, s.filters);
  last = out.length;
  return out;
});

addExplorerBar((s) => {
  if (s.section !== 'files' || (!s.files.length && !s.results?.length)) return null;
  return filterBar({ ...s, visibleCount: isActive(s.filters) ? last : undefined }, (patch) => {
    appState.set({ filters: { ...appState.get().filters, ...patch } });
    completeList();
  });
});

/** Con un filtro activo hay que tener cargada toda la carpeta, o faltarían coincidencias de las páginas siguientes. */
async function completeList() {
  for (let i = 0; i < 20; i += 1) {
    const s = appState.get();
    if (!isActive(s.filters) || s.results !== null || s.files.length >= s.total || s.files.length >= MAX_AUTOLOAD) return;
    await loadMore();
  }
}
