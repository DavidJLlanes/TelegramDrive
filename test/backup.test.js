import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHarness } from './helpers/harness.js';
import { encrypt, decrypt } from '../server/features/backup/cipher.js';
import { pack, unpack } from '../server/features/backup/container.js';
import { createService } from '../server/features/backup/service.js';

let h; let call;
before(async () => { h = await makeHarness(); call = h.call; await h.login(); });
after(() => h.close());

test('el cifrado devuelve lo cifrado, falla con otra frase y detecta manipulaciones', () => {
  const data = Buffer.from('datos secretos '.repeat(100));
  const blob = encrypt(data, 'una frase larga y correcta');
  assert.ok(!blob.includes('secretos'));
  assert.deepEqual(decrypt(blob, 'una frase larga y correcta'), data);
  assert.throws(() => decrypt(blob, 'otra frase distinta!!'), /Frase incorrecta/);
  const tampered = Buffer.from(blob); tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decrypt(tampered, 'una frase larga y correcta'), /Frase incorrecta o copia dañada/);
  assert.throws(() => decrypt(Buffer.from('basura'), 'x'), /No es una copia/);
});

test('el contenedor empaqueta y desempaqueta varios archivos con sus nombres', () => {
  const files = [{ name: 'a.txt', data: Buffer.from('hola') }, { name: 'b.bin', data: Buffer.alloc(5000, 3) }, { name: 'vacio', data: Buffer.alloc(0) }];
  const out = unpack(pack(files, { createdAt: 5 }));
  assert.equal(out.meta.createdAt, 5);
  assert.deepEqual(out.files.map((f) => [f.name, f.data.length]), [['a.txt', 4], ['b.bin', 5000], ['vacio', 0]]);
  assert.equal(out.files[0].data.toString(), 'hola');
});

function svc(over = {}) {
  const envFile = path.join(h.dataDir, 'fake.env');
  fs.writeFileSync(envFile, 'SECRETO=1\n');
  return createService({
    db: h.db, tg: h.tg, tmpDir: path.join(h.dataDir, 'tmp'), sources: () => [{ name: '.env', path: envFile }, { name: 'no-existe', path: '/no/existe' }],
    settings: { enabled: true, passphrase: 'frase-de-prueba-larga', chat: '-100777', everyHours: 24, keep: 2, includeSession: false, minPassphrase: 12, tag: '#tgbackup' }, ...over,
  });
}

test('la copia contiene la base de datos válida y el .env, y se puede restaurar con la frase', async () => {
  const s = svc();
  const { name, data } = s.build();
  assert.match(name, /^tgdrive-backup-\d{8}-\d{6}\.tgb$/);
  const { meta, files } = unpack(decrypt(data, 'frase-de-prueba-larga'));
  assert.equal(meta.app, 'telegram-drive');
  assert.deepEqual(files.map((f) => f.name), ['index.db', '.env']);
  assert.equal(files[0].data.subarray(0, 15).toString(), 'SQLite format 3');
  assert.equal(files[1].data.toString(), 'SECRETO=1\n');
});

test('run() sube la copia al chat indicado y conserva solo las últimas N', async () => {
  let clock = 1_800_000_000_000;
  const s = svc({ now: () => (clock += 60_000) });
  for (let i = 0; i < 4; i += 1) await s.run();
  const view = await h.tg.forChat('-100777');
  const backups = [...view.messages.values()].filter((m) => m.message.startsWith('#tgbackup'));
  assert.equal(backups.length, 2);
  assert.ok(backups.every((m) => m.media.document.size > 100));
  assert.equal((await h.tg.forChat('me')).messages.size, [...h.tg.messages.values()].length); // nada se coló en el chat de datos
  assert.equal(s.status().lastError, '');
  assert.ok(s.status().lastOk > 0);
});

test('sin frase o con una corta se rechaza con un mensaje claro y sin enviar nada', async () => {
  await assert.rejects(svc({ settings: { passphrase: '', chat: 'me', keep: 1, minPassphrase: 12, tag: '#tgbackup' } }).run(), /Falta BACKUP_PASSPHRASE/);
  await assert.rejects(svc({ settings: { passphrase: 'corta', chat: 'me', keep: 1, minPassphrase: 12, tag: '#tgbackup' } }).run(), /al menos 12/);
});

test('la API exige sesión y avisa de que falta configuración', async () => {
  assert.equal((await fetch(`${h.base}/api/backup/status`)).status, 401);
  const st = (await call('GET', '/api/backup/status')).json;
  assert.equal(st.enabled, false);
  assert.equal(st.configured, false);
  assert.ok(!JSON.stringify(st).includes('passphrase'));
  assert.equal((await call('POST', '/api/backup/run')).res.status, 400);
});
