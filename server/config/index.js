import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;

function normalizeBase(value = '/') {
  const clean = `/${String(value).trim().replace(/^\/+|\/+$/g, '')}`;
  return clean === '/' ? '/' : clean;
}

const dataDir = path.resolve(root, env.DATA_DIR || 'data');

export const config = Object.freeze({
  root,
  publicDir: path.join(root, 'public'),
  dataDir,
  tmpDir: path.join(dataDir, 'tmp'),
  thumbsDir: path.join(dataDir, 'thumbs'),
  sessionFile: path.join(dataDir, 'telegram.session'),
  dbFile: path.join(dataDir, 'index.db'),
  port: Number(env.PORT || 3100),
  host: env.HOST || '127.0.0.1',
  basePath: normalizeBase(env.BASE_PATH || '/'),
  telegram: {
    apiId: Number(env.TG_API_ID || 0),
    apiHash: env.TG_API_HASH || '',
    chat: env.TG_CHAT || 'me',
  },
  auth: {
    passwordHash: env.APP_PASSWORD_HASH || '',
    secret: env.SESSION_SECRET || '',
    ttlDays: Number(env.SESSION_DAYS || 30),
    cookieName: 'tgd_session',
  },
  upload: {
    maxBytes: Number(env.MAX_UPLOAD_MB || 2000) * 1024 * 1024,
  },
});

export function ensureDirs() {
  for (const dir of [config.dataDir, config.tmpDir, config.thumbsDir]) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

export function assertRuntimeConfig() {
  const missing = [];
  if (!config.telegram.apiId) missing.push('TG_API_ID');
  if (!config.telegram.apiHash) missing.push('TG_API_HASH');
  if (!config.auth.passwordHash) missing.push('APP_PASSWORD_HASH');
  if (config.auth.secret.length < 32) missing.push('SESSION_SECRET (>=32 chars)');
  if (missing.length) {
    throw new Error(`Faltan variables en .env: ${missing.join(', ')}. Ejecuta "npm run setup".`);
  }
}
