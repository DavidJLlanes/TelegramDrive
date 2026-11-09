import { h, clear } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { api, uploadFile } from '../core/api.js';
import { appState } from '../core/store.js';
import { reload, refreshStats } from '../core/drive.js';
import { formatBytes } from '../core/format.js';
import { toast } from './toast.js';

const queue = [];
let running = false;
let panel = null;
let list = null;
const createdFolders = new Set();

function ensurePanel() {
  if (panel) return;
  list = h('div');
  panel = h('aside', { class: 'upload-panel', 'aria-label': 'Subidas' },
    h('div', { class: 'upload-head' }, h('span', {}, 'Subidas'),
      h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Cerrar', onclick: () => { if (!running) { panel.remove(); panel = null; } } }, icon('close'))),
    list);
  document.body.append(panel);
}

function makeRow(job) {
  job.bar = h('i');
  job.state = h('span', { class: 'state' }, 'En cola');
  job.row = h('div', { class: 'upload-row' },
    h('div', { class: 'name', title: job.file.name }, job.file.name),
    h('div', { class: 'progress' }, job.bar), job.state);
  list.append(job.row);
}

/** Crea (si hace falta) las carpetas intermedias de una subida de carpeta. */
async function ensureFolders(base, relative) {
  const dirs = relative.split('/').slice(0, -1);
  let parent = base;
  for (const dir of dirs) {
    const key = `${parent}\u0000${dir}`;
    if (!createdFolders.has(key)) {
      try { await api.createFolder(parent, dir); } catch (e) { if (e.status !== 409) throw e; }
      createdFolders.add(key);
    }
    parent = parent === '/' ? `/${dir}` : `${parent}/${dir}`;
  }
  return parent;
}

async function runJob(job) {
  job.state.textContent = 'Subiendo…';
  try {
    const rel = job.file.webkitRelativePath;
    const target = rel ? await ensureFolders(job.base, rel) : job.base;
    const send = () => uploadFile(job.file, target, (p) => {
      job.bar.style.width = `${Math.round(p * 100)}%`;
      if (p >= 1) job.state.textContent = 'Enviando a Telegram…';
    });
    let result;
    try { result = await send(); } catch (e) {
      if (e.status !== 0 || e.message === 'Subida cancelada') throw e;
      job.state.textContent = 'Reintentando…';
      await new Promise((r) => setTimeout(r, 1500));
      result = await send();
    }
    job.bar.style.width = '100%';
    job.row.classList.add('done');
    job.state.textContent = `Listo · ${formatBytes(result.size)}`;
  } catch (err) {
    job.row.classList.add('error');
    job.state.textContent = err.message;
    job.state.title = err.message;
    console.warn('[upload]', job.file.webkitRelativePath || job.file.name, err);
  }
}

async function drain() {
  running = true;
  let ok = 0;
  while (queue.length) {
    const job = queue.shift();
    await runJob(job);
    if (job.row.classList.contains('done')) ok += 1;
  }
  running = false;
  createdFolders.clear();
  refreshStats();
  if (ok) { reload(); toast(`${ok} archivo${ok > 1 ? 's' : ''} subido${ok > 1 ? 's' : ''}`, { type: 'ok' }); }
}

export function enqueueUploads(files) {
  const { path: base, section } = appState.get();
  if (section !== 'files') { toast('Abre una carpeta para subir archivos'); return; }
  const items = [...files].filter((f) => f.size > 0 || f.name);
  if (!items.length) return;
  ensurePanel();
  items.forEach((file) => { const job = { file, base }; makeRow(job); queue.push(job); });
  if (!running) drain();
}

export function pickFiles({ directory = false } = {}) {
  if (appState.get().section !== 'files') { toast('Abre una carpeta para subir archivos'); return; }
  const input = h('input', { type: 'file', multiple: true, hidden: true });
  if (directory) input.setAttribute('webkitdirectory', '');
  input.addEventListener('change', () => { enqueueUploads(input.files); input.remove(); });
  document.body.append(input);
  input.click();
}

/** Arrastrar y soltar sobre toda la ventana. */
export function enableDropZone() {
  let depth = 0;
  let hint = null;
  const hide = () => { depth = 0; hint?.remove(); hint = null; };
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    depth += 1;
    hint ??= document.body.appendChild(h('div', { class: 'drop-hint' }, 'Suelta para subir a esta carpeta'));
  });
  window.addEventListener('dragleave', () => { depth -= 1; if (depth <= 0) hide(); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => { e.preventDefault(); hide(); enqueueUploads(e.dataTransfer.files); });
}
