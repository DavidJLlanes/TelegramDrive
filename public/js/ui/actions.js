// Acciones sobre archivos y carpetas (renombrar, mover, papelera, descargar, compartir).
import { api } from '../core/api.js';
import { reload, refreshStats } from '../core/drive.js';
import { appState } from '../core/store.js';
import { navigate } from '../core/router.js';
import { pickFolder, promptText } from './modal.js';
import { toast, toastError } from './toast.js';
import { openFile } from '../players/viewer.js';
import { download, downloadZip } from './download.js';
import { playFolder } from '../core/playback.js';
import { audioItems } from './audio-actions.js';
import { shareItem } from './share-dialog.js';

async function guarded(fn, okMessage) {
  try {
    await fn();
    if (okMessage) toast(okMessage, { type: 'ok' });
    await reload();
    refreshStats();
  } catch (err) { toastError(err); }
}

/** Envía a la papelera con la opción de deshacer al momento. */
async function trash(label, remove) {
  try {
    const restoreBody = await remove();
    toast(`«${label}» enviado a la papelera`, { action: { label: 'Deshacer', run: () => guarded(() => api.restore(restoreBody)) } });
    await reload();
    refreshStats();
  } catch (err) { toastError(err); }
}

export function fileMenu(file, siblings) {
  return [
    { label: 'Abrir', icon: 'play', run: () => openFile(file, siblings) },
    ...(file.kind === 'audio' ? audioItems(file) : []),
    'sep',
    { label: 'Descargar', icon: 'download', run: () => download(file) },
    { label: 'Compartir enlace…', icon: 'share', run: () => shareItem({ kind: 'file', target: file.id, label: file.name }) },
    'sep',
    { label: 'Renombrar', icon: 'edit', run: async () => {
      const name = await promptText({ title: 'Renombrar archivo', label: 'Nombre', value: file.name });
      if (name && name !== file.name) guarded(() => api.renameFile(file.id, name), 'Renombrado');
    } },
    { label: 'Mover a…', icon: 'move', run: async () => {
      const target = await pickFolder({ title: `Mover "${file.name}"` });
      if (target !== null && target !== file.parent) guarded(() => api.moveFile(file.id, target), 'Movido');
    } },
    'sep',
    { label: 'Enviar a la papelera', icon: 'trash', danger: true, run: () => trash(file.name, async () => { await api.deleteFile(file.id); return { files: [file.id] }; }) },
  ];
}

export function folderMenu(folder) {
  return [
    { label: 'Abrir', icon: 'folder', run: () => navigate(folder.path) },
    { label: 'Reproducir música', icon: 'play', run: () => playFolder(folder.path) },
    { label: 'Reproducir en aleatorio', icon: 'shuffle', run: () => playFolder(folder.path, { shuffle: true }) },
    'sep',
    { label: 'Descargar como ZIP', icon: 'archive', run: () => downloadZip({ path: folder.path }) },
    { label: 'Compartir como ZIP…', icon: 'share', run: () => shareItem({ kind: 'folder', target: folder.path, label: folder.name }) },
    'sep',
    { label: 'Renombrar', icon: 'edit', run: async () => {
      const name = await promptText({ title: 'Renombrar carpeta', label: 'Nombre', value: folder.name });
      if (name && name !== folder.name) guarded(() => api.renameFolder(folder.path, name), 'Renombrada');
    } },
    { label: 'Mover a…', icon: 'move', run: async () => {
      const target = await pickFolder({ title: `Mover "${folder.name}"`, exclude: folder.path });
      if (target !== null) guarded(() => api.moveFolder(folder.path, target), 'Movida');
    } },
    'sep',
    { label: 'Enviar a la papelera', icon: 'trash', danger: true, run: () => trash(folder.name, async () => ({ folders: [(await api.deleteFolder(folder.path)).id] })) },
  ];
}

export async function createFolder() {
  const name = await promptText({ title: 'Nueva carpeta', label: 'Nombre de la carpeta', confirmLabel: 'Crear' });
  if (name) guarded(() => api.createFolder(appState.get().path, name), 'Carpeta creada');
}
