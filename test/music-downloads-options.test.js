import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOptions } from '../server/features/music-downloads/options.js';
import { videoDestination } from '../server/features/music-downloads/video-paths.js';
import { formatArgs } from '../server/features/music-downloads/format-args.js';
import { progressLine } from '../server/features/music-downloads/progress.js';

test('rechaza opciones de yt-dlp no permitidas', () => {
  assert.throws(() => normalizeOptions({ videoQuality: 'best;rm -rf /' }));
  assert.throws(() => normalizeOptions({ audioFormat: 'exe' }));
  assert.throws(() => normalizeOptions({ videoGroup: '../' }));
});
test('calidad y códec controlados por catálogo', () => {
  const options = normalizeOptions({ videoQuality: '720', audioFormat: 'opus' });
  assert.match(formatArgs('video', options).join(' '), /height<=720/);
  assert.match(formatArgs('mp3', options).join(' '), /opus/);
});
test('vídeos se organizan por canal, año o lista sin traversal', () => {
  const data = { channel: '../canal', year: '2024', playlist: 'Rock/2024' };
  assert.equal(videoDestination(data, 'channel'), '/Descargas de Internet/Vídeos/canal');
  assert.equal(videoDestination(data, 'year'), '/Descargas de Internet/Vídeos/2024');
  assert.equal(videoDestination(data, 'playlist'), '/Descargas de Internet/Vídeos/Rock 2024');
});
test('progreso se interpreta sin ejecutar código externo', () => {
  assert.equal(progressLine('download:55.5%').progress, 42);
  assert.equal(progressLine('other').progress, undefined);
  assert.deepEqual(progressLine('download:55.5% speed:1.2MiB/s eta:01:22'), { progress: 42, speed: '1.2MiB/s', eta: '01:22' });
});
