import { badRequest, notFound } from '../../utils/errors.js';

const MAX_NAME = 80;
const MAX_IDS = 2000;

export function createService({ repo, catalog }) {
  const album = (id) => repo.get(Number(id)) ?? (() => { throw notFound('El álbum no existe'); })();
  const cleanName = (value) => {
    const name = String(value ?? '').trim().replace(/\s+/g, ' ');
    if (!name) throw badRequest('Ponle un nombre al álbum');
    if (name.length > MAX_NAME) throw badRequest(`El nombre no puede pasar de ${MAX_NAME} caracteres`);
    return name;
  };
  /** Solo fotos que existen (las ids que no lo son se ignoran). */
  const photoIds = (ids) => {
    if (!Array.isArray(ids) || ids.length > MAX_IDS) throw badRequest(`Indica hasta ${MAX_IDS} fotos`);
    return catalog.lookup(ids).filter((f) => f.kind === 'image').map((f) => f.id);
  };

  return {
    list: () => repo.list(),
    create(name, ids = []) {
      const id = repo.create(cleanName(name));
      if (ids.length) repo.add(id, photoIds(ids));
      return repo.get(id);
    },
    rename(id, name) { album(id); repo.rename(Number(id), cleanName(name)); return repo.get(Number(id)); },
    remove(id) { album(id); return repo.remove(Number(id)); },
    open(id) {
      const a = album(id);
      return { album: a, photos: catalog.lookup(repo.items(a.id)) };
    },
    add(id, ids) { const a = album(id); return { added: repo.add(a.id, photoIds(ids)) }; },
    removeItems(id, ids) {
      const a = album(id);
      if (!Array.isArray(ids) || ids.length > MAX_IDS) throw badRequest(`Indica hasta ${MAX_IDS} fotos`);
      return { removed: repo.removeItems(a.id, ids.map(Number).filter(Number.isInteger)) };
    },
  };
}
