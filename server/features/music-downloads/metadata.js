import { badRequest } from '../../utils/errors.js';

const VIDEO_ID = /^[\w-]{11}$/;
const LIST_ID = /^[\w-]{12,80}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);
export const ROOT_FOLDER = '/Descargas de Internet';

/** Canonicalise URLs: yt-dlp only sees YouTube, never a user-provided host. */
export function sourceUrl(input) {
  let u;
  try { u = new URL(String(input)); } catch { throw badRequest('Pega un enlace válido de YouTube'); }
  if (u.protocol !== 'https:' || !HOSTS.has(u.hostname.toLowerCase()) || u.username || u.password || u.port) {
    throw badRequest('Por seguridad, solo se admiten enlaces HTTPS de YouTube');
  }
  const pathname = u.pathname;
  if (pathname === '/playlist') {
    const id = u.searchParams.get('list');
    if (!LIST_ID.test(id || '')) throw badRequest('Lista de YouTube no válida');
    return { type: 'playlist', url: 'https://www.youtube.com/playlist?list=' + id, id };
  }
  let id = u.hostname === 'youtu.be' ? pathname.slice(1) : u.searchParams.get('v');
  if (!id && /^\/(shorts|live)\/[\w-]{11}\/?$/.test(pathname)) id = pathname.split('/')[2];
  if (!VIDEO_ID.test(id || '')) throw badRequest('Enlace de canción de YouTube no válido');
  return { type: 'video', url: 'https://www.youtube.com/watch?v=' + id, id };
}

/** Remote names are never used directly as filesystem paths. */
export function safePart(value, fallback = '') {
  const s = String(value ?? '').normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, '').trim();
  return (s.slice(0, 80).trim() || fallback);
}

export function classify(info, changes = {}) {
  const title = safePart(changes.title ?? info.track ?? info.title, 'Canción sin título');
  const artist = safePart(changes.artist ?? info.artist ?? (info.track ? info.creator : ''), '');
  const album = safePart(changes.album ?? info.album, '');
  const parent = artist ? ROOT_FOLDER + '/' + artist + '/' + (album || 'Singles') : ROOT_FOLDER + '/Por revisar';
  return { title, artist, album, parent, fileName: title + '.mp3', needsReview: !artist };
}

export function entryOf(info) {
  const id = String(info.id || '');
  if (!VIDEO_ID.test(id)) throw badRequest('YouTube no devolvió un identificador válido');
  return {
    id, url: 'https://www.youtube.com/watch?v=' + id,
    title: String(info.track || info.title || 'Sin título').slice(0, 180),
    artist: String(info.artist || (info.track ? info.creator : '') || '').slice(0, 180),
    album: String(info.album || '').slice(0, 180),
    duration: Number(info.duration) || 0,
  };
}
