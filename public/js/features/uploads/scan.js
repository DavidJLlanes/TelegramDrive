/** Recorre lo soltado con arrastrar y soltar: expande carpetas en sus archivos con ruta relativa. */
const readAll = (reader) => new Promise((resolve, reject) => {
  const out = [];
  const next = () => reader.readEntries((batch) => {
    if (!batch.length) resolve(out); else { out.push(...batch); next(); }
  }, reject);
  next();
});

async function walk(entry, prefix, out) {
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.push({ file, rel: prefix + entry.name });
  } else if (entry.isDirectory) {
    for (const child of await readAll(entry.createReader())) await walk(child, `${prefix}${entry.name}/`, out);
  }
}

/** Debe llamarse de forma síncrona dentro del evento drop (después la lista se vacía). */
export async function scanDrop(dataTransfer) {
  const entries = [...(dataTransfer.items || [])]
    .map((it) => (it.kind === 'file' ? it.webkitGetAsEntry?.() : null)).filter(Boolean);
  if (!entries.length) return [...dataTransfer.files].map((file) => ({ file, rel: '' }));
  const out = [];
  for (const entry of entries) await walk(entry, '', out);
  return out;
}
