'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BoardDetail,
  Card,
  CreateCardInput,
  CreateListInput,
  List,
  MoveCardInput,
  MoveListInput,
  UpdateCardInput,
  UpdateListInput,
} from '@trelltech/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export type BoardList = BoardDetail['lists'][number];

export type BoardArchive = { lists: List[]; cards: Card[] };

export function useBoard(boardId: string) {
  return useQuery<BoardDetail>({
    queryKey: queryKeys.board(boardId),
    queryFn: ({ signal }) => apiFetch<BoardDetail>(`/api/boards/${boardId}`, { signal }),
  });
}

function useBoardInvalidate(boardId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) });
}

export function useCreateList(boardId: string) {
  const invalidate = useBoardInvalidate(boardId);
  return useMutation({
    mutationFn: (input: CreateListInput) =>
      apiFetch<List>('/api/lists', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateList(boardId: string) {
  const invalidate = useBoardInvalidate(boardId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateListInput }) =>
      apiFetch<List>(`/api/lists/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteList(boardId: string) {
  const invalidate = useBoardInvalidate(boardId);
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/lists/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useCreateCard(boardId: string) {
  const invalidate = useBoardInvalidate(boardId);
  return useMutation({
    mutationFn: (input: CreateCardInput) =>
      apiFetch<Card>('/api/cards', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateCard(boardId: string) {
  const invalidate = useBoardInvalidate(boardId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCardInput }) =>
      apiFetch<Card>(`/api/cards/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteCard(boardId: string) {
  const invalidate = useBoardInvalidate(boardId);
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/cards/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

type MoveVariables = { cardId: string; input: MoveCardInput };

export function useMoveCard(boardId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.board(boardId);

  return useMutation({
    mutationFn: ({ cardId, input }: MoveVariables) =>
      apiFetch<Card>(`/api/cards/${cardId}/move`, { method: 'PATCH', body: input }),
    onMutate: async ({ cardId, input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (previous) {
        queryClient.setQueryData<BoardDetail>(key, applyMove(previous, cardId, input));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

type MoveListVariables = { listId: string; input: MoveListInput };

export function useMoveList(boardId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.board(boardId);

  return useMutation({
    mutationFn: ({ listId, input }: MoveListVariables) =>
      apiFetch<List>(`/api/lists/${listId}/move`, { method: 'PATCH', body: input }),
    onMutate: async ({ listId, input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (previous) {
        queryClient.setQueryData<BoardDetail>(key, applyListMove(previous, listId, input.position));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useArchiveList(boardId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.board(boardId);
  return useMutation({
    mutationFn: (listId: string) =>
      apiFetch<List>(`/api/lists/${listId}`, { method: 'PATCH', body: { closed: true } }),
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (previous) {
        queryClient.setQueryData<BoardDetail>(key, {
          ...previous,
          lists: previous.lists.filter((list) => list.id !== listId),
        });
      }
      return { previous };
    },
    onError: (_error, _listId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: queryKeys.boardArchive(boardId) });
    },
  });
}

export function useArchiveCard(boardId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.board(boardId);
  return useMutation({
    mutationFn: (cardId: string) =>
      apiFetch<Card>(`/api/cards/${cardId}`, { method: 'PATCH', body: { closed: true } }),
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (previous) {
        queryClient.setQueryData<BoardDetail>(key, {
          ...previous,
          lists: previous.lists.map((list) => ({
            ...list,
            cards: list.cards.filter((card) => card.id !== cardId),
          })),
        });
      }
      return { previous };
    },
    onError: (_error, _cardId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: queryKeys.boardArchive(boardId) });
    },
  });
}

export function useBoardArchive(boardId: string, enabled: boolean) {
  return useQuery<BoardArchive>({
    queryKey: queryKeys.boardArchive(boardId),
    queryFn: ({ signal }) =>
      apiFetch<BoardArchive>(`/api/boards/${boardId}/archive`, { signal }),
    enabled: enabled && boardId.length > 0,
  });
}

export function useRestoreArchivedList(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) =>
      apiFetch<List>(`/api/lists/${listId}`, { method: 'PATCH', body: { closed: false } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.boardArchive(boardId) });
    },
  });
}

export function useRestoreArchivedCard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) =>
      apiFetch<Card>(`/api/cards/${cardId}`, { method: 'PATCH', body: { closed: false } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.boardArchive(boardId) });
    },
  });
}

function applyListMove(board: BoardDetail, listId: string, position: number): BoardDetail {
  const index = board.lists.findIndex((list) => list.id === listId);
  if (index === -1) return board;
  const next = [...board.lists];
  const [moved] = next.splice(index, 1);
  const clamped = Math.max(0, Math.min(Math.round(position), next.length));
  next.splice(clamped, 0, moved);
  return { ...board, lists: next };
}

function applyMove(board: BoardDetail, cardId: string, input: MoveCardInput): BoardDetail {
  let moved: Card | undefined;
  const stripped = board.lists.map((list) => {
    const index = list.cards.findIndex((card) => card.id === cardId);
    if (index === -1) return list;
    moved = list.cards[index];
    return { ...list, cards: list.cards.filter((card) => card.id !== cardId) };
  });
  if (!moved) return board;
  const card = moved;

  return {
    ...board,
    lists: stripped.map((list) => {
      if (list.id !== input.listId) return list;
      const nextCards = [...list.cards];
      const clampedIndex = Math.max(0, Math.min(input.position, nextCards.length));
      nextCards.splice(clampedIndex, 0, { ...card, listId: input.listId });
      return { ...list, cards: nextCards };
    }),
  };
}
