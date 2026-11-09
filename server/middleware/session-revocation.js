import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

const file = path.join(config.dataDir, 'revoked-sessions.json');
const revoked = new Map(); // firma de la cookie → caducidad (ms). Cerrar sesión invalida esa cookie aunque alguien la hubiera copiado.
try { for (const [sig, exp] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')))) revoked.set(sig, Number(exp)); } catch { /* sin revocaciones */ }

export const isRevoked = (sig) => revoked.has(sig);

export function revoke(sig, exp) {
  const now = Date.now();
  for (const [key, until] of revoked) if (until < now) revoked.delete(key); // las caducadas ya no valen de todos modos
  revoked.set(sig, Number(exp));
  try { fs.writeFileSync(file, JSON.stringify(Object.fromEntries(revoked)), { mode: 0o600 }); } catch { /* en memoria sigue valiendo */ }
}
