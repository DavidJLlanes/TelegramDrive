import { migrations } from './migrations.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'photo-albums',
  migrations,
  create({ db, catalog }) {
    const service = createService({ repo: createRepo(db), catalog });
    // Sin purga de huérfanos al arrancar: con el índice vacío se perdería la pertenencia a los álbumes. El recuento solo cuenta fotos existentes.
    return { router: createRoutes(service), api: service };
  },
};
