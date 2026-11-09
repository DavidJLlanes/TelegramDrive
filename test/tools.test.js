// Herramientas de línea de comandos: migración entre chats y restauración de copias.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHarness } from './helpers/harness.js';
import { migrateChat } from '../server/tools/migrate-chat.js';
import { restoreBackup } from '../server/tools/restore-backup.js';
import { encrypt } from '../server/features/backup/cipher.js';
import { pack } from '../server/features/backup/container.js';

let h; let call;
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  await call('POST', '/api/folders', { parent: '/', name: 'Música' });
  const folder = h.catalog.tree.resolve('/Música');
  for (const n of ['a', 'b', 'c']) h.tg.addFile({ folder, name: `${n}.mp3`, bytes: Buffer.alloc(3000, n.charCodeAt(0)) });
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

const count = async (chat) => [...(await h.tg.forChat(chat)).messages.values()].filter((m) => m.message.startsWith('#tgdrive')).length;
const noSleep = async () => {};

test('la simulación no copia nada y avisa de lo pendiente', async () => {
  const r = await migrateChat({ tg: h.tg, from: 'me', to: '-100500', dryRun: true, sleep: noSleep });
  assert.equal(r.pending, 4); // carpeta + 3 archivos
  assert.equal(r.copied, 0);
  assert.equal(await count('-100500'), 0);
});

test('migra todo, conserva el orden y el contenido, y es repetible sin duplicar', async () => {
  const log = [];
  const r = await migrateChat({ tg: h.tg, from: 'me', to: '-100500', log: (m) => log.push(m), sleep: noSleep });
  assert.equal(r.copied, 4);
  assert.equal(await count('-100500'), 4);
  assert.equal(await count('me'), 4, 'el origen no se toca');
  const target = await h.tg.forChat('-100500');
  const ids = [...target.messages.values()].map((m) => m.message);
  assert.match(ids[0], /"t":"folder"/); // lo más antiguo (la carpeta) va primero
  assert.deepEqual((await migrateChat({ tg: h.tg, from: 'me', to: '-100500', sleep: noSleep })).copied, 0);
  assert.equal(await count('-100500'), 4);
});

test('tras migrar, la app reconstruye su índice desde el grupo', async () => {
  h.tg.chat = '-100500';
  await h.catalog.startSync();
  await h.waitSync();
  const list = (await call('GET', `/api/list?path=${encodeURIComponent('/Música')}`)).json;
  assert.deepEqual(list.files.map((f) => f.name).sort(), ['a.mp3', 'b.mp3', 'c.mp3']);
  h.tg.chat = 'me';
});

test('origen y destino iguales se rechazan', async () => {
  await assert.rejects(migrateChat({ tg: h.tg, from: 'me', to: 'me' }), /mismo chat/);
});

test('restaurar escribe los archivos, no sobrescribe y no sale del directorio', () => {
  const blob = encrypt(pack([{ name: 'index.db', data: Buffer.from('db') }, { name: '../../escape.txt', data: Buffer.from('x') }], { createdAt: 9 }), 'frase-correcta-larga');
  const out = path.join(h.dataDir, 'restaurado');
  const r = restoreBackup({ blob, passphrase: 'frase-correcta-larga', outDir: out });
  assert.deepEqual(r.files.map((f) => f.name), ['index.db', '../../escape.txt']);
  assert.ok(fs.existsSync(path.join(out, 'escape.txt')));
  assert.ok(!fs.existsSync(path.join(h.dataDir, '..', 'escape.txt')));
  assert.throws(() => restoreBackup({ blob, passphrase: 'frase-correcta-larga', outDir: out }), /ya existe/);
  assert.throws(() => restoreBackup({ blob, passphrase: 'mala', outDir: path.join(h.dataDir, 'otro') }), /Frase incorrecta/);
});
