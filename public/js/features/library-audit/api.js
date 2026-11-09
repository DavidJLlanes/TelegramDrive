import { http } from '../../core/api.js';

export const auditApi = { library: () => http.get('audit/library') };
