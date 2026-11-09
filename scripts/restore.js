// Recupera una copia de seguridad:  npm run restore -- [archivo.tgb] [--out carpeta] [--pick N]
// Sin archivo, descarga la más reciente del chat BACKUP_CHAT. Escribe index.db y .env en la carpeta (no toca nada más).
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../server/config/index.js';
import { backupConfig } from '../server/features/backup/config.js';
import { restoreBackup } from '../server/tools/restore-backup.js';
import { ask } from './prompt.js';
import { connectTelegram, fail, option } from './lib/connect.js';

const out = path.resolve(String(option('out', 'restaurado')));
const file = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && !String(all[i - 1] ?? '').startsWith('--'));

try {
  let blob;
  if (file) blob = fs.readFileSync(file);
  else {
    const tg = await connectTelegram();
    const view = await tg.forChat(backupConfig.chat, 'BACKUP_CHAT');
    const found = [];
    for await (const m of view.iterTagged({ tag: backupConfig.tag })) found.push(m);
    if (!found.length) throw new Error(`No hay copias en ${backupConfig.chat}`);
    found.sort((a, b) => b.id - a.id);
    found.slice(0, 10).forEach((m, i) => console.log(`${i}: ${new Date(m.date * 1000).toLocaleString('es-ES')}  ${(Number(m.media?.document?.size ?? 0) / 1024).toFixed(0)} KB`));
    const chosen = found[Number(option('pick', 0)) || 0];
    if (!chosen) throw new Error('--pick fuera de rango');
    console.log('Descargando…');
    blob = await tg.client.downloadMedia(chosen);
    await tg.disconnect();
  }
  const passphrase = process.env.BACKUP_PASSPHRASE || await ask('Frase de la copia: ', { hidden: true });
  const r = restoreBackup({ blob, passphrase, outDir: out });
  console.log(`\nCopia del ${new Date(r.createdAt).toLocaleString('es-ES')} restaurada en ${out}:`);
  r.files.forEach((f) => console.log(`  ${f.name} (${f.size} bytes)`));
  console.log(`\nPara usarla: para el servicio, copia index.db a ${config.dbFile} y .env a ${path.join(config.root, '.env')}, y arranca de nuevo.`);
  process.exit(0);
} catch (err) { fail(err); }
