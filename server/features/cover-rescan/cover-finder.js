// Busca la carátula de un álbum en la API pública de iTunes (sin clave). Solo se consultan estos dos dominios fijos.
const SEARCH = 'https://itunes.apple.com/search';
const IMAGE_HOST = /^https:\/\/[a-z0-9-]+\.mzstatic\.com\//;
const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT = 15_000;

const norm = (text) => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function get(url, fetcher) {
  const res = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT), headers: { 'User-Agent': 'TelegramDrive' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

/** Devuelve los bytes de la carátula (JPEG/PNG) o null si no hay una coincidencia clara de artista y álbum. */
export async function findAlbumCover(artist, album, fetcher = fetch) {
  const term = new URL(SEARCH);
  term.search = new URLSearchParams({ term: `${artist} ${album}`, entity: 'album', limit: '5', country: 'ES' });
  const { results = [] } = await (await get(term.href, fetcher)).json();
  const wantAlbum = norm(album); const wantArtist = norm(artist);
  const hit = results.find((r) => {
    const name = norm(r.collectionName ?? ''); const by = norm(r.artistName ?? '');
    return (name === wantAlbum || name.startsWith(wantAlbum) || wantAlbum.startsWith(name)) && (by.includes(wantArtist) || wantArtist.includes(by));
  });
  const small = hit?.artworkUrl100;
  if (!small) return null;
  const url = small.replace(/\/\d+x\d+bb\./, '/600x600bb.');
  if (!IMAGE_HOST.test(url)) return null;
  const image = await get(url, fetcher);
  if (Number(image.headers.get('content-length')) > MAX_BYTES) return null;
  const bytes = Buffer.from(await image.arrayBuffer());
  return bytes.length && bytes.length <= MAX_BYTES ? bytes : null;
}
