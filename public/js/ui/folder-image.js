// Imagen de portada de carpeta (una o varias): se recorta con la proporción exacta de la tarjeta entera (cuerpo y pestaña). El icono y el color no cambian.
import { api } from '../core/api.js';
import { reload } from '../core/drive.js';
import { pickImage } from './image-dialog.js';
import { toast, toastError } from './toast.js';

const plural = (n) => `${n} ${n === 1 ? 'carpeta' : 'carpetas'}`;

export async function chooseFolderImage(folders) {
  if (!folders.length) return false;
  const single = folders.length === 1;
  const withImage = folders.filter((f) => f.image).length;
  return pickImage({
    title: single ? `Imagen de «${folders[0].name}»` : 'Asignar imagen a carpetas', ratio: 900 / 625, outWidth: 640,
    text: single ? 'Elige la imagen de fondo de la carpeta. Su icono y su color se mantienen.' : `Elige una imagen: será el fondo de ${plural(folders.length)}.`,
    replaceLabel: single ? null : (withImage ? `Sustituir también las que ya tienen imagen (${withImage})` : 'Sustituir las que ya tengan imagen'),
    apply: async (blob, replace) => {
      const { updated, skipped } = await api.setFolderImages(folders.map((f) => f.path), new File([blob], 'carpeta.jpg', { type: 'image/jpeg' }), replace);
      await reload();
      toast(updated ? `Imagen puesta en ${plural(updated)}${skipped ? ` (${skipped} ya tenían una)` : ''}` : 'No se cambió ninguna: todas tenían ya imagen', { type: updated ? 'ok' : undefined });
      return true;
    },
  });
}

export async function removeFolderImages(folders) {
  try {
    const { removed } = await api.removeFolderImages(folders.map((f) => f.path));
    await reload();
    toast(removed ? `Imagen quitada de ${plural(removed)}` : 'Esas carpetas no tenían imagen');
  } catch (err) { toastError(err); }
}
