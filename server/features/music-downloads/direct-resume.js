import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { directSource } from './direct-url.js';
import { transferPaths, readTransfer, writeTransfer, clearTransfer } from './direct-transfer-state.js';
import { openDirectResponse, inspectResponse } from './direct-http.js';

const MAX_BYTES = 1024 ** 3;

export async function downloadResumable(input, root, id, { signal, onProgress, openResponse = openDirectResponse } = {}) {
  const source = directSource(input);
  const paths = transferPaths(root, id);
  await fsp.mkdir(paths.dir, { recursive: true, mode: 0o700 });
  let previous = await readTransfer(paths);
  if (previous && previous.url !== source.url) throw new Error('La URL de reanudación no coincide');
  let offset = previous?.bytes || 0;
  if (offset > MAX_BYTES) throw new Error('Archivo parcial superior a 1 GB');
  if (offset && !((previous?.etag && !previous.etag.startsWith('W/')) || previous?.lastModified)) {
    await clearTransfer(paths);
    await fsp.mkdir(paths.dir, { recursive: true, mode: 0o700 });
    previous = null;
    offset = 0;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const validator = previous?.etag && !previous.etag.startsWith('W/')
      ? previous.etag : previous?.lastModified;
    const response = await openResponse(source.url, { offset, validator, signal });
    let details;
    try { details = inspectResponse(response, offset, previous, MAX_BYTES); }
    catch (error) { response.destroy(); throw error; }
    if (details.restart) {
      response.destroy();
      await clearTransfer(paths);
      await fsp.mkdir(paths.dir, { recursive: true, mode: 0o700 });
      previous = null;
      offset = 0;
      continue;
    }
    await writeTransfer(paths, { url: source.url, total: details.total,
      etag: details.etag, lastModified: details.lastModified });
    let bytes = offset;
    const limit = new Transform({
      transform(chunk, _encoding, callback) {
        bytes += chunk.length;
        if (bytes > MAX_BYTES || details.total !== null && bytes > details.total) {
          return callback(new Error('Tamaño descargado superior al permitido'));
        }
        if (details.total) onProgress?.(Math.min(75, Math.floor(bytes / details.total * 75)));
        callback(null, chunk);
      },
    });
    await pipeline(response, limit, fs.createWriteStream(paths.partial,
      { flags: offset ? 'a' : 'w', mode: 0o600 }), { signal });
    if (bytes < 128 || details.total !== null && bytes !== details.total) {
      throw new Error('Descarga incompleta');
    }
    return { path: paths.partial, size: bytes, name: source.name, ext: source.ext };
  }
  throw new Error('No se pudo reiniciar la descarga');
}
