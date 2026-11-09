// Registro de funciones. Cada función vive en su carpeta (server/features/<nombre>/) y exporta por defecto
//   { name, migrations?: [{ id, up(db) }], create(ctx) → { router?, api?, start?(), stop?() } }
// `ctx` = { config, db, tg, catalog, events, features } (features: API pública de las funciones ya creadas, por nombre).
// Para añadir una función: crear su carpeta y añadirla a FEATURES. Nada más en el servidor.
import { applyMigrations } from '../db/migrations/runner.js';
import { config } from '../config/index.js';
import { events } from '../core/events.js';

import accessLog from './access-log/index.js';
import shareAccess from './share-access/index.js';
import backup from './backup/index.js';
import duplicates from './duplicates/index.js';
import lyrics from './lyrics/index.js';
import libraryAudit from './library-audit/index.js';

const FEATURES = [
  accessLog,
  shareAccess,
  backup,
  duplicates,
  lyrics,
  libraryAudit,
];

export function bootFeatures({ db, tg, catalog }) {
  applyMigrations(db, FEATURES.flatMap((f) => f.migrations ?? []));
  const api = {};
  const booted = FEATURES.map((feature) => {
    const instance = feature.create({ config, db, tg, catalog, events, features: api }) ?? {};
    api[feature.name] = instance.api ?? {};
    return { name: feature.name, ...instance };
  });
  return {
    api,
    routers: booted.filter((b) => b.router).map((b) => b.router),            // /api, con sesión
    publicRouters: booted.filter((b) => b.publicRouter).map((b) => b.publicRouter), // /share, sin sesión
    start: () => booted.forEach((b) => b.start?.()),
    stop: () => booted.forEach((b) => b.stop?.()),
  };
}
