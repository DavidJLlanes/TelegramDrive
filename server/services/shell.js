// Service worker generado: el servidor inventaría public/ y lo inyecta en sw.js (lista de archivos y versión).
// Así añadir un archivo al cliente no exige editar el service worker ni subir ninguna versión a mano:
// cualquier cambio en public/ cambia la versión, el navegador instala el nuevo SW y renueva la caché.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const INCLUDE = /\.(js|css|woff2|png|svg|webmanifest|html)$/;
const EXCLUDE = new Set(['sw.js', 'css/share-gate.css']);

function* walk(dir, base = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) yield* walk(path.join(dir, entry.name), rel);
    else if (INCLUDE.test(entry.name) && !EXCLUDE.has(rel)) yield rel;
  }
}

export function buildShell(publicDir) {
  const files = [...walk(publicDir)].sort();
  const hash = createHash('sha1');
  for (const f of files) { const s = fs.statSync(path.join(publicDir, f)); hash.update(`${f}:${s.size}:${Math.round(s.mtimeMs)};`); }
  hash.update(fs.readFileSync(path.join(publicDir, 'sw.js')));
  return { version: hash.digest('hex').slice(0, 10), files: ['./', ...files] };
}

/** Manejador de GET /sw.js: la plantilla public/sw.js con la versión y la lista de archivos rellenadas. */
export function serviceWorkerHandler(publicDir) {
  let body;
  return (_req, res) => {
    if (!body) {
      const { version, files } = buildShell(publicDir);
      body = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8').replace("'__BUILD__'", JSON.stringify(version)).replace("['__SHELL__']", JSON.stringify(files));
    }
    res.set({ 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' }).send(body);
  };
}
