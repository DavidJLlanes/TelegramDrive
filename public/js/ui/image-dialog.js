// Diálogo común para asignar una imagen (carátulas de canciones y portadas de carpetas): elegir archivo, recortarlo con la proporción
// del destino (opcional: ya sale centrado) y, si procede, decidir si se sustituyen las que ya tienen imagen.
import { h } from '../core/dom.js';
import { dialog } from './modal.js';
import { createCropper } from './cropper.js';
import { toast, toastError } from './toast.js';

/** `apply(blob, replace)` hace la subida y devuelve true si todo fue bien. `replaceLabel` null = sustituir siempre. */
export function pickImage({ title, text, ratio, outWidth, replaceLabel = null, apply }) {
  const cropper = createCropper({ ratio, outWidth });
  const input = h('input', { class: 'input', type: 'file', accept: 'image/*', 'aria-label': 'Elegir imagen' });
  const replace = h('input', { type: 'checkbox' });
  input.addEventListener('change', async () => {
    if (!(await cropper.load(input.files?.[0])) && input.files?.length) toast('No se pudo abrir esa imagen (usa JPG, PNG o WebP)', { type: 'error' });
  });
  const content = h('div', { class: 'cover-pick' },
    h('p', {}, text), input, cropper.el,
    cropper.el && h('p', { class: 'crop-hint' }, 'Arrastra para encuadrar y usa el zoom. Si no tocas nada, se centra sola.'),
    replaceLabel && h('label', { class: 'cover-pick-replace' }, replace, h('span', {}, replaceLabel)));
  return dialog({
    title, content, confirmLabel: 'Aplicar',
    onConfirm: async () => {
      if (!cropper.ready) { toast('Elige primero una imagen'); return undefined; }
      try {
        const blob = await cropper.toBlob();
        return (await apply(blob, replaceLabel ? replace.checked : true)) ? true : undefined;
      } catch (err) { toastError(err); return undefined; }
    },
  });
}
