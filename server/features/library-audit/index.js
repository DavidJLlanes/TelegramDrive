import { auditConfig } from './config.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'library-audit',
  create({ db, catalog }) {
    const service = createService({ repo: createRepo(db), tree: catalog.tree, settings: auditConfig });
    return { router: createRoutes(service), api: service };
  },
};
