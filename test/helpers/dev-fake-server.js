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

const { config, ensureDirs } = await import('../../server/config/index.js');
const { openDatabase } = await import('../../server/db/database.js');
const { createApp } = await import('../../server/app.js');
const { Catalog } = await import('../../server/services/catalog.js');
const { FakeTelegram } = await import('./fake-telegram.js');

ensureDirs();
const tg = new FakeTelegram();
const catalog = new Catalog(tg, openDatabase(config.dbFile));
await catalog.startSync();
const seed = Number(process.env.FAKE_SEED || 0);
if (seed) { // carpeta de demostración con muchos archivos (FAKE_SEED=650 npm run dev:fake)
  await catalog.folderOps.create('/', 'Discos');
  const folder = catalog.tree.resolve('/Discos');
  for (let n = 1; n <= seed; n += 1) tg.addFile({ folder, name: `Pista ${String(n)}.mp3`, size: 4096 });
  await catalog.startSync({ full: true });
}
const port = Number(process.env.FAKE_PORT || 3199);
createApp({ tg, catalog }).listen(port, '127.0.0.1', () => {
  console.log(`Telegram Drive (demo, sin Telegram) en http://127.0.0.1:${port}  · contraseña: demo-password`);
});
