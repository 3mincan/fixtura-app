import { buildApp } from './app.js';
import { env } from './env.js';

const app = await buildApp();

try {
  const address = await app.listen({
    host: env.host,
    port: env.port,
  });

  app.log.info(`Fixtura backend listening at ${address}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
