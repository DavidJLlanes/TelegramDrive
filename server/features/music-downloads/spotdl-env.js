import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from '../../config/index.js';

// SpotDL escribe configuración y caché en $HOME/.config y $HOME/.spotdl. El HOME de www-data
// (/var/www) no es escribible, así que se redirige a una carpeta propia dentro de data/.
export function spotdlHome() {
  return process.env.SPOTDL_HOME || path.join(config.dataDir, 'spotdl-home');
}

export async function spotdlEnv() {
  const home = spotdlHome();
  await fs.mkdir(path.join(home, '.config'), { recursive: true, mode: 0o700 });
  await fs.mkdir(path.join(home, '.cache'), { recursive: true, mode: 0o700 });
  return { ...process.env, HOME: home,
    XDG_CONFIG_HOME: path.join(home, '.config'), XDG_CACHE_HOME: path.join(home, '.cache') };
}
