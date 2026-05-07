export const ENV = {
  PORT: Number(process.env.PORT ?? 3000),
  DB_HOST: process.env.DB_HOST ?? 'localhost',
  DB_PORT: Number(process.env.DB_PORT ?? 5432),
  DB_NAME: process.env.DB_NAME ?? 'order_ops',
  DB_USER: process.env.DB_USER ?? 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD ?? 'postgres',
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT ?? '5mb',
};
