import { app } from './app.js';
import { ENV } from './config/env.js';
import { warmDefaultOrdersCache } from './services/orders.js';
import { logger } from './utils/logger.js';

app.listen(ENV.PORT, () => {
  logger.info(`Server listening on port ${ENV.PORT}`);
  warmDefaultOrdersCache().catch((err) => {
    logger.warn('Default orders cache warmup failed', { err });
  });
});
