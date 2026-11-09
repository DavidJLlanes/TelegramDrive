import { normalizePath } from '../../utils/paths.js';

/**
 * Compara lo que se va a subir con lo que ya hay en la carpeta destino.
 * `same`: mismo nombre y mismo tamaño (casi seguro el mismo archivo). `differs`: mismo nombre, otro tamaño (se guardaría como «nombre (1)»).
 * Cada elemento es { dir?: 'Sub/Carpeta' (relativa a `parent`), name, size }; devuelve índices de `items`.
 */
export function createService({ tree, files, settings }) {
  return {
    check({ parent = '/', items }) {
      const out = { same: [], differs: [] };
      const byFolder = new Map(); // ruta → Map(nombre en minúsculas → tamaños)
      const sizesIn = (path) => {
        if (!byFolder.has(path)) {
          const id = tree.resolve(path);
          const names = new Map();
          if (id !== null) for (const r of files.inFolder(id)) names.set(r.name.toLowerCase(), [...(names.get(r.name.toLowerCase()) ?? []), r.size]);
          byFolder.set(path, names);
        }
        return byFolder.get(path);
      };
      items.slice(0, settings.maxItems).forEach((item, i) => {
        const dir = String(item.dir ?? '').split('/').filter(Boolean).join('/');
        let path;
        try { path = normalizePath(dir ? `${parent}/${dir}` : parent); } catch { return; } // ruta inválida: no hay nada que comparar
        const sizes = sizesIn(path).get(String(item.name ?? '').toLowerCase());
        if (!sizes) return;
        (sizes.includes(Number(item.size)) ? out.same : out.differs).push(i);
      });
      return out;
    },
  };
}
