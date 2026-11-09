import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

/** Pareja de botones "Reproducir" y "Aleatorio". `run({ shuffle })` lanza la reproducción. */
export const playButtons = (run) => [
  h('button', { class: 'btn btn-primary', onclick: () => run({ shuffle: false }) }, icon('play'), 'Reproducir'),
  h('button', { class: 'btn', onclick: () => run({ shuffle: true }) }, icon('shuffle'), 'Aleatorio'),
];
