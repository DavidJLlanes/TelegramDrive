import mime from 'mime-types';

const EXT_KIND = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg', 'heic'],
  video: ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'ogv'],
  audio: ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'weba'],
};

export function kindOf(name = '', mimeType = '') {
  const [type] = String(mimeType).split('/');
  if (['image', 'video', 'audio'].includes(type)) return type;
  const ext = name.split('.').pop()?.toLowerCase();
  return Object.keys(EXT_KIND).find((k) => EXT_KIND[k].includes(ext)) || 'file';
}

export function mimeFor(name, fallback = 'application/octet-stream') {
  return mime.lookup(name) || fallback;
}
