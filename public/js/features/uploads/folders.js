/** Crea las carpetas intermedias de una subida de carpeta. Varias subidas a la vez comparten la misma promesa por ruta. */
export function createFolderEnsurer(createFolder) {
  const pending = new Map();
  const make = (parent, name) => {
    const key = `${parent}\u0000${name}`;
    if (!pending.has(key)) pending.set(key, Promise.resolve(createFolder(parent, name)).catch((e) => { if (e.status !== 409) { pending.delete(key); throw e; } }));
    return pending.get(key);
  };
  return {
    async ensure(base, rel) {
      let parent = base;
      for (const dir of rel.split('/').slice(0, -1)) {
        await make(parent, dir);
        parent = parent === '/' ? `/${dir}` : `${parent}/${dir}`;
      }
      return parent;
    },
    clear: () => pending.clear(),
  };
}
