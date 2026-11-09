// Cada archivo/carpeta se identifica en Telegram por su pie de mensaje:
//   #tgdrive {"v":1,"t":"file","p":"/Música","n":"tema.mp3"}
// Así el catálogo se reconstruye siempre desde Telegram (sin base de datos).
import { badRequest } from '../utils/errors.js';

export const TAG = '#tgdrive';
const MAX_CAPTION = 1000;

function encode(meta) {
  const text = `${TAG} ${JSON.stringify({ v: 1, ...meta })}`;
  if (text.length > MAX_CAPTION) throw badRequest('Ruta o nombre demasiado largos');
  return text;
}

export const encodeFile = ({ parent, name }) => encode({ t: 'file', p: parent, n: name });
export const encodeFolder = ({ parent, name }) => encode({ t: 'folder', p: parent, n: name });

export function decode(text) {
  if (typeof text !== 'string' || !text.startsWith(TAG)) return null;
  try {
    const meta = JSON.parse(text.slice(TAG.length).trim());
    if (meta?.v !== 1 || typeof meta.p !== 'string' || typeof meta.n !== 'string') return null;
    if (meta.t !== 'file' && meta.t !== 'folder') return null;
    return { type: meta.t, parent: meta.p, name: meta.n };
  } catch {
    return null;
  }
}
