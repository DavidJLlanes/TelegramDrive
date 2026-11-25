// Recibe un multipart con la imagen ("image") y el campo `key` ("ids" o "paths": JSON con la lista) y "replace" ("1" = sustituir las que ya tienen).
import Busboy from 'busboy';
import { HttpError } from '../../utils/errors.js';

export const MAX_IMAGE = 8 * 1024 * 1024;

export function receiveCover(req, key = 'ids') {
  if (!req.is('multipart/form-data')) return Promise.reject(new HttpError(415, 'Envía la imagen como multipart/form-data'));
  return new Promise((resolve, reject) => {
    const out = { ids: [], replace: false, image: null };
    const chunks = []; let size = 0; let tooBig = false;
    const bb = Busboy({ headers: req.headers, defParamCharset: 'utf8', limits: { files: 1, fileSize: MAX_IMAGE, fields: 4, fieldSize: 1_000_000 } });
    bb.on('field', (name, value) => {
      if (name === 'replace') out.replace = value === '1';
      if (name === key) { try { out.ids = JSON.parse(value); } catch { /* se valida abajo */ } }
    });
    bb.on('file', (_field, stream) => {
      stream.on('data', (c) => { size += c.length; chunks.push(c); });
      stream.on('limit', () => { tooBig = true; });
    });
    bb.on('error', reject);
    bb.on('close', () => {
      if (tooBig) return reject(new HttpError(413, 'La imagen pesa más de 8 MB'));
      if (!Array.isArray(out.ids) || !out.ids.length) return reject(new HttpError(400, 'No hay nada seleccionado'));
      if (!size) return reject(new HttpError(400, 'Falta la imagen'));
      out.image = Buffer.concat(chunks);
      return resolve(out);
    });
    req.pipe(bb);
  });
}
