import { Router } from 'express';
import { wrap } from '../utils/async-handler.js';
import { receiveUpload } from '../services/uploads.js';
import { streamEntry } from '../services/streamer.js';
import { getThumbnail, dropThumbnail } from '../services/thumbnails.js';
import { fileDto, folderDto } from './serializers.js';
import { badRequest, notFound } from '../utils/errors.js';

export function driveRoutes({ catalog, tg }) {
  const router = Router();
  const ready = wrap(async (_req, _res, next) => { await catalog.ensureLoaded(); next(); });
  router.use(ready);

  // --- navegación ---
  router.get('/list', (req, res) => {
    const { path, folders, files } = catalog.list(req.query.path ?? '/');
    res.json({ path, folders: folders.map(folderDto), files: files.map(fileDto) });
  });

  router.get('/search', (req, res) => {
    res.json({ files: catalog.search(req.query.q ?? '').map(fileDto) });
  });

  router.get('/folders', (_req, res) => res.json({ folders: catalog.folders() }));
  router.get('/stats', (_req, res) => res.json(catalog.stats()));

  router.post('/refresh', wrap(async (_req, res) => {
    await catalog.reload();
    res.json(catalog.stats());
  }));

  // --- carpetas ---
  router.post('/folders', wrap(async (req, res) => {
    res.status(201).json(await catalog.createFolder(req.body?.parent ?? '/', req.body?.name));
  }));

  router.patch('/folders', wrap(async (req, res) => {
    const { path, name, parent } = req.body ?? {};
    if (name !== undefined) return res.json(await catalog.renameFolder(path, name));
    if (parent !== undefined) return res.json(await catalog.moveFolder(path, parent));
    throw badRequest('Indica "name" o "parent"');
  }));

  router.delete('/folders', wrap(async (req, res) => {
    res.json(await catalog.deleteFolder(req.query.path));
  }));

  // --- archivos ---
  router.post('/files', wrap(async (req, res) => {
    const upload = await receiveUpload(req);
    try {
      const entry = await catalog.addUploaded(upload);
      res.status(201).json(fileDto(entry));
    } finally {
      await upload.cleanup();
    }
  }));

  router.patch('/files/:id', wrap(async (req, res) => {
    const { name, parent } = req.body ?? {};
    const id = Number(req.params.id);
    if (name !== undefined) return res.json(fileDto(await catalog.renameFile(id, name)));
    if (parent !== undefined) return res.json(fileDto(await catalog.moveFile(id, parent)));
    throw badRequest('Indica "name" o "parent"');
  }));

  router.delete('/files/:id', wrap(async (req, res) => {
    const id = Number(req.params.id);
    await catalog.deleteFile(id);
    await dropThumbnail(id);
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
