'use client';

import { useQuery } from '@tanstack/react-query';
import type { Board, Card, DocSummary } from '@trelltech/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export type SearchResults = {
  boards: Board[];
  cards: Card[];
  docs: DocSummary[];
};

export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery<SearchResults>({
    queryKey: queryKeys.search(trimmed),
    queryFn: ({ signal }) =>
      apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal }),
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  });
}
