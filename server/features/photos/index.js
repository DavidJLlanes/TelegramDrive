import { photosConfig } from './config.js';
import { migrations } from './migrations.js';
import { createRepo } from './repo.js';
import { createScanner } from './scanner.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'photos',
  migrations,
  create({ db, tg, catalog }) {
    const repo = createRepo(db);
    const scanner = createScanner({ repo, tg, settings: photosConfig });
    const service = createService({ repo, catalog, scanner, settings: photosConfig });
    let first; let timer;
    return {
      router: createRoutes(service),
      api: service,
      start() {
        first = setTimeout(() => scanner.run(), 8000);
        timer = setInterval(() => scanner.run(), photosConfig.scanEveryMinutes * 60_000);
        first.unref(); timer.unref();
      },
      stop() { clearTimeout(first); clearInterval(timer); },
    };
  },
};
