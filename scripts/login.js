// Inicio de sesión en Telegram (una sola vez). Guarda la sesión en data/telegram.session.
import fs from 'node:fs';
import telegram from 'telegram';
import sessions from 'telegram/sessions/index.js';
import { config, ensureDirs } from '../server/config/index.js';
import { ask } from './prompt.js';

const { TelegramClient } = telegram;
if (!config.telegram.apiId || !config.telegram.apiHash) {
  console.error('Falta TG_API_ID / TG_API_HASH. Ejecuta "npm run setup" primero.');
  process.exit(1);
}
ensureDirs();

const client = new TelegramClient(new sessions.StringSession(''), config.telegram.apiId, config.telegram.apiHash, {
  connectionRetries: 5,
});
client.setLogLevel('error');

await client.start({
  phoneNumber: () => ask('Teléfono (con prefijo, ej. +34600111222): '),
  phoneCode: () => ask('Código recibido en Telegram: '),
  password: () => ask('Contraseña 2FA (si no tienes, Enter): ', { hidden: true }),
  onError: (err) => console.error('Error:', err.message),
});

fs.writeFileSync(config.sessionFile, client.session.save(), { mode: 0o600 });
const me = await client.getMe();
console.log(`\nSesión guardada para ${me.firstName ?? ''} (@${me.username ?? 'sin-alias'}).`);
console.log('No compartas data/telegram.session: da acceso completo a tu cuenta.\n');
await client.disconnect();
process.exit(0);
