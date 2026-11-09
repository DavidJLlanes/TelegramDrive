// Arrastrar archivos y carpetas (o la selección) sobre una carpeta para moverlos.
import { api } from '../../core/api.js';
import { appState } from '../../core/store.js';
import { reload, refreshStats } from '../../core/drive.js';
import { addCardEnhancer } from '../../core/explorer-ext.js';
import { toast, toastError } from '../../ui/toast.js';
import { MIME, dragPayload, canDrop } from './payload.js';

let current = null; // lo que se está arrastrando ahora (dataTransfer no deja leer el contenido en dragover)

async function move(payload, parent) {
  try {
    const r = await api.bulk({ action: 'move', ...payload, parent });
    const label = parent === '/' ? 'Inicio' : parent.split('/').pop();
    toast(r.failed.length ? `${r.done} movidos; ${r.failed.length} con error: ${r.failed[0].error}` : `${r.done} ${r.done === 1 ? 'elemento movido' : 'elementos movidos'} a «${label}»`, { type: r.failed.length ? 'error' : 'ok' });
  } catch (err) { toastError(err); }
  appState.set({ selected: [] });
  await reload();
  refreshStats();
}

function makeDraggable(el, key) {
  el.draggable = true;
  el.addEventListener('dragstart', (e) => {
    current = dragPayload(appState.get().selected, key);
    e.dataTransfer.setData(MIME, JSON.stringify(current));
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => { current = null; el.classList.remove('dragging'); document.querySelectorAll('.drop-target').forEach((n) => n.classList.remove('drop-target')); });
}

function makeTarget(el, path) {
  const accepts = () => current && canDrop(current, path);
  el.addEventListener('dragover', (e) => { if (accepts()) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drop-target'); } });
  el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
  el.addEventListener('drop', (e) => {
    if (!accepts()) return;
    e.preventDefault(); e.stopPropagation();
    el.classList.remove('drop-target');
    const payload = current; current = null;
    move(payload, path);
  });
}

addCardEnhancer((el, item, kind) => {
  if (kind === 'file') { makeDraggable(el, `f:${item.id}`); return; }
  makeDraggable(el, `d:${item.path}`);
  makeTarget(el, item.path);
});
