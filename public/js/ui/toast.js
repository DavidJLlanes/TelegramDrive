import { h, $ } from '../core/dom.js';

export function toast(message, { type = 'info', action, timeout = 4200 } = {}) {
  const root = $('#toasts');
  const el = h('div', { class: `toast ${type}`, role: type === 'error' ? 'alert' : 'status' }, h('span', {}, message));
  const remove = () => el.remove();
  if (action) {
    el.append(h('button', { class: 'btn', onclick: () => { action.run(); remove(); } }, action.label));
    timeout = 12000;
  }
  root.append(el);
  setTimeout(remove, timeout);
}
export const toastError = (err) => toast(err?.message || 'Ha ocurrido un error', { type: 'error' });
