import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateCommentInput, UpdateCommentInput } from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { requireCard } from '../../lib/access.js';
import { publicUserSelect, serializeCommentRow } from '../../lib/serialize.js';
import { emitBoardEvent } from '../../lib/realtime.js';
import { recordActivity } from '../../lib/activity.js';
import { notifyCardComment } from '../../lib/notifications.js';

const IdParams = z.object({ id: z.string().min(1) });

export async function registerCommentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/comments', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateCommentInput.parse(request.body);
    const access = await requireCard(user.id, input.cardId, 'write');

    const comment = await prisma.comment.create({
      data: { cardId: input.cardId, authorId: user.id, text: input.text },
      include: { author: { select: publicUserSelect } },
    });
    await recordActivity({
      cardId: input.cardId,
      userId: user.id,
      type: 'comment_added',
      data: { commentId: comment.id },
    });
    const card = await prisma.card.findUnique({
      where: { id: input.cardId },
      select: { name: true },
    });
    await notifyCardComment({
      actorId: user.id,
      boardId: access.boardId,
      cardId: input.cardId,
      cardName: card?.name ?? '',
    });
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'comment',
      action: 'created',
      id: comment.id,
      actorId: user.id,
      payload: serializeCommentRow(comment),
    });
    return reply.status(201).send(serializeCommentRow(comment));
  });

  app.patch('/api/comments/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateCommentInput.parse(request.body);

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { cardId: true, authorId: true },
    });
    if (!existing) throw NotFound('Commentaire introuvable');
    const access = await requireCard(user.id, existing.cardId, 'write');
    if (existing.authorId !== user.id) throw Forbidden('Vous ne pouvez modifier que vos commentaires');

    const comment = await prisma.comment.update({
      where: { id },
      data: { text: input.text },
      include: { author: { select: publicUserSelect } },
    });
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'comment',
      action: 'updated',
      id: comment.id,
      actorId: user.id,
      payload: serializeCommentRow(comment),
    });
    return serializeCommentRow(comment);
  });

  app.delete('/api/comments/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { cardId: true, authorId: true },
    });
    if (!existing) throw NotFound('Commentaire introuvable');
    const access = await requireCard(user.id, existing.cardId, 'write');
    if (existing.authorId !== user.id && access.role !== 'OWNER') {
      throw Forbidden('Vous ne pouvez supprimer que vos commentaires');
    }

    await prisma.comment.delete({ where: { id } });
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'comment',
      action: 'deleted',
      id,
      actorId: user.id,
    });
    return reply.status(204).send();
  });
}
