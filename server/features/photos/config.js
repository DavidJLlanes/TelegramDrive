import { number } from '../../config/env.js';

export const photosConfig = Object.freeze({
  headBytes: 256 * 1024,     // el EXIF vive en la cabecera del JPEG
  batch: 30,                 // fotos por tanda
  concurrency: 3,
  scanEveryMinutes: Math.min(Math.max(number('PHOTOS_SCAN_MINUTES', 10), 1), 1440),
  pageMax: 300,
});
