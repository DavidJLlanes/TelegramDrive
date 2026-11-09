// Inicio de sesión en Telegram escaneando un QR (alternativa a login.js cuando el código no llega).
// En el móvil: Telegram > Ajustes > Dispositivos > Vincular dispositivo de escritorio > escanear.
import fs from 'node:fs';
import telegram from 'telegram';
import sessions from 'telegram/sessions/index.js';
import qrcode from 'qrcode-terminal';
import { config, ensureDirs } from '../server/config/index.js';
import { ask } from './prompt.js';

const { TelegramClient } = telegram;
if (!config.telegram.apiId || !config.telegram.apiHash) {
  console.error('Falta TG_API_ID / TG_API_HASH. Ejecuta "node scripts/setup.js" primero.');
  process.exit(1);
}
ensureDirs();

const client = new TelegramClient(new sessions.StringSession(''), config.telegram.apiId, config.telegram.apiHash, { connectionRetries: 5 });
client.setLogLevel('error');
await client.connect();

console.log('\nAbre Telegram en el móvil > Ajustes > Dispositivos > Vincular dispositivo de escritorio y escanea el QR.');
console.log('El QR se renueva solo cada pocos segundos; si caduca, espera al siguiente.\n');

await client.signInUserWithQrCode(
  { apiId: config.telegram.apiId, apiHash: config.telegram.apiHash },
  {
    qrCode: async ({ token }) => {
      const url = `tg://login?token=${token.toString('base64url')}`;
      qrcode.generate(url, { small: true });
      console.log(`(${new Date().toLocaleTimeString()}) Esperando el escaneo…\n`);
    },
    password: () => ask('Contraseña 2FA de Telegram (verificación en dos pasos): ', { hidden: true }),
    onError: async (err) => { console.error('Error:', err.message); return false; },
  },
);

fs.writeFileSync(config.sessionFile, client.session.save(), { mode: 0o600 });
const me = await client.getMe();
console.log(`\nSesión guardada para ${me.firstName ?? ''} (@${me.username ?? 'sin-alias'}).`);
console.log('No compartas data/telegram.session: da acceso completo a tu cuenta.\n');
await client.disconnect();
process.exit(0);
