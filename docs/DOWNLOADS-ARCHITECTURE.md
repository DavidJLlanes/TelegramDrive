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
| `direct-url.js` | Validación de URLs y clasificación por extensión |
| `public-ip.js` | Resolución DNS con bloqueo de redes privadas y direcciones especiales |
| `direct-runner.js` | Descargador directo original (compatibilidad) |
| `direct-http.js` | Conexiones HTTPS con IP pública fijada y validación de rangos HTTP |
| `direct-transfer-state.js` | Metadatos de reanudación y archivos parciales persistentes |
| `direct-resume.js` | Transferencias reanudables con ETag/Last-Modified y límite de 1 GiB |
| `spotify-source.js` | Enlaces canónicos de canciones, álbumes y listas públicas de Spotify |
| `spotdl-runner.js` | Aislamiento de procesos SpotDL, inspección previa y descarga MP3 |
| `spotdl-files.js` | Verificación de ficheros, tamaños y estructura artista/álbum |

## Cliente — `public/js/features/music-downloads/`

`view.js` compone la pantalla, `options.js` genera el formulario de preferencias, `jobs.js` muestra la cola y `api.js` contiene las llamadas HTTP.

## Garantías

- No se admiten parámetros arbitrarios para yt-dlp ni se ejecutan comandos de shell.
- Las opciones se validan en servidor y se guardan por trabajo para que cambiar la interfaz no altere trabajos en cola.
- Los archivos temporales se eliminan tras subir a TelegramDrive.
- Los MP3/M4A/Opus se clasifican por artista y álbum; los MP4 pueden agruparse por canal, año o lista.
- Se admiten vídeos individuales de Vimeo y Dailymotion, y pistas individuales de SoundCloud. Las descargas directas HTTPS de extensiones permitidas están activadas en un módulo separado. Se bloquean direcciones IP literales, destinos DNS no públicos, puertos alternativos, credenciales y redirecciones. Requieren un módulo independiente con política de URLs, SSRF, redirects y cuotas.
- El audio convertido a 320 kbps no gana calidad respecto a la fuente original.
- No se sortea DRM ni se garantiza la disponibilidad de subtítulos o de resoluciones.

## Listas y cola

Las listas de YouTube se exploran por páginas de 50 elementos, hasta 5000 por lista. Se pueden pausar y reanudar trabajos **pendientes**; las transferencias en curso solo permiten cancelar y reintentar, sin prometer reanudación parcial.

## Spotify mediante SpotDL

SpotDL se instala en `data/tools/spotdl-venv`, separado del entorno de yt-dlp, con `deploy/install-spotdl.sh`. El formulario de Spotify acepta URLs públicas de canciones, álbumes y listas de `open.spotify.com`; elimina parámetros de seguimiento y no admite credenciales, IP literales ni enlaces arbitrarios. Se comprueba una previsualización de metadatos antes de descargar, con límite de 150 pistas por trabajo; se ejecuta un único proceso por cola con plazo máximo de tres horas. La salida se limita a MP3 (128 kbps de conversión, no implica que el origen tenga esa calidad) y se organiza con los metadatos recuperados en `Descargas de Internet/Artista/Álbum`. Cada archivo se incorpora al catálogo de TelegramDrive y la carpeta temporal se elimina al terminar. Las descargas Spotify no admiten pausa de un proceso activo ni reanudación parcial; sí pausar y reanudar trabajos pendientes.

SpotDL **no extrae el audio de Spotify**: utiliza los datos de Spotify y busca audio coincidente en YouTube Music. No evade DRM. Spotify puede cambiar el acceso a metadatos y la coincidencia de canciones no está garantizada. Las listas privadas y bibliotecas personales requieren autenticación externa y no se admiten en esta integración.

## Archivos directos

Los archivos directos se guardan en `Descargas de Internet/Archivos directos/{Audio, Vídeos, Imágenes, Documentos, Comprimidos}`. Límite de 1 GiB por archivo. La URL debe incluir extensión permitida. La descarga usa TLS con el hostname original y una dirección IPv4 pública validada y fijada para evitar cambios DNS entre comprobación y conexión. No sigue redirecciones. No se permite acceso a hosts privados ni redes de metadatos. La pausa de una descarga HTTP activa conserva los bytes ya descargados y permite reanudar por HTTP Range cuando el servidor remoto admite rangos y validadores ETag o Last-Modified. Si el servidor ignora Range o no ofrece un validador fiable, la descarga se reinicia para evitar mezclar versiones. Las transferencias de yt-dlp siguen admitiendo pausa únicamente antes de iniciarse. Los archivos parciales se conservan en `data/tmp/direct-transfers/<id>` y se eliminan al completar, cancelar o quitar un trabajo.
