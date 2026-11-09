import { http } from '../../core/api.js';

export const policyApi = {
  list: () => http.get('shares/policy').then((r) => r.policies),
  set: (token, { password, maxDownloads }) => http.put(`shares/${token}/policy`, { password, maxDownloads }),
};
