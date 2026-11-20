import { http } from '../../core/api.js';

export const musicApi = {
  status: () => http.get('music-downloads'),
  inspect: (url) => http.post('music-downloads/inspect', { url }),
  add: (items) => http.post('music-downloads', { items }),
  cancel: (id) => http.post('music-downloads/' + encodeURIComponent(id) + '/cancel'),
  retry: (id) => http.post('music-downloads/' + encodeURIComponent(id) + '/retry'),
  remove: (id) => http.delete('music-downloads/' + encodeURIComponent(id)),
};
