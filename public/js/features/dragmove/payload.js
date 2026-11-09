// Qué se arrastra: la selección actual si el elemento arrastrado forma parte de ella; si no, solo ese elemento.
export const MIME = 'application/x-telegramdrive-items';

/** `selected`: claves "f:<id>" / "d:<ruta>". `key`: clave del elemento arrastrado. */
export function dragPayload(selected, key) {
  const keys = selected.includes(key) ? selected : [key];
  return {
    files: keys.filter((k) => k.startsWith('f:')).map((k) => Number(k.slice(2))),
    folders: keys.filter((k) => k.startsWith('d:')).map((k) => k.slice(2)),
  };
}

/** Una carpeta no puede soltarse sobre sí misma ni sobre una de sus hijas. */
export const canDrop = (payload, target) => !payload.folders.some((f) => target === f || target.startsWith(`${f}/`));
