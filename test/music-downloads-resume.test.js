import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectResponse } from '../server/features/music-downloads/direct-http.js';
import { transferPaths, readTransfer, writeTransfer, clearTransfer } from '../server/features/music-downloads/direct-transfer-state.js';

const response = (statusCode, headers = {}) => ({ statusCode, headers });
const limit = 1024 ** 3;

test('valida respuesta HTTP Range y longitud total', () => {
  const old = { total: 1000, etag: '"v1"' };
  const ok = inspectResponse(response(206, {
    'content-range': 'bytes 400-999/1000', 'content-length': '600', etag: '"v1"',
  }), 400, old, limit);
  assert.equal(ok.total, 1000);
  assert.deepEqual(inspectResponse(response(200, {}), 400, old, limit), { restart: true });
  assert.throws(() => inspectResponse(response(206, { 'content-range': 'bytes 0-999/1000' }), 400, old, limit));
  assert.throws(() => inspectResponse(response(206, {
    'content-range': 'bytes 400-999/1000', etag: '"v2"',
  }), 400, old, limit));
  assert.throws(() => inspectResponse(response(206, {
    'content-range': 'bytes 400-999/1000', etag: '"v1"', 'content-length': '10',
  }), 400, old, limit));
  assert.throws(() => inspectResponse(response(302, { location: 'https://other.org/file.zip' }), 0, null, limit));
  assert.throws(() => inspectResponse(response(200, { 'content-length': String(limit + 1) }), 0, null, limit));
});

test('persistencia de parciales y limpieza controlada', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tgd-resume-'));
  const paths = transferPaths(root, 'b4dfe001-0000-4000-8000-000000000001');
  try {
    await fs.mkdir(paths.dir, { recursive: true });
    await fs.writeFile(paths.partial, Buffer.alloc(2048));
    await writeTransfer(paths, { url: 'https://example.org/archive.zip', etag: '"v1"', total: 4096 });
    const saved = await readTransfer(paths);
    assert.equal(saved.bytes, 2048);
    assert.equal(saved.total, 4096);
    assert.throws(() => transferPaths(root, '../unsafe'));
    await clearTransfer(paths);
    assert.equal(await readTransfer(paths), null);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
