import { assertRuntimeConfig, config, ensureDirs } from './config/index.js';
import { TelegramService } from './telegram/service.js';
import { Catalog } from './services/catalog.js';
import { createApp } from './app.js';

assertRuntimeConfig();
ensureDirs();

const tg = new TelegramService();
const catalog = new Catalog(tg);
await tg.connect();
console.log('[telegram] conectado');
catalog.reload()
  .then(() => console.log('[catalogo]', catalog.stats()))
  .catch((e) => console.error('[catalogo] error al cargar:', e.message));

const server = createApp({ tg, catalog }).listen(config.port, config.host, () => {
  console.log(`[http] http://${config.host}:${config.port}  (base ${config.basePath})`);
});
server.requestTimeout = 0;      // subidas/streams largos
server.headersTimeout = 65_000;

async function shutdown() {
  server.close();
  await tg.disconnect().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
