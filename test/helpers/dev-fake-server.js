// Servidor de desarrollo SIN Telegram (datos en memoria) para trabajar la interfaz.
//   npm run dev:fake   ->  http://127.0.0.1:3199   (contraseña: demo-password)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tgd-dev-'));
process.env.TG_API_ID = '1';
process.env.TG_API_HASH = 'fake';
process.env.SESSION_SECRET = 'd'.repeat(64);
process.env.BASE_PATH = '/';
const { hashPassword } = await import('../../server/utils/crypto.js');
process.env.APP_PASSWORD_HASH = hashPassword('demo-password');

const { ensureDirs } = await import('../../server/config/index.js');
const { createApp } = await import('../../server/app.js');
const { Catalog } = await import('../../server/services/catalog.js');
const { FakeTelegram } = await import('./fake-telegram.js');

ensureDirs();
const tg = new FakeTelegram();
const port = Number(process.env.FAKE_PORT || 3199);
createApp({ tg, catalog: new Catalog(tg) }).listen(port, '127.0.0.1', () => {
  console.log(`Telegram Drive (demo, sin Telegram) en http://127.0.0.1:${port}  · contraseña: demo-password`);
});
