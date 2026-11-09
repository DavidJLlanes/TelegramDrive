import { http } from '../../core/api.js';

export const usageApi = { report: () => http.get('usage') };
