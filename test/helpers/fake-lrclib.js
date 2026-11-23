// LRCLIB simulado para el servidor de desarrollo: responde sin red a lo que pregunta la función de letras.
//   «Cartas» no tiene letra (para ver el estado vacío); el resto, una letra sincronizada y otra versión de otro artista.
const synced = (title) => [`[00:00.50]${title}, noche y gasolina`, '[00:03.00]Las luces se derriten en la lluvia', '[00:06.00]Voy cantando bajito por la radio', '[00:09.00]Y no pienso volver', '[00:12.00]Estribillo de neón'].join('\n');
const record = (id, name, artist, extra = {}) => ({ id, trackName: name, artistName: artist, albumName: 'Noche', duration: 0, instrumental: false, plainLyrics: `${name}, noche y gasolina\nLas luces se derriten en la lluvia`, syncedLyrics: null, ...extra });

export function installFakeLrclib() {
  const real = globalThis.fetch;
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  globalThis.fetch = async (url, opts) => {
    if (!String(url).startsWith('https://lrclib.net/')) return real(url, opts);
    await new Promise((r) => setTimeout(r, 350));
    const u = new URL(url);
    const name = u.searchParams.get('track_name') || u.searchParams.get('q') || '';
    if (/cartas/i.test(name)) return u.pathname === '/api/get' ? json({}, 404) : json([]);
    const artist = u.searchParams.get('artist_name') || 'Los Faroles';
    const mine = record(100 + name.length, name, artist, { syncedLyrics: synced(name) });
    if (u.pathname === '/api/get') return json(mine);
    if (u.pathname.startsWith('/api/get/')) return json(record(Number(u.pathname.split('/').pop()), 'Elegida', artist, { syncedLyrics: synced('Elegida') }));
    return json([mine, record(200 + name.length, name, 'Otra Banda'), record(300 + name.length, `${name} (en directo)`, artist, { duration: 301 })]);
  };
}
