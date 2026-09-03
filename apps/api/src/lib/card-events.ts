import { prisma } from '../prisma.js';
import { cardSummaryInclude, serializeCard } from './serialize.js';
import { emitBoardEvent } from './realtime.js';

export async function emitCardUpdated(
  boardId: string,
  actorId: string,
  cardId: string,
): Promise<void> {
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: cardSummaryInclude });
  if (!card) return;
  emitBoardEvent({
    boardId,
    entity: 'card',
    action: 'updated',
    id: cardId,
    actorId,
    payload: serializeCard(card),
  });
}
