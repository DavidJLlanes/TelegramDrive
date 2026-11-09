// Service worker generado: el servidor inventaría public/ y lo inyecta en sw.js (lista de archivos y versión).
// Así añadir un archivo al cliente no exige editar el service worker ni subir ninguna versión a mano:
// cualquier cambio en public/ cambia la versión, el navegador instala el nuevo SW y renueva la caché.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const INCLUDE = /\.(js|css|woff2|png|svg|webmanifest|html)$/;
const EXCLUDE = new Set(['sw.js', 'css/share-gate.css', 'og-image.png']);
const SHELL_ICONS = /^icons\/(favicon-32|apple-touch-icon|icon-96|icon-192)\.png$/; // el resto de iconos los pide el navegador, no hacen falta sin conexión

function* walk(dir, base = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) yield* walk(path.join(dir, entry.name), rel);
    else if (INCLUDE.test(entry.name) && !EXCLUDE.has(rel) && (!rel.startsWith('icons/') || SHELL_ICONS.test(rel))) yield rel;
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

/** GET / y /index.html: la página con la dirección pública real en las metaetiquetas Open Graph (exigen URL absoluta). */
export function indexHandler(publicDir, basePath = '/') {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const prefix = basePath === '/' ? '' : basePath;
  return (req, res) => {
    const host = req.get('host') ?? '';
    const origin = /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `${req.protocol}://${host}${prefix}` : prefix;
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }).send(html.replaceAll('__ORIGIN__', origin));
  };
}
