import { http } from '../../core/api.js';

export const musicApi = {
  status: () => http.get('music-downloads'),
  inspect: (url, offset = 0) => http.post('music-downloads/inspect', { url, offset }),
  addDirect: (url) => http.post('music-downloads/direct', { url }),
  add: (items) => http.post('music-downloads', { items }),
  pause: (id) => http.post('music-downloads/' + encodeURIComponent(id) + '/pause'),
  resume: (id) => http.post('music-downloads/' + encodeURIComponent(id) + '/resume'),
  priority: (id, priority) => http.post('music-downloads/' + encodeURIComponent(id) + '/priority', { priority }),
  cancel: (id) => http.post('music-downloads/' + encodeURIComponent(id) + '/cancel'),
  retry: (id) => http.post('music-downloads/' + encodeURIComponent(id) + '/retry'),
  remove: (id) => http.delete('music-downloads/' + encodeURIComponent(id)),
};
