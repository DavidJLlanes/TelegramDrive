// Identifica «qué pantalla se ve» (sección, carpeta, vista…): cuando cambia, el repintado se hace con transición.
export const screenKey = (s) => [s.section, s.path, s.lib?.view, s.lib?.a, s.lib?.b, s.page?.id, s.results !== null, s.loading].join('|');
