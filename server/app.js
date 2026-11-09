import express from 'express';
import { config } from './config/index.js';
import { securityHeaders } from './middleware/security.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { authRoutes } from './routes/auth.js';
import { driveRoutes } from './routes/drive.js';
import { libraryRoutes } from './routes/library.js';

export function createApp({ tg, catalog }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(express.json({ limit: '64kb' }));

  app.use(express.static(config.publicDir, {
    index: 'index.html',
    setHeaders(res, file) {
      if (/(sw\.js|\.webmanifest|index\.html)$/.test(file)) res.set('Cache-Control', 'no-cache');
    },
  }));

  app.get('/healthz', (_req, res) => res.json({ ok: true, telegram: tg.connected }));
  app.use('/api/auth', authRoutes({ tg }));
  app.use('/api', requireAuth, driveRoutes({ catalog, tg }), libraryRoutes({ catalog }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
