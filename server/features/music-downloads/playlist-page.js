import { badRequest } from '../../utils/errors.js';

export const PAGE_SIZE = 50;
export const MAX_PLAYLIST_ITEMS = 5000;

export function playlistPage(value = 0) {
  const offset = Number(value);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= MAX_PLAYLIST_ITEMS ||
      offset % PAGE_SIZE !== 0) throw badRequest('Página de lista no válida');
  return {
    offset,
    start: offset + 1,
    end: Math.min(offset + PAGE_SIZE, MAX_PLAYLIST_ITEMS),
    nextOffset: offset + PAGE_SIZE < MAX_PLAYLIST_ITEMS ? offset + PAGE_SIZE : null,
    previousOffset: offset ? offset - PAGE_SIZE : null,
  };
}
