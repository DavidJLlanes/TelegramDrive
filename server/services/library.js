import { LibraryRepo } from '../db/library-repo.js';
import { compareNames } from '../utils/text.js';
import { notFound } from '../utils/errors.js';
import { normalizePath } from '../utils/paths.js';

/** Orden por etiquetas: carpeta, disco, nº de pista y nombre (natural). */
const trackOrder = (a, b) =>
  compareNames(a.parent, b.parent) || a.disc - b.disc || a.track - b.track || compareNames(a.name, b.name);

/** Primer número del nombre, sin contar la extensión ("mp3" no es una pista). */
const firstNumber = (name) => { const m = /\d+/.exec(name.replace(/\.[^.]*$/, '')); return m ? Number(m[0]) : null; };

/** Barajado de Fisher-Yates (no modifica la lista original). */
function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/**
 * Orden de reproducción de UNA carpeta:
 *  1. si hay nº de pista en las etiquetas: disco y pista (las que no tienen, al final por nombre);
 *  2. si no, por el número que lleve el nombre del archivo ("01 - Tema", "Pista 2"); los que no lo llevan, al final;
 *  3. si no hay ni lo uno ni lo otro, aleatorio.
 */
export function folderOrder(rows) {
  if (rows.some((r) => r.track > 0)) {
    return [...rows].sort((a, b) => (a.track > 0 ? 0 : 1) - (b.track > 0 ? 0 : 1) || a.disc - b.disc || a.track - b.track || compareNames(a.name, b.name));
  }
  if (rows.some((r) => firstNumber(r.name) !== null)) {
    return [...rows].sort((a, b) => {
      const x = firstNumber(a.name); const y = firstNumber(b.name);
      if (x === null || y === null) return (x === null) - (y === null) || compareNames(a.name, b.name);
      return x - y || compareNames(a.name, b.name);
    });
  }
  return shuffled(rows);
}

/** Colas de reproducción: por carpeta (con subcarpetas) y por etiquetas (artista, álbum, género). */
export class Library {
  constructor({ db, tree, files, toDto }) {
    Object.assign(this, { tree, files, toDto });
    this.repo = new LibraryRepo(db);
  }

  #dtos(rows) {
    const paths = new Map();
    return rows.map((r) => ({ ...this.toDto(r, paths), disc: r.disc, track: r.track })).sort(trackOrder);
  }

  queue(rawPath, { recursive = false } = {}) {
    const id = this.tree.resolve(normalizePath(rawPath));
    if (id === null) throw notFound('La carpeta no existe');
    // la carpeta y, si se pide, sus subcarpetas en profundidad (cada una ordenada por separado, la carpeta primero)
    const folders = [];
    const walk = (folder) => { folders.push(folder); if (recursive) this.tree.childrenOf(folder).forEach((c) => walk(c.id)); };
    walk(id);
    const paths = new Map();
    return folders.flatMap((folder) => folderOrder(this.files.audioIn([folder]))
      .map((r) => ({ ...this.toDto(r, paths), disc: r.disc, track: r.track })));
  }

  tracks(filter) { return this.#dtos(this.repo.tracks(filter)); }
  artists() { return this.repo.artists(); }
  albums(filter) { return this.repo.albums(filter); }
  genres() { return this.repo.genres(); }
}
