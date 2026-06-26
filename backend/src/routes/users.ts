import type { FastifyInstance } from 'fastify';

import type { UserService } from '../services/users.js';
import { isObject, requireString } from '../services/validation.js';
import type { UserSettings } from '../types.js';

export async function registerUserRoutes(
  app: FastifyInstance,
  users: UserService,
): Promise<void> {
  app.post('/sessions', async (request, reply) => {
    if (!isObject(request.body)) {
      return reply.code(400).send({ error: 'body must be an object' });
    }

    const anonymousId = requireString(request.body.anonymousId, 'anonymousId');
    const user = await users.upsertAnonymousUser(anonymousId);

    return reply.code(201).send({ user });
  });

  app.get('/me', async (request, reply) => {
    const userId = requireUserId(request.headers['x-user-id']);
    const user = await users.getUser(userId);

    if (!user) {
      return reply.code(404).send({ error: 'user not found' });
    }

    return { user };
  });

  app.patch('/me/settings', async (request, reply) => {
    const userId = requireUserId(request.headers['x-user-id']);

    if (!isObject(request.body)) {
      return reply.code(400).send({ error: 'body must be an object' });
    }

    const user = await users.updateSettings(userId, request.body as UserSettings);

    if (!user) {
      return reply.code(404).send({ error: 'user not found' });
    }

    return { user };
  });
}

export function requireUserId(header: string | string[] | undefined): string {
  if (Array.isArray(header)) {
    return requireString(header[0], 'x-user-id');
  }

  return requireString(header, 'x-user-id');
}
