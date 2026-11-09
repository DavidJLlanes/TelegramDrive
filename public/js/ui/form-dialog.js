import { h } from '../core/dom.js';
import { dialog } from './modal.js';

/**
 * Diálogo con varios campos. fields: [{ name, label, value, type?, maxlength?, placeholder? }].
 * Devuelve { campo: texto } o null si se cancela.
 */
export function formDialog({ title, fields, confirmLabel = 'Guardar' }) {
  const inputs = fields.map((f) => h('input', {
    class: 'input', type: f.type ?? 'text', name: f.name, value: f.value ?? '', placeholder: f.placeholder ?? '',
    maxlength: f.maxlength ?? 80, min: f.type === 'number' ? 0 : null, autocomplete: 'off',
  }));
  const rows = fields.map((f, i) => h('label', { class: 'field' }, h('span', {}, f.label), inputs[i]));
  return dialog({
    title, confirmLabel, content: h('div', { class: 'fields' }, rows),
    onConfirm: () => Object.fromEntries(fields.map((f, i) => [f.name, inputs[i].value.trim()])),
  });
}
