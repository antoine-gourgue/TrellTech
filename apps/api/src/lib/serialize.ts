import { Prisma } from '@prisma/client';
import type {
  Attachment as PrismaAttachment,
  Board as PrismaBoard,
  BoardRole,
  ChecklistItem as PrismaChecklistItem,
  Doc as PrismaDoc,
  Label as PrismaLabel,
  List as PrismaList,
  Notification as PrismaNotification,
  User as PrismaUser,
  Whiteboard as PrismaWhiteboard,
  Workspace as PrismaWorkspace,
} from '@prisma/client';
import type {
  Activity,
  Attachment,
  Board,
  BoardMember,
  Card,
  Checklist,
  ChecklistItem,
  Comment,
  Doc,
  DocSummary,
  Label,
  List,
  Member,
  Notification,
  PublicUser,
  User,
  Whiteboard,
  WhiteboardSummary,
  Workspace,
} from '@trelltech/shared';

export const publicUserSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const cardSummaryInclude = {
  labels: true,
  members: { select: publicUserSelect },
  checklists: { select: { items: { select: { checked: true } } } },
  attachments: { where: { isCover: true }, take: 1, select: { url: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.CardInclude;

export const cardDetailInclude = {
  labels: true,
  members: { select: publicUserSelect },
  checklists: {
    orderBy: { position: 'asc' },
    include: { items: { orderBy: { position: 'asc' } } },
  },
  comments: {
    orderBy: { createdAt: 'asc' },
    include: { author: { select: publicUserSelect } },
  },
  attachments: { orderBy: { createdAt: 'asc' } },
  activities: {
    orderBy: { createdAt: 'desc' },
    include: { user: { select: publicUserSelect } },
  },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.CardInclude;

type CardSummaryRow = Prisma.CardGetPayload<{ include: typeof cardSummaryInclude }>;
type CardDetailRow = Prisma.CardGetPayload<{ include: typeof cardDetailInclude }>;

export function serializeUser(user: PrismaUser): User {
  return {
    id: user.id,
    trelloId: user.trelloId,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    trelloLinked: Boolean(user.trelloToken),
    hasPassword: Boolean(user.passwordHash),
  };
}

export function serializePublicUser(user: PublicUserRow): PublicUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
  };
}

export function serializeWorkspace(ws: PrismaWorkspace): Workspace {
  return {
    id: ws.id,
    trelloId: ws.trelloId,
    name: ws.name,
    displayName: ws.displayName,
    description: ws.description,
    createdAt: ws.createdAt.toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
  };
}

export function serializeBoard(board: PrismaBoard): Board {
  return {
    id: board.id,
    trelloId: board.trelloId,
    workspaceId: board.workspaceId,
    name: board.name,
    description: board.description,
    background: board.background,
    closed: board.closed,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

export function serializeList(list: PrismaList): List {
  return {
    id: list.id,
    trelloId: list.trelloId,
    boardId: list.boardId,
    name: list.name,
    position: list.position,
    closed: list.closed,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };
}

export function serializeLabel(label: PrismaLabel): Label {
  return {
    id: label.id,
    boardId: label.boardId,
    name: label.name,
    color: label.color,
  };
}

export function serializeBoardMember(user: PublicUserRow, role: BoardRole): BoardMember {
  return { user: serializePublicUser(user), role };
}

export function serializeMember(user: PublicUserRow, role: BoardRole): Member {
  return { user: serializePublicUser(user), role };
}

/** Construit la liste des membres d'une ressource, propriétaire (OWNER) en tête. */
export function buildMembers(
  owner: PublicUserRow,
  memberships: { role: BoardRole; user: PublicUserRow }[],
): Member[] {
  const members: Member[] = [serializeMember(owner, 'OWNER')];
  for (const membership of memberships) {
    if (membership.user.id === owner.id) continue;
    members.push(serializeMember(membership.user, membership.role));
  }
  return members;
}

export function serializeCard(card: CardSummaryRow): Card {
  const total = card.checklists.reduce((n, cl) => n + cl.items.length, 0);
  const done = card.checklists.reduce(
    (n, cl) => n + cl.items.filter((item) => item.checked).length,
    0,
  );
  return {
    id: card.id,
    trelloId: card.trelloId,
    listId: card.listId,
    name: card.name,
    description: card.description,
    position: card.position,
    dueDate: card.dueDate ? card.dueDate.toISOString() : null,
    dueComplete: card.dueComplete,
    closed: card.closed,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    labels: card.labels.map(serializeLabel),
    members: card.members.map(serializePublicUser),
    checklistSummary: { done, total },
    commentCount: card._count.comments,
    attachmentCount: card._count.attachments,
    coverUrl: card.attachments[0]?.url ?? null,
  };
}

function serializeChecklistItem(item: CardDetailRow['checklists'][number]['items'][number]): ChecklistItem {
  return {
    id: item.id,
    checklistId: item.checklistId,
    name: item.name,
    checked: item.checked,
    position: item.position,
  };
}

function serializeChecklist(checklist: CardDetailRow['checklists'][number]): Checklist {
  return {
    id: checklist.id,
    cardId: checklist.cardId,
    name: checklist.name,
    position: checklist.position,
    items: checklist.items.map(serializeChecklistItem),
  };
}

export function serializeComment(comment: CardDetailRow['comments'][number]): Comment {
  return {
    id: comment.id,
    cardId: comment.cardId,
    author: serializePublicUser(comment.author),
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function serializeAttachment(attachment: PrismaAttachment): Attachment {
  return {
    id: attachment.id,
    cardId: attachment.cardId,
    name: attachment.name,
    url: attachment.url,
    mime: attachment.mime,
    isCover: attachment.isCover,
    createdAt: attachment.createdAt.toISOString(),
  };
}

function serializeActivity(activity: CardDetailRow['activities'][number]): Activity {
  return {
    id: activity.id,
    cardId: activity.cardId,
    user: activity.user ? serializePublicUser(activity.user) : null,
    type: activity.type,
    data: activity.data ?? null,
    createdAt: activity.createdAt.toISOString(),
  };
}

export function serializeCardDetail(card: CardDetailRow) {
  const total = card.checklists.reduce((n, cl) => n + cl.items.length, 0);
  const done = card.checklists.reduce(
    (n, cl) => n + cl.items.filter((item) => item.checked).length,
    0,
  );
  const cover = card.attachments.find((a) => a.isCover) ?? null;
  return {
    id: card.id,
    trelloId: card.trelloId,
    listId: card.listId,
    name: card.name,
    description: card.description,
    position: card.position,
    dueDate: card.dueDate ? card.dueDate.toISOString() : null,
    dueComplete: card.dueComplete,
    closed: card.closed,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    labels: card.labels.map(serializeLabel),
    members: card.members.map(serializePublicUser),
    checklistSummary: { done, total },
    commentCount: card._count.comments,
    attachmentCount: card._count.attachments,
    coverUrl: cover ? cover.url : null,
    checklists: card.checklists.map(serializeChecklist),
    comments: card.comments.map(serializeComment),
    attachments: card.attachments.map(serializeAttachment),
    activity: card.activities.map(serializeActivity),
  };
}

export function serializeChecklistFull(
  checklist: Prisma.ChecklistGetPayload<{ include: { items: true } }>,
): Checklist {
  return {
    id: checklist.id,
    cardId: checklist.cardId,
    name: checklist.name,
    position: checklist.position,
    items: [...checklist.items]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        checklistId: item.checklistId,
        name: item.name,
        checked: item.checked,
        position: item.position,
      })),
  };
}

export function serializeChecklistItemRow(
  item: PrismaChecklistItem,
): ChecklistItem {
  return {
    id: item.id,
    checklistId: item.checklistId,
    name: item.name,
    checked: item.checked,
    position: item.position,
  };
}

export function serializeCommentRow(
  comment: Prisma.CommentGetPayload<{ include: { author: { select: typeof publicUserSelect } } }>,
): Comment {
  return {
    id: comment.id,
    cardId: comment.cardId,
    author: serializePublicUser(comment.author),
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function serializeNotification(
  notification: PrismaNotification,
): Notification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    boardId: notification.boardId,
    cardId: notification.cardId,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function serializeDoc(doc: PrismaDoc): Doc {
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    title: doc.title,
    icon: doc.icon,
    blocks: doc.blocks,
    position: doc.position,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeDocSummary(doc: PrismaDoc): DocSummary {
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    title: doc.title,
    icon: doc.icon,
    position: doc.position,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeWhiteboard(
  wb: PrismaWhiteboard,
): Whiteboard {
  return {
    id: wb.id,
    workspaceId: wb.workspaceId,
    title: wb.title,
    scene: wb.scene,
    position: wb.position,
    createdAt: wb.createdAt.toISOString(),
    updatedAt: wb.updatedAt.toISOString(),
  };
}

export function serializeWhiteboardSummary(
  wb: PrismaWhiteboard,
): WhiteboardSummary {
  return {
    id: wb.id,
    workspaceId: wb.workspaceId,
    title: wb.title,
    position: wb.position,
    createdAt: wb.createdAt.toISOString(),
    updatedAt: wb.updatedAt.toISOString(),
  };
}

export const boardDetailInclude = {
  labels: { orderBy: { name: 'asc' } },
  workspace: { select: { ownerId: true, owner: { select: publicUserSelect } } },
  memberships: {
    orderBy: { createdAt: 'asc' },
    include: { user: { select: publicUserSelect } },
  },
  lists: {
    where: { closed: false },
    orderBy: { position: 'asc' },
    include: {
      cards: {
        where: { closed: false },
        orderBy: { position: 'asc' },
        include: cardSummaryInclude,
      },
    },
  },
} satisfies Prisma.BoardInclude;

type BoardDetailRow = Prisma.BoardGetPayload<{ include: typeof boardDetailInclude }>;

export function buildBoardMembers(
  owner: PublicUserRow,
  memberships: { role: BoardRole; user: PublicUserRow }[],
): BoardMember[] {
  const members: BoardMember[] = [serializeBoardMember(owner, 'OWNER')];
  for (const membership of memberships) {
    if (membership.user.id === owner.id) continue;
    members.push(serializeBoardMember(membership.user, membership.role));
  }
  return members;
}

export function serializeBoardDetail(board: BoardDetailRow) {
  return {
    id: board.id,
    trelloId: board.trelloId,
    workspaceId: board.workspaceId,
    name: board.name,
    description: board.description,
    background: board.background,
    closed: board.closed,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    labels: board.labels.map(serializeLabel),
    members: buildBoardMembers(board.workspace.owner, board.memberships),
    lists: board.lists.map((list) => ({
      ...serializeList(list),
      cards: list.cards.map(serializeCard),
    })),
  };
}

export function serializeWorkspaceWithContent(
  ws: PrismaWorkspace & {
    boards: PrismaBoard[];
    docs: PrismaDoc[];
    whiteboards: PrismaWhiteboard[];
  },
  role: BoardRole,
) {
  return {
    ...serializeWorkspace(ws),
    role,
    boards: ws.boards.map(serializeBoard),
    docs: ws.docs.map(serializeDocSummary),
    whiteboards: ws.whiteboards.map(serializeWhiteboardSummary),
  };
}
