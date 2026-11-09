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
echo "==> Instalando dependencias de producción"
npm ci --omit=dev

mkdir -p data
chown -R "$RUN_USER:$RUN_USER" data
chmod 700 data
[ -f .env ] && { chown "$RUN_USER:$RUN_USER" .env; chmod 600 .env; }

if [ ! -f "/etc/systemd/system/$SERVICE.service" ]; then
  echo "==> Instalando servicio systemd"
  cp deploy/telegram-drive.service "/etc/systemd/system/$SERVICE.service"
  systemctl daemon-reload
  systemctl enable "$SERVICE"
fi

if [ ! -f .env ] || [ ! -f data/telegram.session ]; then
  echo
  echo "Falta configuración inicial. Ejecuta, en este orden:"
  echo "  cd $APP_DIR && sudo -u $RUN_USER npm run setup"
  echo "  cd $APP_DIR && sudo -u $RUN_USER npm run login"
  echo "  systemctl restart $SERVICE"
  exit 0
fi

systemctl restart "$SERVICE"
sleep 2
systemctl --no-pager --lines=5 status "$SERVICE" || true
curl -fsS http://127.0.0.1:3100/healthz && echo
