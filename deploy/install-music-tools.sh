#!/usr/bin/env bash
# Ejecutado por deploy.sh como root. Requisitos independientes de Node.
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/djl.com.es/telegram}"
RUN_USER="${RUN_USER:-www-data}"
VENV="$APP_DIR/data/tools/yt-dlp-venv"

if ! command -v ffmpeg >/dev/null || ! command -v python3 >/dev/null; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg python3 python3-venv
fi
mkdir -p "$APP_DIR/data/tools"
chown -R "$RUN_USER:$RUN_USER" "$APP_DIR/data/tools"
if [ ! -x "$VENV/bin/python" ]; then
  if ! sudo -u "$RUN_USER" python3 -m venv "$VENV"; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv
    sudo -u "$RUN_USER" python3 -m venv "$VENV"
  fi
fi
if [ ! -x "$VENV/bin/yt-dlp" ] || [ "${UPDATE_MUSIC_TOOLS:-0}" = "1" ]; then
  sudo -u "$RUN_USER" "$VENV/bin/python" -m pip install --no-cache-dir --disable-pip-version-check -U 'yt-dlp[default]'
fi
"$VENV/bin/yt-dlp" --version
ffmpeg -version | head -n 1
# yt-dlp-ejs utiliza Node >=22.6 cuando se selecciona --js-runtimes node.
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<23 && (major<22 || minor<6))console.warn("Aviso: para YouTube conviene Node >= 22.6 (EJS)")'
