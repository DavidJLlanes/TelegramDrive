import { Router } from 'express';
import { wrap } from '../../utils/async-handler.js';
import { createService } from './service.js';
import { receiveCover } from './receive.js';

export default {
  name: 'cover-assign',
  create({ catalog }) {
    const service = createService({ catalog });
    const router = Router();
    /** POST /api/covers/assign (multipart: image, ids, replace) → { updated, skipped } */
    router.post('/covers/assign', wrap(async (req, res) => res.json(await service.assign(await receiveCover(req)))));
    return { router, api: service };
  },
};
