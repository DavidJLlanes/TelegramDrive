import { Router } from 'express';
import { wrap } from '../utils/async-handler.js';

const ids = (v) => (Array.isArray(v) ? v : []);

/** Papelera: listar, restaurar, borrar definitivamente y vaciar. */
export function trashRoutes({ catalog }) {
  const router = Router();
  const { trash } = catalog;

  router.get('/trash', (_req, res) => res.json(trash.list()));
  router.post('/trash/restore', wrap(async (req, res) => {
    for (const id of ids(req.body?.files)) await trash.restoreFile(id);
    for (const id of ids(req.body?.folders)) await trash.restoreFolder(id);
    res.json({ restored: true });
  }));
  router.post('/trash/delete', wrap(async (req, res) => res.json(await trash.destroy({ files: ids(req.body?.files), folders: ids(req.body?.folders) }))));
  router.post('/trash/empty', wrap(async (_req, res) => res.json(await trash.empty())));
  return router;
}
