#!/usr/bin/env bash
# Despliegue idempotente. Uso (como root):  bash deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/djl.com.es/telegram}"
REPO="${REPO:-https://github.com/DavidJLlanes/TelegramDrive.git}"
BRANCH="${BRANCH:-main}"
SERVICE="telegram-drive"
RUN_USER="${RUN_USER:-www-data}"

if [ -d "$APP_DIR/.git" ]; then
  echo "==> Actualizando código"
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  echo "==> Clonando repositorio"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
echo "==> Node $(node -v)"
if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=5)?0:1)'; then
  echo "==> Instalando dependencias (SQLite integrado de Node)"
  npm ci --omit=dev --omit=optional
else
  echo "==> Node < 22.5: instalando también better-sqlite3"
  npm ci --omit=dev
fi

mkdir -p data
chown -R "$RUN_USER:$RUN_USER" data
chmod 700 data
# .env propiedad del usuario del servicio: así "setup" puede escribirlo sin tocar los permisos de la carpeta
[ -f .env ] || cp .env.example .env
chown "$RUN_USER:$RUN_USER" .env
chmod 600 .env

# la unidad se reinstala si cambia (así llegan los endurecimientos nuevos); si ya tenías cambios propios, se guarda copia .bak
UNIT="/etc/systemd/system/$SERVICE.service"
if [ ! -f "$UNIT" ] || ! cmp -s deploy/telegram-drive.service "$UNIT"; then
  echo "==> Instalando servicio systemd"
  [ -f "$UNIT" ] && cp "$UNIT" "$UNIT.bak"
  cp deploy/telegram-drive.service "$UNIT"
  systemctl daemon-reload
  systemctl enable "$SERVICE"
fi

if ! grep -q '^APP_PASSWORD_HASH=.\+' .env || [ ! -f data/telegram.session ]; then
  echo
  echo "Falta configuración inicial. Ejecuta, en este orden:"
  echo "  cd $APP_DIR && sudo -u $RUN_USER node scripts/setup.js"
  echo "  cd $APP_DIR && sudo -u $RUN_USER node scripts/login.js"
  echo "  systemctl restart $SERVICE"
  exit 0
fi

systemctl restart "$SERVICE"
sleep 2
systemctl --no-pager --lines=5 status "$SERVICE" || true
curl -fsS http://127.0.0.1:3100/healthz && echo
