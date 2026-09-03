'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, MoreHorizontal, Pencil, Trash2, UserPlus } from 'lucide-react';
import type { BoardDetail } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import { useDeleteBoard, useUpdateBoard } from '@/lib/hooks/use-workspaces';
import type { RealtimeStatus } from '@/lib/hooks/use-realtime';
import type { BoardFilters as Filters, BoardViewMode } from '@/lib/board-view';
import { IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { RealtimeIndicator } from '@/components/board/realtime-indicator';
import { ViewSwitcher } from '@/components/board/view-switcher';
import { BoardFilters } from '@/components/board/board-filters';

type BoardHeaderProps = {
  board: BoardDetail;
  realtimeStatus: RealtimeStatus;
  viewMode: BoardViewMode;
  onViewModeChange: (mode: BoardViewMode) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  isOwner: boolean;
  onOpenShare: () => void;
  onOpenArchive: () => void;
};

export function BoardHeader({
  board,
  realtimeStatus,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  isOwner,
  onOpenShare,
  onOpenArchive,
}: BoardHeaderProps) {
  const router = useRouter();
  const toast = useToast();
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setName(board.name);
  }, [board.name]);

  const listCount = board.lists.length;
  const cardCount = board.lists.reduce((sum, list) => sum + list.cards.length, 0);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === board.name) {
      setName(board.name);
      setEditing(false);
      return;
    }
    try {
      await updateBoard.mutateAsync({ id: board.id, input: { name: trimmed } });
      setEditing(false);
    } catch (err) {
      toast.error('Renommage impossible', err instanceof ApiRequestError ? err.message : undefined);
      setName(board.name);
      setEditing(false);
    }
  }

  async function remove() {
    try {
      await deleteBoard.mutateAsync(board.id);
      toast.success('Tableau supprimé');
      router.push('/');
    } catch (err) {
      toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 sm:px-8">
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveName();
            if (e.key === 'Escape') {
              setName(board.name);
              setEditing(false);
            }
          }}
          maxLength={200}
          aria-label="Titre du tableau"
          className="h-9 min-w-0 flex-1 rounded-md border border-brand bg-surface px-2 text-xl font-semibold text-text focus:outline-none sm:flex-none sm:w-96"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-left"
        >
          <h1 className="truncate text-xl font-semibold tracking-tight text-text">{board.name}</h1>
          <Pencil
            className="size-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </button>
      )}

      <RealtimeIndicator status={realtimeStatus} />

      <span className="hidden shrink-0 text-sm text-text-muted md:inline">
        {listCount} liste{listCount > 1 ? 's' : ''} · {cardCount} carte{cardCount > 1 ? 's' : ''}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <ViewSwitcher value={viewMode} onChange={onViewModeChange} />
        <BoardFilters board={board} filters={filters} onChange={onFiltersChange} />

        {board.members.length > 0 ? (
          <span className="hidden -space-x-1.5 sm:flex">
            {board.members.slice(0, 3).map((member) => (
              <Avatar key={member.user.id} user={member.user} size="sm" />
            ))}
          </span>
        ) : null}

        <Button variant="secondary" size="sm" onClick={onOpenShare}>
          <UserPlus className="size-4" aria-hidden />
          <span className="hidden sm:inline">Partager</span>
        </Button>

        <Dropdown
          trigger={({ toggle, ref }) => (
            <IconButton ref={ref} label="Options du tableau" variant="solid" size="sm" onClick={toggle}>
              <MoreHorizontal className="size-4" aria-hidden />
            </IconButton>
          )}
          items={[
            { label: 'Renommer le tableau', icon: <Pencil />, onSelect: () => setEditing(true) },
            { label: 'Voir les archives', icon: <Archive />, onSelect: onOpenArchive },
            ...(isOwner
              ? [
                  {
                    label: 'Supprimer le tableau',
                    icon: <Trash2 />,
                    danger: true,
                    onSelect: () => setConfirmOpen(true),
                  },
                ]
              : []),
          ]}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Supprimer « ${board.name} » ?`}
        description="Toutes les listes et cartes de ce tableau seront supprimées."
        confirmLabel="Supprimer"
        destructive
        loading={deleteBoard.isPending}
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
