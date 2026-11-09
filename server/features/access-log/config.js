import { number } from '../../config/env.js';

export const accessLogConfig = Object.freeze({
  retentionDays: number('ACCESS_LOG_DAYS', 90),
  maxRows: number('ACCESS_LOG_MAX_ROWS', 5000),
  failAlertCount: number('ACCESS_FAIL_ALERT', 5),     // intentos fallidos desde una IP…
  failAlertWindowMs: 10 * 60_000,                     // …dentro de esta ventana disparan un aviso
});
