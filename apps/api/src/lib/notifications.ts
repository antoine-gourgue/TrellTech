import { prisma } from '../prisma.js';

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function notifyCardAssigned(input: {
  actorId: string;
  assignedUserId: string;
  boardId: string;
  cardId: string;
  cardName: string;
}): Promise<void> {
  if (input.assignedUserId === input.actorId) return;
  await prisma.notification.create({
    data: {
      userId: input.assignedUserId,
      type: 'card_assigned',
      title: 'Nouvelle assignation',
      message: `Vous avez été assigné à la carte « ${input.cardName} »`,
      boardId: input.boardId,
      cardId: input.cardId,
    },
  });
}

export async function notifyCardComment(input: {
  actorId: string;
  boardId: string;
  cardId: string;
  cardName: string;
}): Promise<void> {
  const card = await prisma.card.findUnique({
    where: { id: input.cardId },
    select: { members: { select: { id: true } } },
  });
  const recipients = (card?.members ?? [])
    .map((member) => member.id)
    .filter((id) => id !== input.actorId);
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: 'comment_added',
      title: 'Nouveau commentaire',
      message: `Nouveau commentaire sur la carte « ${input.cardName} »`,
      boardId: input.boardId,
      cardId: input.cardId,
    })),
  });
}

export async function notifyDueSoonIfNeeded(input: {
  actorId: string;
  boardId: string;
  cardId: string;
  cardName: string;
  dueDate: Date | null;
  dueComplete: boolean;
}): Promise<void> {
  if (!input.dueDate || input.dueComplete) return;
  const delta = input.dueDate.getTime() - Date.now();
  if (delta < 0 || delta > DUE_SOON_WINDOW_MS) return;

  const card = await prisma.card.findUnique({
    where: { id: input.cardId },
    select: { members: { select: { id: true } } },
  });
  const recipients = (card?.members ?? []).map((member) => member.id);
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: 'due_soon',
      title: 'Échéance proche',
      message: `La carte « ${input.cardName} » arrive à échéance`,
      boardId: input.boardId,
      cardId: input.cardId,
    })),
  });
}
