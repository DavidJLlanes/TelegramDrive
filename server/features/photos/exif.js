// Lector mínimo de EXIF para JPEG (fecha de la toma, GPS y cámara). Sin dependencias; toda lectura está acotada al búfer.
const TAGS = { make: 0x010f, model: 0x0110, modified: 0x0132, exifIfd: 0x8769, gpsIfd: 0x8825, taken: 0x9003, digitized: 0x9004 };
const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function reader(buf, base, little) {
  const u16 = (o) => (o + 2 <= buf.length && o >= 0 ? (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o)) : null);
  const u32 = (o) => (o + 4 <= buf.length && o >= 0 ? (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o)) : null);

  /** Entradas de un IFD: { tag → { type, count, at } } donde `at` es la posición absoluta de los datos. */
  function ifd(offset) {
    const out = new Map();
    const start = base + offset;
    const count = u16(start);
    if (count === null || count > 500) return out;
    for (let i = 0; i < count; i += 1) {
      const e = start + 2 + i * 12;
      const tag = u16(e); const type = u16(e + 2); const n = u32(e + 4);
      if (tag === null || type === null || n === null) break;
      const bytes = (SIZES[type] ?? 1) * n;
      out.set(tag, { type, count: n, at: bytes <= 4 ? e + 8 : base + u32(e + 8) });
    }
    return out;
  }

  const ascii = (entry) => (entry && entry.type === 2 && entry.at + entry.count <= buf.length
    ? buf.toString('latin1', entry.at, entry.at + entry.count).replace(/\0.*$/s, '').trim() : '');
  const long = (entry) => (entry ? u32(entry.at) : null);
  const rationals = (entry, n) => {
    if (!entry || entry.type !== 5 || entry.count < n) return null;
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const num = u32(entry.at + i * 8); const den = u32(entry.at + i * 8 + 4);
      if (num === null || !den) return null;
      out.push(num / den);
    }
    return out;
  };
  return { ifd, ascii, long, rationals };
}

/** "2024:07:15 18:30:05" → ms (se toma como hora local de la cámara, sin zona: se guarda como UTC para ordenar y agrupar). */
export function parseExifDate(text) {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(text ?? '');
  if (!m) return 0;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31) return 0;
  return Date.UTC(y, mo - 1, d, h, mi, s);
}

const dms = (parts, ref) => {
  if (!parts) return null;
  const value = parts[0] + parts[1] / 60 + parts[2] / 3600;
  return ref === 'S' || ref === 'W' ? -value : value;
};

/** Devuelve { taken (ms, 0 si no hay), lat, lon (null si no hay), camera } o null si no es un JPEG con EXIF. */
export function parseExif(buf) {
  if (buf.length < 12 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let pos = 2;
  while (pos + 4 <= buf.length && buf[pos] === 0xff) {
    const marker = buf[pos + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = buf.readUInt16BE(pos + 2);
    if (marker === 0xe1 && buf.toString('latin1', pos + 4, pos + 10) === 'Exif\0\0') return fromTiff(buf, pos + 10);
    pos += 2 + length;
  }
  return null;
}

function fromTiff(buf, base) {
  const order = buf.toString('latin1', base, base + 2);
  if (order !== 'II' && order !== 'MM') return null;
  const r = reader(buf, base, order === 'II');
  const first = r.long({ type: 4, count: 1, at: base + 4 });
  if (first === null) return null;
  const root = r.ifd(first);
  const exifOffset = r.long(root.get(TAGS.exifIfd));
  const exif = exifOffset === null ? new Map() : r.ifd(exifOffset);
  const gpsOffset = r.long(root.get(TAGS.gpsIfd));
  const gps = gpsOffset === null ? new Map() : r.ifd(gpsOffset);

  const taken = parseExifDate(r.ascii(exif.get(TAGS.taken))) || parseExifDate(r.ascii(exif.get(TAGS.digitized))) || parseExifDate(r.ascii(root.get(TAGS.modified)));
  const lat = dms(r.rationals(gps.get(2), 3), r.ascii(gps.get(1)));
  const lon = dms(r.rationals(gps.get(4), 3), r.ascii(gps.get(3)));
  const valid = lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
  const make = r.ascii(root.get(TAGS.make)); const model = r.ascii(root.get(TAGS.model));
  const camera = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`.trim();
  return { taken, lat: valid ? lat : null, lon: valid ? lon : null, camera: camera.slice(0, 80) };
}
