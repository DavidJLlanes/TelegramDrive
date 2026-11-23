import { lyricsConfig } from './config.js';
import { migrations } from './migrations.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createLrclib } from './lrclib.js';
import { createFinder } from './finder.js';
import { createBulk } from './bulk.js';
import { createRoutes } from './routes.js';

export default {
  name: 'lyrics',
  migrations,
  create({ db, tg, catalog }) {
    const repo = createRepo(db);
    const service = createService({ repo, catalog, tg, settings: lyricsConfig });
    const finder = createFinder({ repo, catalog, client: createLrclib({ gapMs: Number(process.env.LYRICS_GAP_MS ?? 250) }), settings: lyricsConfig });
    const bulk = createBulk({ repo, finder, settings: lyricsConfig });
    // Sin purga de huérfanos al arrancar: con el índice vacío (primer arranque tras borrar index.db o cambiar de chat) se perderían las letras.
    return { router: createRoutes(service, finder, bulk), api: service };
  },
};
