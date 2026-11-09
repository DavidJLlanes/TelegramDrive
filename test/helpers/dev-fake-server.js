// Servidor de desarrollo SIN Telegram (datos en memoria) para trabajar la interfaz.
//   npm run dev:fake   ->  http://127.0.0.1:3199   (contraseña: demo-password)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tgd-dev-'));
process.env.TG_API_ID = '1';
process.env.TG_API_HASH = 'fake';
process.env.SESSION_SECRET = 'd'.repeat(64);
process.env.BASE_PATH = '/';
const { hashPassword } = await import('../../server/utils/crypto.js');
process.env.APP_PASSWORD_HASH = hashPassword('demo-password');

const { config, ensureDirs } = await import('../../server/config/index.js');
const { openDatabase } = await import('../../server/db/database.js');
const { createApp } = await import('../../server/app.js');
const { Catalog } = await import('../../server/services/catalog.js');
const { bootFeatures } = await import('../../server/features/index.js');
const { FakeTelegram } = await import('./fake-telegram.js');
const { mp3WithTags } = await import('./id3.js');

ensureDirs();
const tg = new FakeTelegram();
const db = openDatabase(config.dbFile);
const catalog = new Catalog(tg, db);
const features = bootFeatures({ db, tg, catalog });
features.start();
await catalog.startSync();
const seed = Number(process.env.FAKE_SEED || 0);
if (seed) { // datos de demostración (FAKE_SEED=650 npm run dev:fake)
  for (const name of ['Música', 'Fotos', 'Vídeos', 'Documentos']) await catalog.folderOps.create('/', name);
  for (const name of ['Rock clásico', 'Jazz de noche', 'Electrónica']) await catalog.folderOps.create('/Música', name);
  const at = (p) => catalog.tree.resolve(p);
  const cover = async (color) => {
    try {
      const { default: sharp } = await import('sharp');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#0b1020"/></linearGradient></defs>
        <rect width="320" height="320" fill="url(#g)"/><circle cx="220" cy="110" r="70" fill="#fff" fill-opacity=".14"/>
        <circle cx="110" cy="230" r="46" fill="#fff" fill-opacity=".10"/></svg>`;
      return await sharp(Buffer.from(svg)).jpeg().toBuffer();
    } catch { return undefined; }
  };
  const album = async (folder, artist, name, year, genre, color, titles) => {
    const art = await cover(color);
    titles.forEach((title, i) => tg.addFile({
      folder: at(folder), name: `${String(i + 1).padStart(2, '0')} - ${title}.mp3`,
      bytes: mp3WithTags({ title, artist, album: name, track: `${i + 1}/${titles.length}`, year, genre }, { cover: art, frames: 600 }), // ~15 s de silencio
    }));
  };
  await album('/Música/Rock clásico', 'Los Faroles', 'Autopista', 1978, 'Rock', '#c2410c', ['Intro', 'Autopista', 'Cielo abierto', 'Luces de ciudad', 'Último tren']);
  await album('/Música/Rock clásico', 'Los Faroles', 'Marea', 1981, 'Rock', '#0e7490', ['Marea', 'Cartas', 'Despedida']);
  await album('/Música/Jazz de noche', 'Trío Sur', 'Noche en vela', 1964, 'Jazz', '#4338ca', ['Azul', 'Madrugada', 'Humo', 'Último bar']);
  await album('/Música/Electrónica', 'Neón', 'Circuitos', 2019, 'Electrónica', '#be185d', ['Pulso', 'Fibra', 'Satélite', 'Eco']);
  tg.addFile({ folder: at('/Vídeos'), name: 'concierto 2025.mp4', size: 2_400_000 });
  tg.addFile({ folder: at('/Vídeos'), name: 'viaje a Lisboa.mov', size: 9_800_000 });
  tg.addFile({ folder: at('/Documentos'), name: 'factura-octubre.pdf', size: 88_000 });
  tg.addFile({ folder: at('/Documentos'), name: 'contrato.docx', size: 41_000 });
  tg.addFile({ folder: at('/Fotos'), name: 'amanecer.png', size: 3_100_000 });
  const { jpegWithExif } = await import('./jpeg-exif.js');
  tg.addFile({ folder: at('/Fotos'), name: 'Barcelona.jpg', bytes: jpegWithExif({ taken: '2024:07:15 18:30:05', lat: 41.3874, lon: 2.1686 }) });
  tg.addFile({ folder: at('/Fotos'), name: 'Madrid.jpg', bytes: jpegWithExif({ taken: '2023:12:24 21:00:00', lat: 40.4168, lon: -3.7038 }) });
  tg.addFile({ folder: at('/Fotos'), name: 'Sin-gps.jpg', bytes: jpegWithExif({ taken: '2024:07:02 09:00:00' }) });
  await catalog.folderOps.create('/', 'Discos');
  const big = at('/Discos');
  for (let n = 1; n <= seed; n += 1) tg.addFile({ folder: big, name: `Pista ${n}.mp3`, size: 4096 });
  await catalog.startSync({ full: true });
}
const port = Number(process.env.FAKE_PORT || 3199);
createApp({ tg, catalog, features }).listen(port, '127.0.0.1', () => {
  console.log(`Telegram Drive (demo, sin Telegram) en http://127.0.0.1:${port}  · contraseña: demo-password`);
});
