import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'cover-rescan',
  create({ catalog }) {
    const service = createService({ files: catalog.repo, tree: catalog.tree, tagger: catalog.tagger });
    return { router: createRoutes(service), api: service, stop: () => service.stop() };
  },
};
