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

// Documentos que el navegador ejecutaría en el origen de la app si se abrieran en una pestaña: se aíslan con `sandbox`
// (sin scripts ni acceso a la sesión). Los <img>/<video>/<audio> no se ven afectados.
const ACTIVE = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml|application\/xml|text\/javascript|application\/javascript)\b/i;

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
  if (ACTIVE.test(type)) res.set('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:");
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
