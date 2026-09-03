'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, User } from '@trelltech/shared';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useMe() {
  return useQuery<User>({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => apiFetch<User>('/api/auth/me', { signal }),
    retry: (failureCount, error) => {
      if (error instanceof ApiRequestError && error.status === 401) return false;
      return failureCount < 1;
    },
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<User>('/api/auth/login', { method: 'POST', body: input }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiFetch<User>('/api/auth/register', { method: 'POST', body: input }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}

export function useUnlinkTrello() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<User>('/api/auth/trello/unlink', { method: 'POST' }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
