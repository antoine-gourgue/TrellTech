'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Board,
  CreateBoardInput,
  CreateDocInput,
  CreateWhiteboardInput,
  CreateWorkspaceInput,
  Doc,
  UpdateBoardInput,
  UpdateWorkspaceInput,
  Whiteboard,
  Workspace,
  WorkspaceWithBoards,
} from '@trelltech/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useWorkspaces() {
  return useQuery<WorkspaceWithBoards[]>({
    queryKey: queryKeys.workspaces,
    queryFn: ({ signal }) => apiFetch<WorkspaceWithBoards[]>('/api/workspaces', { signal }),
  });
}

function useInvalidateWorkspaces() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
}

export function useCreateWorkspace() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) =>
      apiFetch<Workspace>('/api/workspaces', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateWorkspace() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkspaceInput }) =>
      apiFetch<Workspace>(`/api/workspaces/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteWorkspace() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/workspaces/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useCreateBoard() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (input: CreateBoardInput) =>
      apiFetch<Board>('/api/boards', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBoardInput }) =>
      apiFetch<Board>(`/api/boards/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      queryClient.invalidateQueries({ queryKey: queryKeys.board(variables.id) });
    },
  });
}

export function useDeleteBoard() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/boards/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useCreateDoc() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (input: CreateDocInput) =>
      apiFetch<Doc>('/api/docs', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteDoc() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/docs/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useCreateWhiteboard() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (input: CreateWhiteboardInput) =>
      apiFetch<Whiteboard>('/api/whiteboards', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteWhiteboard() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/whiteboards/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useSyncTrello() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<unknown>('/api/sync/trello', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.workspaces }),
  });
}
