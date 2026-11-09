// Reduce las portadas incrustadas (pueden pesar varios MB) a 400 px. "sharp" es opcional: sin él se sirve la original.
let loading;
const loadSharp = () => (loading ??= import('sharp').then((m) => m.default).catch(() => null));

export async function shrinkCover(buffer, size = 400) {
  const sharp = await loadSharp();
  if (!sharp) return buffer.length <= 2 * 1024 * 1024 ? buffer : null;
  try {
    return await sharp(buffer).resize(size, size, { fit: 'cover' }).jpeg({ quality: 78 }).toBuffer();
  } catch {
    return null;
  }
}
