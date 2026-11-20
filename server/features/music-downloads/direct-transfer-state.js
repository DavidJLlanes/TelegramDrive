import fs from 'node:fs/promises';
import path from 'node:path';

export function transferPaths(root, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Identificador de descarga inválido');
  const dir = path.join(root, 'direct-transfers', id);
  return { dir, partial: path.join(dir, 'file.part'), meta: path.join(dir, 'resume.json') };
}

export async function readTransfer(paths) {
  try {
    const [raw, stat] = await Promise.all([fs.readFile(paths.meta, 'utf8'), fs.stat(paths.partial)]);
    const data = JSON.parse(raw);
    if (!data.url || !Number.isSafeInteger(stat.size) || stat.size < 0) return null;
    return { ...data, bytes: stat.size };
  } catch { return null; }
}

export async function writeTransfer(paths, info) {
  await fs.mkdir(paths.dir, { recursive: true, mode: 0o700 });
  const tmp = paths.meta + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(info), { mode: 0o600 });
  await fs.rename(tmp, paths.meta);
}

export async function clearTransfer(paths) {
  await fs.rm(paths.dir, { recursive: true, force: true });
}
