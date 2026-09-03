import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateLabelInput, UpdateLabelInput } from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { requireBoard } from '../../lib/access.js';
import { serializeLabel } from '../../lib/serialize.js';
import { emitBoardEvent } from '../../lib/realtime.js';

const IdParams = z.object({ id: z.string().min(1) });

async function requireLabelBoard(userId: string, labelId: string) {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    select: { id: true, boardId: true },
  });
  if (!label) throw NotFound('Étiquette introuvable');
  await requireBoard(userId, label.boardId, 'write');
  return label;
}

export async function registerLabelRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/labels', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateLabelInput.parse(request.body);
    await requireBoard(user.id, input.boardId, 'write');

    const label = await prisma.label.create({
      data: { boardId: input.boardId, name: input.name, color: input.color },
    });
    emitBoardEvent({
      boardId: label.boardId,
      entity: 'label',
      action: 'created',
      id: label.id,
      actorId: user.id,
      payload: serializeLabel(label),
    });
    return reply.status(201).send(serializeLabel(label));
  });

  app.patch('/api/labels/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateLabelInput.parse(request.body);
    await requireLabelBoard(user.id, id);

    const label = await prisma.label.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });
    emitBoardEvent({
      boardId: label.boardId,
      entity: 'label',
      action: 'updated',
      id: label.id,
      actorId: user.id,
      payload: serializeLabel(label),
    });
    return serializeLabel(label);
  });

  app.delete('/api/labels/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const label = await requireLabelBoard(user.id, id);
    await prisma.label.delete({ where: { id } });
    emitBoardEvent({
      boardId: label.boardId,
      entity: 'label',
      action: 'deleted',
      id,
      actorId: user.id,
    });
    return reply.status(204).send();
  });
}
