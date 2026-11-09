// Descargas en ZIP (sin comprimir, en streaming, con ZIP64 cuando hace falta) de carpetas o selecciones.
import { Readable } from 'node:stream';
import yazl from 'yazl';
import { normalizePath } from '../utils/paths.js';
import { badRequest, notFound } from '../utils/errors.js';

const MAX_ENTRIES = 20_000;
const safeName = (value) => String(value).replace(/[\\/\u0000-\u001f]/g, '_');
const attachment = (name) => `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`;

export class Archive {
  constructor({ tg, tree, files }) { Object.assign(this, { tg, tree, files }); }

  /** Entradas del ZIP de una carpeta (con subcarpetas); las rutas son relativas a ella. */
  forFolder(rawPath) {
    const path = normalizePath(rawPath);
    const id = this.tree.resolve(path);
    if (id === null) throw notFound('La carpeta no existe');
    const base = this.tree.pathOf(id);
    const entries = [];
    for (const folder of this.tree.descendants(id)) {
      const rel = this.tree.pathOf(folder).slice(base.length).replace(/^\//, '');
      for (const row of this.files.inFolder(folder)) entries.push({ ...row, path: [rel, row.name].filter(Boolean).map((p) => p.split('/').map(safeName).join('/')).join('/') });
    }
    return { name: base === '/' ? 'Telegram Drive' : base.split('/').pop(), entries };
  }

  forIds(ids) {
    const rows = this.files.byIds(ids.map(Number).filter(Number.isInteger));
    return { name: 'Selección', entries: rows.map((r) => ({ ...r, path: safeName(r.name) })) };
  }

  stream(res, { name, entries }) {
    if (!entries.length) throw notFound('No hay archivos que descargar');
    if (entries.length > MAX_ENTRIES) throw badRequest(`Demasiados archivos (máximo ${MAX_ENTRIES}). Descarga por partes.`);
    const used = new Set();
    const zip = new yazl.ZipFile();
    for (const entry of entries) {
      let path = entry.path;
      for (let n = 1; used.has(path.toLowerCase()); n += 1) path = entry.path.replace(/(\.[^./]*)?$/, ` (${n})$1`);
      used.add(path.toLowerCase());
      zip.addReadStreamLazy(path, { compress: false, size: entry.size, mtime: new Date(entry.date) }, (cb) => {
        if (!entry.size) { cb(null, Readable.from([])); return; }
        this.tg.getMessage(entry.id).then((m) => cb(null, Readable.from(this.tg.readRange(m, 0, entry.size - 1)))).catch(cb);
      });
    }
    zip.end();
    res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': attachment(`${name}.zip`), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    zip.outputStream.on('error', () => res.destroy());
    res.on('close', () => zip.outputStream.destroy());
    zip.outputStream.pipe(res);
  }
}
