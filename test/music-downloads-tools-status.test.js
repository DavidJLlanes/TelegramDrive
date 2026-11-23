import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createToolsStatus } from '../server/features/music-downloads/tools-status.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const slow = (ms, value, counter) => async () => { counter.n += 1; await wait(ms); return value; };

test('la primera consulta espera; las siguientes responden al instante aunque la comprobación sea lenta y haya caducado', async () => {
  const runs = { yt: { n: 0 }, sp: { n: 0 } };
  const tools = createToolsStatus({ ttlMs: 20, runner: { installed: slow(80, true, runs.yt) }, spotify: { installed: slow(80, true, runs.sp) } });
  const first = await tools.get();
  assert.deepEqual(first, { available: true, spotdlAvailable: true, spotdlError: '' });
  await wait(40); // caducado
  const t0 = Date.now();
  const second = await tools.get();
  assert.ok(Date.now() - t0 < 30, 'no espera por la nueva comprobación');
  assert.deepEqual(second, first);
  assert.equal(runs.yt.n, 2, 'pero sí la lanza en segundo plano');
  await tools.get(); await tools.get(); // varias consultas mientras se comprueba: una sola comprobación
  assert.equal(runs.yt.n, 2);
});

test('las dos herramientas se comprueban a la vez y SpotDL se ejecuta una sola vez por comprobación (diagnose incluido)', async () => {
  let spotdlRuns = 0;
  const spotify = { installed: async () => { throw new Error('no debe usarse'); }, diagnose: async () => { spotdlRuns += 1; await wait(60); return 'spotdl: command not found'; } };
  const tools = createToolsStatus({ runner: { installed: async () => { await wait(60); return true; } }, spotify });
  const t0 = Date.now();
  const status = await tools.get();
  assert.ok(Date.now() - t0 < 110, 'en paralelo, no una tras otra');
  assert.deepEqual(status, { available: true, spotdlAvailable: false, spotdlError: 'spotdl: command not found' });
  assert.equal(spotdlRuns, 1);
});

test('un fallo al comprobar se interpreta como «no instalado», no como error', async () => {
  const tools = createToolsStatus({ runner: { installed: async () => { throw new Error('boom'); } }, spotify: { installed: async () => { throw new Error('boom'); } } });
  assert.deepEqual(await tools.get(), { available: false, spotdlAvailable: false, spotdlError: '' });
});
