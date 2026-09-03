import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateListInput, MoveListInput, UpdateListInput } from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../lib/session.js';
import { requireBoard, requireList } from '../../lib/access.js';
import { serializeList } from '../../lib/serialize.js';
import { positionAtEnd, positionBetween } from '../../lib/position.js';
import { emitBoardEvent } from '../../lib/realtime.js';
import { pushListCreated, pushListUpdated } from '../sync/push.js';

const IdParams = z.object({ id: z.string().min(1) });

export async function registerListRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/lists', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateListInput.parse(request.body);
    const board = await requireBoard(user.id, input.boardId, 'write');

    const last = await prisma.list.findFirst({
      where: { boardId: input.boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const list = await prisma.list.create({
      data: {
        boardId: input.boardId,
        name: input.name,
        position: positionAtEnd(last?.position ?? null),
      },
    });
    pushListCreated(user, list, board.boardTrelloId, request.log);
    emitBoardEvent({
      boardId: board.boardId,
      entity: 'list',
      action: 'created',
      id: list.id,
      actorId: user.id,
      payload: serializeList(list),
    });
    return reply.status(201).send(serializeList(list));
  });

  app.patch('/api/lists/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateListInput.parse(request.body);
    const access = await requireList(user.id, id, 'write');

    const list = await prisma.list.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.closed !== undefined ? { closed: input.closed } : {}),
      },
    });
    pushListUpdated(user, list, request.log);
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'list',
      action: 'updated',
      id: list.id,
      actorId: user.id,
      payload: serializeList(list),
    });
    return serializeList(list);
  });

  app.patch('/api/lists/:id/move', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = MoveListInput.parse(request.body);
    const access = await requireList(user.id, id, 'write');

    const siblings = await prisma.list.findMany({
      where: { boardId: access.boardId, id: { not: id } },
      orderBy: { position: 'asc' },
      select: { position: true },
    });

    const index = Math.max(0, Math.min(Math.round(input.position), siblings.length));
    const before = index > 0 ? (siblings[index - 1]?.position ?? null) : null;
    const after = index < siblings.length ? (siblings[index]?.position ?? null) : null;
    const position = positionBetween(before, after);

    const list = await prisma.list.update({ where: { id }, data: { position } });
    pushListUpdated(user, list, request.log);
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'list',
      action: 'moved',
      id: list.id,
      actorId: user.id,
      payload: serializeList(list),
    });
    return serializeList(list);
  });

  app.delete('/api/lists/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const access = await requireList(user.id, id, 'write');
    await prisma.list.delete({ where: { id } });
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'list',
      action: 'deleted',
      id,
      actorId: user.id,
    });
    return reply.status(204).send();
  });
}
