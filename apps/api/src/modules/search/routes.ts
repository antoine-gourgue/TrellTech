import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { SearchQueryInput } from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../lib/session.js';
import {
  cardSummaryInclude,
  serializeBoard,
  serializeCard,
  serializeDocSummary,
} from '../../lib/serialize.js';

const RESULT_LIMIT = 20;

export async function registerSearchRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/search', async (request) => {
    const user = await requireAuth(request);
    const { q } = SearchQueryInput.parse(request.query);

    const boardScope: Prisma.BoardWhereInput = {
      OR: [{ workspace: { ownerId: user.id } }, { memberships: { some: { userId: user.id } } }],
    };
    const contains: Prisma.StringFilter = { contains: q, mode: 'insensitive' };

    const [boards, cards, docs] = await Promise.all([
      prisma.board.findMany({
        where: { AND: [boardScope, { closed: false, name: contains }] },
        orderBy: { updatedAt: 'desc' },
        take: RESULT_LIMIT,
      }),
      prisma.card.findMany({
        where: {
          closed: false,
          list: { board: boardScope },
          OR: [{ name: contains }, { description: contains }],
        },
        include: cardSummaryInclude,
        orderBy: { updatedAt: 'desc' },
        take: RESULT_LIMIT,
      }),
      prisma.doc.findMany({
        where: { workspace: { ownerId: user.id }, title: contains },
        orderBy: { updatedAt: 'desc' },
        take: RESULT_LIMIT,
      }),
    ]);

    return {
      boards: boards.map(serializeBoard),
      cards: cards.map(serializeCard),
      docs: docs.map(serializeDocSummary),
    };
  });
}
