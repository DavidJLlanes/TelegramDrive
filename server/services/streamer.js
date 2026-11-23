import { once } from 'node:events';
import { mimeFor } from '../utils/media-kind.js';

/** Interpreta "Range: bytes=a-b". Devuelve null si no hay rango, false si es inválido. */
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return false;
  let start; let end;
  if (m[1] === '') {
    start = Math.max(size - Number(m[2]), 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start <= end && start < size ? { start, end } : false;
}

const encodeName = (name) => encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const asciiName = (name) => name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');

// Todo archivo servido se aísla con `sandbox` (sin scripts ni acceso a la sesión) si se abre en una pestaña: una lista de tipos
// «peligrosos» siempre se queda corta (+xml, rss, atom…), así que se invierte. Quedan fuera solo los tipos que el navegador
// muestra sin ejecutar nada y que el aislamiento estropea: audio y vídeo (no se reproducirían), imágenes de mapa de bits y PDF
// (el visor de Chrome no abre documentos aislados). El SVG sí se aísla: puede llevar scripts.
const NO_SANDBOX = /^(audio\/|video\/|application\/pdf\b|image\/(?!svg))/i;
export const isolated = (type) => !NO_SANDBOX.test(type);

export async function streamEntry({ req, res, tg, entry, download = false }) {
  const message = await tg.getMessage(entry.id);
  const size = Number(message.media.document.size);
  const range = parseRange(req.headers.range, size);

  if (range === false) {
    res.status(416).set('Content-Range', `bytes */${size}`).end();
    return;
  }
  const { start, end } = range || { start: 0, end: size - 1 };
  const type = entry.mime && entry.mime !== 'application/octet-stream' ? entry.mime : mimeFor(entry.name);
  const disposition = download ? 'attachment' : 'inline';

  res.status(range ? 206 : 200).set({
    'Content-Type': type,
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `${disposition}; filename="${asciiName(entry.name)}"; filename*=UTF-8''${encodeName(entry.name)}`,
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  if (isolated(type)) res.set('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:");
  if (range) res.set('Content-Range', `bytes ${start}-${end}/${size}`);
  if (size === 0) { res.end(); return; }

  let closed = false;
  res.on('close', () => { closed = true; });
  for await (const chunk of tg.readRange(message, start, end)) {
    if (closed) break;
    if (!res.write(chunk)) await once(res, 'drain').catch(() => {});
  }
  if (!closed) res.end();
}
