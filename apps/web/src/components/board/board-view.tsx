'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiRequestError } from '@/lib/api';
import { useBoard } from '@/lib/hooks/use-board';
import { useMe } from '@/lib/hooks/use-auth';
import { useRealtime } from '@/lib/hooks/use-realtime';
import {
  EMPTY_FILTERS,
  readViewMode,
  writeViewMode,
  type BoardFilters,
  type BoardViewMode,
} from '@/lib/board-view';
import { BoardHeader } from '@/components/board/board-header';
import { BoardColumns } from '@/components/board/board-columns';
import { CalendarView } from '@/components/board/calendar-view';
import { TableView } from '@/components/board/table-view';
import { ShareModal } from '@/components/share/share-modal';
import { ArchivePanel } from '@/components/board/archive-panel';
import { BoardSkeleton } from '@/components/board/board-skeleton';
import { BoardError } from '@/components/board/board-error';
import { CardModal } from '@/components/card/card-modal';
import { CardOpenProvider, useCardOpen } from '@/components/card/card-open-context';

export function BoardView({ boardId }: { boardId: string }) {
  return (
    <CardOpenProvider>
      <BoardViewInner boardId={boardId} />
    </CardOpenProvider>
  );
}

function BoardViewInner({ boardId }: { boardId: string }) {
  const router = useRouter();
  const { openCardId, closeCard } = useCardOpen();
  const { data: board, isLoading, isError, error, refetch } = useBoard(boardId);
  const { data: me } = useMe();
  const { status } = useRealtime(boardId);

  const [viewMode, setViewMode] = useState<BoardViewMode>('board');
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const [shareOpen, setShareOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    setViewMode(readViewMode(boardId));
    setFilters(EMPTY_FILTERS);
  }, [boardId]);

  function changeViewMode(mode: BoardViewMode) {
    setViewMode(mode);
    writeViewMode(boardId, mode);
  }

  if (isLoading) return <BoardSkeleton />;
  if (isError || !board) {
    return (
      <BoardError
        message={error instanceof ApiRequestError ? error.message : undefined}
        onRetry={() => refetch()}
        onBack={() => router.push('/')}
      />
    );
  }

  const isOwner = board.members.some(
    (member) => member.role === 'OWNER' && member.user.id === me?.id,
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <BoardHeader
        board={board}
        realtimeStatus={status}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
        filters={filters}
        onFiltersChange={setFilters}
        isOwner={isOwner}
        onOpenShare={() => setShareOpen(true)}
        onOpenArchive={() => setArchiveOpen(true)}
      />

      {viewMode === 'board' ? (
        <BoardColumns board={board} filters={filters} />
      ) : viewMode === 'calendar' ? (
        <CalendarView board={board} filters={filters} />
      ) : (
        <TableView board={board} filters={filters} />
      )}

      {openCardId ? (
        <CardModal cardId={openCardId} boardId={boardId} onClose={closeCard} />
      ) : null}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        type="board"
        entityId={boardId}
        isOwner={isOwner}
      />
      <ArchivePanel open={archiveOpen} onClose={() => setArchiveOpen(false)} boardId={boardId} />
    </div>
  );
}
