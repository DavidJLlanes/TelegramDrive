// Grafo de Web Audio compartido. Un elemento <audio> solo admite UNA conexión con Web Audio, así que el ecualizador y el osciloscopio
// la comparten: el grafo se crea la primera vez que alguien lo pide (nunca al arrancar) y desde entonces el sonido pasa por él hasta
// que se recarga la aplicación. En iPhone, pasar el audio por Web Audio puede cortar la música con la pantalla bloqueada.
const ORDER = { eq: 0 }; // los insertos se encadenan en este orden (los desconocidos, al final)

/** Grafo: fuente → insertos (ecualizador…) → salida, más «tomas» que solo escuchan (analizadores). */
export function createGraph(ctx, source) {
  const inserts = new Map();
  const taps = new Set();
  function wire() {
    source.disconnect();
    for (const nodes of inserts.values()) nodes.forEach((n) => n.disconnect());
    let last = source;
    const keys = [...inserts.keys()].sort((a, b) => (ORDER[a] ?? 9) - (ORDER[b] ?? 9));
    for (const key of keys) for (const node of inserts.get(key)) { last.connect(node); last = node; }
    last.connect(ctx.destination);
    taps.forEach((tap) => last.connect(tap));
  }
  wire();
  return {
    ctx,
    setInserts(key, nodes) { inserts.get(key)?.forEach((n) => n.disconnect()); if (nodes) inserts.set(key, nodes); else inserts.delete(key); wire(); },
    addTap(node) { taps.add(node); wire(); },
    removeTap(node) { taps.delete(node); wire(); },
  };
}

let shared = null;
const Context = () => window.AudioContext || window.webkitAudioContext;

export const webAudioSupported = () => Boolean(Context());
export const webAudioActive = () => shared !== null;

/** Crea (si hace falta) y devuelve el grafo del elemento; null si el navegador no tiene Web Audio. */
export function getGraph(audio) {
  if (shared) return shared;
  const Ctx = Context();
  if (!Ctx) return null;
  const ctx = new Ctx();
  shared = createGraph(ctx, ctx.createMediaElementSource(audio));
  // Si el reproductor se creó sin gesto del usuario (al restaurar la cola) el contexto nace suspendido y no sonaría nada.
  audio.addEventListener('play', () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); });
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return shared;
}
