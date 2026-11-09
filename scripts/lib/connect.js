// Arranque común de los scripts que hablan con Telegram o con la base de datos.
import { assertRuntimeConfig, config, ensureDirs } from '../../server/config/index.js';
import { TelegramService } from '../../server/telegram/service.js';
import { openDatabase } from '../../server/db/database.js';

export function option(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

export async function connectTelegram() {
  ensureDirs();
  if (!config.telegram.apiId || !config.telegram.apiHash) throw new Error('Falta TG_API_ID / TG_API_HASH. Ejecuta "node scripts/setup.js" primero.');
  const tg = new TelegramService();
  await tg.connect();
  return tg;
}

export function openIndex() {
  assertRuntimeConfig();
  ensureDirs();
  return openDatabase(config.dbFile);
}

export function fail(err) {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
}
