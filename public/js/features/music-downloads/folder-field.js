import { h } from '../../core/dom.js';

/** Campo opcional: si se rellena, la descarga va a Descargas de Internet / <nombre>. */
export function folderField() {
  const control = h('input', { class: 'input', type: 'text', maxlength: 80, autocomplete: 'off',
    placeholder: 'Vacío = organización automática' });
  return {
    control,
    element: h('label', { class: 'md-field' }, h('span', {}, 'Nueva carpeta en Descargas de Internet (opcional)'), control),
    value: () => control.value.trim(),
  };
}
