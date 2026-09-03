import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { serializeNotification } from '../../lib/serialize.js';

const IdParams = z.object({ id: z.string().min(1) });
const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
});

export async function registerNotificationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/notifications', async (request) => {
    const user = await requireAuth(request);
    const { limit, cursor } = ListQuery.parse(request.query);

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return notifications.map(serializeNotification);
  });

  app.post('/api/notifications/:id/read', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
    if (result.count === 0) throw NotFound('Notification introuvable');
    return reply.status(204).send();
  });

  app.post('/api/notifications/read-all', async (request, reply) => {
    const user = await requireAuth(request);
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return reply.status(204).send();
  });
}
