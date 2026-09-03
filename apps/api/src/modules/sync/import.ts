/**
 * Import initial depuis Trello vers la BDD locale, upsert par trelloId.
 * Stratégie de conflit : dernier écrivain gagne — l'import écrase les champs
 * locaux avec l'état Trello et pose syncedAt=now sur chaque entité importée.
 */
import type { User } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { BadRequest } from '../../lib/errors.js';
import { TrelloClient } from '../trello/client.js';

export interface ImportSummary {
  workspaces: number;
  boards: number;
  lists: number;
  cards: number;
}

const DEFAULT_WORKSPACE_NAME = 'Personnel';

export async function importFromTrello(user: User): Promise<ImportSummary> {
  if (!user.trelloToken) throw BadRequest('Liez d’abord votre compte Trello');
  const client = new TrelloClient(user.trelloToken);
  const now = new Date();
  const summary: ImportSummary = { workspaces: 0, boards: 0, lists: 0, cards: 0 };

  const organizations = await client.organizations();
  const orgIdToWorkspaceId = new Map<string, string>();

  for (const org of organizations) {
    const workspace = await prisma.workspace.upsert({
      where: { trelloId: org.id },
      create: {
        trelloId: org.id,
        name: org.name,
        displayName: org.displayName || org.name,
        description: org.desc ?? null,
        ownerId: user.id,
        syncedAt: now,
      },
      update: {
        name: org.name,
        displayName: org.displayName || org.name,
        description: org.desc ?? null,
        syncedAt: now,
      },
    });
    orgIdToWorkspaceId.set(org.id, workspace.id);
    summary.workspaces += 1;
  }

  const boards = await client.boards();
  const needsDefault = boards.some((b) => !b.idOrganization);
  let defaultWorkspaceId: string | null = null;

  if (needsDefault) {
    const existing = await prisma.workspace.findFirst({
      where: { ownerId: user.id, trelloId: null, displayName: DEFAULT_WORKSPACE_NAME },
    });
    const workspace =
      existing ??
      (await prisma.workspace.create({
        data: {
          name: DEFAULT_WORKSPACE_NAME.toLowerCase(),
          displayName: DEFAULT_WORKSPACE_NAME,
          ownerId: user.id,
          syncedAt: now,
        },
      }));
    defaultWorkspaceId = workspace.id;
    summary.workspaces += 1;
  }

  for (const board of boards) {
    const workspaceId = board.idOrganization
      ? orgIdToWorkspaceId.get(board.idOrganization) ?? defaultWorkspaceId
      : defaultWorkspaceId;
    if (!workspaceId) continue;

    const localBoard = await prisma.board.upsert({
      where: { trelloId: board.id },
      create: {
        trelloId: board.id,
        workspaceId,
        name: board.name,
        description: board.desc ?? null,
        background: board.prefs?.background ?? null,
        closed: board.closed,
        syncedAt: now,
      },
      update: {
        workspaceId,
        name: board.name,
        description: board.desc ?? null,
        background: board.prefs?.background ?? null,
        closed: board.closed,
        syncedAt: now,
      },
    });
    summary.boards += 1;

    const [lists, cards, labels] = await Promise.all([
      client.listsForBoard(board.id),
      client.cardsForBoard(board.id),
      client.labelsForBoard(board.id),
    ]);
    const listTrelloIdToLocalId = new Map<string, string>();
    const labelTrelloIdToLocalId = new Map<string, string>();

    for (const label of labels) {
      if (!label.name && !label.color) continue;
      const localLabel = await prisma.label.upsert({
        where: { trelloId: label.id },
        create: {
          trelloId: label.id,
          boardId: localBoard.id,
          name: label.name || label.color || 'Étiquette',
          color: label.color ?? 'gray',
        },
        update: {
          boardId: localBoard.id,
          name: label.name || label.color || 'Étiquette',
          color: label.color ?? 'gray',
        },
      });
      labelTrelloIdToLocalId.set(label.id, localLabel.id);
    }

    for (const list of lists) {
      const localList = await prisma.list.upsert({
        where: { trelloId: list.id },
        create: {
          trelloId: list.id,
          boardId: localBoard.id,
          name: list.name,
          position: list.pos,
          closed: list.closed,
          syncedAt: now,
        },
        update: {
          boardId: localBoard.id,
          name: list.name,
          position: list.pos,
          closed: list.closed,
          syncedAt: now,
        },
      });
      listTrelloIdToLocalId.set(list.id, localList.id);
      summary.lists += 1;
    }

    for (const card of cards) {
      const listId = listTrelloIdToLocalId.get(card.idList);
      if (!listId) continue;
      const labelConnect = (card.idLabels ?? [])
        .map((trelloLabelId) => labelTrelloIdToLocalId.get(trelloLabelId))
        .filter((localId): localId is string => Boolean(localId))
        .map((localId) => ({ id: localId }));
      await prisma.card.upsert({
        where: { trelloId: card.id },
        create: {
          trelloId: card.id,
          listId,
          name: card.name,
          description: card.desc ?? null,
          position: card.pos,
          dueDate: card.due ? new Date(card.due) : null,
          dueComplete: card.dueComplete ?? false,
          closed: card.closed,
          syncedAt: now,
          labels: { connect: labelConnect },
        },
        update: {
          listId,
          name: card.name,
          description: card.desc ?? null,
          position: card.pos,
          dueDate: card.due ? new Date(card.due) : null,
          dueComplete: card.dueComplete ?? false,
          closed: card.closed,
          syncedAt: now,
          labels: { set: labelConnect },
        },
      });
      summary.cards += 1;
    }
  }

  return summary;
}
