/**
 * Push best-effort vers Trello. Stratégie de conflit : dernier écrivain gagne.
 * Une opération locale n'échoue jamais si Trello échoue ; on logge et syncedAt
 * reste en retard sur updatedAt pour tracer la divergence à re-synchroniser.
 */
import type { Board, Card, List, User, Workspace } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { trelloConfigured } from '../../env.js';
import { TrelloClient } from '../trello/client.js';

type Logger = { error: (obj: unknown, msg?: string) => void };

function canPush(user: User): user is User & { trelloToken: string } {
  return trelloConfigured() && Boolean(user.trelloToken);
}

async function safe(log: Logger, label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    log.error({ err, label }, 'Push Trello échoué (best-effort)');
  }
}

export function pushWorkspaceCreated(user: User, workspace: Workspace, log: Logger): void {
  if (!canPush(user) || workspace.trelloId) return;
  void safe(log, 'workspace.create', async () => {
    const client = new TrelloClient(user.trelloToken);
    const org = await client.createOrganization(
      workspace.displayName,
      workspace.description ?? undefined,
    );
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { trelloId: org.id, name: org.name, syncedAt: new Date() },
    });
  });
}

export function pushBoardCreated(user: User, board: Board, log: Logger): void {
  if (!canPush(user) || board.trelloId) return;
  void safe(log, 'board.create', async () => {
    const client = new TrelloClient(user.trelloToken);
    const workspace = await prisma.workspace.findUnique({ where: { id: board.workspaceId } });
    const remote = await client.createBoard(
      board.name,
      board.description ?? undefined,
      workspace?.trelloId ?? undefined,
    );
    await prisma.board.update({
      where: { id: board.id },
      data: { trelloId: remote.id, syncedAt: new Date() },
    });
  });
}

export function pushBoardUpdated(user: User, board: Board, log: Logger): void {
  if (!canPush(user) || !board.trelloId) return;
  void safe(log, 'board.update', async () => {
    const client = new TrelloClient(user.trelloToken);
    await client.updateBoard(board.trelloId as string, {
      name: board.name,
      desc: board.description ?? undefined,
      closed: board.closed,
    });
    await prisma.board.update({ where: { id: board.id }, data: { syncedAt: new Date() } });
  });
}

export function pushBoardDeleted(user: User, trelloId: string | null, log: Logger): void {
  if (!canPush(user) || !trelloId) return;
  void safe(log, 'board.delete', async () => {
    const client = new TrelloClient(user.trelloToken);
    await client.deleteBoard(trelloId);
  });
}

export function pushListCreated(user: User, list: List, boardTrelloId: string | null, log: Logger): void {
  if (!canPush(user) || list.trelloId || !boardTrelloId) return;
  void safe(log, 'list.create', async () => {
    const client = new TrelloClient(user.trelloToken);
    const remote = await client.createList(list.name, boardTrelloId, list.position);
    await prisma.list.update({
      where: { id: list.id },
      data: { trelloId: remote.id, syncedAt: new Date() },
    });
  });
}

export function pushListUpdated(user: User, list: List, log: Logger): void {
  if (!canPush(user) || !list.trelloId) return;
  void safe(log, 'list.update', async () => {
    const client = new TrelloClient(user.trelloToken);
    await client.updateList(list.trelloId as string, {
      name: list.name,
      pos: list.position,
      closed: list.closed,
    });
    await prisma.list.update({ where: { id: list.id }, data: { syncedAt: new Date() } });
  });
}

export function pushCardCreated(user: User, card: Card, listTrelloId: string | null, log: Logger): void {
  if (!canPush(user) || card.trelloId || !listTrelloId) return;
  void safe(log, 'card.create', async () => {
    const client = new TrelloClient(user.trelloToken);
    const remote = await client.createCard(
      card.name,
      listTrelloId,
      card.description ?? undefined,
      card.position,
    );
    await prisma.card.update({
      where: { id: card.id },
      data: { trelloId: remote.id, syncedAt: new Date() },
    });
  });
}

export function pushCardUpdated(user: User, card: Card, listTrelloId: string | null, log: Logger): void {
  if (!canPush(user) || !card.trelloId) return;
  void safe(log, 'card.update', async () => {
    const client = new TrelloClient(user.trelloToken);
    await client.updateCard(card.trelloId as string, {
      name: card.name,
      desc: card.description ?? undefined,
      pos: card.position,
      idList: listTrelloId ?? undefined,
      closed: card.closed,
    });
    await prisma.card.update({ where: { id: card.id }, data: { syncedAt: new Date() } });
  });
}

export function pushCardDeleted(user: User, trelloId: string | null, log: Logger): void {
  if (!canPush(user) || !trelloId) return;
  void safe(log, 'card.delete', async () => {
    const client = new TrelloClient(user.trelloToken);
    await client.deleteCard(trelloId);
  });
}
