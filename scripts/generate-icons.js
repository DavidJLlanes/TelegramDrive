// Genera los PNG de la PWA a partir de public/icons/icon.svg (requiere `sharp`, devDependency).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.resolve('public/icons');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'));
const BG = '#0f8cc9';

const plain = (size, name) => sharp(svg, { density: 384 }).resize(size, size).png().toFile(path.join(dir, name));

// Maskable: el icono ocupa el 62 % central (zona segura) sobre fondo sólido.
async function maskable(size, name) {
  const inner = Math.round(size * 0.62);
  const glyph = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: glyph, gravity: 'centre' }]).png().toFile(path.join(dir, name));
}

await Promise.all([
  plain(192, 'icon-192.png'), plain(512, 'icon-512.png'), plain(180, 'apple-touch-icon.png'),
  plain(32, 'favicon-32.png'), maskable(512, 'icon-maskable-512.png'),
]);
console.log('Iconos generados en public/icons');
