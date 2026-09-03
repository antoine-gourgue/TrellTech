'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Member,
  ShareBoardInput,
  ShareLink,
  SharedWithMe,
  UpdateBoardMemberInput,
} from '@trelltech/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys, type ShareEntityType } from '@/lib/query-keys';

const ENTITY_PATH: Record<ShareEntityType, string> = {
  workspace: 'workspaces',
  board: 'boards',
  doc: 'docs',
  whiteboard: 'whiteboards',
};

function useInvalidateMembers(type: ShareEntityType, id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members(type, id) });
    if (type === 'board') queryClient.invalidateQueries({ queryKey: queryKeys.board(id) });
    if (type === 'workspace') queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
  };
}

export function useMembers(type: ShareEntityType, id: string) {
  return useQuery<Member[]>({
    queryKey: queryKeys.members(type, id),
    queryFn: ({ signal }) =>
      apiFetch<Member[]>(`/api/${ENTITY_PATH[type]}/${id}/members`, { signal }),
    enabled: id.length > 0,
  });
}

export function useShare(type: ShareEntityType, id: string) {
  const invalidate = useInvalidateMembers(type, id);
  return useMutation({
    mutationFn: (input: ShareBoardInput) =>
      apiFetch<Member>(`/api/${ENTITY_PATH[type]}/${id}/members`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateMember(type: ShareEntityType, id: string) {
  const invalidate = useInvalidateMembers(type, id);
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateBoardMemberInput }) =>
      apiFetch<Member>(`/api/${ENTITY_PATH[type]}/${id}/members/${userId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(type: ShareEntityType, id: string) {
  const invalidate = useInvalidateMembers(type, id);
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<void>(`/api/${ENTITY_PATH[type]}/${id}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

/** Génère un lien de partage signé (propriétaire uniquement) pour l'entité. */
export function useShareLink(type: ShareEntityType, id: string) {
  return useMutation({
    mutationFn: (role: 'EDITOR' | 'VIEWER') =>
      apiFetch<ShareLink>(`/api/${ENTITY_PATH[type]}/${id}/share-link?role=${role}`),
  });
}

/** Résultat du join générique : type d'entité rejointe pour rediriger le front. */
export type JoinResult = {
  type: ShareEntityType;
  id: string;
  workspaceId?: string;
};

/** Rejoint une entité partagée via un jeton de lien (board, espace, doc, whiteboard). */
export function useJoinShare() {
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<JoinResult>('/api/share/join', { method: 'POST', body: { token } }),
  });
}

/** Contenus partagés individuellement avec l'utilisateur (section « Partagé avec moi »). */
export function useSharedWithMe() {
  return useQuery<SharedWithMe>({
    queryKey: queryKeys.shared,
    queryFn: ({ signal }) => apiFetch<SharedWithMe>('/api/shared', { signal }),
  });
}

export function useShareBoard(boardId: string) {
  return useShare('board', boardId);
}

export function useUpdateBoardMember(boardId: string) {
  return useUpdateMember('board', boardId);
}

export function useRemoveBoardMember(boardId: string) {
  return useRemoveMember('board', boardId);
}
