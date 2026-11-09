// Asistente inicial: crea/actualiza .env (credenciales API, contraseña web, secreto de sesión).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask } from './prompt.js';
import { hashPassword, randomSecret } from '../server/utils/crypto.js';

const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
const example = path.resolve(path.dirname(envFile), '.env.example');

const current = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : fs.readFileSync(example, 'utf8');
const values = Object.fromEntries(
  current.split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

function put(key, value) { values[key] = value; }

console.log('\n== Telegram Drive · configuración ==\n');
console.log('Obtén API ID y API HASH en https://my.telegram.org -> API development tools\n');
const apiId = await ask(`TG_API_ID [${values.TG_API_ID || ''}]: `);
const apiHash = await ask(`TG_API_HASH [${values.TG_API_HASH ? '***' : ''}]: `);
if (apiId) put('TG_API_ID', apiId);
if (apiHash) put('TG_API_HASH', apiHash);

const base = await ask(`BASE_PATH [${values.BASE_PATH || '/'}]: `);
if (base) put('BASE_PATH', base);

const password = await ask('Contraseña de acceso a la web (vacío = mantener): ', { hidden: true });
if (password) {
  if (password.length < 10) { console.error('Usa al menos 10 caracteres.'); process.exit(1); }
  put('APP_PASSWORD_HASH', hashPassword(password));
}
if (!values.SESSION_SECRET || values.SESSION_SECRET.length < 32) put('SESSION_SECRET', randomSecret());

const out = current.split('\n').map((line) => {
  const key = line.slice(0, line.indexOf('='));
  return /^[A-Z_]+=/.test(line) && key in values ? `${key}=${values[key]}` : line;
}).join('\n');
fs.writeFileSync(envFile, out, { mode: 0o600 });
console.log('\n.env guardado. Siguiente paso: npm run login\n');
