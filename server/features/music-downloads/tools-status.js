// Estado de yt-dlp y SpotDL para la pantalla Descargas. Comprobarlos lanza procesos Python (varios segundos, más con una descarga en
// curso), así que al responder NUNCA se espera por ellos: se sirve el último resultado conocido y se refresca en segundo plano.
// Solo la primera vez (si el arranque aún no lo ha comprobado) se espera, y las comprobaciones se hacen a la vez, no una tras otra.
export function createToolsStatus({ runner, spotify, ttlMs = 60_000 }) {
  let last = null; let checkedAt = 0; let probing = null;

  async function probe() {
    const [available, spotdl] = await Promise.all([
      runner.installed().catch(() => false),
      (async () => {
        if (spotify.diagnose) { const error = await spotify.diagnose().catch((e) => String(e?.message || e)); return { available: !error, error }; }
        return { available: await spotify.installed().catch(() => false), error: '' };
      })(),
    ]);
    last = { available, spotdlAvailable: spotdl.available, spotdlError: spotdl.error };
    checkedAt = Date.now();
  }
  const refresh = () => { probing ??= probe().finally(() => { probing = null; }); return probing; };

  return {
    warm: () => { refresh(); },
    async get() {
      if (!last) await refresh();
      else if (Date.now() - checkedAt > ttlMs) refresh();
      return last;
    },
  };
}
