import { badRequest } from '../../utils/errors.js';
import { safePart } from './metadata.js';

export const QUALITIES = Object.freeze(['best', '360', '480', '720', '1080', '1440', '2160']);
export const AUDIO_BITRATES = Object.freeze(['128', '192', '320']);
export const VIDEO_GROUPS = Object.freeze(['flat', 'channel', 'year', 'playlist']);
export const AUDIO_GROUPS = Object.freeze(['playlist', 'artist']);
export const AUDIO_FORMATS = Object.freeze(['mp3', 'm4a', 'opus']);

export function normalizeOptions(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw badRequest('Opciones inválidas');
  const videoQuality = String(raw.videoQuality || 'best');
  const audioBitrate = String(raw.audioBitrate || '320');
  const videoGroup = String(raw.videoGroup || 'flat');
  const audioFormat = String(raw.audioFormat || 'mp3');
  const audioGroup = String(raw.audioGroup || 'playlist');
  const rawFolder = String(raw.folder ?? '').trim();
  const folder = safePart(rawFolder);
  if (rawFolder && !folder) throw badRequest('Nombre de carpeta no válido');
  if (!QUALITIES.includes(videoQuality) || !AUDIO_BITRATES.includes(audioBitrate) ||
      !VIDEO_GROUPS.includes(videoGroup) || !AUDIO_GROUPS.includes(audioGroup) || !AUDIO_FORMATS.includes(audioFormat)) {
    throw badRequest('Calidad, formato u organización no admitidos');
  }
  return {
    videoQuality, audioBitrate, videoGroup, audioFormat, audioGroup, folder,
    subtitles: raw.subtitles === true,
    thumbnail: raw.thumbnail !== false,
  };
}

export function fileExtension(format, options) {
  return format === 'video' ? 'mp4' : options.audioFormat;
}
