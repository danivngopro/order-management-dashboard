import { app } from './app.js';
import { warmDefaultOrdersCache } from './services/orders.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  warmDefaultOrdersCache().catch((err) => {
    console.warn('Default orders cache warmup failed:', err?.message ?? err);
  });
});
