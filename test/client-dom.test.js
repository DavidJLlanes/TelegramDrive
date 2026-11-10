import { test } from 'node:test';
import assert from 'node:assert/strict';

class FakeNode { constructor(text) { this.text = text; this.children = []; } append(...c) { this.children.push(...c); } replaceChildren(...c) { this.children = c; } }
globalThis.Node = FakeNode;
globalThis.document = { createTextNode: (t) => new FakeNode(String(t)), createElement: () => new FakeNode() };
const { fill, append } = await import('../public/js/core/dom.js');

test('fill y append ignoran null, undefined y false (nunca pintan el texto «null»)', () => {
  const el = new FakeNode();
  fill(el, null, [undefined, false, 'a'], 0);
  assert.deepEqual(el.children.map((c) => c.text), ['a', '0']);
  append(el, [null]);
  assert.equal(el.children.length, 2);
});
