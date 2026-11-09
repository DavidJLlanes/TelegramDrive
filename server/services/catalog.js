import { decode, encodeFile, encodeFolder } from '../telegram/codec.js';
import { kindOf } from '../utils/media-kind.js';
import { conflict, notFound, badRequest } from '../utils/errors.js';
import {
  ancestorsOf, baseName, isWithin, joinPath, normalizePath, parentOf,
  replacePrefix, uniqueName, validateName,
} from '../utils/paths.js';

const filenameOf = (doc) =>
  doc.attributes?.find((a) => a.className === 'DocumentAttributeFilename')?.fileName || 'archivo';

function toEntry(message) {
  const meta = decode(message.message);
  if (!meta) return null;
  const base = { id: message.id, type: meta.type, parent: meta.parent, name: meta.name, date: message.date * 1000 };
  if (meta.type === 'folder') return base;
  const doc = message.media?.document;
  if (!doc) return null;
  const mimeType = doc.mimeType || 'application/octet-stream';
  const name = meta.name || filenameOf(doc);
  return {
    ...base, name, size: Number(doc.size), mime: mimeType,
    kind: kindOf(name, mimeType), thumb: Boolean(doc.thumbs?.length),
  };
}

/** Índice en memoria del contenido, reconstruido desde Telegram. */
export class Catalog {
  constructor(tg) {
    this.tg = tg;
    this.entries = new Map();
    this.loadedAt = 0;
    this.loading = null;
  }

  async ensureLoaded() {
    if (!this.loadedAt) await this.reload();
  }

  reload() {
    this.loading ??= (async () => {
      const next = new Map();
      for await (const message of this.tg.iterTagged()) {
        const entry = toEntry(message);
        if (entry) next.set(entry.id, entry);
      }
      this.entries = next;
      this.loadedAt = Date.now();
    })().finally(() => { this.loading = null; });
    return this.loading;
  }

  // ---------- consultas ----------

  #folderPaths() {
    const set = new Set();
    for (const e of this.entries.values()) {
      const folder = e.type === 'folder' ? joinPath(e.parent, e.name) : e.parent;
      ancestorsOf(folder).forEach((p) => set.add(p));
    }
    return set;
  }

  folderExists(path) {
    return path === '/' || this.#folderPaths().has(path);
  }

  folders() {
    return [...this.#folderPaths()].sort((a, b) => a.localeCompare(b, 'es'));
  }

  list(rawPath) {
    const path = normalizePath(rawPath);
    if (!this.folderExists(path)) throw notFound('La carpeta no existe');
    const folders = [...this.#folderPaths()]
      .filter((p) => parentOf(p) === path && p !== '/')
      .map((p) => ({ type: 'folder', name: baseName(p), path: p }));
    const files = [...this.entries.values()].filter((e) => e.type === 'file' && e.parent === path);
    return { path, folders, files };
  }

  search(query, limit = 200) {
    const q = String(query).trim().toLowerCase();
    if (q.length < 2) return [];
    return [...this.entries.values()]
      .filter((e) => e.type === 'file' && e.name.toLowerCase().includes(q))
      .slice(0, limit);
  }

  stats() {
    let files = 0; let bytes = 0;
    for (const e of this.entries.values()) if (e.type === 'file') { files += 1; bytes += e.size; }
    return { files, bytes, folders: this.#folderPaths().size };
  }

  getFile(id) {
    const entry = this.entries.get(Number(id));
    if (!entry || entry.type !== 'file') throw notFound('Archivo no encontrado');
    return entry;
  }

  #takenNames(parent, type, skipId) {
    const taken = new Set();
    if (type === 'folder') {
      this.#folderPaths().forEach((p) => parentOf(p) === parent && taken.add(baseName(p).toLowerCase()));
    }
    for (const e of this.entries.values()) {
      if (e.type === 'file' && type === 'file' && e.parent === parent && e.id !== skipId) {
        taken.add(e.name.toLowerCase());
      }
    }
    return taken;
  }

  // ---------- carpetas ----------

  async createFolder(rawParent, rawName) {
    const parent = normalizePath(rawParent);
    const name = validateName(rawName);
    if (!this.folderExists(parent)) throw notFound('La carpeta padre no existe');
    if (this.#takenNames(parent, 'folder').has(name.toLowerCase())) throw conflict('Ya existe una carpeta con ese nombre');
    const message = await this.tg.sendText(encodeFolder({ parent, name }));
    const entry = { id: message.id, type: 'folder', parent, name, date: Date.now() };
    this.entries.set(entry.id, entry);
    return { type: 'folder', name, path: joinPath(parent, name) };
  }

  /** Renombra o mueve una carpeta (y todo su contenido) a `target`. */
  async relocateFolder(rawFrom, rawTarget) {
    const from = normalizePath(rawFrom);
    const target = normalizePath(rawTarget);
    if (from === '/' || !this.folderExists(from)) throw notFound('La carpeta no existe');
    if (isWithin(target, from)) throw badRequest('No se puede mover una carpeta dentro de sí misma');
    const targetParent = parentOf(target);
    if (!this.folderExists(targetParent)) throw notFound('El destino no existe');
    if (this.folderExists(target)) throw conflict('Ya existe una carpeta con ese nombre en el destino');

    for (const e of [...this.entries.values()]) {
      const own = e.type === 'folder' && joinPath(e.parent, e.name) === from;
      if (own) {
        const next = { ...e, parent: targetParent, name: baseName(target) };
        await this.tg.editText(e.id, encodeFolder(next));
        this.entries.set(e.id, next);
      } else if (isWithin(e.parent, from)) {
        const next = { ...e, parent: replacePrefix(e.parent, from, target) };
        await this.tg.editText(e.id, e.type === 'folder' ? encodeFolder(next) : encodeFile(next));
        this.entries.set(e.id, next);
      }
    }
    // Carpeta puramente implícita (sin mensaje propio): materializa para que no desaparezca vacía.
    return { path: target };
  }

  async renameFolder(path, rawName) {
    const from = normalizePath(path);
    return this.relocateFolder(from, joinPath(parentOf(from), validateName(rawName)));
  }

  async moveFolder(path, rawParent) {
    const from = normalizePath(path);
    return this.relocateFolder(from, joinPath(normalizePath(rawParent), baseName(from)));
  }

  async deleteFolder(rawPath) {
    const path = normalizePath(rawPath);
    if (path === '/' || !this.folderExists(path)) throw notFound('La carpeta no existe');
    const ids = [...this.entries.values()]
      .filter((e) => (e.type === 'folder' ? isWithin(joinPath(e.parent, e.name), path) : isWithin(e.parent, path)))
      .map((e) => e.id);
    await this.tg.remove(ids);
    ids.forEach((id) => this.entries.delete(id));
    return { deleted: ids.length };
  }

  // ---------- archivos ----------

  async addUploaded({ parent: rawParent, name: rawName, path, size, onProgress }) {
    const parent = normalizePath(rawParent);
    if (!this.folderExists(parent)) throw notFound('La carpeta destino no existe');
    const name = uniqueName(validateName(rawName), this.#takenNames(parent, 'file'));
    const message = await this.tg.sendFile({
      path, name, size, caption: encodeFile({ parent, name }), onProgress,
    });
    const entry = toEntry(message);
    if (!entry) throw new Error('Telegram no devolvió el archivo subido');
    entry.name = name;
    this.entries.set(entry.id, entry);
    return entry;
  }

  async renameFile(id, rawName) {
    const entry = this.getFile(id);
    const name = validateName(rawName);
    if (this.#takenNames(entry.parent, 'file', entry.id).has(name.toLowerCase())) {
      throw conflict('Ya existe un archivo con ese nombre');
    }
    const next = { ...entry, name, kind: kindOf(name, entry.mime) };
    await this.tg.editText(entry.id, encodeFile(next));
    this.entries.set(entry.id, next);
    return next;
  }

  async moveFile(id, rawParent) {
    const entry = this.getFile(id);
    const parent = normalizePath(rawParent);
    if (!this.folderExists(parent)) throw notFound('La carpeta destino no existe');
    const name = uniqueName(entry.name, this.#takenNames(parent, 'file', entry.id));
    const next = { ...entry, parent, name };
    await this.tg.editText(entry.id, encodeFile(next));
    this.entries.set(entry.id, next);
    return next;
  }

  async deleteFile(id) {
    const entry = this.getFile(id);
    await this.tg.remove([entry.id]);
    this.entries.delete(entry.id);
  }
}
