// «Cambiar carátula»: una misma imagen (recortada en cuadrado) para una pista o para toda la selección.
import { api, bumpCovers } from '../core/api.js';
import { reload } from '../core/drive.js';
import { pickImage } from './image-dialog.js';
import { toast } from './toast.js';

const plural = (n) => `${n} ${n === 1 ? 'canción' : 'canciones'}`;

export async function chooseCover(files) {
  const tracks = files.filter((f) => f.kind === 'audio');
  if (!tracks.length) { toast('Selecciona alguna canción para cambiar su carátula'); return false; }
  const single = tracks.length === 1;
  const withCover = tracks.filter((f) => f.thumb).length;
  return pickImage({
    title: single ? 'Cambiar carátula' : 'Asignar carátula', ratio: 1, outWidth: 600,
    text: single ? 'Elige la imagen que será la carátula de esta canción.' : `Elige una imagen: será la carátula de ${plural(tracks.length)}.`,
    replaceLabel: single ? null : (withCover ? `Sustituir también las que ya tienen carátula (${withCover})` : 'Sustituir las que ya tengan carátula'),
    apply: async (blob, replace) => {
      const image = new File([blob], 'portada.jpg', { type: 'image/jpeg' });
      const { updated, skipped } = await api.assignCover(tracks.map((f) => f.id), image, replace);
      bumpCovers(); await reload();
      toast(updated ? `Carátula cambiada en ${plural(updated)}${skipped ? ` (${skipped} ya tenían una)` : ''}` : 'No se cambió ninguna: todas tenían ya carátula', { type: updated ? 'ok' : undefined });
      return true;
    },
  });
}
