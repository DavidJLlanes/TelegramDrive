import { badRequest } from '../../utils/errors.js';

const TYPES = new Set(['track', 'album', 'playlist']);
const ID = /^[a-zA-Z0-9]{22}$/;

export function spotifySource(input) {
  if (typeof input !== 'string' || input.length > 1000) throw badRequest('Enlace de Spotify inválido');
  let url;
  try { url = new URL(input); } catch { throw badRequest('Enlace de Spotify inválido'); }
  if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' ||
      url.port || url.username || url.password || url.hash) {
    throw badRequest('Introduce un enlace HTTPS público de open.spotify.com');
  }
  const segments = url.pathname.split('/').filter(Boolean);
  const route = segments[0]?.startsWith('intl-') ? segments.slice(1) : segments;
  if (route.length !== 2 || !TYPES.has(route[0]) || !ID.test(route[1])) {
    throw badRequest('SpotDL admite enlaces de canciones, álbumes y listas públicas de Spotify');
  }
  const [type, id] = route;
  const canonical = 'https://open.spotify.com/' + type + '/' + id;
  return { type, id: 'spotify:' + type + ':' + id, url: canonical };
}
