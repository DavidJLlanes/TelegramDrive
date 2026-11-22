import { ROOT_FOLDER, safePart } from './metadata.js';
import { videoDestination } from './video-paths.js';

/** Folder creation goes through TelegramDrive, not the local VPS filesystem. */
export async function ensureDirectDestination(catalog, category, custom = '') {
  const folder = custom ? ROOT_FOLDER + '/' + safePart(custom) : ROOT_FOLDER + '/Archivos directos/' + safePart(category, 'Otros');
  let current = '/';
  for (const segment of folder.split('/').filter(Boolean)) {
    const next = current === '/' ? '/' + segment : current + '/' + segment;
    if (catalog.tree.resolve(next) === null) {
      try { await catalog.folderOps.create(current, segment); }
      catch (err) { if (catalog.tree.resolve(next) === null) throw err; }
    }
    current = next;
  }
  return current;
}

export async function ensureDestination(catalog, info, overrides = {}) {
  const artist = safePart(overrides.artist ?? info.artist);
  const album = safePart(overrides.album ?? info.album);
  const list = info.format === 'video' || info.options?.audioGroup === 'artist' ? '' : safePart(info.playlist);
  const custom = safePart(info.options?.folder);
  const path = custom ? ROOT_FOLDER + '/' + custom : info.format === 'video' ? videoDestination(info, info.options?.videoGroup) : list ? ROOT_FOLDER + '/Listas/' + list : artist ? ROOT_FOLDER + '/' + artist + '/' + (album || 'Singles') : ROOT_FOLDER + '/Por revisar';
  let current = '/';
  for (const segment of path.split('/').filter(Boolean)) {
    const next = current === '/' ? '/' + segment : current + '/' + segment;
    if (catalog.tree.resolve(next) === null) {
      try { await catalog.folderOps.create(current, segment); }
      catch (err) { if (catalog.tree.resolve(next) === null) throw err; }
    }
    current = next;
  }
  return current;
}
