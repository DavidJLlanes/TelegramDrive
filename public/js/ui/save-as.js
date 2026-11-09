import { h, $ } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { contentUrl } from '../core/api.js';
import { formatBytes } from '../core/format.js';
import { download } from './download.js';
import { toastError } from './toast.js';

/**
 * «Guardar como…» adaptado a cada dispositivo:
 *  - PC (Chrome/Edge): selector nativo de «Guardar como» y escritura en streaming (sin cargar el archivo en memoria).
 *  - iPhone/iPad/Android: hoja de compartir del sistema (Guardar en Fotos, Archivos, Drive…), con respaldo de descarga normal.
 *  - Resto (Firefox, Safari de escritorio): descarga nativa del navegador.
 */
const SHARE_MAX = 120 * 1024 * 1024; // en móvil el archivo pasa por memoria: por encima se usa la descarga nativa
const MIME_OK = /^[\w.+-]+\/[\w.+-]+$/;

const isTouch = () => matchMedia('(pointer: coarse)').matches;
const mimeOf = (file, fallback) => (MIME_OK.test(file.mime || '') ? file.mime : (MIME_OK.test(fallback || '') ? fallback : 'application/octet-stream'));
const extOf = (name) => { const m = /\.([A-Za-z0-9]{1,15})$/.exec(name); return m ? `.${m[1].toLowerCase()}` : ''; };
const fetchFile = (file, signal) => fetch(contentUrl(file.id, { download: true }), { credentials: 'same-origin', signal });
const canShare = (file) => file.size <= SHARE_MAX && typeof navigator.canShare === 'function'
  && navigator.canShare({ files: [new File([''], file.name, { type: mimeOf(file) })] });

async function readOk(res) {
  if (res.ok) return res;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || `No se pudo leer el archivo (${res.status})`);
}

/** Lee la respuesta contando bytes; `onProgress(0..1)`. */
async function readBlob(file, res, onProgress) {
  const total = Number(res.headers.get('content-length')) || file.size || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) onProgress(Math.min(1, got / total));
  }
  return new Blob(chunks, { type: mimeOf(file, res.headers.get('content-type')) });
}

function progressToast(text) {
  const label = h('span', {}, text);
  const el = h('div', { class: 'toast info', role: 'status' }, label);
  $('#toasts').append(el);
  return { set: (t) => { label.textContent = t; }, done: (t) => { label.textContent = t; setTimeout(() => el.remove(), 2500); }, remove: () => el.remove() };
}

/** PC: selector de «Guardar como» y copia en streaming al archivo elegido. */
async function viaPicker(file) {
  const ext = extOf(file.name);
  const opts = { suggestedName: file.name };
  if (ext) opts.types = [{ description: `Archivo ${ext.slice(1).toUpperCase()}`, accept: { [mimeOf(file)]: [ext] } }];
  let handle;
  try { handle = await window.showSaveFilePicker(opts); } catch (err) {
    if (err.name === 'AbortError') return;
    if (!(err instanceof TypeError) || !opts.types) throw err;
    delete opts.types; // tipo/extensión que el navegador no acepta: se reintenta sin filtro
    try { handle = await window.showSaveFilePicker(opts); } catch (e) { if (e.name === 'AbortError') return; throw e; }
  }
  const note = progressToast(`Guardando ${file.name}…`);
  let got = 0;
  const meter = new TransformStream({ transform(chunk, ctl) {
    got += chunk.length; ctl.enqueue(chunk);
    if (file.size) note.set(`Guardando ${file.name} · ${Math.min(100, Math.round((got / file.size) * 100))} %`);
  } });
  try {
    const res = await readOk(await fetchFile(file));
    await res.body.pipeThrough(meter).pipeTo(await handle.createWritable());
    note.done(`Guardado: ${handle.name || file.name}`);
  } catch (err) { note.remove(); throw err; }
}

/** Móvil: prepara el archivo y abre la hoja de compartir del sistema (Fotos, Archivos, Drive…). */
function viaSheet(file) {
  const ctrl = new AbortController();
  let blob = null;
  const bar = h('i');
  const status = h('p', {}, `Preparando ${formatBytes(file.size)}…`);
  const close = () => { ctrl.abort(); overlay.remove(); };
  const save = h('button', { class: 'btn btn-primary', type: 'button', disabled: true, onclick: async () => {
    try {
      await navigator.share({ files: [new File([blob], file.name, { type: blob.type })] });
      close();
    } catch (err) {
      if (err.name !== 'AbortError') status.textContent = 'No se pudo abrir el menú del sistema. Usa «Descargar».';
    }
  } }, icon('share'), 'Guardar o compartir…');
  const plain = h('button', { class: 'btn', type: 'button', onclick: () => { close(); download(file); } }, icon('download'), 'Descargar');
  const box = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Guardar archivo' },
    h('h2', {}, 'Guardar archivo'), h('p', {}, file.name), h('div', { class: 'progress' }, bar), status,
    h('div', { class: 'dialog-actions save-actions' }, h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancelar'), plain, save));
  const overlay = h('div', { class: 'overlay', onmousedown: (e) => e.target === overlay && close() }, box);
  document.body.append(overlay);
  fetchFile(file, ctrl.signal).then(readOk).then((res) => readBlob(file, res, (p) => { bar.style.width = `${Math.round(p * 100)}%`; }))
    .then((b) => { blob = b; bar.style.width = '100%'; status.textContent = 'Listo. Elige dónde guardarlo.'; save.disabled = false; save.focus(); })
    .catch((err) => { if (err.name !== 'AbortError') { status.textContent = err.message; } });
}

/** Punto de entrada: elige el mejor método según el dispositivo. */
export async function saveAs(file) {
  try {
    if (!isTouch() && typeof window.showSaveFilePicker === 'function') return await viaPicker(file);
    if (isTouch() && canShare(file)) return viaSheet(file);
  } catch (err) { toastError(err); return undefined; }
  return download(file);
}
