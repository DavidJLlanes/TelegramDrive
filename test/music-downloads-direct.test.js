import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directSource, directCategory } from '../server/features/music-downloads/direct-url.js';
import { isPublicIp } from '../server/features/music-downloads/public-ip.js';

test('acepta solo extensiones de archivo explícitas en HTTPS', () => {
  assert.equal(directSource('https://example.org/fotos/paisaje.webp').name, 'paisaje.webp');
  assert.equal(directSource('https://example.org/download/a.zip?token=abc').ext, 'zip');
  assert.equal(directCategory('pdf'), 'Documentos');
  assert.equal(directCategory('mp4'), 'Vídeos');
  for (const url of ['http://example.org/file.zip', 'https://127.0.0.1/file.zip',
    'https://user:pass@example.org/file.zip', 'https://example.org/file.exe',
    'https://example.org/download', 'https://example.org:8443/file.zip',
    'https://example.org/file.zip#fragment']) assert.throws(() => directSource(url), url);
});
test('bloquea IP privadas, loopback, documentación, metadatos y redes especiales', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '192.168.1.2', '172.16.0.1',
    '169.254.169.254', '100.64.0.1', '192.0.2.1', '198.51.100.3',
    '203.0.113.7', '224.0.0.1', '::1', '::ffff:127.0.0.1']) {
    assert.equal(isPublicIp(ip), false, ip);
  }
  assert.equal(isPublicIp('8.8.8.8'), true);
});
