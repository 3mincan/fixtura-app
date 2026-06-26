import type { FastifyInstance } from 'fastify';

import type { WorldCupDataService } from '../services/worldcup-data.js';

export async function registerWorldCupRoutes(
  app: FastifyInstance,
  worldCupData: WorldCupDataService,
): Promise<void> {
  app.get('/worldcup/2026', async () => {
    const cached = await worldCupData.getWorldCup2026Data();

    return {
      sourceUrl: cached.sourceUrl,
      fetchedAt: cached.fetchedAt,
      data: cached.data,
    };
  });

  app.post('/worldcup/2026/refresh', async () => {
    const cached = await worldCupData.refreshWorldCup2026Data();

    return {
      sourceUrl: cached.sourceUrl,
      fetchedAt: cached.fetchedAt,
      data: cached.data,
    };
  });
}
