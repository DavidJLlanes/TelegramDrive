#!/usr/bin/env bash
# Instala y valida SpotDL en un venv independiente de yt-dlp.
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/djl.com.es/telegram}"
RUN_USER="${RUN_USER:-www-data}"
VENV="$APP_DIR/data/tools/spotdl-venv"
BIN="$VENV/bin/spotdl"
# HOME escribible para SpotDL (el de www-data, /var/www, no lo es); coincide con server/.../spotdl-env.js
SPOTDL_HOME="${SPOTDL_HOME:-$APP_DIR/data/spotdl-home}"
mkdir -p "$SPOTDL_HOME/.config" "$SPOTDL_HOME/.cache"
chown -R "$RUN_USER:$RUN_USER" "$SPOTDL_HOME"
chmod 700 "$SPOTDL_HOME"
RUN="sudo -u $RUN_USER env HOME=$SPOTDL_HOME XDG_CONFIG_HOME=$SPOTDL_HOME/.config XDG_CACHE_HOME=$SPOTDL_HOME/.cache"

if ! command -v python3 >/dev/null || ! command -v ffmpeg >/dev/null; then
  echo "ERROR: faltan python3 o ffmpeg; ejecuta install-music-tools.sh primero" >&2
  exit 1
fi
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo "ERROR: SpotDL requiere Python 3.11 o posterior" >&2
  exit 1
fi
mkdir -p "$APP_DIR/data/tools"
chown "$RUN_USER:$RUN_USER" "$APP_DIR/data/tools"

# Un venv roto o incompleto debe reconstruirse, no tratarse como instalado.
if [ ! -x "$VENV/bin/python" ]; then
  rm -rf "$VENV"
  sudo -u "$RUN_USER" python3 -m venv "$VENV"
fi

if [ ! -x "$BIN" ] || ! $RUN timeout 30 "$BIN" --version >/dev/null 2>&1 ||
   [ "${UPDATE_MUSIC_TOOLS:-0}" = "1" ]; then
  echo "==> Instalando o reparando SpotDL para $RUN_USER"
  sudo -u "$RUN_USER" "$VENV/bin/python" -m pip install --no-cache-dir --disable-pip-version-check --upgrade 'spotdl>=4.4,<5'
fi

echo "==> Verificando SpotDL con la misma cuenta que ejecuta TelegramDrive"
if ! $RUN timeout 30 "$BIN" --version; then
  echo "ERROR: SpotDL no puede ejecutarse como $RUN_USER; revisa las dependencias y el registro anterior" >&2
  exit 1
fi
echo "==> SpotDL disponible: $BIN"
