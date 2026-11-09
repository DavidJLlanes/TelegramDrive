// Formato (v2) del pie de cada mensaje en Telegram. Las carpetas tienen id propio, de modo que
// renombrar/mover una carpeta es editar UN mensaje, no uno por archivo.
//   Carpeta: #tgdrive {"v":2,"t":"folder","i":"a1b2c3d4e5","p":"root","n":"Música"}
//   Archivo: #tgdrive {"v":2,"t":"file","f":"a1b2c3d4e5","n":"tema.mp3"}
//   Opcionales: "x" (papelera: fecha en ms), "m" (etiquetas de música corregidas por el usuario).
//   Lista:   #tgdrive {"v":2,"t":"playlist","i":"a1b2c3d4e5","n":"Para correr","s":"1x,2k,3d"}  (ids de archivo en base 36)
import { randomBytes } from 'node:crypto';
import { badRequest } from '../utils/errors.js';

export const TAG = '#tgdrive';
const MAX_CAPTION = 1000;
const VERSION = 2;

function encode(meta) {
  const text = `${TAG} ${JSON.stringify({ v: VERSION, ...meta })}`;
  if (text.length > MAX_CAPTION) throw badRequest('Nombre demasiado largo');
  return text;
}

export const newFolderId = () => randomBytes(5).toString('hex');
export const newId = newFolderId;
export const encodeFolder = ({ id, parent, name, trashed = 0 }) => encode({ t: 'folder', i: id, p: parent, n: name, ...(trashed ? { x: trashed } : {}) });
export const encodeFile = ({ folder, name, trashed = 0, ovr = null }) =>
  encode({ t: 'file', f: folder, n: name, ...(trashed ? { x: trashed } : {}), ...(ovr && Object.keys(ovr).length ? { m: ovr } : {}) });

/** Una lista cabe en un mensaje de texto (4096): ~650 canciones con ids en base 36. */
export const MAX_PLAYLIST = 600;
export const encodePlaylist = ({ id, name, ids }) => {
  const text = `${TAG} ${JSON.stringify({ v: VERSION, t: 'playlist', i: id, n: name, s: ids.map((n) => n.toString(36)).join(',') })}`;
  if (text.length > 4000) throw badRequest(`Una lista admite hasta ${MAX_PLAYLIST} canciones`);
  return text;
};

const isStr = (v) => typeof v === 'string' && v.length > 0;

export function decode(text) {
  if (typeof text !== 'string' || !text.startsWith(TAG)) return null;
  try {
    const m = JSON.parse(text.slice(TAG.length).trim());
    if (m?.v !== VERSION || !isStr(m.n)) return null;
    const trashed = Number.isFinite(m.x) && m.x > 0 ? m.x : 0;
    if (m.t === 'folder' && isStr(m.i) && isStr(m.p)) return { type: 'folder', id: m.i, parent: m.p, name: m.n, trashed };
    if (m.t === 'file' && isStr(m.f)) return { type: 'file', folder: m.f, name: m.n, trashed, ovr: m.m && typeof m.m === 'object' ? m.m : null };
    if (m.t === 'playlist' && isStr(m.i)) {
      const ids = String(m.s ?? '').split(',').filter(Boolean).map((v) => parseInt(v, 36)).filter(Number.isInteger);
      return { type: 'playlist', id: m.i, name: m.n, ids };
    }
    return null;
  } catch {
    return null;
  }
}
