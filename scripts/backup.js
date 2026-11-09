// Hace una copia de seguridad cifrada ahora mismo:  npm run backup
// Úsalo con el servicio parado (sudo systemctl stop telegram-drive) o, mejor, pulsa «Copiar ahora» en la web.
import { config } from '../server/config/index.js';
import { backupConfig } from '../server/features/backup/config.js';
import { createService } from '../server/features/backup/service.js';
import { connectTelegram, fail, openIndex } from './lib/connect.js';
import path from 'node:path';

try {
  const db = openIndex();
  const tg = await connectTelegram();
  const sources = () => [{ name: '.env', path: path.join(config.root, '.env') }, ...(backupConfig.includeSession ? [{ name: 'telegram.session', path: config.sessionFile }] : [])];
  const r = await createService({ db, tg, settings: backupConfig, tmpDir: config.tmpDir, sources }).run();
  console.log(`Copia enviada a ${backupConfig.chat}: ${r.name} (${(r.size / 1024).toFixed(0)} KB). Copias antiguas eliminadas: ${r.removed}.`);
  await tg.disconnect();
  process.exit(0);
} catch (err) { fail(err); }
