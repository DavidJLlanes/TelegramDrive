// Genera un "mp3" mínimo con cabecera ID3v2.3 para probar la lectura de etiquetas.
const FRAMES = { title: 'TIT2', artist: 'TPE1', album: 'TALB', band: 'TPE2', track: 'TRCK', genre: 'TCON', year: 'TYER', disc: 'TPOS' };

const frame = (id, body) => {
  const head = Buffer.alloc(10);
  head.write(id, 0, 'latin1');
  head.writeUInt32BE(body.length, 4);
  return Buffer.concat([head, body]);
};
const text = (value) => Buffer.concat([Buffer.from([3]), Buffer.from(String(value), 'utf8')]); // 3 = UTF-8

const syncsafe = (n) => Buffer.from([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f]);

/** `frames`: nº de tramas MPEG de audio (~26 ms cada una, silencio). */
export function mp3WithTags(tags = {}, { cover, frames: count = 4 } = {}) {
  const tagFrames = Object.entries(FRAMES).filter(([key]) => tags[key] !== undefined).map(([key, id]) => frame(id, text(tags[key])));
  if (cover) tagFrames.push(frame('APIC', Buffer.concat([Buffer.from([0]), Buffer.from('image/jpeg\0'), Buffer.from([3]), Buffer.from('\0'), cover])));
  const body = Buffer.concat(tagFrames);
  const header = Buffer.concat([Buffer.from('ID3'), Buffer.from([3, 0, 0]), syncsafe(body.length)]);
  const audio = Buffer.concat(Array.from({ length: count }, () => Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x00]), Buffer.alloc(413)])));
  return Buffer.concat([header, body, audio]);
}
