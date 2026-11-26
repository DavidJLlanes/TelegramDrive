// Reduce las portadas incrustadas (pueden pesar varios MB) a 400 px. "sharp" es opcional: sin él se sirve la original.
let loading;
const loadSharp = () => (loading ??= import('sharp').then((m) => m.default).catch(() => null));

export const COVER_SIZE = 480; // cuadrada; en retina cubre las tarjetas (≈ 170-230 px) con holgura
const COVER_QUALITY = 70;

/** Tipo de imagen por sus primeros bytes. Las carátulas de audio se guardan como WebP en archivos `<id>.jpg` (el nombre es heredado de cuando eran JPEG). */
export function sniffImageType(bytes) {
  return bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : 'image/jpeg';
}

export async function shrinkCover(buffer, size = COVER_SIZE) {
  const sharp = await loadSharp();
  if (!sharp) return buffer.length <= 2 * 1024 * 1024 ? buffer : null;
  try {
    return await sharp(buffer).resize(size, size, { fit: 'cover' }).webp({ quality: COVER_QUALITY }).toBuffer();
  } catch {
    return null;
  }
}
