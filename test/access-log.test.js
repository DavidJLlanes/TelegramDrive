import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { createService } from '../server/features/access-log/service.js';
import { createRepo } from '../server/features/access-log/repo.js';
import { describeAgent } from '../server/features/access-log/agent.js';

let h; let call;
const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
before(async () => { h = await makeHarness(); call = h.call; });
after(() => h.close());

test('describeAgent da etiquetas cortas y estables', () => {
  assert.equal(describeAgent(CHROME_WIN), 'Chrome en Windows');
  assert.equal(describeAgent(IPHONE), 'Safari en iPhone/iPad');
  assert.equal(describeAgent(''), 'Navegador en sistema desconocido');
});

test('el login real queda registrado (fallo y acierto) y exige sesión para consultarlo', async () => {
  assert.equal((await call('GET', '/api/security/log')).res.status, 401);
  await call('POST', '/api/auth/login', { password: 'mal' }, { 'user-agent': CHROME_WIN });
  await h.login();
  const { entries } = (await call('GET', '/api/security/log')).json;
  assert.deepEqual(entries.map((e) => [e.event, e.ok]), [['login', true], ['login', false]]);
  assert.equal(entries[1].detail, 'contraseña incorrecta');
  assert.equal((await call('GET', '/api/security/log?limit=1')).json.entries.length, 1);
});

test('el primer dispositivo no genera aviso; uno nuevo sí, hasta que se confirma', async () => {
  const { db } = h;
  let clock = 1_000_000;
  const alerts = [];
  const svc = createService({ repo: createRepo(db), notify: (t) => alerts.push(t), now: () => clock,
    settings: { retentionDays: 90, maxRows: 5000, failAlertCount: 3, failAlertWindowMs: 600_000 } });
  db.exec('DELETE FROM access_devices');
  svc.onLogin({ ok: true, ip: '1.1.1.1', ua: CHROME_WIN });
  assert.equal(svc.summary().newDevices.length, 0);
  assert.equal(alerts.length, 0);
  clock += 1000;
  svc.onLogin({ ok: true, ip: '2.2.2.2', ua: IPHONE });
  assert.equal(svc.summary().newDevices.length, 1);
  assert.match(alerts[0], /Safari en iPhone\/iPad.*2\.2\.2\.2/);
  svc.onLogin({ ok: true, ip: '3.3.3.3', ua: IPHONE }); // mismo dispositivo desde otra IP: no es nuevo
  assert.equal(alerts.length, 1);
  svc.ackDevices();
  assert.equal(svc.summary().newDevices.length, 0);
});

test('una racha de fallos desde una IP avisa una sola vez por hora', () => {
  let clock = 5_000_000;
  const alerts = [];
  const svc = createService({ repo: createRepo(h.db), notify: (t) => alerts.push(t), now: () => clock,
    settings: { retentionDays: 90, maxRows: 5000, failAlertCount: 3, failAlertWindowMs: 600_000 } });
  for (let i = 0; i < 6; i += 1) { clock += 1000; svc.onLogin({ ok: false, ip: '9.9.9.9', ua: CHROME_WIN, reason: 'x' }); }
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /9\.9\.9\.9/);
  clock += 3_700_000; // pasada una hora, una nueva racha vuelve a avisar
  for (let i = 0; i < 3; i += 1) { clock += 1000; svc.onLogin({ ok: false, ip: '9.9.9.9', ua: CHROME_WIN, reason: 'x' }); }
  assert.equal(alerts.length, 2);
});

test('la poda respeta antigüedad y número máximo de filas', () => {
  const svc = createService({ repo: createRepo(h.db), now: () => 10_000_000_000, settings: { retentionDays: 1, maxRows: 3, failAlertCount: 9, failAlertWindowMs: 1 } });
  h.db.exec('DELETE FROM access_log');
  for (let i = 0; i < 6; i += 1) h.db.stmt('INSERT INTO access_log (ts, event, ok) VALUES (?, ?, 1)').run(10_000_000_000 - i, 'login');
  svc.prune();
  assert.equal(h.db.stmt('SELECT COUNT(*) AS n FROM access_log').get().n, 3);
});
