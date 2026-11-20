import https from 'node:https';
import { publicAddress } from './public-ip.js';

export async function openDirectResponse(input, { offset = 0, validator, signal } = {}) {
  const url = new URL(input);
  const ip = await publicAddress(url.hostname);
  const headers = { 'User-Agent': 'TelegramDrive/1.0', Accept: '*/*', 'Accept-Encoding': 'identity' };
  if (offset > 0) {
    headers.Range = 'bytes=' + offset + '-';
    if (validator) headers['If-Range'] = validator;
  }
  const request = https.get(url, {
    agent: false, lookup: (_host, _options, callback) => callback(null, ip, 4),
    headers, timeout: 30_000, signal,
  });
  return new Promise((resolve, reject) => {
    request.once('response', resolve);
    request.once('error', reject);
    request.once('timeout', () => request.destroy(new Error('Tiempo de conexión agotado')));
  });
}

export function inspectResponse(response, offset, previous, maxBytes) {
  const status = response.statusCode;
  if (status >= 300 && status < 400) throw new Error('No se siguen redirecciones por seguridad');
  if (offset && status === 200) return { restart: true };
  if (status !== (offset ? 206 : 200)) throw new Error('El servidor devolvió HTTP ' + status);
  if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') {
    throw new Error('No se admiten respuestas comprimidas para reanudación');
  }
  const sizeHeader = response.headers['content-length'];
  const length = sizeHeader === undefined ? null : Number(sizeHeader);
  if (length !== null && (!Number.isSafeInteger(length) || length < 0)) throw new Error('Tamaño inválido');
  let total = length === null ? null : offset + length;
  if (offset) {
    const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(String(response.headers['content-range'] || ''));
    if (!match || Number(match[1]) !== offset || Number(match[2]) < offset ||
        Number(match[3]) <= Number(match[2])) throw new Error('Respuesta Range inválida');
    total = Number(match[3]);
    if (length !== null && Number(match[2]) - offset + 1 !== length) throw new Error('Longitud Range incoherente');
    if (previous?.total && total !== previous.total) throw new Error('El tamaño del archivo ha cambiado');
    const etag = response.headers.etag;
    const lastModified = response.headers['last-modified'];
    if (previous?.etag && etag !== previous.etag) throw new Error('El archivo remoto ha cambiado (ETag)');
    if (previous?.lastModified && lastModified !== previous.lastModified) throw new Error('El archivo remoto ha cambiado (fecha)');
  }
  if (total !== null && (!Number.isSafeInteger(total) || total > maxBytes)) throw new Error('Archivo superior a 1 GB');
  return { total, etag: response.headers.etag || '', lastModified: response.headers['last-modified'] || '' };
}
