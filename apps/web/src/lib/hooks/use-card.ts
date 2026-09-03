'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  Attachment,
  BoardMember,
  CardDetail,
  Checklist,
  ChecklistItem,
  Comment,
  CreateAttachmentInput,
  CreateChecklistInput,
  CreateChecklistItemInput,
  CreateCommentInput,
  CreateLabelInput,
  Label,
  PublicUser,
  UpdateCardInput,
  UpdateChecklistInput,
  UpdateChecklistItemInput,
  UpdateCommentInput,
  UpdateLabelInput,
} from '@trelltech/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useCard(cardId: string, enabled = true) {
  return useQuery<CardDetail>({
    queryKey: queryKeys.card(cardId),
    queryFn: ({ signal }) => apiFetch<CardDetail>(`/api/cards/${cardId}`, { signal }),
    enabled: enabled && cardId.length > 0,
  });
}

export function useBoardMembers(boardId: string) {
  return useQuery<BoardMember[]>({
    queryKey: queryKeys.boardMembers(boardId),
    queryFn: ({ signal }) => apiFetch<BoardMember[]>(`/api/boards/${boardId}/members`, { signal }),
    enabled: boardId.length > 0,
  });
}

type CardContext = { cardId: string; boardId: string };

function patchCard(
  queryClient: QueryClient,
  cardId: string,
  updater: (card: CardDetail) => CardDetail,
) {
  queryClient.setQueryData<CardDetail>(queryKeys.card(cardId), (current) =>
    current ? updater(current) : current,
  );
}

/**
 * Fabrique de mutation pour le détail de carte : applique une mise à jour
 * optimiste sur le cache de la carte puis resynchronise carte + board au settle.
 */
function useCardMutation<TData, TVars>(
  { cardId, boardId }: CardContext,
  mutationFn: (vars: TVars) => Promise<TData>,
  optimistic?: (card: CardDetail, vars: TVars) => CardDetail,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      if (!optimistic) return undefined;
      await queryClient.cancelQueries({ queryKey: queryKeys.card(cardId) });
      const previous = queryClient.getQueryData<CardDetail>(queryKeys.card(cardId));
      patchCard(queryClient, cardId, (card) => optimistic(card, vars));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      const ctx = context as { previous?: CardDetail } | undefined;
      if (ctx?.previous) {
        queryClient.setQueryData(queryKeys.card(cardId), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.card(cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) });
    },
  });
}

export function useUpdateCardDetail(ctx: CardContext) {
  return useCardMutation<CardDetail, UpdateCardInput>(
    ctx,
    (input) => apiFetch<CardDetail>(`/api/cards/${ctx.cardId}`, { method: 'PATCH', body: input }),
    (card, input) => ({
      ...card,
      name: input.name ?? card.name,
      description: input.description === undefined ? card.description : input.description,
      dueDate: input.dueDate === undefined ? card.dueDate : input.dueDate,
      dueComplete: input.dueComplete ?? card.dueComplete,
    }),
  );
}

export function useAttachLabel(ctx: CardContext) {
  return useCardMutation<void, Label>(
    ctx,
    (label) =>
      apiFetch<void>(`/api/cards/${ctx.cardId}/labels/${label.id}`, { method: 'PUT' }),
    (card, label) =>
      card.labels.some((l) => l.id === label.id)
        ? card
        : { ...card, labels: [...card.labels, label] },
  );
}

export function useDetachLabel(ctx: CardContext) {
  return useCardMutation<void, string>(
    ctx,
    (labelId) =>
      apiFetch<void>(`/api/cards/${ctx.cardId}/labels/${labelId}`, { method: 'DELETE' }),
    (card, labelId) => ({ ...card, labels: card.labels.filter((l) => l.id !== labelId) }),
  );
}

export function useCreateLabel(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLabelInput) =>
      apiFetch<Label>('/api/labels', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) }),
  });
}

export function useUpdateLabel(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLabelInput }) =>
      apiFetch<Label>(`/api/labels/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) });
      queryClient.invalidateQueries({ queryKey: ['card'] });
    },
  });
}

export function useDeleteLabel(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/labels/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) });
      queryClient.invalidateQueries({ queryKey: ['card'] });
    },
  });
}

export function useAssignMember(ctx: CardContext) {
  return useCardMutation<void, PublicUser>(
    ctx,
    (user) =>
      apiFetch<void>(`/api/cards/${ctx.cardId}/members/${user.id}`, { method: 'PUT' }),
    (card, user) =>
      card.members.some((m) => m.id === user.id)
        ? card
        : { ...card, members: [...card.members, user] },
  );
}

export function useUnassignMember(ctx: CardContext) {
  return useCardMutation<void, string>(
    ctx,
    (userId) =>
      apiFetch<void>(`/api/cards/${ctx.cardId}/members/${userId}`, { method: 'DELETE' }),
    (card, userId) => ({ ...card, members: card.members.filter((m) => m.id !== userId) }),
  );
}

export function useCreateChecklist(ctx: CardContext) {
  return useCardMutation<Checklist, string>(ctx, (name) =>
    apiFetch<Checklist>('/api/checklists', {
      method: 'POST',
      body: { cardId: ctx.cardId, name } satisfies CreateChecklistInput,
    }),
  );
}

export function useUpdateChecklist(ctx: CardContext) {
  return useCardMutation<Checklist, { id: string; input: UpdateChecklistInput }>(
    ctx,
    ({ id, input }) =>
      apiFetch<Checklist>(`/api/checklists/${id}`, { method: 'PATCH', body: input }),
    (card, { id, input }) => ({
      ...card,
      checklists: card.checklists.map((cl) =>
        cl.id === id ? { ...cl, name: input.name ?? cl.name } : cl,
      ),
    }),
  );
}

export function useDeleteChecklist(ctx: CardContext) {
  return useCardMutation<void, string>(
    ctx,
    (id) => apiFetch<void>(`/api/checklists/${id}`, { method: 'DELETE' }),
    (card, id) => ({ ...card, checklists: card.checklists.filter((cl) => cl.id !== id) }),
  );
}

export function useCreateChecklistItem(ctx: CardContext) {
  return useCardMutation<ChecklistItem, { checklistId: string; name: string }>(
    ctx,
    ({ checklistId, name }) =>
      apiFetch<ChecklistItem>('/api/checklist-items', {
        method: 'POST',
        body: { checklistId, name } satisfies CreateChecklistItemInput,
      }),
  );
}

export function useUpdateChecklistItem(ctx: CardContext) {
  return useCardMutation<ChecklistItem, { id: string; input: UpdateChecklistItemInput }>(
    ctx,
    ({ id, input }) =>
      apiFetch<ChecklistItem>(`/api/checklist-items/${id}`, { method: 'PATCH', body: input }),
    (card, { id, input }) => ({
      ...card,
      checklists: card.checklists.map((cl) => ({
        ...cl,
        items: cl.items.map((item) =>
          item.id === id
            ? {
                ...item,
                name: input.name ?? item.name,
                checked: input.checked ?? item.checked,
              }
            : item,
        ),
      })),
    }),
  );
}

export function useDeleteChecklistItem(ctx: CardContext) {
  return useCardMutation<void, string>(
    ctx,
    (id) => apiFetch<void>(`/api/checklist-items/${id}`, { method: 'DELETE' }),
    (card, id) => ({
      ...card,
      checklists: card.checklists.map((cl) => ({
        ...cl,
        items: cl.items.filter((item) => item.id !== id),
      })),
    }),
  );
}

export function useCreateComment(ctx: CardContext) {
  return useCardMutation<Comment, string>(ctx, (text) =>
    apiFetch<Comment>('/api/comments', {
      method: 'POST',
      body: { cardId: ctx.cardId, text } satisfies CreateCommentInput,
    }),
  );
}

export function useUpdateComment(ctx: CardContext) {
  return useCardMutation<Comment, { id: string; text: string }>(
    ctx,
    ({ id, text }) =>
      apiFetch<Comment>(`/api/comments/${id}`, {
        method: 'PATCH',
        body: { text } satisfies UpdateCommentInput,
      }),
    (card, { id, text }) => ({
      ...card,
      comments: card.comments.map((c) => (c.id === id ? { ...c, text } : c)),
    }),
  );
}

export function useDeleteComment(ctx: CardContext) {
  return useCardMutation<void, string>(
    ctx,
    (id) => apiFetch<void>(`/api/comments/${id}`, { method: 'DELETE' }),
    (card, id) => ({ ...card, comments: card.comments.filter((c) => c.id !== id) }),
  );
}

export function useCreateAttachment(ctx: CardContext) {
  return useCardMutation<Attachment, Omit<CreateAttachmentInput, 'cardId'>>(ctx, (input) =>
    apiFetch<Attachment>('/api/attachments', {
      method: 'POST',
      body: { cardId: ctx.cardId, ...input } satisfies CreateAttachmentInput,
    }),
  );
}

export function useDeleteAttachment(ctx: CardContext) {
  return useCardMutation<void, string>(
    ctx,
    (id) => apiFetch<void>(`/api/attachments/${id}`, { method: 'DELETE' }),
    (card, id) => ({ ...card, attachments: card.attachments.filter((a) => a.id !== id) }),
  );
}
