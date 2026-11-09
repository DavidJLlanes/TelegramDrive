import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createKeymap, describeKey } from '../public/js/features/shortcuts/keymap.js';

const key = (k, extra = {}) => ({ key: k, ...extra });

test('describeKey normaliza modificadores y espacio', () => {
  assert.equal(describeKey(key('A', { ctrlKey: true })), 'ctrl+a');
  assert.equal(describeKey(key(' ')), 'space');
  assert.equal(describeKey(key('ArrowRight', { shiftKey: true })), 'shift+arrowright');
  assert.equal(describeKey(key('?', { shiftKey: true })), '?');
});

test('tecla suelta y condición when', () => {
  const km = createKeymap(); const hits = []; let on = false;
  km.bind({ keys: 'u', label: 'subir', run: () => hits.push('u'), when: () => on });
  assert.equal(km.handle(key('u')), false);
  on = true;
  assert.equal(km.handle(key('u')), true);
  assert.deepEqual(hits, ['u']);
});

test('secuencias: g h dentro de plazo; caducan; una tecla distinta las cancela', () => {
  let t = 0; const hits = [];
  const km = createKeymap(() => t);
  km.bind({ keys: 'g h', label: 'inicio', run: () => hits.push('home') });
  km.bind({ keys: 'h', label: 'otra', run: () => hits.push('h') });
  km.handle(key('g')); t = 500; km.handle(key('h'));
  assert.deepEqual(hits, ['home']);
  km.handle(key('g')); t = 5000; km.handle(key('h'));
  assert.deepEqual(hits, ['home', 'h']);
  km.handle(key('g')); km.handle(key('x')); km.handle(key('h'));
  assert.deepEqual(hits, ['home', 'h', 'h']);
});

test('list agrupa para la ayuda', () => {
  const km = createKeymap();
  km.bind({ keys: 'g h', label: 'Inicio', group: 'Nav', run() {} });
  assert.deepEqual(km.list(), [{ keys: 'g h', label: 'Inicio', group: 'Nav' }]);
});
