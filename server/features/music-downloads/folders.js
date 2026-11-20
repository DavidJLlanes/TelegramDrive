import { ROOT_FOLDER, safePart } from './metadata.js';

/** Folder creation goes through TelegramDrive, not the local VPS filesystem. */
export async function ensureDestination(catalog, info, overrides = {}) {
  const artist = safePart(overrides.artist ?? info.artist);
  const album = safePart(overrides.album ?? info.album);
  const path = artist ? ROOT_FOLDER + '/' + artist + '/' + (album || 'Singles') : ROOT_FOLDER + '/Por revisar';
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
