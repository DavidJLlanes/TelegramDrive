import { config } from '../../config/index.js';
import { shareAccessConfig } from './config.js';
import { migrations } from './migrations.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createAdminRouter, createPublicRouter } from './routes.js';

export default {
  name: 'share-access',
  migrations,
  create({ db, catalog }) {
    const service = createService({ repo: createRepo(db), shares: catalog.shares, settings: shareAccessConfig, secret: config.auth.secret });
    return { router: createAdminRouter(service), publicRouter: createPublicRouter({ service, shares: catalog.shares }), api: service };
  },
};
