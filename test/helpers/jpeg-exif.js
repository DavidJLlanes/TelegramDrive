// Construye un JPEG mínimo con EXIF (fecha, GPS y cámara) para probar el lector.
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const entry = (tag, type, count, valueOrOffset) => Buffer.concat([u16(tag), u16(type), u32(count), u32(valueOrOffset)]);
const rat = (n, d = 1) => Buffer.concat([u32(n), u32(d)]);

/** `exif`: { taken: '2024:07:15 18:30:05', lat, lon (grados decimales), make, model }; la parte GPS se omite si no hay lat/lon. */
export function jpegWithExif({ taken, lat, lon, make = 'Canon', model = 'Canon EOS 80D' } = {}) {
  // Cuerpo TIFF construido con desplazamientos calculados a mano: IFD0 | datos | ExifIFD | GPS IFD
  const datos = []; let cursor = 0;
  const place = (buf) => { datos.push(buf); const at = cursor; cursor += buf.length; return at; };
  const withGps = lat !== undefined && lon !== undefined;
  const IFD0_COUNT = 2 + (withGps ? 1 : 0) + (taken ? 1 : 0);
  const ifd0Size = 2 + IFD0_COUNT * 12 + 4;
  const dataStart = 8 + ifd0Size;
  const abs = (rel) => dataStart + rel;

  const makeAt = place(Buffer.from(`${make}\0`)); const modelAt = place(Buffer.from(`${model}\0`));
  let exifAt = null; let gpsAt = null;
  if (taken) {
    const dateAt = place(Buffer.from(`${taken}\0`));
    const sub = Buffer.concat([u16(1), entry(0x9003, 2, taken.length + 1, abs(dateAt)), u32(0)]);
    exifAt = place(sub);
  }
  if (withGps) {
    const toDms = (v) => { const a = Math.abs(v); const d = Math.floor(a); const m = Math.floor((a - d) * 60); const s = Math.round(((a - d) * 60 - m) * 60 * 100); return Buffer.concat([rat(d), rat(m), rat(s, 100)]); };
    const latAt = place(toDms(lat)); const lonAt = place(toDms(lon));
    const sub = Buffer.concat([u16(4), entry(1, 2, 2, (lat < 0 ? 'S' : 'N').charCodeAt(0)), entry(2, 5, 3, abs(latAt)), entry(3, 2, 2, (lon < 0 ? 'W' : 'E').charCodeAt(0)), entry(4, 5, 3, abs(lonAt)), u32(0)]);
    gpsAt = place(sub);
  }
  const entries = [entry(0x010f, 2, make.length + 1, abs(makeAt)), entry(0x0110, 2, model.length + 1, abs(modelAt))];
  if (exifAt !== null) entries.push(entry(0x8769, 4, 1, abs(exifAt)));
  if (gpsAt !== null) entries.push(entry(0x8825, 4, 1, abs(gpsAt)));
  entries.sort((a, b) => a.readUInt16LE(0) - b.readUInt16LE(0));
  const ifd0 = Buffer.concat([u16(entries.length), ...entries, u32(0)]);
  const tiff = Buffer.concat([Buffer.from('II'), u16(42), u32(8), ifd0, ...datos]);
  const app1 = Buffer.concat([Buffer.from('Exif\0\0'), tiff]);
  const len = Buffer.alloc(2); len.writeUInt16BE(app1.length + 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), len, app1, Buffer.from([0xff, 0xd9])]);
}
