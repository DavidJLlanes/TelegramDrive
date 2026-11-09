import { encodeFolder, newFolderId } from '../telegram/codec.js';
import { ROOT } from '../db/folder-tree.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { normalizePath, validateName } from '../utils/paths.js';
import { dropThumbnail } from './thumbnails.js';

/** Operaciones sobre carpetas. Renombrar o mover = editar UN solo mensaje, sin importar cuántos archivos contenga. */
export class FolderOps {
  constructor({ tg, tree, files, lock }) { Object.assign(this, { tg, tree, files, lock }); }

  #need(path) {
    const id = this.tree.resolve(normalizePath(path));
    if (id === null) throw notFound('La carpeta no existe');
    return id;
  }

  #needSub(path) {
    const id = this.#need(path);
    if (id === ROOT) throw badRequest('No se puede modificar la carpeta raíz');
    return id;
  }

  create(parentPath, rawName) {
    return this.lock.run(async () => {
      const parent = this.#need(parentPath);
      const name = validateName(rawName);
      if (this.tree.child(parent, name)) throw conflict('Ya existe una carpeta con ese nombre');
      const id = newFolderId();
      const message = await this.tg.sendText(encodeFolder({ id, parent, name }));
      this.tree.insert({ id, msgId: message.id, parent, name });
      return { type: 'folder', name, path: this.tree.pathOf(id) };
    });
  }

  rename(path, rawName) {
    return this.lock.run(async () => {
      const id = this.#needSub(path);
      const folder = this.tree.get(id);
      const name = validateName(rawName);
      const clash = this.tree.child(folder.parent, name);
      if (clash && clash.id !== id) throw conflict('Ya existe una carpeta con ese nombre');
      await this.tg.editText(folder.msgId, encodeFolder({ id, parent: folder.parent, name }));
      this.tree.update(id, { parent: folder.parent, name });
      return { path: this.tree.pathOf(id) };
    });
  }

  move(path, targetPath) {
    return this.lock.run(async () => {
      const id = this.#needSub(path);
      const folder = this.tree.get(id);
      const parent = this.#need(targetPath);
      if (this.tree.isWithin(parent, id)) throw badRequest('No se puede mover una carpeta dentro de sí misma');
      const clash = this.tree.child(parent, folder.name);
      if (clash && clash.id !== id) throw conflict('Ya existe una carpeta con ese nombre en el destino');
      await this.tg.editText(folder.msgId, encodeFolder({ id, parent, name: folder.name }));
      this.tree.update(id, { parent, name: folder.name });
      return { path: this.tree.pathOf(id) };
    });
  }

  delete(path) {
    return this.lock.run(async () => {
      const id = this.#needSub(path);
      const folderIds = this.tree.descendants(id);
      const fileIds = this.files.idsInFolders(folderIds);
      const folderMsgIds = folderIds.map((f) => this.tree.get(f).msgId);
      await this.tg.remove([...fileIds, ...folderMsgIds]);
      this.files.remove(fileIds);
      this.tree.remove(folderIds);
      fileIds.forEach((fid) => dropThumbnail(fid));
      return { deleted: fileIds.length + folderIds.length };
    });
  }
}
