import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateBoardInput,
  CreateShareLinkInput,
  JoinBoardInput,
  ShareBoardInput,
  UpdateBoardInput,
  UpdateBoardMemberInput,
} from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { env } from '../../env.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { requireBoard, requireOwnedWorkspace } from '../../lib/access.js';
import { signShareToken, verifyShareToken } from '../../lib/share-token.js';
import {
  boardDetailInclude,
  buildBoardMembers,
  cardSummaryInclude,
  publicUserSelect,
  serializeBoard,
  serializeBoardDetail,
  serializeBoardMember,
  serializeCard,
  serializeList,
} from '../../lib/serialize.js';
import { emitBoardEvent } from '../../lib/realtime.js';
import { pushBoardCreated, pushBoardDeleted, pushBoardUpdated } from '../sync/push.js';

const IdParams = z.object({ id: z.string().min(1) });
const MemberParams = z.object({ id: z.string().min(1), userId: z.string().min(1) });

async function loadBoardMembers(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      workspace: { select: { owner: { select: publicUserSelect } } },
      memberships: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: publicUserSelect } },
      },
    },
  });
  if (!board) throw NotFound('Board introuvable');
  return buildBoardMembers(board.workspace.owner, board.memberships);
}

export async function registerBoardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/boards/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireBoard(user.id, id, 'read');
    const board = await prisma.board.findUniqueOrThrow({
      where: { id },
      include: boardDetailInclude,
    });
    return serializeBoardDetail(board);
  });

  app.post('/api/boards', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateBoardInput.parse(request.body);
    await requireOwnedWorkspace(user.id, input.workspaceId);

    const board = await prisma.board.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        background: input.background ?? null,
      },
    });
    pushBoardCreated(user, board, request.log);
    return reply.status(201).send(serializeBoard(board));
  });

  app.patch('/api/boards/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateBoardInput.parse(request.body);
    const access = await requireBoard(user.id, id, 'write');

    const board = await prisma.board.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.background !== undefined ? { background: input.background } : {}),
        ...(input.closed !== undefined ? { closed: input.closed } : {}),
      },
    });
    pushBoardUpdated(user, board, request.log);
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'board',
      action: 'updated',
      id: board.id,
      actorId: user.id,
      payload: serializeBoard(board),
    });
    return serializeBoard(board);
  });

  app.delete('/api/boards/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const access = await requireBoard(user.id, id, 'write');
    if (access.role !== 'OWNER') throw Forbidden('Seul le propriétaire peut supprimer ce board');
    await prisma.board.delete({ where: { id } });
    pushBoardDeleted(user, access.boardTrelloId, request.log);
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'board',
      action: 'deleted',
      id,
      actorId: user.id,
    });
    return reply.status(204).send();
  });

  app.get('/api/boards/:id/members', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireBoard(user.id, id, 'read');
    return loadBoardMembers(id);
  });

  // Éléments archivés (listes et cartes fermées) d'un board.
  app.get('/api/boards/:id/archive', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireBoard(user.id, id, 'read');
    const [lists, cards] = await Promise.all([
      prisma.list.findMany({
        where: { boardId: id, closed: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.card.findMany({
        where: { closed: true, list: { boardId: id } },
        include: cardSummaryInclude,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return { lists: lists.map(serializeList), cards: cards.map(serializeCard) };
  });

  app.post('/api/boards/:id/members', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = ShareBoardInput.parse(request.body);
    const access = await requireBoard(user.id, id, 'write');
    if (access.role !== 'OWNER') throw Forbidden('Seul le propriétaire peut partager ce board');

    const target = await prisma.user.findFirst({
      where: { OR: [{ id: input.userQuery }, { username: input.userQuery }] },
      select: { ...publicUserSelect },
    });
    if (!target) throw NotFound('Utilisateur introuvable');

    const workspace = await prisma.workspace.findFirst({
      where: { boards: { some: { id } } },
      select: { ownerId: true },
    });
    if (workspace?.ownerId === target.id) {
      throw BadRequest('Cet utilisateur est déjà propriétaire du board');
    }

    const membership = await prisma.boardMembership.upsert({
      where: { boardId_userId: { boardId: id, userId: target.id } },
      create: { boardId: id, userId: target.id, role: input.role },
      update: { role: input.role },
      include: { user: { select: publicUserSelect } },
    });
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'member',
      action: 'created',
      id: target.id,
      actorId: user.id,
    });
    return reply
      .status(201)
      .send(serializeBoardMember(membership.user, membership.role));
  });

  app.patch('/api/boards/:id/members/:userId', async (request) => {
    const user = await requireAuth(request);
    const { id, userId } = MemberParams.parse(request.params);
    const input = UpdateBoardMemberInput.parse(request.body);
    const access = await requireBoard(user.id, id, 'write');
    if (access.role !== 'OWNER') throw Forbidden('Seul le propriétaire peut modifier les rôles');

    const existing = await prisma.boardMembership.findUnique({
      where: { boardId_userId: { boardId: id, userId } },
      select: { id: true },
    });
    if (!existing) throw NotFound('Membre introuvable');

    const membership = await prisma.boardMembership.update({
      where: { boardId_userId: { boardId: id, userId } },
      data: { role: input.role },
      include: { user: { select: publicUserSelect } },
    });
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'member',
      action: 'updated',
      id: userId,
      actorId: user.id,
    });
    return serializeBoardMember(membership.user, membership.role);
  });

  app.delete('/api/boards/:id/members/:userId', async (request, reply) => {
    const user = await requireAuth(request);
    const { id, userId } = MemberParams.parse(request.params);
    const access = await requireBoard(user.id, id, 'write');
    if (access.role !== 'OWNER') throw Forbidden('Seul le propriétaire peut retirer un membre');

    const existing = await prisma.boardMembership.findUnique({
      where: { boardId_userId: { boardId: id, userId } },
      select: { id: true },
    });
    if (!existing) throw NotFound('Membre introuvable');

    await prisma.boardMembership.delete({
      where: { boardId_userId: { boardId: id, userId } },
    });
    emitBoardEvent({
      boardId: access.boardId,
      entity: 'member',
      action: 'deleted',
      id: userId,
      actorId: user.id,
    });
    return reply.status(204).send();
  });

  // ─── Lien de partage (jeton signé, sans stockage) ──────────────────
  app.get('/api/boards/:id/share-link', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const { role } = CreateShareLinkInput.parse(request.query);
    const access = await requireBoard(user.id, id, 'write');
    if (access.role !== 'OWNER')
      throw Forbidden('Seul le propriétaire peut générer un lien de partage');

    const token = signShareToken('board', id, role);
    return { token, role, url: `${env.WEB_ORIGIN}/join/${token}` };
  });

  app.post('/api/boards/join', async (request) => {
    const user = await requireAuth(request);
    const { token } = JoinBoardInput.parse(request.body);
    const payload = verifyShareToken(token);
    if (!payload || payload.t !== 'board') throw BadRequest('Lien de partage invalide ou expiré');

    const board = await prisma.board.findUnique({
      where: { id: payload.id },
      include: { workspace: { select: { ownerId: true } } },
    });
    if (!board) throw NotFound('Board introuvable');

    // Le propriétaire du workspace a déjà tous les droits : rien à créer.
    if (board.workspace.ownerId !== user.id) {
      await prisma.boardMembership.upsert({
        where: { boardId_userId: { boardId: board.id, userId: user.id } },
        create: { boardId: board.id, userId: user.id, role: payload.r },
        update: {}, // ne pas écraser un rôle existant (ex. déjà EDITOR)
      });
      emitBoardEvent({
        boardId: board.id,
        entity: 'member',
        action: 'created',
        id: user.id,
        actorId: user.id,
      });
    }
    return serializeBoard(board);
  });
}
