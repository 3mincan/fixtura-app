import cors from '@fastify/cors';
import fastify, { type FastifyInstance } from 'fastify';

import { env } from './env.js';
import { registerAiRoutes } from './routes/ai.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerEventRoutes } from './routes/events.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSimulationRoutes } from './routes/simulations.js';
import { registerUserRoutes } from './routes/users.js';
import { AiProxyService } from './services/ai-proxy.js';
import { EventService } from './services/events.js';
import { SimulationService } from './services/simulations.js';
import { UserService } from './services/users.js';
import { JsonStore } from './storage/json-store.js';

export async function buildApp() {
  const app = fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: env.corsOrigin,
  });

  const store = new JsonStore(env.dataDir);
  const users = new UserService(store);
  const simulations = new SimulationService(store);
  const events = new EventService(store);
  const aiProxy = new AiProxyService(env.geminiApiKey);

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = getStatusCode(error);

    requestLogError(app, error, statusCode);

    return reply.code(statusCode).send({
      error: error instanceof Error ? error.message : 'unexpected error',
    });
  });

  await registerHealthRoutes(app);
  await registerUserRoutes(app, users);
  await registerSimulationRoutes(app, simulations);
  await registerConfigRoutes(app);
  await registerEventRoutes(app, events);
  await registerAiRoutes(app, aiProxy);

  return app;
}

function getStatusCode(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }

  return 500;
}

function requestLogError(app: FastifyInstance, error: unknown, statusCode: number): void {
  if (statusCode >= 500) {
    app.log.error(error);
  }
}
