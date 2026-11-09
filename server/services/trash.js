import { encodeFile, encodeFolder } from '../telegram/codec.js';
import { ROOT } from '../db/folder-tree.js';
import { notFound } from '../utils/errors.js';
import { normalizePath } from '../utils/paths.js';

export const TRASH_DAYS = 30;
const DAY = 86_400_000;

/** Papelera: enviar = editar UN mensaje (marca "x"); los archivos de una carpeta eliminada quedan ocultos sin tocarlos. */
export class TrashOps {
  constructor({ tg, tree, files, lock, fileOps, folderOps, toDto }) {
    Object.assign(this, { tg, tree, files, lock, fileOps, folderOps, toDto });
  }

  #hide() { this.files.refreshHidden(this.tree.hiddenIds); }

  trashFile(id) {
    return this.lock.run(async () => {
      const row = this.files.get(Number(id));
      if (!row || row.hidden) throw notFound('Archivo no encontrado');
      const ts = Date.now();
      await this.tg.editText(row.id, encodeFile({ folder: row.folder, name: row.name, trashed: ts, ovr: this.files.overrideOf(row.id) }));
      this.files.setTrashed(row.id, ts);
    });
  }

  trashFolder(path) {
    return this.lock.run(async () => {
      const id = this.tree.resolve(normalizePath(path));
      if (id === null || id === ROOT) throw notFound('La carpeta no existe');
      const f = this.tree.get(id);
      const ts = Date.now();
      await this.tg.editText(f.msgId, encodeFolder({ id, parent: f.parent, name: f.name, trashed: ts }));
      this.tree.update(id, { parent: f.parent, name: f.name, trashed: ts });
      this.#hide();
      return id;
    });
  }

  restoreFile(id) {
    return this.lock.run(async () => {
      const row = this.files.get(Number(id));
      if (!row || !row.trashed) throw notFound('El archivo no está en la papelera');
      const folder = this.tree.exists(row.folder) ? row.folder : ROOT;
      const name = this.fileOps.freeName(folder, row.name, row.id);
      await this.tg.editText(row.id, encodeFile({ folder, name, ovr: this.files.overrideOf(row.id) }));
      this.files.move(row.id, folder, name);
      this.files.setTrashed(row.id, 0);
      this.#hide();
    });
  }

  restoreFolder(folderId) {
    return this.lock.run(async () => {
      const f = this.tree.get(folderId);
      if (!f || !f.trashed) throw notFound('La carpeta no está en la papelera');
      const parent = this.tree.exists(f.parent) ? f.parent : ROOT;
      const name = this.tree.child(parent, f.name) ? `${f.name} (restaurada)` : f.name;
      await this.tg.editText(f.msgId, encodeFolder({ id: f.id, parent, name }));
      this.tree.update(f.id, { parent, name, trashed: 0 });
      this.#hide();
    });
  }

  list() {
    const paths = new Map();
    const folders = this.tree.trashedRoots().map((f) => ({
      id: f.id, type: 'folder', name: f.name, from: this.tree.pathOf(f.parent) || '/', trashed: f.trashed,
      files: this.files.idsInFolders(this.tree.subtree(f.id)).length,
    }));
    const files = this.files.trashedFiles().map((r) => ({ ...this.toDto(r, paths), trashed: r.trashed }));
    return { folders, files, days: TRASH_DAYS };
  }

  /** Solo borra lo que está en la papelera: un id de algo que no se ha enviado a ella se ignora. */
  async destroy({ files = [], folders = [] }) {
    const trashedFiles = files.map(Number).filter((id) => this.files.get(id)?.trashed > 0);
    const trashedFolders = folders.filter((id) => typeof id === 'string' && this.tree.get(id)?.trashed > 0);
    let count = await this.fileOps.destroy(trashedFiles);
    for (const id of trashedFolders) count += (await this.folderOps.destroy(id)).deleted;
    return { deleted: count };
  }

  empty() {
    const { files, folders } = this.list();
    return this.destroy({ files: files.map((f) => f.id), folders: folders.map((f) => f.id) });
  }

  /** Borra definitivamente lo que lleva más de 30 días en la papelera. */
  purge(now = Date.now()) {
    const limit = now - TRASH_DAYS * DAY;
    const { files, folders } = this.list();
    return this.destroy({
      files: files.filter((f) => f.trashed < limit).map((f) => f.id),
      folders: folders.filter((f) => f.trashed < limit).map((f) => f.id),
    });
  }
}
