// Arnés de pruebas: API real + SQLite real + Telegram simulado.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function makeHarness() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgd-test-'));
  Object.assign(process.env, {
    DATA_DIR: dataDir, BASE_PATH: '/telegram', TG_API_ID: '1', TG_API_HASH: 'x', SESSION_SECRET: 'a'.repeat(64),
  });
  const { hashPassword } = await import('../../server/utils/crypto.js');
  process.env.APP_PASSWORD_HASH = hashPassword('contraseña-de-prueba');
  const { config, ensureDirs } = await import('../../server/config/index.js');
  const { openDatabase } = await import('../../server/db/database.js');
  const { Catalog } = await import('../../server/services/catalog.js');
  const { createApp } = await import('../../server/app.js');
  const { FakeTelegram } = await import('./fake-telegram.js');

  ensureDirs();
  const db = openDatabase(config.dbFile);
  const tg = new FakeTelegram();
  const catalog = new Catalog(tg, db);
  await catalog.startSync();
  const server = createApp({ tg, catalog }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';

  const call = async (method, url, body, headers = {}) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { cookie, ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body instanceof FormData ? body : body && JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* binario */ }
    return { res, json, text };
  };

  return {
    tg, db, catalog, call, dataDir, Catalog,
    setCookie: (value) => { cookie = value; },
    async login() {
      const r = await call('POST', '/api/auth/login', { password: 'contraseña-de-prueba' });
      cookie = r.res.headers.get('set-cookie').split(';')[0];
      return r;
    },
    /** Espera a que termine la sincronización en segundo plano. */
    async waitSync() {
      for (let i = 0; i < 200; i += 1) {
        if (!(await call('GET', '/api/stats')).json.sync.running) return;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error('La sincronización no terminó');
    },
    close() { server.close(); db.close(); fs.rmSync(dataDir, { recursive: true, force: true }); },
  };
}
