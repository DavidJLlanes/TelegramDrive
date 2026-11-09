import { assertRuntimeConfig, config, ensureDirs } from './config/index.js';
import { openDatabase } from './db/database.js';
import { TelegramService } from './telegram/service.js';
import { Catalog } from './services/catalog.js';
import { createApp } from './app.js';

assertRuntimeConfig();
ensureDirs();

const db = openDatabase(config.dbFile);
console.log(`[db] ${config.dbFile} (${db.driver})`);
const tg = new TelegramService();
const catalog = new Catalog(tg, db);
await tg.connect();
console.log('[telegram] conectado');
catalog.startSync(); // incremental si ya hay índice; completa la primera vez

const server = createApp({ tg, catalog }).listen(config.port, config.host, () => {
  console.log(`[http] http://${config.host}:${config.port}  (base ${config.basePath})`);
});
server.requestTimeout = 0;      // subidas/streams largos
server.headersTimeout = 65_000;

async function shutdown() {
  server.close();
  await tg.disconnect().catch(() => {});
  db.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
