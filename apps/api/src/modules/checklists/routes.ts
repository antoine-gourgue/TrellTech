import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateChecklistInput,
  CreateChecklistItemInput,
  UpdateChecklistInput,
  UpdateChecklistItemInput,
} from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { requireCard } from '../../lib/access.js';
import { serializeChecklistFull, serializeChecklistItemRow } from '../../lib/serialize.js';
import { positionAtEnd } from '../../lib/position.js';
import { emitBoardEvent } from '../../lib/realtime.js';
import { recordActivity } from '../../lib/activity.js';

const IdParams = z.object({ id: z.string().min(1) });

async function checklistContext(userId: string, checklistId: string) {
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    select: { id: true, cardId: true },
  });
  if (!checklist) throw NotFound('Checklist introuvable');
  const access = await requireCard(userId, checklist.cardId, 'write');
  return { checklist, boardId: access.boardId };
}

async function emitChecklistUpdated(
  boardId: string,
  actorId: string,
  checklistId: string,
): Promise<void> {
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    include: { items: true },
  });
  if (!checklist) return;
  emitBoardEvent({
    boardId,
    entity: 'checklist',
    action: 'updated',
    id: checklistId,
    actorId,
    payload: serializeChecklistFull(checklist),
  });
}

export async function registerChecklistRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/checklists', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateChecklistInput.parse(request.body);
    const access = await requireCard(user.id, input.cardId, 'write');

    const last = await prisma.checklist.findFirst({
      where: { cardId: input.cardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const checklist = await prisma.checklist.create({
      data: {
        cardId: input.cardId,
        name: input.name,
        position: positionAtEnd(last?.position ?? null),
      },
      include: { items: true },
    });
    await recordActivity({
      cardId: input.cardId,
      userId: user.id,
      type: 'checklist_added',
      data: { checklistId: checklist.id },
    });
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'checklist',
      action: 'created',
      id: checklist.id,
      actorId: user.id,
      payload: serializeChecklistFull(checklist),
    });
    return reply.status(201).send(serializeChecklistFull(checklist));
  });

  app.patch('/api/checklists/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateChecklistInput.parse(request.body);
    const { boardId } = await checklistContext(user.id, id);

    const checklist = await prisma.checklist.update({
      where: { id },
      data: { ...(input.name !== undefined ? { name: input.name } : {}) },
      include: { items: true },
    });
    emitBoardEvent({
      boardId,
      entity: 'checklist',
      action: 'updated',
      id: checklist.id,
      actorId: user.id,
      payload: serializeChecklistFull(checklist),
    });
    return serializeChecklistFull(checklist);
  });

  app.delete('/api/checklists/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const { boardId, checklist } = await checklistContext(user.id, id);
    await prisma.checklist.delete({ where: { id } });
    await recordActivity({
      cardId: checklist.cardId,
      userId: user.id,
      type: 'checklist_removed',
      data: { checklistId: id },
    });
    emitBoardEvent({
      boardId,
      entity: 'checklist',
      action: 'deleted',
      id,
      actorId: user.id,
    });
    return reply.status(204).send();
  });

  app.post('/api/checklist-items', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateChecklistItemInput.parse(request.body);
    const { boardId } = await checklistContext(user.id, input.checklistId);

    const last = await prisma.checklistItem.findFirst({
      where: { checklistId: input.checklistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const item = await prisma.checklistItem.create({
      data: {
        checklistId: input.checklistId,
        name: input.name,
        position: positionAtEnd(last?.position ?? null),
      },
    });
    await emitChecklistUpdated(boardId, user.id, input.checklistId);
    return reply.status(201).send(serializeChecklistItemRow(item));
  });

  app.patch('/api/checklist-items/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateChecklistItemInput.parse(request.body);

    const existing = await prisma.checklistItem.findUnique({
      where: { id },
      select: { checklistId: true },
    });
    if (!existing) throw NotFound('Élément introuvable');
    const { boardId } = await checklistContext(user.id, existing.checklistId);

    const item = await prisma.checklistItem.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.checked !== undefined ? { checked: input.checked } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
      },
    });
    await emitChecklistUpdated(boardId, user.id, existing.checklistId);
    return serializeChecklistItemRow(item);
  });

  app.delete('/api/checklist-items/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);

    const existing = await prisma.checklistItem.findUnique({
      where: { id },
      select: { checklistId: true },
    });
    if (!existing) throw NotFound('Élément introuvable');
    const { boardId } = await checklistContext(user.id, existing.checklistId);

    await prisma.checklistItem.delete({ where: { id } });
    await emitChecklistUpdated(boardId, user.id, existing.checklistId);
    return reply.status(204).send();
  });
}
