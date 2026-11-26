import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';

const fileFor = (id) => path.join(config.thumbsDir, `${id}.jpg`);
// Marca «sin carátula» (el usuario la quitó): impide que se vuelva a poner sola (miniatura de Telegram, etiquetas o búsqueda en internet).
const noCoverFor = (id) => path.join(config.thumbsDir, `${Number(id)}.nocover`);
export const hasNoCover = async (id) => { try { await fs.access(noCoverFor(id)); return true; } catch { return false; } };
export const clearNoCover = (id) => fs.rm(noCoverFor(id), { force: true }).catch(() => {});
export async function removeCover(id) {
  await fs.rm(fileFor(id), { force: true });
  await fs.writeFile(noCoverFor(id), '', { mode: 0o600 });
}

/** Miniatura cacheada en disco; null si Telegram no generó ninguna. */
export async function getThumbnail(tg, id) {
  if (await hasNoCover(id)) return null;
  const file = fileFor(id);
  try {
    return await fs.readFile(file);
  } catch { /* no cacheada */ }
  let data = await tg.downloadThumb(await tg.getMessage(id));
  if (!data) data = await tg.downloadThumb(await tg.getMessage(id, { fresh: true })); // quizá Telegram la generó después de subirse
  if (data) await fs.writeFile(file, data).catch(() => {});
  return data;
}

export const dropThumbnail = (id) => fs.rm(fileFor(id), { force: true }).catch(() => {});
