import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl } from '../server/features/music-downloads/sources.js';
import { entryOf } from '../server/features/music-downloads/metadata.js';

test('Vimeo y Dailymotion: URLs canónicas e IDs sin colisiones', () => {
  const v = sourceUrl('https://player.vimeo.com/video/123456789');
  assert.deepEqual([v.id, v.url], ['vimeo:123456789', 'https://vimeo.com/123456789']);
  const d = sourceUrl('https://dai.ly/x8abcd1');
  assert.deepEqual([d.id, d.url], ['dailymotion:x8abcd1', 'https://www.dailymotion.com/video/x8abcd1']);
  assert.equal(entryOf({ id: '123456789', title: 'Prueba' }, v.url).id, v.id);
});
test('SoundCloud: pistas individuales, no perfiles ni playlists', () => {
  const s = sourceUrl('https://soundcloud.com/artist/song-name');
  assert.equal(s.id, 'soundcloud:artist/song-name');
  assert.equal(entryOf({ id: '999', title: 'Tema' }, s.url).url, s.url);
  assert.throws(() => sourceUrl('https://soundcloud.com/artist/sets/playlist'));
});
test('proveedores: no hosts falsos, IP locales, HTTP ni credenciales', () => {
  for (const url of ['https://vimeo.com.evil.test/123456789',
    'https://127.0.0.1/123456789', 'http://vimeo.com/123456789',
    'https://user:pass@vimeo.com/123456789', 'https://vimeo.com:8080/123456789',
    'https://example.com/track', 'https://soundcloud.com/artist',
    'https://soundcloud.com/artist/song#section']) assert.throws(() => sourceUrl(url), url);
});
