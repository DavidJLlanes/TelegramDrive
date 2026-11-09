import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import Busboy from 'busboy';
import { config } from '../config/index.js';
import { HttpError } from '../utils/errors.js';

/**
 * Recibe un multipart (campo "path" + un "file") y lo vuelca a disco
 * sin cargarlo en memoria. Devuelve { parent, name, path, size, cleanup }.
 */
export function receiveUpload(req) {
  return new Promise((resolve, reject) => {
    let parent = '/';
    let received = null;
    let writing = null;
    let failed = false;

    const bb = Busboy({
      headers: req.headers,
      defParamCharset: 'utf8',
      limits: { files: 1, fileSize: config.upload.maxBytes, fields: 4 },
    });
    const fail = (err) => {
      if (failed) return;
      failed = true;
      if (received) fsp.rm(received.path, { force: true });
      reject(err);
    };

    bb.on('field', (name, value) => { if (name === 'path') parent = value; });
    bb.on('file', (_field, stream, info) => {
      const tmp = path.join(config.tmpDir, crypto.randomUUID());
      received = { name: info.filename, path: tmp, size: 0, truncated: false };
      stream.on('data', (c) => { received.size += c.length; });
      stream.on('limit', () => { received.truncated = true; });
      writing = pipeline(stream, fs.createWriteStream(tmp, { mode: 0o600 })).catch(fail);
    });
    bb.on('error', fail);
    bb.on('close', async () => {
      if (failed) return;
      await writing;
      if (failed) return;
      if (!received) return fail(new HttpError(400, 'No se recibió ningún archivo'));
      if (received.truncated) return fail(new HttpError(413, 'El archivo supera el límite permitido'));
      resolve({
        parent,
        name: received.name,
        path: received.path,
        size: received.size,
        cleanup: () => fsp.rm(received.path, { force: true }),
      });
    });
    req.on('aborted', () => fail(new HttpError(499, 'Subida cancelada')));
    req.pipe(bb);
  });
}
