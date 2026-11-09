import { encodeFile } from '../telegram/codec.js';
import { isUniqueViolation } from '../db/database.js';
import { conflict, notFound } from '../utils/errors.js';
import { kindOf } from '../utils/media-kind.js';
import { normalizePath, suffixed, validateName } from '../utils/paths.js';
import { dropThumbnail } from './thumbnails.js';

/** Operaciones sobre archivos (subida, renombrar, mover, borrar). */
export class FileOps {
  constructor({ tg, tree, files, lock, toDto }) {
    Object.assign(this, { tg, tree, files, lock, toDto });
    this.reserved = new Set(); // nombres en subida: evita colisiones entre subidas simultáneas
  }

  #folder(path) {
    const id = this.tree.resolve(normalizePath(path));
    if (id === null) throw notFound('La carpeta destino no existe');
    return id;
  }

  #need(id) {
    const row = this.files.get(Number(id));
    if (!row || row.hidden) throw notFound('Archivo no encontrado');
    return row;
  }

  freeName(folder, name, exceptId = 0) {
    let candidate = name;
    for (let n = 1; this.files.exists(folder, candidate, exceptId) || this.reserved.has(`${folder}\u0000${candidate.toLowerCase()}`); n += 1) {
      candidate = suffixed(name, n);
    }
    return candidate;
  }

  async upload({ parent, name: rawName, path, size, onProgress }) {
    const folder = this.#folder(parent);
    const name = this.freeName(folder, validateName(rawName));
    const key = `${folder}\u0000${name.toLowerCase()}`;
    this.reserved.add(key);
    try {
      const message = await this.tg.sendFile({ path, name, size, caption: encodeFile({ folder, name }), onProgress });
      const doc = message.media.document;
      const record = {
        msgId: message.id, folder, name, size: Number(doc.size), mime: doc.mimeType || 'application/octet-stream',
        kind: kindOf(name, doc.mimeType), date: message.date * 1000, thumb: doc.thumbs?.length ? 1 : 0,
      };
      try { this.files.upsert(record); } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        record.name = this.freeName(folder, name);
        await this.tg.editText(record.msgId, encodeFile({ folder, name: record.name }));
        this.files.upsert(record);
      }
      return this.toDto(this.files.get(record.msgId));
    } finally {
      this.reserved.delete(key);
    }
  }

  rename(id, rawName) {
    return this.lock.run(async () => {
      const row = this.#need(id);
      const name = validateName(rawName);
      if (this.files.exists(row.folder, name, row.id)) throw conflict('Ya existe un archivo con ese nombre');
      await this.tg.editText(row.id, encodeFile({ folder: row.folder, name, ovr: this.files.overrideOf(row.id) }));
      this.files.rename(row.id, name);
      return this.toDto(this.files.get(row.id));
    });
  }

  move(id, targetPath) {
    return this.lock.run(async () => {
      const row = this.#need(id);
      const folder = this.#folder(targetPath);
      const name = this.freeName(folder, row.name, row.id);
      await this.tg.editText(row.id, encodeFile({ folder, name, ovr: this.files.overrideOf(row.id) }));
      this.files.move(row.id, folder, name);
      return this.toDto(this.files.get(row.id));
    });
  }

  /** Borrado definitivo (también en Telegram). Lo normal es enviar a la papelera, ver TrashOps. */
  destroy(ids) {
    return this.lock.run(async () => {
      const list = ids.filter((id) => this.files.get(id));
      if (!list.length) return 0;
      await this.tg.remove(list);
      this.files.remove(list);
      list.forEach((id) => dropThumbnail(id));
      return list.length;
    });
  }
}
