// Papelera: lo eliminado se puede restaurar durante 30 días; después se borra definitivamente (también de Telegram).
import { h, clear } from '../core/dom.js';
import { icon, kindIcon } from '../core/icons.js';
import { api } from '../core/api.js';
import { appState } from '../core/store.js';
import { formatBytes } from '../core/format.js';
import { loadTrash } from '../core/trash.js';
import { refreshStats } from '../core/drive.js';
import { confirmDialog } from './modal.js';
import { toast, toastError } from './toast.js';

const DAY = 86_400_000;
const daysLeft = (ts, days) => Math.max(0, Math.ceil((ts + days * DAY - Date.now()) / DAY));

async function act(fn, message) {
  try { await fn(); if (message) toast(message, { type: 'ok' }); } catch (err) { toastError(err); }
  await loadTrash();
  refreshStats();
}

function row({ name, sub, iconName, left, restore, destroy }) {
  return h('div', { class: 'trash-row' },
    h('span', { class: 'trash-icon' }, icon(iconName)),
    h('span', { class: 'trash-main' }, h('span', { class: 'trash-name' }, name), h('span', { class: 'trash-sub' }, sub)),
    h('span', { class: `trash-left${left <= 3 ? ' soon' : ''}` }, left === 0 ? 'Se borra hoy' : `${left} ${left === 1 ? 'día' : 'días'}`),
    h('button', { class: 'btn', type: 'button', onclick: restore }, icon('restore'), h('span', { class: 'hide-mobile' }, 'Restaurar')),
    h('button', { class: 'btn btn-icon btn-ghost', type: 'button', 'aria-label': `Eliminar definitivamente ${name}`, onclick: destroy }, icon('trash')));
}

export function emptyTrash() {
  return confirmDialog({
    title: 'Vaciar la papelera', message: 'Todo lo que hay en la papelera se borrará definitivamente, también de Telegram. No se puede deshacer.', confirmLabel: 'Vaciar',
  }).then((ok) => ok && act(() => api.emptyTrash(), 'Papelera vaciada'));
}

export function renderTrash(container) {
  const { trash } = appState.get();
  clear(container);
  if (trash.loading) { container.append(h('div', { class: 'trash-list' }, Array.from({ length: 4 }, () => h('div', { class: 'skeleton row' })))); return; }
  if (!trash.files.length && !trash.folders.length) {
    container.append(h('div', { class: 'empty' }, icon('trash'), h('strong', {}, 'La papelera está vacía'), h('span', {}, `Lo que elimines aparecerá aquí durante ${trash.days} días.`)));
    return;
  }
  const forever = (label, body) => async () => {
    const ok = await confirmDialog({ title: 'Eliminar definitivamente', message: `«${label}» se borrará también de Telegram. No se puede deshacer.` });
    if (ok) act(() => api.destroy(body), 'Eliminado definitivamente');
  };
  container.append(h('div', { class: 'trash-list' },
    trash.folders.map((f) => row({
      name: f.name, iconName: 'folder', left: daysLeft(f.trashed, trash.days),
      sub: `Carpeta · ${f.files} archivos · estaba en ${f.from}`,
      restore: () => act(() => api.restore({ folders: [f.id] }), 'Carpeta restaurada'), destroy: forever(f.name, { folders: [f.id] }),
    })),
    trash.files.map((f) => row({
      name: f.name, iconName: kindIcon(f.kind), left: daysLeft(f.trashed, trash.days),
      sub: `${formatBytes(f.size)} · estaba en ${f.parent}`,
      restore: () => act(() => api.restore({ files: [f.id] }), 'Archivo restaurado'), destroy: forever(f.name, { files: [f.id] }),
    }))));
}
