import { migrations } from './migrations.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'photo-albums',
  migrations,
  create({ db, catalog }) {
    const service = createService({ repo: createRepo(db), catalog });
    return { router: createRoutes(service), api: service, start: () => service.purgeOrphans() };
  },
};
