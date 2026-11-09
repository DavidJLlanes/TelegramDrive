import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';

/** Diálogo modal genérico: devuelve una promesa con el valor confirmado o null si se cancela. */
export function dialog({ title, content, confirmLabel = 'Aceptar', danger = false, hideCancel = false, onConfirm }) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const close = (value) => { overlay.remove(); previous?.focus?.(); resolve(value); };
    const ok = h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'submit' }, confirmLabel);
    const form = h('form', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title,
      onsubmit: async (e) => {
        e.preventDefault();
        const value = onConfirm ? await onConfirm() : true;
        if (value !== undefined) close(value);
      } },
    h('h2', {}, title), content,
    h('div', { class: 'dialog-actions' },
      !hideCancel && h('button', { class: 'btn', type: 'button', onclick: () => close(null) }, 'Cancelar'), ok));
    const overlay = h('div', { class: 'overlay', onmousedown: (e) => e.target === overlay && close(null) }, form);
    overlay.addEventListener('keydown', (e) => e.key === 'Escape' && close(null));
    document.body.append(overlay);
    (form.querySelector('input') ?? ok).focus();
  });
}

export function promptText({ title, label, value = '', confirmLabel = 'Guardar' }) {
  const input = h('input', { class: 'input', type: 'text', value, 'aria-label': label, maxlength: 120, autocomplete: 'off' });
  const p = dialog({
    title, content: input, confirmLabel,
    onConfirm: () => (input.value.trim() ? input.value.trim() : undefined),
  });
  input.select();
  return p;
}

export const confirmDialog = ({ title, message, confirmLabel = 'Eliminar', danger = true }) =>
  dialog({ title, content: h('p', {}, message), confirmLabel, danger });

/** Selector de carpeta destino. `exclude`: ruta que no se puede elegir (ni sus hijas). */
export async function pickFolder({ title, exclude = null }) {
  const { folders } = await api.folders();
  let selected = null;
  const options = ['/', ...folders]
    .filter((p) => !exclude || !(p === exclude || p.startsWith(`${exclude}/`)))
    .map((path) => {
      const depth = path === '/' ? 0 : path.split('/').length - 1;
      const btn = h('button', {
        type: 'button', class: 'folder-option', role: 'option', 'aria-selected': 'false',
        onclick: () => {
          selected = path;
          options.forEach((o) => o.setAttribute('aria-selected', String(o === btn)));
        },
      }, icon(path === '/' ? 'home' : 'folder'), h('span', {}, path === '/' ? 'Inicio' : path.split('/').pop()));
      btn.style.paddingLeft = `${12 + depth * 16}px`;
      return btn;
    });
  return dialog({
    title, confirmLabel: 'Mover aquí',
    content: h('div', { class: 'folder-picker', role: 'listbox' }, options),
    onConfirm: () => selected ?? undefined,
  });
}
