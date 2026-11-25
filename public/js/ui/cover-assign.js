// «Cambiar carátula»: una misma imagen para una pista o para toda la selección, con opción de sustituir las que ya tienen.
import { h } from '../core/dom.js';
import { api, bumpCovers } from '../core/api.js';
import { reload } from '../core/drive.js';
import { dialog } from './modal.js';
import { toast, toastError } from './toast.js';

const MAX_MB = 8;

export async function chooseCover(files) {
  const tracks = files.filter((f) => f.kind === 'audio');
  if (!tracks.length) { toast('Selecciona alguna canción para cambiar su carátula'); return false; }
  const single = tracks.length === 1;
  const withCover = tracks.filter((f) => f.thumb).length;
  const input = h('input', { class: 'input', type: 'file', accept: 'image/*', 'aria-label': 'Imagen de la carátula' });
  const preview = h('img', { class: 'cover-pick-preview', alt: 'Vista previa', hidden: true });
  const replace = h('input', { type: 'checkbox', checked: single });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (preview.src) URL.revokeObjectURL(preview.src);
    preview.hidden = !file;
    if (file) preview.src = URL.createObjectURL(file);
  });
  const content = h('div', { class: 'cover-pick' },
    h('p', {}, single ? 'Elige la imagen que será la carátula de esta canción.' : `Elige una imagen: será la carátula de ${tracks.length} canciones.`),
    input, preview,
    !single && h('label', { class: 'cover-pick-replace' }, replace,
      h('span', {}, withCover ? `Sustituir también las que ya tienen carátula (${withCover})` : 'Sustituir las que ya tengan carátula')));
  return dialog({
    title: single ? 'Cambiar carátula' : 'Asignar carátula', content, confirmLabel: 'Aplicar',
    onConfirm: async () => {
      const image = input.files?.[0];
      if (!image) { toast('Elige primero una imagen'); return undefined; }
      if (image.size > MAX_MB * 1048576) { toast(`La imagen pesa más de ${MAX_MB} MB`, { type: 'error' }); return undefined; }
      try {
        const { updated, skipped } = await api.assignCover(tracks.map((f) => f.id), image, replace.checked);
        bumpCovers(); await reload();
        toast(updated ? `Carátula cambiada en ${updated} ${updated === 1 ? 'canción' : 'canciones'}${skipped ? ` (${skipped} ya tenían una)` : ''}` : 'No se cambió ninguna: todas tenían ya carátula', { type: updated ? 'ok' : undefined });
        return true;
      } catch (err) { toastError(err); return undefined; }
    },
  });
}
