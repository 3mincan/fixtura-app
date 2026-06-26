import type { FastifyInstance } from 'fastify';

import { getRemoteConfig } from '../services/remote-config.js';

export async function registerConfigRoutes(app: FastifyInstance): Promise<void> {
  app.get('/remote-config', async () => ({
    config: getRemoteConfig(),
  }));
}
