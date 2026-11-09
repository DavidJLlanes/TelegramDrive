// Router por hash: #/Carpeta/Sub. Independiente del prefijo de despliegue.
export const pathFromHash = () => {
  const raw = location.hash.replace(/^#/, '') || '/';
  try {
    return `/${raw.split('/').filter(Boolean).map(decodeURIComponent).join('/')}`;
  } catch { return '/'; }
};

export const hashFor = (path) =>
  `#/${path.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;

export const navigate = (path) => { location.hash = hashFor(path); };
export const onRoute = (fn) => window.addEventListener('hashchange', () => fn(pathFromHash()));
