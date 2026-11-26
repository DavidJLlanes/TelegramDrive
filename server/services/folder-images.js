// Imagen de portada de una carpeta: data/folder-images/<id>.webp (las anteriores, <id>.jpg, se siguen sirviendo) (el id de carpeta es estable aunque se renombre o mueva).
// Vive solo en el servidor (no en Telegram) y no depende del índice: sobrevive a reconstruirlo. `stamp(id)` = versión (para la URL) o null.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

export const WIDTH = 640;
export const HEIGHT = 444; // 640×444 ≈ 1,44:1: la silueta completa de la tarjeta (cuerpo + pestaña); cubre con holgura su ancho máximo en retina
let stamps = null;

const EXTS = ['webp', 'jpg']; // webp actual; jpg = imágenes subidas antes del cambio
const fileFor = (id, ext = 'webp') => path.join(config.folderImagesDir, `${id}.${ext}`);
function load() {
  if (stamps) return stamps;
  stamps = new Map();
  try {
    for (const name of fs.readdirSync(config.folderImagesDir)) {
      const m = /^(.+)\.(webp|jpg)$/.exec(name);
      if (m) stamps.set(m[1], Math.floor(fs.statSync(path.join(config.folderImagesDir, name)).mtimeMs));
    }
  } catch { /* aún no existe */ }
  return stamps;
}

export const stamp = (id) => load().get(String(id)) ?? null;
/** { path, type } de la imagen de la carpeta, o null. */
export function file(id) {
  if (stamp(id) === null) return null;
  const ext = EXTS.find((e) => fs.existsSync(fileFor(id, e)));
  return ext ? { path: fileFor(id, ext), type: ext === 'webp' ? 'image/webp' : 'image/jpeg' } : null;
}

export function save(id, bytes) {
  fs.writeFileSync(fileFor(id), bytes, { mode: 0o600 });
  fs.rmSync(fileFor(id, 'jpg'), { force: true });
  load().set(String(id), Date.now());
}

export function drop(id) {
  for (const ext of EXTS) fs.rmSync(fileFor(id, ext), { force: true });
  load().delete(String(id));
}

let sharpLoading;
/** Ajusta la imagen a 640×444 WebP al 70 % (la proporción de la tarjeta con su pestaña). Sin «sharp» solo se admite una imagen pequeña tal cual. */
export async function prepare(buffer) {
  sharpLoading ??= import('sharp').then((m) => m.default).catch(() => null);
  const sharp = await sharpLoading;
  if (!sharp) return buffer.length <= 2 * 1024 * 1024 ? buffer : null;
  try {
    return await sharp(buffer).rotate().resize(WIDTH, HEIGHT, { fit: 'cover' }).webp({ quality: 70 }).toBuffer();
  } catch { return null; }
}
