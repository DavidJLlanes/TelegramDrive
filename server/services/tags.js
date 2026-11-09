// Lectura de etiquetas de audio (ID3v2/ID3v1, Vorbis, MP4…) descargando solo el principio del archivo.
import { parseBuffer } from 'music-metadata';

const HEAD = 64 * 1024;            // primera lectura
const MAX_TAG = 6 * 1024 * 1024;   // tope para cabeceras ID3v2 grandes (portadas incrustadas)
const MAX_COVER = 2 * 1024 * 1024;

const clean = (value, max = 200) => String(value ?? '').replace(/\0/g, '').trim().slice(0, max);
const int = (value) => (Number.isInteger(value) && value > 0 && value < 100000 ? value : 0);

/** Tamaño total de la cabecera ID3v2 (0 si no hay). */
export function id3v2Size(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return 0;
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  return size + 10;
}

/** ID3v1: bloque fijo de 128 bytes al final del archivo. */
export function parseId3v1(buf) {
  if (buf.length < 128 || buf.toString('latin1', 0, 3) !== 'TAG') return null;
  const field = (from, to) => clean(buf.toString('latin1', from, to));
  const zeroTrack = buf[125] === 0 && buf[126] !== 0;
  return { title: field(3, 33), artist: field(33, 63), album: field(63, 93), year: int(Number(field(93, 97))), track: zeroTrack ? buf[126] : 0 };
}

async function bytes(tg, message, start, end) {
  const parts = [];
  for await (const chunk of tg.readRange(message, start, end)) parts.push(chunk);
  return Buffer.concat(parts);
}

function normalize(common) {
  const artist = clean(common.artist);
  const band = clean(common.albumartist) || artist;
  return {
    title: clean(common.title), artist, band, album: clean(common.album), genre: clean(common.genre?.[0], 80),
    track: int(common.track?.no), disc: int(common.disk?.no), year: int(common.year),
  };
}

const hasAny = (t) => Boolean(t.title || t.artist || t.album);

/** Devuelve { tags, cover } o { tags: null } si el archivo no tiene etiquetas legibles. */
export async function readTags(tg, message, name) {
  const size = Number(message.media.document.size);
  if (size === 0) return { tags: null };
  let head = await bytes(tg, message, 0, Math.min(size, HEAD) - 1);
  const wanted = id3v2Size(head);
  if (wanted > head.length) head = await bytes(tg, message, 0, Math.min(size, wanted, MAX_TAG) - 1);

  let tags = null;
  let cover = null;
  try {
    const { common } = await parseBuffer(head, { path: name, size }, { duration: false, skipPostHeaders: true });
    tags = normalize(common);
    const picture = common.picture?.[0];
    if (picture && picture.data.length <= MAX_COVER && /^image\/(jpe?g|png)$/i.test(picture.format)) cover = Buffer.from(picture.data);
  } catch { /* formato sin cabecera al inicio o truncado */ }

  if ((!tags || !hasAny(tags)) && size > 128) {
    const v1 = parseId3v1(await bytes(tg, message, size - 128, size - 1));
    if (v1) tags = { ...tags, ...v1, band: v1.artist, disc: 0, genre: tags?.genre ?? '' };
  }
  return tags && hasAny(tags) ? { tags, cover } : { tags: null };
}
