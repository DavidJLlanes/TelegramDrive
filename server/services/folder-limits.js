import { badRequest } from '../utils/errors.js';
import { normalizePath, joinPath } from '../utils/paths.js';

export const MAX_FOLDER_DEPTH = 64;

/** Validate a proposed folder path and every descendant before editing Telegram. */
export function validateFolderChange(tree, parent, name, movingId = null) {
  const destination = normalizePath(joinPath(tree.pathOf(parent), name));
  if (destination.split('/').filter(Boolean).length > MAX_FOLDER_DEPTH) {
    throw badRequest('Máximo de 64 niveles de carpetas');
  }
  if (movingId !== null) {
    const base = tree.pathOf(movingId);
    for (const id of tree.subtree(movingId)) {
      const original = tree.pathOf(id);
      const suffix = original.slice(base.length);
      const next = normalizePath(destination + suffix);
      if (next.split('/').filter(Boolean).length > MAX_FOLDER_DEPTH) {
        throw badRequest('El movimiento supera los 64 niveles de carpetas');
      }
    }
  }
  return destination;
}
