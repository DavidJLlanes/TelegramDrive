// El ejecutor de migraciones aplica cada una una sola vez, en orden, y deshace las que fallan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/db/database.js';
import { applyMigrations } from '../server/db/migrations/runner.js';

const open = () => openDatabase(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tgd-mig-')), 'x.db'));

test('aplica en orden, una sola vez, y es idempotente', () => {
  const db = open();
  const log = [];
  const m = (id) => ({ id, up: (d) => { log.push(id); d.exec(`CREATE TABLE t_${id.replace(/\W/g, '_')} (a INTEGER)`); } });
  assert.deepEqual(applyMigrations(db, [m('002-b'), m('001-a')]), ['001-a', '002-b']);
  assert.deepEqual(applyMigrations(db, [m('001-a'), m('002-b'), m('003-c')]), ['003-c']);
  assert.deepEqual(log, ['001-a', '002-b', '003-c']);
  db.close();
});

test('una migración que falla no deja rastro y se reintenta', () => {
  const db = open();
  const bad = { id: '001-bad', up: (d) => { d.exec('CREATE TABLE medio (a INTEGER)'); throw new Error('boom'); } };
  assert.throws(() => applyMigrations(db, [bad]), /boom/);
  assert.equal(db.stmt("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'medio'").get().n, 0);
  assert.deepEqual(applyMigrations(db, [{ id: '001-bad', up: (d) => d.exec('CREATE TABLE medio (a INTEGER)') }]), ['001-bad']);
  db.close();
});

test('rechaza identificadores duplicados', () => {
  const db = open();
  assert.throws(() => applyMigrations(db, [{ id: '001-a', up() {} }, { id: '001-a', up() {} }]), /duplicada/);
  db.close();
});
