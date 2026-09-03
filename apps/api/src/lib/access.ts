import type { BoardRole } from '@prisma/client';
import { prisma } from '../prisma.js';
import { Forbidden, NotFound } from './errors.js';

export type AccessMode = 'read' | 'write';

export interface BoardAccess {
  boardId: string;
  workspaceId: string;
  boardTrelloId: string | null;
  role: BoardRole;
}

export interface ListAccess extends BoardAccess {
  listId: string;
  listTrelloId: string | null;
}

export interface CardAccess extends ListAccess {
  cardId: string;
  cardTrelloId: string | null;
}

export interface WorkspaceAccess {
  workspaceId: string;
  role: BoardRole;
}

export interface DocAccess {
  docId: string;
  workspaceId: string;
  role: BoardRole;
}

export interface WhiteboardAccess {
  whiteboardId: string;
  workspaceId: string;
  role: BoardRole;
}

const ROLE_RANK: Record<BoardRole, number> = { OWNER: 3, EDITOR: 2, VIEWER: 1 };

function strongest(...roles: (BoardRole | null | undefined)[]): BoardRole | null {
  let best: BoardRole | null = null;
  for (const role of roles) {
    if (!role) continue;
    if (best === null || ROLE_RANK[role] > ROLE_RANK[best]) best = role;
  }
  return best;
}

function assertMode<T extends { role: BoardRole }>(access: T, mode: AccessMode): T {
  if (mode === 'write' && access.role === 'VIEWER') {
    throw Forbidden('Vous êtes en lecture seule sur cette ressource');
  }
  return access;
}

export async function requireOwnedWorkspace(userId: string, workspaceId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: userId },
  });
  if (!workspace) throw NotFound('Workspace introuvable');
  return workspace;
}

async function resolveWorkspaceRole(userId: string, workspaceId: string): Promise<BoardRole | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (!workspace) return null;
  if (workspace.ownerId === userId) return 'OWNER';
  const membership = await prisma.workspaceMembership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
  mode: AccessMode = 'read',
): Promise<WorkspaceAccess> {
  const role = await resolveWorkspaceRole(userId, workspaceId);
  if (!role) throw NotFound('Workspace introuvable');
  return assertMode({ workspaceId, role }, mode);
}

async function resolveBoardAccess(userId: string, boardId: string): Promise<BoardAccess | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      workspaceId: true,
      trelloId: true,
      workspace: { select: { ownerId: true } },
    },
  });
  if (!board) return null;

  if (board.workspace.ownerId === userId) {
    return {
      boardId: board.id,
      workspaceId: board.workspaceId,
      boardTrelloId: board.trelloId,
      role: 'OWNER',
    };
  }

  const [workspaceMembership, boardMembership] = await Promise.all([
    prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: board.workspaceId, userId } },
      select: { role: true },
    }),
    prisma.boardMembership.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { role: true },
    }),
  ]);

  const role = strongest(workspaceMembership?.role, boardMembership?.role);
  if (!role) return null;

  return {
    boardId: board.id,
    workspaceId: board.workspaceId,
    boardTrelloId: board.trelloId,
    role,
  };
}

export async function isBoardParticipant(userId: string, boardId: string): Promise<boolean> {
  const access = await resolveBoardAccess(userId, boardId);
  return access !== null;
}

export async function requireBoard(
  userId: string,
  boardId: string,
  mode: AccessMode = 'read',
): Promise<BoardAccess> {
  const access = await resolveBoardAccess(userId, boardId);
  if (!access) throw NotFound('Board introuvable');
  return assertMode(access, mode);
}

export async function requireList(
  userId: string,
  listId: string,
  mode: AccessMode = 'read',
): Promise<ListAccess> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { id: true, boardId: true, trelloId: true },
  });
  if (!list) throw NotFound('Liste introuvable');
  const access = await requireBoard(userId, list.boardId, mode);
  return { ...access, listId: list.id, listTrelloId: list.trelloId };
}

export async function requireCard(
  userId: string,
  cardId: string,
  mode: AccessMode = 'read',
): Promise<CardAccess> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      listId: true,
      trelloId: true,
      list: { select: { boardId: true, trelloId: true } },
    },
  });
  if (!card) throw NotFound('Carte introuvable');
  const access = await requireBoard(userId, card.list.boardId, mode);
  return {
    ...access,
    listId: card.listId,
    listTrelloId: card.list.trelloId,
    cardId: card.id,
    cardTrelloId: card.trelloId,
  };
}

export async function requireDoc(
  userId: string,
  docId: string,
  mode: AccessMode = 'read',
): Promise<DocAccess> {
  const doc = await prisma.doc.findUnique({
    where: { id: docId },
    select: {
      id: true,
      workspaceId: true,
      workspace: { select: { ownerId: true } },
    },
  });
  if (!doc) throw NotFound('Document introuvable');

  let role: BoardRole | null;
  if (doc.workspace.ownerId === userId) {
    role = 'OWNER';
  } else {
    const [workspaceMembership, docMembership] = await Promise.all([
      prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: doc.workspaceId, userId } },
        select: { role: true },
      }),
      prisma.docMembership.findUnique({
        where: { docId_userId: { docId, userId } },
        select: { role: true },
      }),
    ]);
    role = strongest(workspaceMembership?.role, docMembership?.role);
  }
  if (!role) throw NotFound('Document introuvable');
  return assertMode({ docId: doc.id, workspaceId: doc.workspaceId, role }, mode);
}

export async function requireWhiteboard(
  userId: string,
  whiteboardId: string,
  mode: AccessMode = 'read',
): Promise<WhiteboardAccess> {
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
    select: {
      id: true,
      workspaceId: true,
      workspace: { select: { ownerId: true } },
    },
  });
  if (!whiteboard) throw NotFound('Tableau blanc introuvable');

  let role: BoardRole | null;
  if (whiteboard.workspace.ownerId === userId) {
    role = 'OWNER';
  } else {
    const [workspaceMembership, whiteboardMembership] = await Promise.all([
      prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: whiteboard.workspaceId, userId } },
        select: { role: true },
      }),
      prisma.whiteboardMembership.findUnique({
        where: { whiteboardId_userId: { whiteboardId, userId } },
        select: { role: true },
      }),
    ]);
    role = strongest(workspaceMembership?.role, whiteboardMembership?.role);
  }
  if (!role) throw NotFound('Tableau blanc introuvable');
  return assertMode({ whiteboardId: whiteboard.id, workspaceId: whiteboard.workspaceId, role }, mode);
}
