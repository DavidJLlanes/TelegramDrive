// Portadas de archivo: foto real si existe; si no, una portada con el color de su carpeta.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { tint } from '../core/color.js';
import { thumbUrl, contentUrl } from '../core/api.js';

const MAX_FULL_FALLBACK = 6 * 1024 * 1024;
const noThumb = new Set(); // ids sin miniatura: evita repetir la petición en cada repintado

function photo(file, onFail) {
  const useFull = noThumb.has(file.id);
  if (useFull && (file.kind !== 'image' || file.size > MAX_FULL_FALLBACK)) return null;
  const img = h('img', { src: useFull ? contentUrl(file.id) : thumbUrl(file.id), alt: '', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => {
    noThumb.add(file.id);
    if (img.dataset.fallback || file.kind !== 'image' || file.size > MAX_FULL_FALLBACK) { img.remove(); onFail?.(); return; }
    img.dataset.fallback = '1';
    img.src = contentUrl(file.id);
  });
  return img;
}

const playBadge = () => h('span', { class: 'play-badge' }, icon('play'));
const equalizer = () => h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
const trackNumber = (name) => {
  const m = /^\s*(\d{1,3})(?=\D)/.exec(name);
  return m ? m[1].padStart(2, '0') : null;
};

function audioCover(file) {
  const num = trackNumber(file.name);
  return tint(h('div', { class: 'cover audio' },
    num ? h('span', { class: 'cover-num' }, num) : h('span', { class: 'cover-num' }, icon('music')),
    playBadge(), equalizer()), file.parent);
}

function videoCover(file) {
  const cover = tint(h('div', { class: 'cover video' }, icon('video', 'big'), playBadge()), file.parent);
  if (file.thumb) {
    const img = photo(file, () => {});
    if (img) cover.prepend(img);
  }
  return cover;
}

function imageCover(file) {
  const cover = h('div', { class: 'cover' });
  const img = photo(file, () => cover.append(icon('image', 'big')));
  cover.append(img ?? icon('image', 'big'));
  return cover;
}

function otherCover(file) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  return h('div', { class: 'cover other' }, ext && ext.length <= 5 ? h('span', { class: 'cover-ext' }, ext) : icon('file', 'big'));
}

export function fileCover(file) {
  switch (file.kind) {
    case 'audio': return audioCover(file);
    case 'video': return videoCover(file);
    case 'image': return imageCover(file);
    default: return otherCover(file);
  }
}
