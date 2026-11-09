import { flag, number, text } from '../../config/env.js';

export const backupConfig = Object.freeze({
  enabled: flag('BACKUP_ENABLED', false),
  passphrase: text('BACKUP_PASSPHRASE'),            // sin ella no se hace copia: el archivo contiene secretos
  chat: text('BACKUP_CHAT', 'me'),                  // "me" = Mensajes guardados; mejor un chat distinto del almacén
  everyHours: Math.max(1, number('BACKUP_EVERY_HOURS', 24)),
  keep: Math.max(1, number('BACKUP_KEEP', 7)),
  includeSession: flag('BACKUP_INCLUDE_SESSION', false), // la sesión de Telegram es fácil de recrear; por defecto no se copia
  minPassphrase: 12,
  tag: '#tgbackup',
});
