import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => ({
    ok: true,
    service: 'fixtura-backend',
    health: '/health',
  }));

  app.get('/health', async () => ({
    ok: true,
    service: 'fixtura-backend',
  }));

  app.get('/favicon.ico', async (_request, reply) => {
    return reply.code(204).send();
  });
}
