// Formato (v2) del pie de cada mensaje en Telegram. Las carpetas tienen id propio, de modo que
// renombrar/mover una carpeta es editar UN mensaje, no uno por archivo.
//   Carpeta: #tgdrive {"v":2,"t":"folder","i":"a1b2c3d4e5","p":"root","n":"Música"}
//   Archivo: #tgdrive {"v":2,"t":"file","f":"a1b2c3d4e5","n":"tema.mp3"}
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
export const encodeFolder = ({ id, parent, name }) => encode({ t: 'folder', i: id, p: parent, n: name });
export const encodeFile = ({ folder, name }) => encode({ t: 'file', f: folder, n: name });

const isStr = (v) => typeof v === 'string' && v.length > 0;

export function decode(text) {
  if (typeof text !== 'string' || !text.startsWith(TAG)) return null;
  try {
    const m = JSON.parse(text.slice(TAG.length).trim());
    if (m?.v !== VERSION || !isStr(m.n)) return null;
    if (m.t === 'folder' && isStr(m.i) && isStr(m.p)) return { type: 'folder', id: m.i, parent: m.p, name: m.n };
    if (m.t === 'file' && isStr(m.f)) return { type: 'file', folder: m.f, name: m.n };
    return null;
  } catch {
    return null;
  }
}
