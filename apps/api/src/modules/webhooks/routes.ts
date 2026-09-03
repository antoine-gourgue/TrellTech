import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { emitBoardEvent } from '../../lib/realtime.js';
import { cardSummaryInclude, serializeCard, serializeList } from '../../lib/serialize.js';

/**
 * Callbacks Trello (best-effort, jamais bloquants).
 * On applique les changements distants aux entités locales SYNCHRONISÉES
 * (retrouvées par leur trelloId) puis on notifie les abonnés temps réel avec
 * un actorId null. Toute erreur est loggée et avalée : Trello reçoit toujours 200.
 */

const TrelloAction = z.object({
  action: z
    .object({
      type: z.string(),
      data: z
        .object({
          board: z.object({ id: z.string() }).partial().optional(),
          card: z
            .object({ id: z.string(), name: z.string(), desc: z.string(), pos: z.number(), closed: z.boolean() })
            .partial()
            .optional(),
          list: z.object({ id: z.string(), name: z.string() }).partial().optional(),
          listAfter: z.object({ id: z.string() }).partial().optional(),
        })
        .partial()
        .optional(),
    })
    .optional(),
});

async function applyRemoteChange(body: unknown): Promise<void> {
  const parsed = TrelloAction.safeParse(body);
  if (!parsed.success || !parsed.data.action) return;
  const { type, data } = parsed.data.action;
  if (!data) return;

  if (type === 'updateCard' && data.card?.id) {
    const card = await prisma.card.findUnique({
      where: { trelloId: data.card.id },
      select: { id: true, list: { select: { boardId: true } } },
    });
    if (!card) return;
    const targetListId = data.listAfter?.id
      ? (await prisma.list.findUnique({ where: { trelloId: data.listAfter.id }, select: { id: true } }))?.id
      : undefined;
    const updated = await prisma.card.update({
      where: { id: card.id },
      data: {
        ...(data.card.name !== undefined ? { name: data.card.name } : {}),
        ...(data.card.desc !== undefined ? { description: data.card.desc } : {}),
        ...(data.card.pos !== undefined ? { position: data.card.pos } : {}),
        ...(data.card.closed !== undefined ? { closed: data.card.closed } : {}),
        ...(targetListId ? { listId: targetListId } : {}),
        syncedAt: new Date(),
      },
      include: cardSummaryInclude,
    });
    emitBoardEvent({
      boardId: card.list.boardId,
      entity: 'card',
      action: 'updated',
      id: updated.id,
      actorId: null,
      payload: serializeCard(updated),
    });
    return;
  }

  if (type === 'deleteCard' && data.card?.id) {
    const card = await prisma.card.findUnique({
      where: { trelloId: data.card.id },
      select: { id: true, list: { select: { boardId: true } } },
    });
    if (!card) return;
    await prisma.card.delete({ where: { id: card.id } });
    emitBoardEvent({
      boardId: card.list.boardId,
      entity: 'card',
      action: 'deleted',
      id: card.id,
      actorId: null,
    });
    return;
  }

  if (type === 'updateList' && data.list?.id) {
    const list = await prisma.list.findUnique({
      where: { trelloId: data.list.id },
      select: { id: true, boardId: true },
    });
    if (!list) return;
    const updated = await prisma.list.update({
      where: { id: list.id },
      data: { ...(data.list.name !== undefined ? { name: data.list.name } : {}), syncedAt: new Date() },
    });
    emitBoardEvent({
      boardId: list.boardId,
      entity: 'list',
      action: 'updated',
      id: updated.id,
      actorId: null,
      payload: serializeList(updated),
    });
  }
}

export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.head('/api/webhooks/trello', async (_request, reply) => reply.status(200).send());

  app.post('/api/webhooks/trello', async (request, reply) => {
    try {
      await applyRemoteChange(request.body);
    } catch (err) {
      request.log.error({ err }, 'Webhook Trello: application best-effort échouée');
    }
    return reply.status(200).send({ ok: true });
  });
}
