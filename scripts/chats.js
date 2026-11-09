// Lista tus grupos y canales con su ID, para poner el elegido en TG_CHAT del .env.
import telegram from 'telegram';
import sessions from 'telegram/sessions/index.js';
import { config } from '../server/config/index.js';
import { TelegramService } from '../server/telegram/service.js';

const session = TelegramService.readSession();
if (!session) { console.error('No hay sesión de Telegram. Ejecuta "npm run login:qr" primero.'); process.exit(1); }
const client = new telegram.TelegramClient(new sessions.StringSession(session), config.telegram.apiId, config.telegram.apiHash, { connectionRetries: 5 });
client.setLogLevel('error');
await client.connect();
const filtro = (process.argv[2] || '').toLowerCase();
const dialogs = await client.getDialogs({ limit: 500 });
const rows = dialogs.filter((d) => (d.isGroup || d.isChannel) && d.title.toLowerCase().includes(filtro));
console.log(rows.length ? '\nID                  Tipo     Nombre' : '\nNo hay grupos ni canales que coincidan.');
for (const d of rows) console.log(`${String(d.id).padEnd(19)} ${(d.isChannel && !d.isGroup ? 'canal' : 'grupo').padEnd(8)} ${d.title}`);
console.log('\nCopia el ID del grupo y ponlo en .env como TG_CHAT=<ID>');
await client.disconnect();
process.exit(0);
