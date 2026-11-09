# Telegram Drive

Tu cuenta de Telegram convertida en una unidad de almacenamiento personal, instalable como **PWA**:
carpetas, subida/descarga, reproductor de música, reproductor de vídeo y visor de fotos con lightbox.

- **Sin base de datos**: el catálogo (carpetas y archivos) se reconstruye siempre desde Telegram. Cada archivo se guarda como
  documento en tus *Mensajes guardados* con un pie `#tgdrive {"t":"file","p":"/ruta","n":"nombre"}`; las carpetas son mensajes
  `#tgdrive {"t":"folder",...}`. Renombrar/mover = editar el pie del mensaje.
- **Cuenta real (MTProto)** con [GramJS](https://github.com/gram-js/gramjs): hasta 2 GB por archivo (4 GB con Premium) y descargas
  sin el límite de 20 MB de la Bot API.
- **Streaming con `Range`**: audio y vídeo se pueden buscar (seek) sin descargar el archivo entero.
- **Frontend sin build**: HTML + CSS + módulos ES nativos. Cero dependencias en el navegador.

## Estructura

```
server/
  config/        Carga y validación de .env
  middleware/    Sesión (cookie firmada), rate-limit, cabeceras CSP, errores
  routes/        auth.js · drive.js · serializers.js
  services/      catalog.js (índice y operaciones) · streamer.js (Range) · uploads.js · thumbnails.js
  telegram/      service.js (único contacto con GramJS) · codec.js (formato del pie de mensaje)
  utils/         paths, crypto (scrypt/HMAC), errores, tipos de medio
scripts/         setup.js · login.js · generate-icons.js · check.js
public/
  index.html · manifest.webmanifest · sw.js · offline.html · icons/
  css/           tokens → base → components → layout → explorer → players → lightbox
  js/core/       api · store · router · drive (datos) · dom (DOM seguro) · icons · format
  js/ui/         topbar · explorer · actions · modal · menu · uploader · login · toast …
  js/players/    audio-player · video-player · lightbox · viewer (despacho por tipo)
  js/pwa/        registro del service worker e instalación
deploy/          nginx-telegram.conf · telegram-drive.service · deploy.sh
test/            Integración con un Telegram simulado (npm test) y servidor demo (npm run dev:fake)
```

Regla de oro: ningún archivo de código supera ~220 líneas (`npm run check` lo verifica).

## Puesta en marcha

Requisitos: Node.js ≥ 20 y credenciales de API en <https://my.telegram.org> → *API development tools*.

```bash
npm ci --omit=dev
npm run setup     # API ID/HASH, BASE_PATH y contraseña web  -> .env
npm run login     # inicia sesión en Telegram (teléfono + código + 2FA) -> data/telegram.session
npm start
```

Desarrollo de la interfaz sin Telegram: `npm run dev:fake` → <http://127.0.0.1:3199> (contraseña `demo-password`).

## Seguridad

- La web se protege con contraseña (scrypt) y cookie `HttpOnly`/`SameSite=Lax` firmada con HMAC. Limitador de intentos de login.
- `data/telegram.session` equivale a tu cuenta de Telegram: permisos `600`, fuera de git y fuera del alcance web. **Sirve la app solo por HTTPS.**
- CSP estricta (`script-src 'self'`), sin HTML inyectado desde nombres de archivo, y `nosniff` en descargas.
- La API y los medios nunca se guardan en la caché del service worker.

## Despliegue

Ver `deploy/`. Resumen: `bash deploy/deploy.sh` y bloque `location /telegram/` de Nginx (`deploy/nginx-telegram.conf`).

## Notas y límites

- Las carpetas vacías persisten (son mensajes propios); las carpetas con contenido existen mientras tengan algo dentro.
- Si editas/borras mensajes `#tgdrive` a mano en Telegram, pulsa **Sincronizar** en la barra superior.
- Los formatos que el navegador no reproduce (p. ej. MKV/HEVC) se pueden descargar desde el propio reproductor.
