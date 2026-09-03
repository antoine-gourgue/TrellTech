'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Doc,
  UpdateDocInput,
  UpdateWhiteboardInput,
  Whiteboard,
} from '@trelltech/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useDoc(docId: string) {
  return useQuery<Doc>({
    queryKey: queryKeys.doc(docId),
    queryFn: ({ signal }) => apiFetch<Doc>(`/api/docs/${docId}`, { signal }),
  });
}

export function useUpdateDoc(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDocInput) =>
      apiFetch<Doc>(`/api/docs/${docId}`, { method: 'PATCH', body: input }),
    onSuccess: (doc) => {
      queryClient.setQueryData(queryKeys.doc(docId), doc);
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}

export function useWhiteboard(whiteboardId: string) {
  return useQuery<Whiteboard>({
    queryKey: queryKeys.whiteboard(whiteboardId),
    queryFn: ({ signal }) => apiFetch<Whiteboard>(`/api/whiteboards/${whiteboardId}`, { signal }),
  });
}

export function useUpdateWhiteboard(whiteboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWhiteboardInput) =>
      apiFetch<Whiteboard>(`/api/whiteboards/${whiteboardId}`, { method: 'PATCH', body: input }),
    onSuccess: (whiteboard) => {
      queryClient.setQueryData(queryKeys.whiteboard(whiteboardId), whiteboard);
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}
