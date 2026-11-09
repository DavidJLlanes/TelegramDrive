import { FolderTree } from '../db/folder-tree.js';
import { FilesRepo } from '../db/files-repo.js';
import { Syncer } from './sync.js';
import { Tagger } from './tagger.js';
import { Library } from './library.js';
import { FolderOps } from './folder-ops.js';
import { FileOps } from './file-ops.js';
import { Mutex } from '../utils/mutex.js';
import { compareNames } from '../utils/text.js';
import { badRequest, notFound } from '../utils/errors.js';
import { normalizePath } from '../utils/paths.js';

const SORTERS = {
  name: (a, b) => compareNames(a.name, b.name),
  date: (a, b) => b.date - a.date || compareNames(a.name, b.name),
  size: (a, b) => b.size - a.size || compareNames(a.name, b.name),
};
const MAX_LIMIT = 5000;

/** Fachada: consulta el índice SQLite y delega las modificaciones (que también escriben en Telegram). */
export class Catalog {
  constructor(tg, db) {
    this.tg = tg;
    this.db = db;
    this.tree = new FolderTree(db);
    this.repo = new FilesRepo(db);
    this.syncer = new Syncer({ tg, db, tree: this.tree, files: this.repo });
    this.tagger = new Tagger({ tg, files: this.repo });
    this.library = new Library({ db, tree: this.tree, files: this.repo, toDto: (row, paths) => this.toDto(row, paths) });
    const shared = { tg, tree: this.tree, files: this.repo, lock: new Mutex() };
    this.folderOps = new FolderOps(shared);
    this.fileOps = new FileOps({ ...shared, toDto: (row) => this.toDto(row) });
  }

  /** Sincroniza con Telegram y, al terminar, lee en segundo plano las etiquetas de los audios nuevos. */
  startSync(options) {
    return this.syncer.start(options).then(() => { this.tagger.kick(); });
  }

  toDto(row, paths = new Map()) {
    if (!paths.has(row.folder)) paths.set(row.folder, this.tree.pathOf(row.folder));
    const dto = {
      id: row.id, type: 'file', name: row.name, parent: paths.get(row.folder), size: row.size,
      mime: row.mime, kind: row.kind, date: row.date, thumb: Boolean(row.thumb),
    };
    if (row.kind === 'audio' && row.tagged === 1) {
      dto.tags = { title: row.title, artist: row.artist, album: row.album, band: row.band, genre: row.genre, track: row.track, disc: row.disc, year: row.year };
    }
    return dto;
  }

  list(rawPath, { sort = 'name', offset = 0, limit = 300, kind } = {}) {
    if (!SORTERS[sort]) throw badRequest('Orden no válido');
    const id = this.tree.resolve(normalizePath(rawPath));
    if (id === null) throw notFound('La carpeta no existe');
    const rows = this.repo.inFolder(id, kind || undefined).sort(SORTERS[sort]);
    const start = Math.max(0, Number(offset) || 0);
    const size = Math.min(Math.max(1, Number(limit) || 300), MAX_LIMIT);
    const paths = new Map();
    return {
      path: this.tree.pathOf(id),
      total: rows.length,
      folders: this.tree.childrenOf(id).map((f) => ({ type: 'folder', name: f.name, path: this.tree.pathOf(f.id) })),
      files: rows.slice(start, start + size).map((r) => this.toDto(r, paths)),
    };
  }

  search(query, limit = 200) {
    if (String(query).trim().length < 2) return [];
    const paths = new Map();
    return this.repo.search(query, limit).map((r) => this.toDto(r, paths));
  }

  getFile(id) {
    const row = this.repo.get(Number(id));
    if (!row) throw notFound('Archivo no encontrado');
    return this.toDto(row);
  }

  folderPaths() { return this.tree.allPaths(); }

  stats() {
    return { ...this.repo.stats(), folders: this.tree.byId.size, sync: { ...this.syncer.state }, tagging: this.tagger.state() };
  }
}
