import { Router } from 'express';
import { wrap } from '../utils/async-handler.js';
import { receiveUpload } from '../services/uploads.js';
import { streamEntry } from '../services/streamer.js';
import { getThumbnail } from '../services/thumbnails.js';
import { badRequest, notFound } from '../utils/errors.js';

export function driveRoutes({ catalog, tg }) {
  const router = Router();
  const { folderOps, fileOps } = catalog;

  // --- navegación ---
  router.get('/list', (req, res) => {
    const { path = '/', sort, offset, limit, kind } = req.query;
    res.json(catalog.list(path, { sort, offset, limit, kind }));
  });
  router.get('/search', (req, res) => res.json({ files: catalog.search(req.query.q ?? '') }));
  router.get('/folders', (_req, res) => res.json({ folders: catalog.folderPaths() }));
  router.get('/stats', (_req, res) => res.json(catalog.stats()));

  /** Sincronización completa en segundo plano; el cliente consulta /stats hasta que termine. */
  router.post('/refresh', (_req, res) => {
    catalog.startSync({ full: true });
    res.status(202).json(catalog.stats());
  });

  router.post('/files/lookup', (req, res) => res.json({ files: catalog.lookup(Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 5000) : []) }));

  // --- acciones múltiples y descargas en ZIP ---
  router.post('/bulk', wrap(async (req, res) => {
    const { action, files, folders, parent } = req.body ?? {};
    if (!['trash', 'move'].includes(action)) throw badRequest('Acción no válida');
    res.json(await catalog.bulk.run({ action, files: Array.isArray(files) ? files : [], folders: Array.isArray(folders) ? folders : [], parent }));
  }));
  router.get('/zip', wrap(async (req, res) => {
    const source = req.query.ids
      ? catalog.archive.forIds(String(req.query.ids).split(','))
      : catalog.archive.forFolder(req.query.path ?? '/');
    catalog.archive.stream(res, source);
  }));

  // --- carpetas (se direccionan por ruta; internamente por id) ---
  router.post('/folders', wrap(async (req, res) => {
    res.status(201).json(await folderOps.create(req.body?.parent ?? '/', req.body?.name));
  }));
  router.patch('/folders', wrap(async (req, res) => {
    const { path, name, parent } = req.body ?? {};
    if (name !== undefined) return res.json(await folderOps.rename(path, name));
    if (parent !== undefined) return res.json(await folderOps.move(path, parent));
    throw badRequest('Indica "name" o "parent"');
  }));
  router.delete('/folders', wrap(async (req, res) => {
    if (req.query.permanent === '1') return res.json(await folderOps.delete(req.query.path));
    return res.json({ trashed: true, id: await catalog.trash.trashFolder(req.query.path) });
  }));

  // --- archivos ---
  router.post('/files', wrap(async (req, res) => {
    const upload = await receiveUpload(req);
    try {
      const dto = await fileOps.upload(upload);
      if (dto.kind === 'audio') catalog.tagger.kick();
      res.status(201).json(dto);
    } catch (err) {
      console.warn(`[upload] fallo enviando "${upload.name}" a Telegram (${upload.size} bytes): ${err.message}`);
      throw err;
    } finally {
      await upload.cleanup();
    }
  }));
  router.patch('/files/:id', wrap(async (req, res) => {
    const { name, parent } = req.body ?? {};
    const id = Number(req.params.id);
    if (name !== undefined) return res.json(await fileOps.rename(id, name));
    if (parent !== undefined) return res.json(await fileOps.move(id, parent));
    throw badRequest('Indica "name" o "parent"');
  }));
  router.delete('/files/:id', wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (req.query.permanent === '1') await fileOps.destroy([id]); else await catalog.trash.trashFile(id);
    res.status(204).end();
  }));
  router.get('/files/:id/content', wrap(async (req, res) => {
    const entry = catalog.getFile(req.params.id);
    await streamEntry({ req, res, tg, entry, download: req.query.download === '1' });
  }));
  router.get('/files/:id/thumb', wrap(async (req, res) => {
    const entry = catalog.getFile(req.params.id);
    const data = await getThumbnail(tg, entry.id);
    if (!data) throw notFound('Sin miniatura');
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=604800' }).end(data);
  }));

  return router;
}
