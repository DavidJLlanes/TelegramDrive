import { encodeFolder, newFolderId } from '../telegram/codec.js';
import { ROOT } from '../db/folder-tree.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { normalizePath, validateName } from '../utils/paths.js';
import { parseColor, parseIcon } from '../utils/folder-style.js';
import { validateFolderChange } from './folder-limits.js';
import { dropThumbnail } from './thumbnails.js';
import { moveCacheFolder, dropCacheFolder } from './image-cache/paths.js';

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
      validateFolderChange(this.tree, parent, name);
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
      validateFolderChange(this.tree, folder.parent, name, id);
      const oldPath = this.tree.pathOf(id);
      const msgId = await this.tg.rewriteText(folder.msgId, encodeFolder({ id, parent: folder.parent, name, color: folder.color, icon: folder.icon }));
      if (msgId !== folder.msgId) this.tree.setMsgId(id, msgId);
      this.tree.update(id, { parent: folder.parent, name });
      await moveCacheFolder(oldPath, this.tree.pathOf(id));
      return { path: this.tree.pathOf(id) };
    });
  }

  /** Estilo de la carpeta: `color` (0-359, -1/null = automático) e `icon` (de FOLDER_ICONS, '' = normal). Lo omitido no cambia. Se guarda también en Telegram. */
  setStyle(path, raw = {}) {
    const color = 'color' in raw ? parseColor(raw.color) : undefined;
    const icon = 'icon' in raw ? parseIcon(raw.icon) : undefined;
    if (color === undefined && 'color' in raw) throw badRequest('Color no válido');
    if (icon === undefined && 'icon' in raw) throw badRequest('Icono no válido');
    return this.lock.run(async () => {
      const id = this.#needSub(path);
      const folder = this.tree.get(id);
      const next = { color: color ?? folder.color, icon: icon ?? folder.icon };
      if (next.color === folder.color && next.icon === folder.icon) return next;
      const msgId = await this.tg.rewriteText(folder.msgId, encodeFolder({ id, parent: folder.parent, name: folder.name, ...next }));
      if (msgId !== folder.msgId) this.tree.setMsgId(id, msgId);
      this.tree.setStyle(id, next);
      return next;
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
      validateFolderChange(this.tree, parent, folder.name, id);
      const oldPath = this.tree.pathOf(id);
      const msgId = await this.tg.rewriteText(folder.msgId, encodeFolder({ id, parent, name: folder.name, color: folder.color, icon: folder.icon }));
      if (msgId !== folder.msgId) this.tree.setMsgId(id, msgId);
      this.tree.update(id, { parent, name: folder.name });
      await moveCacheFolder(oldPath, this.tree.pathOf(id));
      return { path: this.tree.pathOf(id) };
    });
  }

  /** Borrado definitivo de una carpeta con todo su contenido. Lo normal es enviarla a la papelera. */
  delete(path) { return this.destroy(this.#needSub(path)); }

  destroy(id) {
    return this.lock.run(async () => {
      if (!this.tree.byId.has(id)) return { deleted: 0 };
      const oldPath = this.tree.pathOf(id);
      const folderIds = this.tree.subtree(id);
      const fileIds = this.files.idsInFolders(folderIds);
      const folderMsgIds = folderIds.map((f) => this.tree.get(f).msgId);
      await this.tg.remove([...fileIds, ...folderMsgIds]);
      this.files.remove(fileIds);
      this.tree.remove(folderIds);
      fileIds.forEach((fid) => dropThumbnail(fid));
      await dropCacheFolder(oldPath);
      return { deleted: fileIds.length + folderIds.length };
    });
  }
}
