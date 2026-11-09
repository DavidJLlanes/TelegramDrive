import { joinPath } from '../utils/paths.js';

export const fileDto = (e) => ({
  id: e.id, type: 'file', name: e.name, parent: e.parent, size: e.size,
  mime: e.mime, kind: e.kind, date: e.date, thumb: e.thumb,
});

export const folderDto = (f) => ({ type: 'folder', name: f.name, path: f.path ?? joinPath(f.parent, f.name) });
