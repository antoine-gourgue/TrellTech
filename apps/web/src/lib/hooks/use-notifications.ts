'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import type { Notification } from '@trelltech/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const POLL_INTERVAL = 30_000;
const HISTORY_PAGE_SIZE = 30;

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: queryKeys.notifications,
    queryFn: ({ signal }) => apiFetch<Notification[]>('/api/notifications', { signal }),
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

/**
 * Historique complet paginé par curseur (`?limit&cursor`, curseur = id du
 * dernier élément). Partage le préfixe de clé de `useNotifications`, donc les
 * invalidations des mutations de lecture le rafraîchissent aussi.
 */
export function useNotificationHistory() {
  return useInfiniteQuery<
    Notification[],
    Error,
    InfiniteData<Notification[]>,
    typeof queryKeys.notificationHistory,
    string | undefined
  >({
    queryKey: queryKeys.notificationHistory,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: String(HISTORY_PAGE_SIZE) });
      if (pageParam) params.set('cursor', pageParam);
      return apiFetch<Notification[]>(`/api/notifications?${params.toString()}`, { signal });
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === HISTORY_PAGE_SIZE ? lastPage[lastPage.length - 1]?.id : undefined,
  });
}

function patchHistory(
  queryClient: QueryClient,
  updater: (item: Notification) => Notification,
): InfiniteData<Notification[]> | undefined {
  const previous = queryClient.getQueryData<InfiniteData<Notification[]>>(
    queryKeys.notificationHistory,
  );
  queryClient.setQueryData<InfiniteData<Notification[]>>(
    queryKeys.notificationHistory,
    (data) => (data ? { ...data, pages: data.pages.map((page) => page.map(updater)) } : data),
  );
  return previous;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications);
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (current) =>
        current?.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      const previousHistory = patchHistory(queryClient, (item) =>
        item.id === id ? { ...item, read: true } : item,
      );
      return { previous, previousHistory };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notifications, context.previous);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(queryKeys.notificationHistory, context.previousHistory);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/api/notifications/read-all', { method: 'POST' }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications);
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (current) =>
        current?.map((item) => ({ ...item, read: true })),
      );
      const previousHistory = patchHistory(queryClient, (item) => ({ ...item, read: true }));
      return { previous, previousHistory };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notifications, context.previous);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(queryKeys.notificationHistory, context.previousHistory);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
