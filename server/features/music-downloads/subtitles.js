import fs from 'node:fs/promises';
import path from 'node:path';

/** Subtitle sidecars are separate TelegramDrive files beside their video. */
export async function sidecars(dir, fileName) {
  const names = await fs.readdir(dir);
  const result = [];
  for (const name of names) {
    if (!/^track\.[\w-]+\.(?:vtt|srt)$/.test(name)) continue;
    const full = path.join(dir, name);
    const stat = await fs.stat(full);
    if (stat.size > 0 && stat.size <= 5 * 1024 * 1024) {
      result.push({ path: full, size: stat.size, name: fileName.replace(/\.mp4$/i, '') + '.' + name.split('.').slice(1).join('.') });
    }
  }
  return result;
}
