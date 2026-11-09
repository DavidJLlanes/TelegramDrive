// Acciones sobre archivos y carpetas (renombrar, mover, borrar, descargar).
import { api } from '../core/api.js';
import { reload, refreshStats } from '../core/drive.js';
import { appState } from '../core/store.js';
import { navigate } from '../core/router.js';
import { confirmDialog, pickFolder, promptText } from './modal.js';
import { toast, toastError } from './toast.js';
import { openFile } from '../players/viewer.js';
import { download } from './download.js';
import { playFolder } from '../core/playback.js';

async function guarded(fn, okMessage) {
  try {
    await fn();
    if (okMessage) toast(okMessage, { type: 'ok' });
    await reload();
    refreshStats();
  } catch (err) { toastError(err); }
}

export function fileMenu(file, siblings) {
  return [
    { label: 'Abrir', icon: 'play', run: () => openFile(file, siblings) },
    { label: 'Descargar', icon: 'download', run: () => download(file) },
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
    { label: 'Eliminar', icon: 'trash', danger: true, run: async () => {
      const ok = await confirmDialog({ title: 'Eliminar archivo', message: `"${file.name}" se borrará también de Telegram.` });
      if (ok) guarded(() => api.deleteFile(file.id), 'Archivo eliminado');
    } },
  ];
}

export function folderMenu(folder) {
  return [
    { label: 'Abrir', icon: 'folder', run: () => navigate(folder.path) },
    { label: 'Reproducir música', icon: 'play', run: () => playFolder(folder.path) },
    { label: 'Reproducir en aleatorio', icon: 'shuffle', run: () => playFolder(folder.path, { shuffle: true }) },
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
    { label: 'Eliminar', icon: 'trash', danger: true, run: async () => {
      const ok = await confirmDialog({ title: 'Eliminar carpeta', message: `Se borrará "${folder.name}" con todo su contenido, también en Telegram.` });
      if (ok) guarded(() => api.deleteFolder(folder.path), 'Carpeta eliminada');
    } },
  ];
}

export async function createFolder() {
  const name = await promptText({ title: 'Nueva carpeta', label: 'Nombre de la carpeta', confirmLabel: 'Crear' });
  if (name) guarded(() => api.createFolder(appState.get().path, name), 'Carpeta creada');
}
