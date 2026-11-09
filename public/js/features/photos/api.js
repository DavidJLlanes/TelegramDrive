import { http } from '../../core/api.js';

export const photosApi = {
  timeline: (offset = 0, limit = 200) => http.get('photos/timeline', { offset, limit }),
  status: () => http.get('photos/status'),
  scan: () => http.post('photos/scan'),
  albums: () => http.get('photo-albums').then((r) => r.albums),
  album: (id) => http.get(`photo-albums/${id}`),
  createAlbum: (name, ids = []) => http.post('photo-albums', { name, ids }).then((r) => r.album),
  renameAlbum: (id, name) => http.patch(`photo-albums/${id}`, { name }),
  deleteAlbum: (id) => http.delete(`photo-albums/${id}`),
  addToAlbum: (id, ids) => http.post(`photo-albums/${id}/items`, { ids }),
  removeFromAlbum: (id, ids) => http.delete(`photo-albums/${id}/items`, { ids }),
};
