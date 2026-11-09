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
    // Sin purga de huérfanos al arrancar: con el índice vacío (primer arranque tras borrar index.db o cambiar de chat) se perderían las letras.
    return { router: createRoutes(service), api: service };
  },
};
