// Color e icono para varias carpetas a la vez (una sola petición; el servidor actualiza cada una en Telegram).
import { api } from '../core/api.js';
import { reload } from '../core/drive.js';
import { pickColorFor, pickIconFor } from './folder-color.js';
import { toast, toastError } from './toast.js';

const plural = (n) => `${n} ${n === 1 ? 'carpeta' : 'carpetas'}`;

async function apply(folders, style, done) {
  try {
    const { updated, failed } = await api.setFoldersStyle(folders.map((f) => f.path), style);
    await reload();
    toast(failed.length ? `${done} en ${plural(updated)}; ${failed.length} con error: ${failed[0].error}` : `${done} en ${plural(updated)}`, { type: failed.length ? 'error' : 'ok' });
    return true;
  } catch (err) { toastError(err); return false; }
}

export async function colorFolders(folders) {
  const color = await pickColorFor(folders);
  return color === null ? false : apply(folders, { color }, color === -1 ? 'Color automático' : 'Color cambiado');
}
export async function iconFolders(folders) {
  const icon = await pickIconFor(folders);
  return icon === null ? false : apply(folders, { icon }, icon === 'none' ? 'Icono quitado' : 'Icono cambiado');
}
export const removeIconFolders = (folders) => apply(folders, { icon: 'none' }, 'Icono quitado');
export const defaultIconFolders = (folders) => apply(folders, { icon: '' }, 'Icono normal puesto');
