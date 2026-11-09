import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UploadQueue, isRetryable } from '../public/js/features/uploads/queue.js';
import { createFolderEnsurer } from '../public/js/features/uploads/folders.js';

const err = (status, message = 'x') => Object.assign(new Error(message), { status });
const idle = (q) => new Promise((resolve) => { q.onIdle = resolve; });
const mk = (n) => Array.from({ length: n }, (_, i) => ({ file: { name: `f${i}`, size: 1 }, rel: '', base: '/' }));

test('respeta la concurrencia máxima', async () => {
  let now = 0; let peak = 0;
  const q = new UploadQueue({ concurrency: 3, wait: async () => {}, run: async () => { now += 1; peak = Math.max(peak, now); await new Promise((r) => setTimeout(r, 5)); now -= 1; return { size: 1 }; } });
  const done = idle(q); q.add(mk(10));
  const s = await done;
  assert.equal(peak, 3);
  assert.deepEqual([s.done, s.failed, s.pending], [10, 0, 0]);
});

test('reintenta cortes de red y errores 5xx, pero no rechazos 4xx', async () => {
  const tries = {};
  const q = new UploadQueue({ retries: 2, wait: async () => {}, run: async (job) => {
    tries[job.file.name] = (tries[job.file.name] ?? 0) + 1;
    if (job.file.name === 'f0' && tries.f0 < 3) throw err(0);
    if (job.file.name === 'f1') throw err(413, 'Demasiado grande');
    if (job.file.name === 'f2') throw err(503);
    return { size: 1 };
  } });
  const done = idle(q); q.add(mk(3));
  const s = await done;
  assert.deepEqual(tries, { f0: 3, f1: 1, f2: 3 });
  assert.equal(s.done, 1);
  assert.deepEqual(s.failures.map((j) => j.file.name).sort(), ['f1', 'f2']);
});

test('retryFailed vuelve a encolar solo los fallidos', async () => {
  let fail = true;
  const q = new UploadQueue({ retries: 0, wait: async () => {}, run: async () => { if (fail) throw err(500); return { size: 1 }; } });
  let done = idle(q); q.add(mk(2));
  assert.equal((await done).failed, 2);
  fail = false; done = idle(q);
  assert.equal(q.retryFailed(), 2);
  const s = await done;
  assert.deepEqual([s.done, s.failed], [2, 0]);
});

test('isRetryable', () => {
  assert.equal(isRetryable(err(0)), true);
  assert.equal(isRetryable(err(0, 'Subida cancelada')), false);
  assert.equal(isRetryable(err(409)), false);
});

test('las carpetas intermedias se crean una sola vez aunque haya subidas en paralelo', async () => {
  const calls = [];
  const f = createFolderEnsurer(async (parent, name) => { calls.push(`${parent}|${name}`); await new Promise((r) => setTimeout(r, 5)); if (name === 'ya') throw err(409); });
  const paths = await Promise.all(['A/B/x.txt', 'A/B/y.txt', 'A/z.txt', 'ya/q.txt'].map((r) => f.ensure('/', r)));
  assert.deepEqual(paths, ['/A/B', '/A/B', '/A', '/ya']);
  assert.deepEqual(calls.sort(), ['/A|B', '/|A', '/|ya']);
});
