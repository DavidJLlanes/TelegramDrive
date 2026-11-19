// Qué pantalla se ve (sección, carpeta, vista…), lo «profunda» que es y si aún está cargando.
// Cuando la clave cambia, el repintado se hace con transición; la profundidad decide la dirección.
export const screenKey = (s) => [s.section, s.path, s.lib?.view, s.lib?.a, s.lib?.b, s.page?.id, (s.page?.parts ?? []).join('/'), s.results !== null].join('|');

const segments = (p = '/') => p.split('/').filter(Boolean).length;
export function screenDepth(s) {
  if (s.results !== null) return -1;
  if (s.section === 'library') return [s.lib?.a, s.lib?.b].filter((v) => v !== undefined).length;
  if (s.section === 'page') return s.page?.parts?.length ?? 0;
  if (s.section === 'files') return segments(s.path);
  return 0;
}

export function screenBusy(s) {
  if (s.section === 'library') return Boolean(s.lib?.loading);
  if (s.section === 'trash') return Boolean(s.trash?.loading);
  if (s.section === 'page') return Boolean(s.page?.loading);
  return Boolean(s.loading);
}

/** 'forward' al entrar más hondo en la misma sección, 'back' al salir, 'fade' en cualquier otro cambio. */
export function screenDirection(from, to) {
  if (!from || from.section !== to.section || (from.results !== null) !== (to.results !== null)) return 'fade';
  if (to.section === 'library' && from.lib?.view !== to.lib?.view && !(to.lib?.a ?? from.lib?.a)) return 'fade';
  const a = screenDepth(from); const b = screenDepth(to);
  return b > a ? 'forward' : b < a ? 'back' : 'fade';
}

const parent = (p) => p.slice(0, Math.max(p.lastIndexOf('/'), 0)) || '/';
/** Carpeta cuyo nombre «viaja» al título (al entrar) o del título a su tarjeta (al salir). */
export function heroFolder(from, to, dir) {
  if (from?.section !== 'files' || to.section !== 'files' || to.results !== null || from.results !== null) return null;
  if (dir === 'forward' && parent(to.path) === from.path) return to.path;
  if (dir === 'back' && parent(from.path) === to.path) return from.path;
  return null;
}
