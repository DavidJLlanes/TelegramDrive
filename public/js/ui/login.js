import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { tint } from '../core/color.js';

const collage = () => h('div', { class: 'collage', 'aria-hidden': 'true' },
  tint(h('div', { class: 'a' }, icon('music')), 'Música'),
  tint(h('div', { class: 'b' }, icon('video')), 'Vídeos'),
  tint(h('div', { class: 'c' }, icon('image')), 'Fotos'),
  tint(h('div', { class: 'd' }, icon('folder')), 'Documentos'));

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
  h('h1', {}, 'Entrar'),
  h('p', {}, 'Escribe la contraseña de tu unidad.'),
  input, error, button);

  root.replaceChildren(h('div', { class: 'login' },
    h('section', { class: 'login-art' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, icon('plane')), 'Telegram Drive'),
      h('h2', {}, 'Tu música, vídeos y fotos, en tu Telegram.'),
      collage()),
    h('section', { class: 'login-form-side' }, form)));
  input.focus();
}
