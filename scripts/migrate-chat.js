// Copia lo guardado en un chat de Telegram a otro:  npm run migrate -- --from me --to -1001234567890 [--dry-run]
// Después pon TG_CHAT=<destino> en .env y reinicia: la app reconstruye su índice sola. El origen no se toca.
import { migrateChat } from '../server/tools/migrate-chat.js';
import { connectTelegram, fail, option } from './lib/connect.js';

const from = option('from', 'me');
const to = option('to');
if (!to || to === true) fail(new Error('Indica el destino: --to <ID del grupo> (mira "npm run chats"). Opcional: --from me --dry-run'));

try {
  const tg = await connectTelegram();
  const r = await migrateChat({ tg, from: String(from), to: String(to), dryRun: Boolean(option('dry-run')), log: (m) => console.log(m) });
  console.log(r.dryRun ? '\nSimulación: no se ha copiado nada.' : `\nListo: ${r.copied} elementos copiados.\nAhora pon TG_CHAT=${to} en .env y reinicia el servicio.\n\nOJO: los archivos y carpetas se trasladan, pero lo que la app guarda aparte y apunta a mensajes concretos\n(enlaces compartidos, letras, álbumes de fotos, posiciones de vídeo…) seguirá apuntando a los mensajes antiguos\ny habrá que rehacerlo. Si ya usas esas funciones, valora no migrar.`);
  await tg.disconnect();
  process.exit(0);
} catch (err) { fail(err); }
