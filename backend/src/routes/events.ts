import type { FastifyInstance } from 'fastify';

import type { EventService } from '../services/events.js';
import { isObject, requireString, ValidationError } from '../services/validation.js';
import type { JsonObject } from '../types.js';

export async function registerEventRoutes(
  app: FastifyInstance,
  events: EventService,
): Promise<void> {
  app.post('/events', async (request, reply) => {
    if (!isObject(request.body)) {
      throw new ValidationError('body must be an object');
    }

    const name = requireString(request.body.name, 'name');
    const payload = request.body.payload;

    if (payload !== undefined && !isObject(payload)) {
      throw new ValidationError('payload must be an object');
    }

    const event = await events.record({
      userId: getOptionalUserId(request.headers['x-user-id']),
      name,
      payload: (payload ?? {}) as JsonObject,
    });

    return reply.code(202).send({ eventId: event.id });
  });
}

function getOptionalUserId(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
