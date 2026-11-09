import { encodePlaylist, newId, MAX_PLAYLIST } from '../telegram/codec.js';
import { badRequest, notFound } from '../utils/errors.js';
import { validateName } from '../utils/paths.js';

/** Listas de reproducción. Se guardan como UN mensaje de texto en Telegram (ids de archivo), igual que las carpetas. */
export class Playlists {
  constructor({ tg, repo, files, lock, toDto }) { Object.assign(this, { tg, repo, files, lock, toDto }); }

  #need(id) {
    const list = this.repo.get(id);
    if (!list) throw notFound('La lista no existe');
    return list;
  }

  /** Solo canciones que existen y no están en la papelera, sin repetir ids. */
  #audioIds(ids) {
    if (!Array.isArray(ids)) throw badRequest('Se esperaba una lista de canciones');
    const unique = [...new Set(ids.map(Number).filter(Number.isInteger))];
    const found = new Set(this.files.byIds(unique).filter((r) => r.kind === 'audio').map((r) => r.id));
    return unique.filter((id) => found.has(id));
  }

  list() {
    return this.repo.all().map((p) => {
      const rows = this.files.byIds(p.ids);
      const byId = new Map(rows.map((r) => [r.id, r]));
      const cover = p.ids.map((id) => byId.get(id)).find((r) => r?.thumb)?.id ?? null;
      return { id: p.id, name: p.name, tracks: rows.length, cover };
    });
  }

  get(id) {
    const list = this.#need(id);
    const byId = new Map(this.files.byIds(list.ids).map((r) => [r.id, r]));
    const paths = new Map();
    const files = list.ids.map((fid) => byId.get(fid)).filter(Boolean).map((r) => this.toDto(r, paths));
    return { id: list.id, name: list.name, files };
  }

  create({ name, ids = [] }) {
    return this.lock.run(async () => {
      const clean = validateName(name);
      const list = this.#audioIds(ids);
      if (list.length > MAX_PLAYLIST) throw badRequest(`Una lista admite hasta ${MAX_PLAYLIST} canciones`);
      const id = newId();
      const message = await this.tg.sendText(encodePlaylist({ id, name: clean, ids: list }));
      this.repo.upsert({ id, msgId: message.id, name: clean, ids: list });
      return { id, name: clean, tracks: list.length };
    });
  }

  /** `add`: ids a añadir al final; `ids`: orden completo (también sirve para quitar). */
  update(id, { name, ids, add }) {
    return this.lock.run(async () => {
      const list = this.#need(id);
      const nextName = name === undefined ? list.name : validateName(name);
      let nextIds = ids === undefined ? list.ids : this.#audioIds(ids);
      if (add !== undefined) nextIds = this.#audioIds([...nextIds, ...(Array.isArray(add) ? add.map(Number) : [])]);
      if (nextIds.length > MAX_PLAYLIST) throw badRequest(`Una lista admite hasta ${MAX_PLAYLIST} canciones`);
      await this.tg.editText(list.msgId, encodePlaylist({ id, name: nextName, ids: nextIds }));
      this.repo.upsert({ id, msgId: list.msgId, name: nextName, ids: nextIds });
      return { id, name: nextName, tracks: nextIds.length };
    });
  }

  delete(id) {
    return this.lock.run(async () => {
      const list = this.#need(id);
      await this.tg.remove([list.msgId]);
      this.repo.remove(id);
    });
  }
}
