// Lista tus grupos y canales con su ID, para poner el elegido en TG_CHAT del .env:  npm run chats [-- filtro]
import { connectTelegram, fail } from './lib/connect.js';

try {
  const tg = await connectTelegram();
  const filtro = (process.argv[2] || '').toLowerCase();
  const dialogs = await tg.client.getDialogs({ limit: 500 });
  const rows = dialogs.filter((d) => (d.isGroup || d.isChannel) && d.title.toLowerCase().includes(filtro));
  console.log(rows.length ? '\nID                  Tipo     Nombre' : '\nNo hay grupos ni canales que coincidan.');
  for (const d of rows) console.log(`${String(d.id).padEnd(19)} ${(d.isChannel && !d.isGroup ? 'canal' : 'grupo').padEnd(8)} ${d.title}`);
  console.log('\nCopia el ID del grupo y ponlo en .env como TG_CHAT=<ID>');
  await tg.disconnect();
  process.exit(0);
} catch (err) { fail(err); }
