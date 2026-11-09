# Arquitectura

Telegram Drive es una PWA (cliente de módulos ES sin *build*) más un servidor Express que usa Telegram como almacén.
**Telegram es la fuente de verdad**; SQLite es un índice reconstruible y solo guarda aparte lo que no puede vivir en
Telegram (enlaces compartidos, registro de accesos, letras, metadatos de fotos…).

## Mapa

```
server/
  index.js, app.js          arranque y montaje Express (no se toca para añadir funciones)
  config/                   configuración base (index.js) y lectura tipada de env (env.js)
  core/events.js            bus de eventos interno (desacopla productor y consumidor)
  middleware/               auth, cabeceras de seguridad, límite de peticiones, errores
  routes/, services/, db/   NÚCLEO estable: explorador, sincronización, etiquetas, papelera, listas
  telegram/                 único contacto con MTProto (GramJS)
  features/                 FUNCIONES: una carpeta por capacidad (ver abajo)
  db/migrations/            migraciones numeradas de las tablas propias de cada función
public/
  js/core/                  estado, router, API, registro de vistas (views.js)
  js/ui/                    componentes del núcleo (explorador, menús, diálogos…)
  js/features/<nombre>/     funciones del cliente
  css/                      tokens → base → componentes → layout → … → pages (vistas registradas)
scripts/                    herramientas de línea de comandos (setup, login, backup, migrate…)
test/                       pruebas de integración con Telegram simulado
docs/                       esta documentación
```

## Reglas

1. **Una función = una carpeta.** `server/features/<nombre>/` y, si tiene pantalla, `public/js/features/<nombre>/`.
   El núcleo no importa funciones; las funciones sí pueden usar el núcleo y la API pública de otras (`ctx.features`).
2. **Ningún archivo supera 220 líneas** (`npm run check` lo vigila). Si crece, se divide por responsabilidad.
3. **Capas dentro de una función (servidor):**
   `config.js` (env) → `repo.js` (SQL, sin lógica) → `service.js` (reglas, sin Express) → `routes.js` (HTTP, validación) →
   `index.js` (ensamblado). Las rutas no tocan SQL; el servicio no conoce `req`/`res`.
4. **Base de datos.** No se añaden columnas a `files`/`folders` (`schema.js` las reconstruye al cambiar de versión).
   Datos nuevos → tabla propia con clave `msg_id`, creada por una migración numerada (`NNN-nombre.js`, idempotente,
   nunca se edita una ya publicada). Lo derivable de Telegram se marca como reconstruible; lo demás va en la copia de seguridad.
5. **Eventos.** Los hechos transversales se emiten con `emitSafe` (`auth:login`, `share:access`…); quien necesita
   reaccionar se suscribe en su `create()` y se desuscribe en `stop()`.
6. **Errores.** Los servicios lanzan `HttpError` (utils/errors.js); `routes.js` no captura, usa `wrap()`.
   Toda entrada externa se valida en la ruta (tipos, longitudes, rangos) y nunca se interpola en SQL.
7. **Cliente.** Sin *build* ni dependencias. DOM solo con `h()` (nunca `innerHTML`: la CSP lo prohíbe y evita XSS).
   Pantallas nuevas con `registerView` (core/views.js); no se tocan router, menú ni cabecera.
   Estado en `appState`; suscripciones con `watch()` para que se liberen solas.
8. **Service worker.** `public/sw.js` es una plantilla: el servidor (`services/shell.js`) la sirve con la lista de archivos y la
   versión calculadas del contenido de `public/`. Añadir o cambiar un archivo del cliente no requiere tocar el SW ni subir versión.
9. **Pruebas.** Cada función trae su `test/<nombre>.test.js` y se añade a `npm test`. El Telegram simulado
   (`test/helpers/fake-telegram.js`) y el arnés (`harness.js`) montan la API real con SQLite real.

## Cómo añadir una función (servidor)

```js
// server/features/mi-funcion/index.js
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';
import { migrations } from './migrations.js';

export default {
  name: 'mi-funcion',
  migrations,                                   // [{ id: '020-mi-funcion', up(db) {…} }]
  create({ db, events, config, features }) {
    const service = createService({ repo: createRepo(db) });
    const off = events.on('auth:login', (e) => service.onLogin(e)) && (() => events.off('auth:login', service.onLogin));
    return { router: createRoutes(service), api: service, start() {}, stop: off };
  },
};
```

Después, importarla en `server/features/index.js`. Las rutas se montan bajo `/api` con sesión obligatoria.

## Cómo añadir una pantalla (cliente)

```js
// public/js/features/mi-funcion/index.js
import { registerView } from '../../core/views.js';
registerView({ id: 'mi-funcion', label: 'Mi función', icon: 'tag', group: 'more',
  title: () => 'Mi función', load: () => api.get('mi-funcion'), render: (el, page) => { /* … */ } });
```

y una línea en `public/js/features/index.js`.

## Funciones actuales

| Función | Servidor | Cliente |
|---|---|---|
| Registro de accesos y avisos | `features/access-log` | `features/security` |
| Enlaces con caducidad, contraseña y límite | `features/share-access` | (diálogo de compartir) |
| Copia de seguridad cifrada | `features/backup` + `scripts/backup.js` | `features/security` |
| Migración a otro chat | `scripts/migrate-chat.js` | — |
| Subidas en paralelo con reintentos y duplicados | `features/uploads` | `features/uploads` |
| Filtros por tipo, arrastrar para mover, atajos | — | `features/filters`, `features/dragmove`, `features/shortcuts` |
| Letras | `features/lyrics` | `features/lyrics` |
| Ecualizador y fundido | — | `features/audio-fx` |
| Revisión de la biblioteca | `features/library-audit` | `features/library-audit` |
| Fotos (línea de tiempo EXIF) | `features/photos` | `features/photos` |
| Uso de espacio | `features/usage` | `features/usage` |
| Compartir hacia la app (Android) | — | `features/share-target` |
