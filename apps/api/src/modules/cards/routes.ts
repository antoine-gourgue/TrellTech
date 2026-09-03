import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateCardInput, MoveCardInput, UpdateCardInput } from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { isBoardParticipant, requireCard, requireList } from '../../lib/access.js';
import {
  cardDetailInclude,
  cardSummaryInclude,
  serializeCard,
  serializeCardDetail,
} from '../../lib/serialize.js';
import { positionAtEnd, positionBetween } from '../../lib/position.js';
import { emitBoardEvent } from '../../lib/realtime.js';
import { emitCardUpdated } from '../../lib/card-events.js';
import { recordActivity } from '../../lib/activity.js';
import { notifyCardAssigned, notifyDueSoonIfNeeded } from '../../lib/notifications.js';
import { pushCardCreated, pushCardDeleted, pushCardUpdated } from '../sync/push.js';

const IdParams = z.object({ id: z.string().min(1) });
const CardChildParams = z.object({ id: z.string().min(1), labelId: z.string().min(1) });
const CardMemberParams = z.object({ id: z.string().min(1), userId: z.string().min(1) });

export async function registerCardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/cards/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireCard(user.id, id, 'read');
    const card = await prisma.card.findUniqueOrThrow({
      where: { id },
      include: cardDetailInclude,
    });
    return serializeCardDetail(card);
  });

  app.post('/api/cards', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateCardInput.parse(request.body);
    const list = await requireList(user.id, input.listId, 'write');

    const last = await prisma.card.findFirst({
      where: { listId: input.listId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const card = await prisma.card.create({
      data: {
        listId: input.listId,
        name: input.name,
        description: input.description ?? null,
        position: positionAtEnd(last?.position ?? null),
      },
      include: cardSummaryInclude,
    });
    await recordActivity({ cardId: card.id, userId: user.id, type: 'card_created' });
    pushCardCreated(user, card, list.listTrelloId, request.log);
    emitBoardEvent({
      boardId: list.boardId,
      entity: 'card',
      action: 'created',
      id: card.id,
      actorId: user.id,
      payload: serializeCard(card),
    });
    return reply.status(201).send(serializeCard(card));
  });

  app.patch('/api/cards/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateCardInput.parse(request.body);
    const access = await requireCard(user.id, id, 'write');

    const card = await prisma.card.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.dueDate !== undefined
          ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
          : {}),
        ...(input.dueComplete !== undefined ? { dueComplete: input.dueComplete } : {}),
        ...(input.closed !== undefined ? { closed: input.closed } : {}),
      },
      include: cardSummaryInclude,
    });
    await recordActivity({ cardId: card.id, userId: user.id, type: 'card_updated' });
    await notifyDueSoonIfNeeded({
      actorId: user.id,
      boardId: access.boardId,
      cardId: card.id,
      cardName: card.name,
      dueDate: card.dueDate,
      dueComplete: card.dueComplete,
    });
    pushCardUpdated(user, card, access.listTrelloId, request.log);
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'card',
      action: 'updated',
      id: card.id,
      actorId: user.id,
      payload: serializeCard(card),
    });
    return serializeCard(card);
  });

  app.patch('/api/cards/:id/move', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = MoveCardInput.parse(request.body);
    await requireCard(user.id, id, 'write');
    const targetList = await requireList(user.id, input.listId, 'write');

    const siblings = await prisma.card.findMany({
      where: { listId: input.listId, id: { not: id } },
      orderBy: { position: 'asc' },
      select: { position: true },
    });

    const index = Math.max(0, Math.min(Math.round(input.position), siblings.length));
    const before = index > 0 ? (siblings[index - 1]?.position ?? null) : null;
    const after = index < siblings.length ? (siblings[index]?.position ?? null) : null;
    const position = positionBetween(before, after);

    const card = await prisma.card.update({
      where: { id },
      data: { listId: input.listId, position },
      include: cardSummaryInclude,
    });
    await recordActivity({
      cardId: card.id,
      userId: user.id,
      type: 'card_moved',
      data: { listId: input.listId },
    });
    pushCardUpdated(user, card, targetList.listTrelloId, request.log);
    emitBoardEvent({
      boardId: targetList.boardId,
      entity: 'card',
      action: 'moved',
      id: card.id,
      actorId: user.id,
      payload: serializeCard(card),
    });
    return serializeCard(card);
  });

  app.delete('/api/cards/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const access = await requireCard(user.id, id, 'write');
    await prisma.card.delete({ where: { id } });
    pushCardDeleted(user, access.cardTrelloId, request.log);
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'card',
      action: 'deleted',
      id,
      actorId: user.id,
    });
    return reply.status(204).send();
  });

  app.put('/api/cards/:id/labels/:labelId', async (request, reply) => {
    const user = await requireAuth(request);
    const { id, labelId } = CardChildParams.parse(request.params);
    const access = await requireCard(user.id, id, 'write');

    const label = await prisma.label.findFirst({
      where: { id: labelId, boardId: access.boardId },
      select: { id: true },
    });
    if (!label) throw NotFound('Étiquette introuvable sur ce board');

    await prisma.card.update({ where: { id }, data: { labels: { connect: { id: labelId } } } });
    await recordActivity({ cardId: id, userId: user.id, type: 'label_added', data: { labelId } });
    await emitCardUpdated(access.boardId, user.id, id);
    return reply.status(204).send();
  });

  app.delete('/api/cards/:id/labels/:labelId', async (request, reply) => {
    const user = await requireAuth(request);
    const { id, labelId } = CardChildParams.parse(request.params);
    const access = await requireCard(user.id, id, 'write');

    await prisma.card.update({ where: { id }, data: { labels: { disconnect: { id: labelId } } } });
    await recordActivity({ cardId: id, userId: user.id, type: 'label_removed', data: { labelId } });
    await emitCardUpdated(access.boardId, user.id, id);
    return reply.status(204).send();
  });

  app.put('/api/cards/:id/members/:userId', async (request, reply) => {
    const user = await requireAuth(request);
    const { id, userId } = CardMemberParams.parse(request.params);
    const access = await requireCard(user.id, id, 'write');

    const participant = await isBoardParticipant(userId, access.boardId);
    if (!participant) throw BadRequest("L'utilisateur n'est pas membre de ce board");

    const card = await prisma.card.update({
      where: { id },
      data: { members: { connect: { id: userId } } },
      select: { name: true },
    });
    await recordActivity({
      cardId: id,
      userId: user.id,
      type: 'member_added',
      data: { memberId: userId },
    });
    await notifyCardAssigned({
      actorId: user.id,
      assignedUserId: userId,
      boardId: access.boardId,
      cardId: id,
      cardName: card.name,
    });
    await emitCardUpdated(access.boardId, user.id, id);
    return reply.status(204).send();
  });

  app.delete('/api/cards/:id/members/:userId', async (request, reply) => {
    const user = await requireAuth(request);
    const { id, userId } = CardMemberParams.parse(request.params);
    const access = await requireCard(user.id, id, 'write');

    await prisma.card.update({ where: { id }, data: { members: { disconnect: { id: userId } } } });
    await recordActivity({
      cardId: id,
      userId: user.id,
      type: 'member_removed',
      data: { memberId: userId },
    });
    await emitCardUpdated(access.boardId, user.id, id);
    return reply.status(204).send();
  });
}
