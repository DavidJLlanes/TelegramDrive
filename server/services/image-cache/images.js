// Originales siempre en Telegram; el disco almacena solo derivados WebP recreables.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../../config/index.js';
import { getThumbnail } from '../thumbnails.js';
import { cachePath } from './paths.js';
import { schedulePrune } from './prune.js';

const MAX_SOURCE = 48 * 1024 * 1024;
const pending = new Map();
let active = 0;
const waiting = [];
const converter = import('sharp').then((m) => m.default).catch(() => null);

async function slot(job) {
  if (active >= 2) await new Promise((resolve) => waiting.push(resolve));
  active++;
  try { return await job(); }
  finally { active--; waiting.shift()?.(); }
}

async function original(tg, id) {
  const message = await tg.getMessage(id);
  const size = Number(message.media?.document?.size);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_SOURCE) return null;
  const chunks = [];
  let length = 0;
  for await (const chunk of tg.readRange(message, 0, size - 1)) {
    length += chunk.length;
    if (length > MAX_SOURCE) return null;
    chunks.push(chunk);
  }
  return length === size ? Buffer.concat(chunks, length) : null;
}

const settings = {
  thumb: { width: 360, quality: 70 },
  preview: { width: 2560, quality: 85 },
};

async function transform(bytes, kind, sharp) {
  return sharp(bytes, { limitInputPixels: 90_000_000, failOn: 'error' })
    .rotate().resize({ width: settings[kind].width, withoutEnlargement: true })
    .webp({ quality: settings[kind].quality, effort: 4 }).toBuffer();
}

async function persist(target, bytes) {
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const tmp = target + '.' + randomUUID() + '.tmp';
  try { await fs.writeFile(tmp, bytes, { mode: 0o600 }); await fs.rename(tmp, target); }
  finally { await fs.rm(tmp, { force: true }).catch(() => {}); }
  schedulePrune();
}

async function cached(file) {
  try { await fs.access(file); await fs.utimes(file, new Date(), new Date()).catch(() => {}); return { path: file, type: 'image/webp' }; }
  catch (err) { if (err.code === 'ENOENT') return null; throw err; }
}

async function build(tg, entry, kind) {
  const target = cachePath(kind, entry.parent, entry.id);
  const hit = await cached(target);
  if (hit) return hit;
  const sharp = await converter;
  if (!sharp) {
    if (kind === 'preview') return null;
    const bytes = await getThumbnail(tg, entry.id);
    return bytes ? { bytes, type: 'image/jpeg' } : null;
  }
  return slot(async () => {
    const again = await cached(target);
    if (again) return again;
    let source = null;
    let fromThumbnail = false;
    if (kind === 'thumb') {
      source = await getThumbnail(tg, entry.id);
      fromThumbnail = Boolean(source);
    }
    if (!source) source = await original(tg, entry.id);
    if (!source) return null;
    try {
      await persist(target, await transform(source, kind, sharp));
      if (kind === 'thumb') await fs.rm(path.join(config.thumbsDir, String(entry.id) + '.jpg'), { force: true });
      return { path: target, type: 'image/webp' };
    } catch (err) {
      console.warn('[caché] ' + kind + ' ' + entry.id + ': ' + err.message);
      return fromThumbnail ? { bytes: source, type: 'image/jpeg' } : null;
    }
  });
}

export function getCachedImage(tg, entry, kind) {
  if (entry.kind !== 'image' || !settings[kind]) return Promise.resolve(null);
  const key = kind + ':' + entry.parent + ':' + entry.id;
  if (!pending.has(key)) pending.set(key, build(tg, entry, kind).finally(() => pending.delete(key)));
  return pending.get(key);
}
