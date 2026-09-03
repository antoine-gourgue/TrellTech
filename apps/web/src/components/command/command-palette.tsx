'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, LayoutGrid, Plus, Search, SquareKanban } from 'lucide-react';
import type { BoardDetail } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useSearch } from '@/lib/hooks/use-search';
import { useWorkspaces } from '@/lib/hooks/use-workspaces';
import { useCreateCard } from '@/lib/hooks/use-board';
import { useAppNavigate } from '@/lib/hooks/use-app-navigate';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

type CommandItem = {
  key: string;
  group: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onRun: () => void;
};

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function findBoardIdForList(
  entries: [readonly unknown[], BoardDetail | undefined][],
  listId: string,
): string | null {
  for (const [, board] of entries) {
    if (board?.lists.some((list) => list.id === listId)) return board.id;
  }
  return null;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { goToBoard, goToDoc } = useAppNavigate();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 180);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const { data: workspaces } = useWorkspaces();
  const search = useSearch(debouncedQuery);

  const currentBoardId = useMemo(() => {
    const match = pathname?.match(/^\/boards\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const createCard = useCreateCard(currentBoardId ?? '');

  useEffect(() => {
    if (open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  function run(item: CommandItem) {
    onClose();
    item.onRun();
  }

  async function createCardInCurrentList() {
    if (!currentBoardId) return;
    const board = queryClient.getQueryData<BoardDetail>(queryKeys.board(currentBoardId));
    const firstList = board?.lists[0];
    if (!board || !firstList) {
      toast.error('Aucune liste', 'Créez d’abord une liste dans ce tableau.');
      return;
    }
    try {
      const card = await createCard.mutateAsync({ listId: firstList.id, name: 'Nouvelle carte' });
      goToBoard(currentBoardId, card.id);
    } catch (err) {
      toast.error('Création impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  const hasQuery = debouncedQuery.trim().length >= 2;

  const items = useMemo<CommandItem[]>(() => {
    const result: CommandItem[] = [];

    if (currentBoardId) {
      result.push({
        key: 'action:create-card',
        group: 'Actions',
        label: 'Créer une carte dans le tableau courant',
        icon: <Plus className="size-4" aria-hidden />,
        onRun: () => void createCardInCurrentList(),
      });
    }

    if (hasQuery) {
      const data = search.data;
      if (data) {
        for (const board of data.boards) {
          result.push({
            key: `board:${board.id}`,
            group: 'Tableaux',
            label: board.name,
            icon: <LayoutGrid className="size-4" aria-hidden />,
            onRun: () => goToBoard(board.id),
          });
        }
        const boardEntries = queryClient.getQueriesData<BoardDetail>({ queryKey: ['board'] });
        for (const card of data.cards) {
          const boardId = findBoardIdForList(boardEntries, card.listId);
          result.push({
            key: `card:${card.id}`,
            group: 'Cartes',
            label: card.name,
            sublabel: boardId ? undefined : 'Ouvrez le tableau pour accéder à cette carte',
            icon: <SquareKanban className="size-4" aria-hidden />,
            onRun: () => {
              if (boardId) {
                goToBoard(boardId, card.id);
              } else {
                toast.error(
                  'Tableau introuvable',
                  'Ouvrez le tableau concerné pour afficher cette carte.',
                );
              }
            },
          });
        }
        for (const doc of data.docs) {
          result.push({
            key: `doc:${doc.id}`,
            group: 'Documents',
            label: doc.title || 'Sans titre',
            icon: <FileText className="size-4" aria-hidden />,
            onRun: () => goToDoc(doc.id),
          });
        }
      }
    } else if (workspaces) {
      for (const workspace of workspaces) {
        for (const board of workspace.boards) {
          result.push({
            key: `nav-board:${board.id}`,
            group: 'Aller à un tableau',
            label: board.name,
            sublabel: workspace.displayName,
            icon: <LayoutGrid className="size-4" aria-hidden />,
            onRun: () => goToBoard(board.id),
          });
        }
      }
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBoardId, hasQuery, search.data, workspaces, queryClient]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (items.length === 0 ? 0 : (index + 1) % items.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (items.length === 0 ? 0 : (index - 1 + items.length) % items.length));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) run(item);
    }
  }

  if (!open || typeof document === 'undefined') return null;

  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
      <button
        type="button"
        aria-label="Fermer la recherche"
        tabIndex={-1}
        onClick={onClose}
        className="animate-fade-in fixed inset-0 cursor-default bg-black/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche et commandes"
        className="animate-scale-in relative z-10 flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-md"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded
            aria-controls="command-listbox"
            aria-activedescendant={items[activeIndex] ? `command-${items[activeIndex].key}` : undefined}
            placeholder="Rechercher un tableau, une carte, un document…"
            className="h-12 w-full bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none"
          />
        </div>

        <ul
          id="command-listbox"
          ref={listRef}
          role="listbox"
          aria-label="Résultats"
          className="scrollbar-thin flex-1 overflow-y-auto p-2"
        >
          {hasQuery && search.isLoading ? (
            <li className="flex items-center gap-2 px-3 py-6 text-sm text-text-muted">
              <Spinner className="size-4 text-brand" />
              Recherche en cours…
            </li>
          ) : hasQuery && search.isError ? (
            <li className="px-3 py-6 text-center text-sm text-text-muted">
              La recherche a échoué. Réessayez.
            </li>
          ) : items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-text-muted">
              {hasQuery ? 'Aucun résultat.' : 'Tapez pour rechercher dans vos contenus.'}
            </li>
          ) : (
            items.map((item, index) => {
              const showHeader = item.group !== lastGroup;
              lastGroup = item.group;
              const active = index === activeIndex;
              return (
                <li key={item.key}>
                  {showHeader ? (
                    <p className="px-2 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wide text-text-muted first:pt-1">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    id={`command-${item.key}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-active={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => run(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                      active ? 'bg-brand/10 text-text' : 'text-text hover:bg-surface-muted',
                    )}
                  >
                    <span className="shrink-0 text-text-muted">{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base">{item.label}</span>
                      {item.sublabel ? (
                        <span className="block truncate text-sm text-text-muted">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-2xs text-text-muted">
          <span>Naviguer avec les flèches</span>
          <span>Entrée pour ouvrir</span>
          <span>Échap pour fermer</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
