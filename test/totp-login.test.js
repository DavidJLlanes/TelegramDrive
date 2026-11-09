import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { newTotpSecret, codeAt } from '../server/utils/totp.js';

const secret = newTotpSecret();
process.env.APP_TOTP_SECRET = secret;
const { makeHarness } = await import('./helpers/harness.js');
let h;
before(async () => { h = await makeHarness(); });
after(() => h.close());

const login = (code) => h.call('POST', '/api/auth/login', { password: 'contraseña-de-prueba', code });
const now = () => Math.floor(Date.now() / 30_000);

test('con TOTP activo el login exige el código, que solo vale una vez', async () => {
  assert.equal((await h.call('GET', '/api/auth/status')).json.totp, true);
  assert.equal((await login(undefined)).res.status, 401);
  assert.equal((await login('123456')).res.status, 401);
  const code = codeAt(secret, now());
  assert.equal((await login(code)).res.status, 200);
  assert.equal((await login(code)).res.status, 401);               // reutilizado
});

test('los accesos correctos no consumen el límite de intentos', async () => {
  const bad = async (n) => { let last; for (let i = 0; i < n; i += 1) last = await h.call('POST', '/api/auth/login', { password: 'mala' }); return last.res.status; };
  assert.equal(await bad(8), 401);
  assert.equal((await login(codeAt(secret, now() + 1))).res.status, 200);   // acierto: reinicia el contador
  assert.equal(await bad(8), 401);                                             // sin reinicio serían 16 > 10 y daría 429
});
