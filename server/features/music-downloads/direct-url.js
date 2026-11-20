import { badRequest } from '../../utils/errors.js';

const EXTENSIONS = new Set(['mp3', 'm4a', 'opus', 'mp4', 'mkv', 'webm', 'pdf', 'zip', 'txt', 'jpg', 'jpeg', 'png', 'webp', 'epub']);
const MAX_URL = 1800;

export function directSource(input) {
  let url;
  try { url = new URL(String(input)); } catch { throw badRequest('Enlace de descarga directa inválido'); }
  if (String(input).length > MAX_URL || url.protocol !== 'https:' || url.port ||
      url.username || url.password || url.hash || !url.hostname.includes('.') ||
      /[^a-z0-9.-]/i.test(url.hostname)) throw badRequest('Solo se permiten enlaces HTTPS públicos sin credenciales');
  const filename = decodeURIComponent(url.pathname.split('/').pop() || '');
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!EXTENSIONS.has(ext)) throw badRequest('Tipo de archivo no admitido; el enlace debe terminar en una extensión conocida');
  const clean = filename.replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  if (!clean || clean.startsWith('.')) throw badRequest('Nombre de archivo inválido');
  return { url: url.href, name: clean, ext, id: 'direct:' + url.href };
}

export function directCategory(ext) {
  if (['mp3', 'm4a', 'opus'].includes(ext)) return 'Audio';
  if (['mp4', 'mkv', 'webm'].includes(ext)) return 'Vídeos';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'Imágenes';
  if (['pdf', 'txt', 'epub'].includes(ext)) return 'Documentos';
  return 'Comprimidos';
}
