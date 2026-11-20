import { migrations } from './migrations.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'music-downloads', migrations,
  create({ db, catalog, config }) {
    const service = createService({ repo: createRepo(db), catalog, tmpDir: config.tmpDir });
    return { router: createRoutes(service), api: service, start: service.start, stop: service.stop };
  },
};
