import { ROOT_FOLDER, safePart } from './metadata.js';

export function videoDestination(info, group = 'flat') {
  const base = ROOT_FOLDER + '/Vídeos';
  if (group === 'channel') return base + '/' + safePart(info.channel, 'Canal desconocido');
  if (group === 'year') return base + '/' + (/^\d{4}$/.test(String(info.year)) ? info.year : 'Sin fecha');
  if (group === 'playlist') return base + '/' + safePart(info.playlist, 'Sin lista');
  return base;
}
