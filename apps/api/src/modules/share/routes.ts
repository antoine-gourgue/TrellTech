import type { FastifyInstance } from 'fastify';
import { JoinBoardInput } from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import {
  serializeBoard,
  serializeDocSummary,
  serializeWhiteboardSummary,
} from '../../lib/serialize.js';
import { emitBoardEvent } from '../../lib/realtime.js';
import { verifyShareToken } from '../../lib/share-token.js';

interface JoinResult {
  type: 'workspace' | 'board' | 'doc' | 'whiteboard';
  id: string;
  workspaceId?: string;
}

async function joinWorkspace(userId: string, workspaceId: string, role: 'EDITOR' | 'VIEWER'): Promise<JoinResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  });
  if (!workspace) throw NotFound('Espace introuvable');
  if (workspace.ownerId !== userId) {
    await prisma.workspaceMembership.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      create: { workspaceId, userId, role },
      update: {},
    });
  }
  return { type: 'workspace', id: workspace.id };
}

async function joinBoard(userId: string, boardId: string, role: 'EDITOR' | 'VIEWER'): Promise<JoinResult> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, workspaceId: true, workspace: { select: { ownerId: true } } },
  });
  if (!board) throw NotFound('Board introuvable');
  if (board.workspace.ownerId !== userId) {
    await prisma.boardMembership.upsert({
      where: { boardId_userId: { boardId, userId } },
      create: { boardId, userId, role },
      update: {},
    });
    emitBoardEvent({
      boardId: board.id,
      entity: 'member',
      action: 'created',
      id: userId,
      actorId: userId,
    });
  }
  return { type: 'board', id: board.id, workspaceId: board.workspaceId };
}

async function joinDoc(userId: string, docId: string, role: 'EDITOR' | 'VIEWER'): Promise<JoinResult> {
  const doc = await prisma.doc.findUnique({
    where: { id: docId },
    select: { id: true, workspaceId: true, workspace: { select: { ownerId: true } } },
  });
  if (!doc) throw NotFound('Document introuvable');
  if (doc.workspace.ownerId !== userId) {
    await prisma.docMembership.upsert({
      where: { docId_userId: { docId, userId } },
      create: { docId, userId, role },
      update: {},
    });
  }
  return { type: 'doc', id: doc.id, workspaceId: doc.workspaceId };
}

async function joinWhiteboard(userId: string, whiteboardId: string, role: 'EDITOR' | 'VIEWER'): Promise<JoinResult> {
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
    select: { id: true, workspaceId: true, workspace: { select: { ownerId: true } } },
  });
  if (!whiteboard) throw NotFound('Tableau blanc introuvable');
  if (whiteboard.workspace.ownerId !== userId) {
    await prisma.whiteboardMembership.upsert({
      where: { whiteboardId_userId: { whiteboardId, userId } },
      create: { whiteboardId, userId, role },
      update: {},
    });
  }
  return { type: 'whiteboard', id: whiteboard.id, workspaceId: whiteboard.workspaceId };
}

export async function registerShareRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/share/join', async (request) => {
    const user = await requireAuth(request);
    const { token } = JoinBoardInput.parse(request.body);
    const payload = verifyShareToken(token);
    if (!payload) throw BadRequest('Lien de partage invalide ou expiré');

    switch (payload.t) {
      case 'workspace':
        return joinWorkspace(user.id, payload.id, payload.r);
      case 'board':
        return joinBoard(user.id, payload.id, payload.r);
      case 'doc':
        return joinDoc(user.id, payload.id, payload.r);
      case 'whiteboard':
        return joinWhiteboard(user.id, payload.id, payload.r);
      default:
        throw BadRequest('Lien de partage invalide ou expiré');
    }
  });

  app.get('/api/shared', async (request) => {
    const user = await requireAuth(request);

    const [owned, workspaceMemberships] = await Promise.all([
      prisma.workspace.findMany({ where: { ownerId: user.id }, select: { id: true } }),
      prisma.workspaceMembership.findMany({ where: { userId: user.id }, select: { workspaceId: true } }),
    ]);
    const coveredWorkspaceIds = new Set<string>([
      ...owned.map((w) => w.id),
      ...workspaceMemberships.map((m) => m.workspaceId),
    ]);
    const excluded = [...coveredWorkspaceIds];

    const [boardRows, docRows, whiteboardRows] = await Promise.all([
      prisma.boardMembership.findMany({
        where: {
          userId: user.id,
          board: { closed: false, workspaceId: { notIn: excluded } },
        },
        orderBy: { createdAt: 'asc' },
        include: { board: true },
      }),
      prisma.docMembership.findMany({
        where: { userId: user.id, doc: { workspaceId: { notIn: excluded } } },
        orderBy: { createdAt: 'asc' },
        include: { doc: true },
      }),
      prisma.whiteboardMembership.findMany({
        where: { userId: user.id, whiteboard: { workspaceId: { notIn: excluded } } },
        orderBy: { createdAt: 'asc' },
        include: { whiteboard: true },
      }),
    ]);

    return {
      boards: boardRows.map((row) => serializeBoard(row.board)),
      docs: docRows.map((row) => serializeDocSummary(row.doc)),
      whiteboards: whiteboardRows.map((row) => serializeWhiteboardSummary(row.whiteboard)),
    };
  });
}
