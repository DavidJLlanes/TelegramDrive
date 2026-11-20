import { badRequest } from '../../utils/errors.js';

const VIDEO_ID = /^[\w-]{11}$/;
const LIST_ID = /^[\w-]{12,80}$/;
const YOUTUBE = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);
const VIMEO = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const DAILYMOTION = new Set(['dailymotion.com', 'www.dailymotion.com', 'dai.ly']);
const SOUNDCLOUD = new Set(['soundcloud.com', 'www.soundcloud.com']);

/** Canonical URLs and exact host allowlist. No userinfo, ports, fragments or arbitrary URLs. */
export function sourceUrl(input) {
  let u;
  try { u = new URL(String(input)); } catch { throw badRequest('Pega un enlace válido'); }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash ||
      String(input).length > 1200) throw badRequest('Solo se admiten enlaces HTTPS seguros');
  if (YOUTUBE.has(host)) {
    if (u.pathname === '/playlist') {
      const id = u.searchParams.get('list');
      if (!LIST_ID.test(id || '')) throw badRequest('Lista de YouTube no válida');
      return { type: 'playlist', provider: 'youtube', url: 'https://www.youtube.com/playlist?list=' + id, id };
    }
    let id = host === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
    if (!id && /^\/(shorts|live)\/[\w-]{11}\/?$/.test(u.pathname)) id = u.pathname.split('/')[2];
    if (!VIDEO_ID.test(id || '')) throw badRequest('Vídeo de YouTube no válido');
    return { type: 'video', provider: 'youtube', url: 'https://www.youtube.com/watch?v=' + id, id };
  }
  if (VIMEO.has(host)) {
    const m = /^\/(?:video\/)?(\d{6,12})\/?$/.exec(u.pathname);
    if (!m) throw badRequest('Vídeo de Vimeo no válido');
    return { type: 'video', provider: 'vimeo', url: 'https://vimeo.com/' + m[1], id: 'vimeo:' + m[1] };
  }
  if (DAILYMOTION.has(host)) {
    const m = host === 'dai.ly' ? /^\/([\w]{5,15})\/?$/.exec(u.pathname)
      : /^\/video\/([\w]{5,15})(?:_[\w-]+)?\/?$/.exec(u.pathname);
    if (!m) throw badRequest('Vídeo de Dailymotion no válido');
    return { type: 'video', provider: 'dailymotion', url: 'https://www.dailymotion.com/video/' + m[1], id: 'dailymotion:' + m[1] };
  }
  if (SOUNDCLOUD.has(host)) {
    const m = /^\/([\w-]{1,80})\/([\w-]{1,120})\/?$/.exec(u.pathname);
    if (!m || ['sets', 'likes', 'reposts', 'tracks', 'albums'].includes(m[1])) throw badRequest('Pista de SoundCloud no válida');
    return { type: 'video', provider: 'soundcloud',
      url: 'https://soundcloud.com/' + m[1] + '/' + m[2], id: 'soundcloud:' + m[1].toLowerCase() + '/' + m[2].toLowerCase() };
  }
  throw badRequest('Plataforma no admitida');
}
