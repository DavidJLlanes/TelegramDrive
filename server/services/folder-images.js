// Imagen de portada de una carpeta: data/folder-images/<id>.jpg (el id de carpeta es estable aunque se renombre o mueva).
// Vive solo en el servidor (no en Telegram) y no depende del índice: sobrevive a reconstruirlo. `stamp(id)` = versión (para la URL) o null.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

export const WIDTH = 900;
export const HEIGHT = 600;
let stamps = null;

const fileFor = (id) => path.join(config.folderImagesDir, `${id}.jpg`);
function load() {
  if (stamps) return stamps;
  stamps = new Map();
  try {
    for (const name of fs.readdirSync(config.folderImagesDir)) {
      const id = name.replace(/\.jpg$/, '');
      if (id !== name) stamps.set(id, Math.floor(fs.statSync(path.join(config.folderImagesDir, name)).mtimeMs));
    }
  } catch { /* aún no existe */ }
  return stamps;
}

export const stamp = (id) => load().get(String(id)) ?? null;
export const file = (id) => (stamp(id) === null ? null : fileFor(id));

export function save(id, bytes) {
  fs.writeFileSync(fileFor(id), bytes, { mode: 0o600 });
  load().set(String(id), Date.now());
}

export function drop(id) {
  fs.rmSync(fileFor(id), { force: true });
  load().delete(String(id));
}

let sharpLoading;
/** Ajusta la imagen a 900×600 (3:2, la proporción de la tarjeta). Sin «sharp» solo se admite una imagen pequeña tal cual. */
export async function prepare(buffer) {
  sharpLoading ??= import('sharp').then((m) => m.default).catch(() => null);
  const sharp = await sharpLoading;
  if (!sharp) return buffer.length <= 2 * 1024 * 1024 ? buffer : null;
  try {
    return await sharp(buffer).rotate().resize(WIDTH, HEIGHT, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer();
  } catch { return null; }
}
