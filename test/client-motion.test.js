import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenKey, screenDirection, screenBusy } from '../public/js/core/screen-key.js';

const files = (path, extra = {}) => ({ section: 'files', path, results: null, loading: false, ...extra });
const lib = (view, a, b) => ({ section: 'library', path: '/', results: null, lib: { view, a, b, loading: false } });

test('la dirección sigue la profundidad dentro de una sección', () => {
  assert.equal(screenDirection(files('/'), files('/Fotos')), 'forward');
  assert.equal(screenDirection(files('/Fotos/2024'), files('/Fotos')), 'back');
  assert.equal(screenDirection(files('/A'), files('/B')), 'fade');
  assert.equal(screenDirection(files('/'), lib('albums')), 'fade');
  assert.equal(screenDirection(lib('albums'), lib('albums', 'Daft Punk', 'Discovery')), 'forward');
  assert.equal(screenDirection(lib('albums'), lib('artists')), 'fade');
});

test('la clave de pantalla ignora la carga y los datos', () => {
  assert.equal(screenKey(files('/A', { loading: true })), screenKey(files('/A', { files: [1] })));
  assert.notEqual(screenKey(files('/A')), screenKey(files('/B')));
  assert.equal(screenBusy(files('/A', { loading: true })), true);
});
