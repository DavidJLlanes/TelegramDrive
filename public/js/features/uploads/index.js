// Subidas: cola paralela con reintentos, detección de duplicados, carpetas y arrastrar y soltar.
import { h } from '../../core/dom.js';
import { api, uploadFile } from '../../core/api.js';
import { appState } from '../../core/store.js';
import { reload, refreshStats } from '../../core/drive.js';
import { toast } from '../../ui/toast.js';
import { UploadQueue } from './queue.js';
import { createFolderEnsurer } from './folders.js';
import { findDuplicates, resolveDuplicates } from './duplicates.js';
import { createPanel } from './panel.js';
import { scanDrop } from './scan.js';

const folders = createFolderEnsurer((parent, name) => api.createFolder(parent, name));
const panel = createPanel({ running: () => queue.running, retryFailed: () => queue.retryFailed() });
const queue = new UploadQueue({
  concurrency: 3,
  run: async (job, onProgress) => {
    // Tras un corte puede que el servidor sí llegara a guardar el archivo: se comprueba antes de reintentar para no duplicarlo.
    if (job.attempt > 0 && (await findDuplicates(job.base, [{ file: job.file, rel: job.rel }])).same.length) return { size: job.file.size };
    return uploadFile(job.file, job.rel ? await folders.ensure(job.base, job.rel) : job.base, onProgress);
  },
  onChange: (jobs) => panel.update(jobs),
  onIdle: ({ done, failed }) => {
    folders.clear();
    refreshStats();
    if (done) reload();
    panel.finish({ done, failed });
    if (done && !failed) {
      toast(`${done === 1 ? 'Archivo subido' : `${done} archivos subidos`} correctamente`, { type: 'ok' });
      panel.closeLater(); // el panel se cierra solo; si hubo errores se queda para poder reintentar
    }
  },
});

/** Sube `entries` ({ file, rel }) a la carpeta `base` (el destino se elige antes, p. ej. al compartir desde otra aplicación). */
export async function uploadTo(entries, base) {
  await enqueue(entries, base);
}

async function enqueueEntries(entries) {
  const { path: base, section } = appState.get();
  if (section !== 'files') { toast('Abre una carpeta para subir archivos'); return; }
  await enqueue(entries, base);
}

async function enqueue(entries, base) {
  const items = entries.filter((e) => e.file.size > 0);
  if (entries.length > items.length) toast(`${entries.length - items.length} archivo(s) vacío(s) omitido(s): Telegram no admite archivos de 0 bytes`);
  if (!items.length) return;
  const chosen = await resolveDuplicates(base, items);
  if (!chosen) return;
  if (!chosen.length) { toast('Todo lo que elegiste ya estaba en la carpeta'); return; }
  if (!queue.running) { queue.reset(); panel.clearFoot(); }
  queue.add(chosen.map(({ file, rel }) => ({ file, rel, base })));
}

export const enqueueUploads = (files) => enqueueEntries([...files].map((file) => ({ file, rel: file.webkitRelativePath || '' })));

export function pickFiles({ directory = false } = {}) {
  if (appState.get().section !== 'files') { toast('Abre una carpeta para subir archivos'); return; }
  const input = h('input', { type: 'file', multiple: true, hidden: true });
  if (directory) input.setAttribute('webkitdirectory', '');
  input.addEventListener('change', () => { enqueueUploads(input.files); input.remove(); });
  document.body.append(input);
  input.click();
}

/** Arrastrar y soltar sobre toda la ventana (solo si lo arrastrado son archivos del sistema).
 *  El aviso se quita solo: el navegador no avisa al cancelar un arrastre externo (Esc, salir de la ventana, soltar fuera), así que
 *  se oculta si dejan de llegar `dragover` (se emiten sin parar mientras se arrastra), y también con Esc, un clic o toque, o al perder el foco. */
export function enableDropZone() {
  let hint = null; let timer = 0;
  const hide = () => { clearTimeout(timer); hint?.remove(); hint = null; };
  const isFiles = (e) => e.dataTransfer?.types?.includes('Files');
  const keepAlive = () => { clearTimeout(timer); timer = setTimeout(hide, 700); };
  const show = () => { hint ??= document.body.appendChild(h('div', { class: 'drop-hint' }, 'Suelta para subir a esta carpeta')); keepAlive(); };
  window.addEventListener('dragenter', (e) => { if (isFiles(e)) show(); });
  window.addEventListener('dragover', (e) => { e.preventDefault(); if (isFiles(e)) show(); });
  window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) keepAlive(); }); // salió de la ventana
  window.addEventListener('dragend', hide);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  for (const ev of ['pointerdown', 'touchstart', 'blur']) window.addEventListener(ev, hide, { passive: true });
  document.addEventListener('visibilitychange', hide);
  window.addEventListener('drop', (e) => {
    e.preventDefault(); hide();
    if (!isFiles(e)) return;
    scanDrop(e.dataTransfer).then(enqueueEntries).catch(() => toast('No se pudo leer lo que soltaste', { type: 'error' }));
  });
}
