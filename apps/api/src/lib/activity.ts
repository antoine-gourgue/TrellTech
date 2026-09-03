import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export async function recordActivity(input: {
  cardId: string;
  userId: string | null;
  type: string;
  data?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.activity.create({
    data: {
      cardId: input.cardId,
      userId: input.userId,
      type: input.type,
      ...(input.data !== undefined ? { data: input.data } : {}),
    },
  });
}
