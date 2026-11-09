import { notify } from '../../core/notify.js';
import { accessLogConfig } from './config.js';
import { migrations } from './migrations.js';
import { createRepo } from './repo.js';
import { createService } from './service.js';
import { createRoutes } from './routes.js';

export default {
  name: 'access-log',
  migrations,
  create({ db, events }) {
    const service = createService({ repo: createRepo(db), settings: accessLogConfig, notify });
    const onLogin = (e) => service.onLogin(e);
    const onShare = (e) => service.onShare(e);
    let timer;
    return {
      router: createRoutes(service),
      api: service,
      start() {
        events.on('auth:login', onLogin);
        events.on('share:access', onShare);
        service.prune();
        timer = setInterval(() => service.prune(), 6 * 3_600_000);
        timer.unref();
      },
      stop() { events.off('auth:login', onLogin); events.off('share:access', onShare); clearInterval(timer); },
    };
  },
};
