import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';

export function renderLogin(root, onSuccess) {
  const error = h('div', { class: 'form-error', role: 'alert' });
  const input = h('input', {
    class: 'input', type: 'password', autocomplete: 'current-password', 'aria-label': 'Contraseña', placeholder: 'Contraseña', required: true,
  });
  const button = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Entrar');
  const form = h('form', { class: 'login-card', onsubmit: async (e) => {
    e.preventDefault();
    button.disabled = true; error.textContent = '';
    try {
      await api.login(input.value);
      onSuccess();
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false; input.select();
    }
  } },
  h('div', { class: 'logo' }, icon('plane')),
  h('h1', {}, 'Telegram Drive'),
  h('p', {}, 'Tu almacenamiento personal sobre Telegram'),
  input, error, button);
  root.replaceChildren(h('div', { class: 'login-wrap' }, form));
  input.focus();
}
