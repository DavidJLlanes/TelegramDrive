# Centro de descargas: responsabilidades

El centro de descargas se implementa como una función aislada, sin mezclar lógica de descargas con los módulos de archivos, Telegram o la biblioteca.

## Servidor — `server/features/music-downloads/`

| Archivo | Responsabilidad |
|---|---|
| `index.js` | Composición de dependencias y ciclo de vida |
| `routes.js` | API autenticada |
| `service.js` | Orquestación de cola, subida y limpieza temporal |
| `repo.js` | Consultas y persistencia SQLite |
| `migrations.js` | Migraciones versionadas |
| `metadata.js` | Normalización y limpieza de nombres |
| `folders.js` | Creación de carpetas TelegramDrive |
| `video-paths.js` | Organización opcional de vídeos |
| `options.js` | Validación centralizada de opciones permitidas |
| `format-args.js` | Argumentos seguros de yt-dlp |
| `runner.js` | Procesos externos con `spawn`, sin shell |
| `progress.js` | Lectura de progreso y velocidad |
| `subtitles.js` | Identificación de subtítulos acompañantes |
| `sources.js` | Allowlist de proveedores y URLs canónicas HTTPS |
| `playlist-page.js` | Paginación acotada de listas de YouTube |

## Cliente — `public/js/features/music-downloads/`

`view.js` compone la pantalla, `options.js` genera el formulario de preferencias, `jobs.js` muestra la cola y `api.js` contiene las llamadas HTTP.

## Garantías

- No se admiten parámetros arbitrarios para yt-dlp ni se ejecutan comandos de shell.
- Las opciones se validan en servidor y se guardan por trabajo para que cambiar la interfaz no altere trabajos en cola.
- Los archivos temporales se eliminan tras subir a TelegramDrive.
- Los MP3/M4A/Opus se clasifican por artista y álbum; los MP4 pueden agruparse por canal, año o lista.
- Se admiten vídeos individuales de Vimeo y Dailymotion, y pistas individuales de SoundCloud. Las URLs directas arbitrarias **no están activadas**. Requieren un módulo independiente con política de URLs, SSRF, redirects y cuotas.
- El audio convertido a 320 kbps no gana calidad respecto a la fuente original.
- No se sortea DRM ni se garantiza la disponibilidad de subtítulos o de resoluciones.

## Listas y cola

Las listas de YouTube se exploran por páginas de 50 elementos, hasta 5000 por lista. Se pueden pausar y reanudar trabajos **pendientes**; las transferencias en curso solo permiten cancelar y reintentar, sin prometer reanudación parcial.
