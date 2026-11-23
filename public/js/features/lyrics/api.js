import { http } from '../../core/api.js';

export const lyricsApi = {
  get: (id) => http.get(`lyrics/${id}`).then((r) => r.lyrics),
  save: (id, text) => http.put(`lyrics/${id}`, { text }).then((r) => r.lyrics),
  remove: (id) => http.delete(`lyrics/${id}`),
  importFromFile: (id) => http.post(`lyrics/${id}/import`).then((r) => r.lyrics),
  /** Búsqueda en internet (LRCLIB): candidatos para elegir; `q` afina a mano. */
  search: (id, q = '') => http.get(`lyrics/${id}/search`, q ? { q } : undefined),
  adopt: (id, lrclibId) => http.post(`lyrics/${id}/adopt`, { lrclibId }).then((r) => r.lyrics),
  /** → { state: 'found' | 'none' | 'skipped', lyrics } */
  auto: (id) => http.post(`lyrics/${id}/auto`),
  finder: {
    status: () => http.get('lyrics/finder'),
    start: () => http.post('lyrics/finder/start'),
    cancel: () => http.post('lyrics/finder/cancel'),
  },
};
