// Diálogo común para asignar una imagen (carátulas de canciones y portadas de carpetas): elegir archivo, recortarlo con la proporción
// del destino (opcional: ya sale centrado) y, si procede, decidir si se sustituyen las que ya tienen imagen.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { dialog } from './modal.js';
import { createCropper } from './cropper.js';
import { toast, toastError } from './toast.js';

/** `apply(blob, replace)` hace la subida y devuelve true si todo fue bien. `replaceLabel` null = sustituir siempre. */
export function pickImage({ title, text, ratio, outWidth, replaceLabel = null, apply }) {
  const cropper = createCropper({ ratio, outWidth });
  const input = h('input', { type: 'file', accept: 'image/*', hidden: true, 'aria-label': 'Elegir imagen' });
  const label = h('span', {}, 'Elegir imagen');
  const name = h('span', { class: 'file-pick-name' }, 'Ninguna imagen elegida');
  const button = h('button', { class: 'btn', type: 'button', onclick: () => input.click() }, icon('image'), label);
  const replace = h('input', { type: 'checkbox' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (await cropper.load(file)) { name.textContent = file.name; label.textContent = 'Cambiar imagen'; }
    else toast('No se pudo abrir esa imagen (usa JPG, PNG o WebP)', { type: 'error' });
  });
  const content = h('div', { class: 'cover-pick' },
    h('p', {}, text),
    h('div', { class: 'file-pick' }, input, button, name),
    cropper.el,
    h('p', { class: 'crop-hint', hidden: true }, 'Arrastra para encuadrar. Zoom con el deslizador o pellizcando; doble clic para centrar. Si no tocas nada, se centra sola.'),
    replaceLabel && h('label', { class: 'cover-pick-replace' }, replace, h('span', {}, replaceLabel)));
  const hint = content.querySelector('.crop-hint');
  new MutationObserver(() => { hint.hidden = cropper.el.hidden; }).observe(cropper.el, { attributes: true, attributeFilter: ['hidden'] });
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
