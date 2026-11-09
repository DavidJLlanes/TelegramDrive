// Router por hash. Carpetas: #/Carpeta/Sub. Biblioteca de música: #!/musica/album/<artista>/<álbum>.
// Independiente del prefijo de despliegue.
const LIB_PREFIX = '#!/musica';
const decode = (v) => { try { return decodeURIComponent(v); } catch { return v; } };

export const pathFromHash = () => {
  const raw = location.hash.replace(/^#/, '') || '/';
  return `/${raw.split('/').filter(Boolean).map(decode).join('/')}`;
};

/** { kind: 'folder', path } | { kind: 'lib', view, a, b } */
export function currentRoute() {
  if (location.hash.startsWith(LIB_PREFIX)) {
    const [view, a, b] = location.hash.slice(LIB_PREFIX.length).split('/').slice(1).map(decode);
    return { kind: 'lib', view: view || 'albums', a, b };
  }
  return { kind: 'folder', path: pathFromHash() };
}

export const hashFor = (path) =>
  `#/${path.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;

export const libHash = (view, a, b) =>
  `${LIB_PREFIX}/${[view, a, b].filter((v) => v !== undefined).map(encodeURIComponent).join('/')}`;

export const navigate = (path) => { location.hash = hashFor(path); };
export const navigateLib = (view, a, b) => { location.hash = libHash(view, a, b); };
export const onRoute = (fn) => window.addEventListener('hashchange', () => fn(currentRoute()));
