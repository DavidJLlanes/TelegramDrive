import path from 'node:path';
import { backupConfig } from './config.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'backup',
  create({ db, tg, config }) {
    const sources = () => [
      { name: '.env', path: path.join(config.root, '.env') },
      ...(backupConfig.includeSession ? [{ name: 'telegram.session', path: config.sessionFile }] : []),
    ];
    const service = createService({ db, tg, settings: backupConfig, tmpDir: config.tmpDir, sources });
    let timer;
    return {
      router: createRoutes(service),
      api: service,
      start() {
        if (!backupConfig.enabled) return;
        const tick = () => service.run().then((r) => console.log(`[copia] ${r.name} (${r.size} bytes)`)).catch((e) => console.warn('[copia]', e.message));
        const every = backupConfig.everyHours * 3_600_000;
        const last = service.status().lastOk;
        setTimeout(tick, Math.max(60_000, last ? last + every - Date.now() : 60_000)).unref(); // tras reiniciar no se repite una copia reciente
        timer = setInterval(tick, every);
        timer.unref();
      },
      stop() { clearInterval(timer); },
    };
  },
};
