import https from 'node:https';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { publicAddress } from './public-ip.js';
import { directSource } from './direct-url.js';

const MAX_BYTES = 1024 ** 3;
const TIMEOUT_MS = 45 * 60_000;

export async function downloadDirect(input, dir, { signal, onProgress } = {}) {
  const source = directSource(input);
  const url = new URL(source.url);
  const ip = await publicAddress(url.hostname);
  const destination = path.join(dir, 'direct-' + source.name);
  const request = https.get(url, {
    agent: false,
    lookup: (_hostname, _opts, cb) => cb(null, ip, 4),
    headers: { 'User-Agent': 'TelegramDrive/1.0', Accept: '*/*' },
    timeout: 30_000,
    signal,
  });
  const response = await new Promise((resolve, reject) => {
    request.once('response', resolve);
    request.once('error', reject);
    request.once('timeout', () => request.destroy(new Error('Tiempo de conexión agotado')));
  });
  if (response.statusCode !== 200) {
    response.destroy();
    throw new Error(response.statusCode >= 300 && response.statusCode < 400
      ? 'La URL redirige a otro destino; por seguridad no se siguen redirecciones'
      : 'El servidor devolvió HTTP ' + response.statusCode);
  }
  const length = Number(response.headers['content-length'] || 0);
  if (length > MAX_BYTES) { response.destroy(); throw new Error('Archivo superior a 1 GB'); }
  let bytes = 0;
  const limit = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) return callback(new Error('Archivo superior a 1 GB'));
      if (length > 0) onProgress?.(Math.min(75, Math.floor(bytes / length * 75)));
      callback(null, chunk);
    },
  });
  try {
    await pipeline(response, limit, fs.createWriteStream(destination, { flags: 'wx', mode: 0o600 }), { signal });
    if (bytes < 128) throw new Error('Archivo demasiado pequeño');
    return { path: destination, size: bytes, name: source.name, ext: source.ext };
  } catch (error) {
    await fsp.rm(destination, { force: true }).catch(() => {});
    throw error;
  }
}
