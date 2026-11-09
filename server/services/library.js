import { LibraryRepo } from '../db/library-repo.js';
import { compareNames } from '../utils/text.js';
import { notFound } from '../utils/errors.js';
import { normalizePath } from '../utils/paths.js';

/** Orden de reproducción: carpeta, disco, nº de pista y nombre (natural). */
const trackOrder = (a, b) =>
  compareNames(a.parent, b.parent) || a.disc - b.disc || a.track - b.track || compareNames(a.name, b.name);

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
    const folders = recursive ? this.tree.descendants(id) : [id];
    return this.#dtos(this.files.audioIn(folders));
  }

  tracks(filter) { return this.#dtos(this.repo.tracks(filter)); }
  artists() { return this.repo.artists(); }
  albums(filter) { return this.repo.albums(filter); }
  genres() { return this.repo.genres(); }
}
