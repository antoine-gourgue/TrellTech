export type ShareEntityType = 'workspace' | 'board' | 'doc' | 'whiteboard';

export const queryKeys = {
  me: ['me'] as const,
  authStatus: ['auth-status'] as const,
  workspaces: ['workspaces'] as const,
  shared: ['shared'] as const,
  board: (boardId: string) => ['board', boardId] as const,
  boardMembers: (boardId: string) => ['board-members', boardId] as const,
  members: (type: ShareEntityType, id: string) =>
    type === 'board' ? (['board-members', id] as const) : (['members', type, id] as const),
  boardArchive: (boardId: string) => ['board-archive', boardId] as const,
  card: (cardId: string) => ['card', cardId] as const,
  doc: (docId: string) => ['doc', docId] as const,
  whiteboard: (whiteboardId: string) => ['whiteboard', whiteboardId] as const,
  notifications: ['notifications'] as const,
  notificationHistory: ['notifications', 'history'] as const,
  search: (query: string) => ['search', query] as const,
};
