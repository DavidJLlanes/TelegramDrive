import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';

const fileFor = (id) => path.join(config.thumbsDir, `${id}.jpg`);

/** Miniatura cacheada en disco; null si Telegram no generó ninguna. */
export async function getThumbnail(tg, id) {
  const file = fileFor(id);
  try {
    return await fs.readFile(file);
  } catch { /* no cacheada */ }
  const message = await tg.getMessage(id);
  const data = await tg.downloadThumb(message);
  if (data) await fs.writeFile(file, data).catch(() => {});
  return data;
}

export const dropThumbnail = (id) => fs.rm(fileFor(id), { force: true }).catch(() => {});
