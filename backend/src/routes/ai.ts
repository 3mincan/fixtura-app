import type { FastifyInstance } from 'fastify';

import type { AiProxyService } from '../services/ai-proxy.js';
import { isObject, ValidationError } from '../services/validation.js';
import type { JsonObject } from '../types.js';

export async function registerAiRoutes(
  app: FastifyInstance,
  aiProxy: AiProxyService,
): Promise<void> {
  app.post('/ai/match-score', async (request) => {
    if (!isObject(request.body)) {
      throw new ValidationError('body must be an object');
    }

    if (!isObject(request.body.fixture)) {
      throw new ValidationError('fixture must be an object');
    }

    const completedMatches = request.body.completedMatches;

    if (completedMatches !== undefined && !Array.isArray(completedMatches)) {
      throw new ValidationError('completedMatches must be an array');
    }

    const groupStandings = request.body.groupStandings;

    if (groupStandings !== undefined && !isObject(groupStandings)) {
      throw new ValidationError('groupStandings must be an object');
    }

    const language = typeof request.body.language === 'string' ? request.body.language : undefined;

    return {
      score: await aiProxy.resolveMatchScore({
        fixture: request.body.fixture,
        completedMatches,
        groupStandings: groupStandings as JsonObject | undefined,
        language,
      }),
    };
  });
}
