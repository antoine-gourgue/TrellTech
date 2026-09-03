import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateAttachmentInput } from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { requireCard } from '../../lib/access.js';
import { serializeAttachment } from '../../lib/serialize.js';
import { emitCardUpdated } from '../../lib/card-events.js';
import { recordActivity } from '../../lib/activity.js';

const IdParams = z.object({ id: z.string().min(1) });

export async function registerAttachmentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/attachments', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateAttachmentInput.parse(request.body);
    const access = await requireCard(user.id, input.cardId, 'write');

    const attachment = await prisma.$transaction(async (tx) => {
      if (input.isCover) {
        await tx.attachment.updateMany({
          where: { cardId: input.cardId, isCover: true },
          data: { isCover: false },
        });
      }
      return tx.attachment.create({
        data: {
          cardId: input.cardId,
          name: input.name,
          url: input.url,
          mime: input.mime ?? null,
          isCover: input.isCover ?? false,
        },
      });
    });
    await recordActivity({
      cardId: input.cardId,
      userId: user.id,
      type: 'attachment_added',
      data: { attachmentId: attachment.id },
    });
    await emitCardUpdated(access.boardId, user.id, input.cardId);
    return reply.status(201).send(serializeAttachment(attachment));
  });

  app.delete('/api/attachments/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);

    const existing = await prisma.attachment.findUnique({
      where: { id },
      select: { cardId: true },
    });
    if (!existing) throw NotFound('Pièce jointe introuvable');
    const access = await requireCard(user.id, existing.cardId, 'write');

    await prisma.attachment.delete({ where: { id } });
    await recordActivity({
      cardId: existing.cardId,
      userId: user.id,
      type: 'attachment_removed',
      data: { attachmentId: id },
    });
    await emitCardUpdated(access.boardId, user.id, existing.cardId);
    return reply.status(204).send();
  });
}
