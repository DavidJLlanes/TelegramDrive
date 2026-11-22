#!/usr/bin/env bash
# SpotDL is isolated from yt-dlp to avoid conflicting Python dependencies.
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/djl.com.es/telegram}"
RUN_USER="${RUN_USER:-www-data}"
VENV="$APP_DIR/data/tools/spotdl-venv"

if ! command -v ffmpeg >/dev/null || ! command -v python3 >/dev/null; then
  echo "Faltan Python 3 o FFmpeg; ejecuta primero install-music-tools.sh" >&2
  exit 1
fi
mkdir -p "$APP_DIR/data/tools"
chown "$RUN_USER:$RUN_USER" "$APP_DIR/data/tools"
if [ ! -x "$VENV/bin/python" ]; then
  sudo -u "$RUN_USER" python3 -m venv "$VENV"
fi
if [ ! -x "$VENV/bin/spotdl" ] || [ "${UPDATE_MUSIC_TOOLS:-0}" = "1" ]; then
  sudo -u "$RUN_USER" "$VENV/bin/python" -m pip install --no-cache-dir --disable-pip-version-check 'spotdl>=4.4,<5'
fi
"$VENV/bin/spotdl" --version
