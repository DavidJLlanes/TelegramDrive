import { lyricsConfig } from './config.js';
import { migrations } from './migrations.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'lyrics',
  migrations,
  create({ db, tg, catalog }) {
    const service = createService({ repo: createRepo(db), catalog, tg, settings: lyricsConfig });
    return { router: createRoutes(service), api: service, start: () => service.purgeOrphans() };
  },
};
