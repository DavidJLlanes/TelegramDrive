// Cliente HTTP. Todas las URLs son relativas al documento: la app funciona bajo cualquier prefijo (/telegram/).
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const listeners = new Set();
export const onUnauthorized = (fn) => listeners.add(fn);

const url = (path, query) => {
  const u = new URL(`api/${path}`, document.baseURI);
  Object.entries(query ?? {}).forEach(([k, v]) => v != null && u.searchParams.set(k, v));
  return u;
};

async function request(path, { method = 'GET', body, query } = {}) {
  const res = await fetch(url(path, query), {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== 'auth/login') listeners.forEach((fn) => fn());
    throw new ApiError(res.status, data.error || `Error ${res.status}`);
  }
  return data;
}

export const api = {
  status: () => request('auth/status'),
  login: (password, code) => request('auth/login', { method: 'POST', body: { password, code } }),
  logout: () => request('auth/logout', { method: 'POST' }),
  list: (path, opts = {}) => request('list', { query: { path, ...opts } }),
  search: (q) => request('search', { query: { q } }),
  folders: () => request('folders'),
  stats: () => request('stats'),
  queue: (path, recursive = true) => request('queue', { query: { path, recursive: recursive ? 1 : 0 } }),
  artists: () => request('library/artists'),
  genres: () => request('library/genres'),
  albums: (filter = {}) => request('library/albums', { query: filter }),
  tracks: (filter = {}) => request('library/tracks', { query: filter }),
  refresh: () => request('refresh', { method: 'POST' }),
  createFolder: (parent, name) => request('folders', { method: 'POST', body: { parent, name } }),
  renameFolder: (path, name) => request('folders', { method: 'PATCH', body: { path, name } }),
  moveFolder: (path, parent) => request('folders', { method: 'PATCH', body: { path, parent } }),
  deleteFolder: (path) => request('folders', { method: 'DELETE', query: { path } }),
  renameFile: (id, name) => request(`files/${id}`, { method: 'PATCH', body: { name } }),
  moveFile: (id, parent) => request(`files/${id}`, { method: 'PATCH', body: { parent } }),
  deleteFile: (id) => request(`files/${id}`, { method: 'DELETE' }),
  lookup: (ids) => request('files/lookup', { method: 'POST', body: { ids } }),
  bulk: (body) => request('bulk', { method: 'POST', body }),
  trash: () => request('trash'),
  restore: (body) => request('trash/restore', { method: 'POST', body }),
  destroy: (body) => request('trash/delete', { method: 'POST', body }),
  emptyTrash: () => request('trash/empty', { method: 'POST' }),
  playlists: () => request('playlists'),
  playlist: (id) => request(`playlists/${id}`),
  createPlaylist: (name, ids = []) => request('playlists', { method: 'POST', body: { name, ids } }),
  updatePlaylist: (id, body) => request(`playlists/${id}`, { method: 'PATCH', body }),
  deletePlaylist: (id) => request(`playlists/${id}`, { method: 'DELETE' }),
  shares: () => request('shares'),
  createShare: (body) => request('shares', { method: 'POST', body }),
  revokeShare: (token) => request(`shares/${token}`, { method: 'DELETE' }),
  setTags: (id, patch) => request(`files/${id}/tags`, { method: 'PATCH', body: patch }),
  retag: (filter, set) => request('library/retag', { method: 'POST', body: { filter, set } }),
  retagIds: (ids, set) => request('library/retag', { method: 'POST', body: { ids, set } }),
};

/** Cliente genérico para las funciones (features/*): cada una define sus llamadas en su propia carpeta, no aquí. */
export const http = {
  get: (path, query) => request(path, { query }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export const contentUrl = (id, { download = false } = {}) =>
  url(`files/${id}/content`, download ? { download: 1 } : undefined).href;
export const thumbUrl = (id) => url(`files/${id}/thumb`).href;
/** ZIP de una carpeta (`path`) o de una selección (`ids`). Se descarga navegando a la URL (la cookie de sesión va sola). */
export const zipUrl = ({ path, ids }) => url('zip', ids ? { ids: ids.join(',') } : { path }).href;
export const shareUrl = (token) => new URL(`share/${token}`, document.baseURI).href;

/** Subida con progreso (XHR, porque fetch no expone progreso de subida). */
export async function uploadFile(file, parent, onProgress) {
  try { await file.slice(0, 1).arrayBuffer(); } catch {
    throw new ApiError(0, 'El navegador no puede leer este archivo del disco (¿está en la nube sin descargar o abierto en otro programa?)');
  }
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('path', parent);
    form.append('file', file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url('files').href);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(xhr.status, data.error || `Error ${xhr.status}`));
    };
    xhr.onerror = () => reject(new ApiError(0, `Se cortó la conexión durante la subida (${(file.size / 1048576).toFixed(1)} MB)`));
    xhr.onabort = () => reject(new ApiError(0, 'Subida cancelada'));
    xhr.send(form);
  });
}
