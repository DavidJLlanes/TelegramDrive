// Genera todos los iconos y la imagen social a partir de las imágenes maestras de assets/brand/ (requiere `sharp`, devDependency).
//   icon-master.png  (cuadrada, a sangre)  → iconos PWA/Android/iOS/escritorio en public/icons/
//   cover.png        (apaisada)            → public/og-image.png (1200×630)
// Uso: npm run icons
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MASTER = 'assets/brand/icon-master.png';
const COVER = 'assets/brand/cover.png';
const out = path.resolve('public/icons');
fs.mkdirSync(out, { recursive: true });

const plain = (size) => sharp(MASTER).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 });

/** Maskable (Android adaptable): el motivo ocupa el 70 % central (zona segura del círculo) y el resto prolonga el degradado. */
async function maskable(size) {
  const inner = Math.round(size * 0.7);
  const pad = Math.ceil((size - inner) / 2);
  const glyph = await sharp(MASTER).resize(inner, inner).png().toBuffer();
  const extended = await sharp(glyph).extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: 'mirror' }).png().toBuffer();
  const base = await sharp(extended).resize(size, size).blur(Math.max(size / 18, 4)).png().toBuffer(); // (sharp aplica resize antes que extend)
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${inner}" height="${inner}"><defs><radialGradient id="g"><stop offset="0.82" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  const soft = await sharp(glyph).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  return sharp(base).composite([{ input: soft, gravity: 'centre' }]).png({ compressionLevel: 9 });
}

/** .ico con PNG incrustados (Windows, pestañas de escritorio). */
async function ico(sizes) {
  const images = await Promise.all(sizes.map((s) => plain(s).toBuffer()));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const at = 6 + 16 * i;
    head[at] = s; head[at + 1] = s; head.writeUInt16LE(1, at + 4); head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(images[i].length, at + 8); head.writeUInt32LE(offset, at + 12);
    offset += images[i].length;
  });
  return Buffer.concat([head, ...images]);
}

const jobs = [];
const put = (name, pipeline) => jobs.push(Promise.resolve(pipeline).then((p) => p.toFile(path.join(out, name))));

for (const s of [48, 72, 96, 144, 192, 256, 384, 512]) put(`icon-${s}.png`, plain(s));
for (const s of [192, 512]) put(`icon-maskable-${s}.png`, maskable(s));
for (const s of [120, 152, 167, 180]) put(s === 180 ? 'apple-touch-icon.png' : `apple-touch-icon-${s}.png`, plain(s));
for (const s of [16, 32, 48]) put(`favicon-${s}.png`, plain(s));
put('mstile-150.png', plain(150));
jobs.push(ico([16, 32, 48]).then((buf) => fs.writeFileSync(path.join(out, 'favicon.ico'), buf)));

// Imagen social 1200×630 (Open Graph / Twitter) .
jobs.push(sharp(COVER).resize(1200, 630, { fit: 'cover' }).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(path.resolve('public/og-image.png')));

await Promise.all(jobs);
console.log('Iconos y portada generados (public/icons, public/og-image.png)');
