import { http } from '../../core/api.js';

export const lyricsApi = {
  get: (id) => http.get(`lyrics/${id}`).then((r) => r.lyrics),
  save: (id, text) => http.put(`lyrics/${id}`, { text }).then((r) => r.lyrics),
  remove: (id) => http.delete(`lyrics/${id}`),
  importFromFile: (id) => http.post(`lyrics/${id}/import`).then((r) => r.lyrics),
};
