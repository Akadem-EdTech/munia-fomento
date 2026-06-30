import { buildApp } from './app.js';
import { loadEnv } from './env.js';

const env = loadEnv();

buildApp()
  .then((app) =>
    app.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
      app.log.info(`MunIA Fomento API en http://localhost:${env.PORT}`);
    }),
  )
  .catch((err) => {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
  });
