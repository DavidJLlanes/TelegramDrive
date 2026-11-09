import { usageConfig } from './config.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'usage',
  create({ db, catalog }) {
    const service = createService({ repo: createRepo(db), tree: catalog.tree, settings: usageConfig });
    return { router: createRoutes(service), api: service };
  },
};
