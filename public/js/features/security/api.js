import { http } from '../../core/api.js';

export const securityApi = {
  summary: () => http.get('security/summary'),
  log: (limit = 50) => http.get('security/log', { limit }),
  ackDevices: () => http.post('security/devices/ack'),
  backupStatus: () => http.get('backup/status'),
  runBackup: () => http.post('backup/run'),
};
