import type { FastifyInstance } from 'fastify';

import type { SimulationService } from '../services/simulations.js';
import {
  isObject,
  optionalString,
  requireString,
  ValidationError,
} from '../services/validation.js';
import type { JsonObject } from '../types.js';
import { requireUserId } from './users.js';

export async function registerSimulationRoutes(
  app: FastifyInstance,
  simulations: SimulationService,
): Promise<void> {
  app.get('/simulations', async (request) => {
    const userId = requireUserId(request.headers['x-user-id']);
    return {
      simulations: await simulations.list(userId),
    };
  });

  app.get<{ Params: { id: string } }>('/simulations/:id', async (request, reply) => {
    const userId = requireUserId(request.headers['x-user-id']);
    const simulation = await simulations.get(userId, request.params.id);

    if (!simulation) {
      return reply.code(404).send({ error: 'simulation not found' });
    }

    return { simulation };
  });

  app.post('/simulations', async (request, reply) => {
    const userId = requireUserId(request.headers['x-user-id']);
    const body = parseSaveSimulationBody(request.body);
    const simulation = await simulations.save(userId, body);

    return reply.code(201).send({ simulation });
  });

  app.patch<{ Params: { id: string } }>('/simulations/:id', async (request, reply) => {
    const userId = requireUserId(request.headers['x-user-id']);
    const body = parseSaveSimulationBody(request.body, request.params.id);
    const simulation = await simulations.save(userId, body);

    return { simulation };
  });

  app.delete<{ Params: { id: string } }>('/simulations/:id', async (request, reply) => {
    const userId = requireUserId(request.headers['x-user-id']);
    const deleted = await simulations.delete(userId, request.params.id);

    if (!deleted) {
      return reply.code(404).send({ error: 'simulation not found' });
    }

    return reply.code(204).send();
  });
}

function parseSaveSimulationBody(body: unknown, forcedId?: string) {
  if (!isObject(body)) {
    throw new ValidationError('body must be an object');
  }

  const rawGameMode = requireString(body.gameMode, 'gameMode');

  if (rawGameMode !== 'predict' && rawGameMode !== 'random') {
    throw new ValidationError('gameMode must be predict or random');
  }

  const gameMode: 'predict' | 'random' = rawGameMode;

  const progress = body.progress;

  if (!isObject(progress)) {
    throw new ValidationError('progress must be an object');
  }

  return {
    id: forcedId ?? optionalString(body.id) ?? undefined,
    selectedTeamId: requireString(body.selectedTeamId, 'selectedTeamId'),
    gameMode,
    tournamentPhase: requireString(body.tournamentPhase, 'tournamentPhase'),
    currentStage: requireString(body.currentStage, 'currentStage'),
    championId: optionalString(body.championId),
    progress: progress as JsonObject,
  };
}
