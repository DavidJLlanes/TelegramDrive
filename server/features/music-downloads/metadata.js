import { badRequest } from '../../utils/errors.js';

import { sourceUrl } from './sources.js';
export { sourceUrl } from './sources.js';

export const ROOT_FOLDER = '/Descargas de Internet';
export const VIDEO_FOLDER = ROOT_FOLDER + '/Vídeos';

/** Remote names are never used directly as filesystem paths. */
export function safePart(value, fallback = '') {
  const s = String(value ?? '').normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, '').trim();
  return (s.slice(0, 80).trim() || fallback);
}

export function classify(info, changes = {}, format = 'mp3', options = {}) {
  const title = safePart(changes.title ?? info.track ?? info.title, 'Canción sin título');
  const artist = safePart(changes.artist ?? info.artist ?? (info.track ? info.creator : ''), '');
  const album = safePart(changes.album ?? info.album, '');
  const parent = format === 'video' ? VIDEO_FOLDER : artist ? ROOT_FOLDER + '/' + artist + '/' + (album || 'Singles') : ROOT_FOLDER + '/Por revisar';
  return { title, artist, album, parent, fileName: title + (format === 'video' ? '.mp4' : '.' + (options.audioFormat || 'mp3')), needsReview: !artist };
}

/** When the uploader omitted music tags, use a clear "Artist - Song" title conservatively. */
export function parseVideoTitle(value) {
  const m = /^(.{2,70}?)\s+[-–—]\s+(.{2,160})$/.exec(String(value ?? ''));
  if (!m || /^(official|audio|lyrics|music|video)$/i.test(m[1].trim())) return null;
  const title = m[2].replace(/\s*[[(](?:official\s+(?:music\s+)?video|official\s+audio|lyric(?:s)?\s+video|hd|4k)[)\]]\s*$/i, '').trim();
  return { artist: m[1].trim(), title: title || m[2].trim() };
}

export function entryOf(info, original) {
  const source = original ? sourceUrl(original) : null;
  const id = source?.type === 'video' ? source.id : String(info.id || '');
  if (!id || (!source && !/^[\\w-]{11}$/.test(id))) throw badRequest('No se encontró un identificador válido');
  const fallback = info.artist || info.track ? null : parseVideoTitle(info.title);
  return {
    id, url: source?.type === 'video' ? source.url : 'https://www.youtube.com/watch?v=' + id,
    title: String(info.track || fallback?.title || info.title || 'Sin título').slice(0, 180),
    artist: String(info.artist || (info.track ? info.creator : fallback?.artist) || '').slice(0, 180),
    album: String(info.album || '').slice(0, 180),
    duration: Number(info.duration) || 0,
    channel: String(info.channel || info.uploader || '').slice(0, 180),
    year: String(info.release_year || info.upload_date || '').slice(0, 4),
  };
}
