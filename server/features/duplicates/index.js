import { duplicatesConfig } from './config.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'duplicates',
  create({ catalog }) {
    const service = createService({ tree: catalog.tree, files: catalog.repo, settings: duplicatesConfig });
    return { router: createRoutes(service, duplicatesConfig), api: service };
  },
};
