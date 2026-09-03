'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { BoardDetail, Card as CardType } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import { useMoveCard, useMoveList } from '@/lib/hooks/use-board';
import { matchesFilters, type BoardFilters } from '@/lib/board-view';
import { useToast } from '@/components/ui/toast';
import { ColumnPreview, ListColumn } from '@/components/board/list-column';
import { CardPreview } from '@/components/board/card-item';
import { AddList } from '@/components/board/add-list';

type DragState =
  | { type: 'card'; card: CardType }
  | { type: 'column'; listId: string }
  | null;

export function BoardColumns({
  board,
  filters,
}: {
  board: BoardDetail;
  filters: BoardFilters;
}) {
  const toast = useToast();
  const moveCard = useMoveCard(board.id);
  const moveList = useMoveList(board.id);

  const [drag, setDrag] = useState<DragState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const cardsById = useMemo(() => {
    const map = new Map<string, CardType>();
    board.lists.forEach((list) => list.cards.forEach((card) => map.set(card.id, card)));
    return map;
  }, [board]);

  const listIds = board.lists.map((list) => list.id);
  const matches = useMemo(() => (card: CardType) => matchesFilters(card, filters), [filters]);
  const filtersOn =
    filters.labelIds.length > 0 || filters.memberIds.length > 0 || filters.due !== 'any';

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { type?: string } | undefined;
    if (data?.type === 'column') {
      setDrag({ type: 'column', listId: String(event.active.id) });
      return;
    }
    const card = cardsById.get(String(event.active.id));
    setDrag(card ? { type: 'card', card } : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const state = drag;
    setDrag(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { type?: string; listId?: string } | undefined;
    const overData = over.data.current as { type?: string; listId?: string } | undefined;

    if (state?.type === 'column' || activeData?.type === 'column') {
      handleColumnDrop(String(active.id), over.id, overData);
      return;
    }

    handleCardDrop(String(active.id), over.id, overData);
  }

  function handleColumnDrop(
    listId: string,
    overId: string | number,
    overData: { type?: string; listId?: string } | undefined,
  ) {
    const destListId = overData?.listId ?? String(overId).replace(/^list:/, '');
    const targetIndex = board.lists.findIndex((list) => list.id === destListId);
    const currentIndex = board.lists.findIndex((list) => list.id === listId);
    if (targetIndex === -1 || currentIndex === -1 || targetIndex === currentIndex) return;

    moveList.mutate(
      { listId, input: { position: targetIndex } },
      {
        onError: (err) =>
          toast.error(
            'Déplacement impossible',
            err instanceof ApiRequestError ? err.message : undefined,
          ),
      },
    );
  }

  function handleCardDrop(
    cardId: string,
    overId: string | number,
    overData: { type?: string; listId?: string } | undefined,
  ) {
    const sourceList = board.lists.find((list) => list.cards.some((c) => c.id === cardId));
    if (!sourceList) return;

    const destListId = overData?.listId ?? String(overId).replace(/^list:/, '');
    const destList = board.lists.find((list) => list.id === destListId);
    if (!destList) return;

    const remaining = destList.cards.filter((c) => c.id !== cardId);
    let targetIndex: number;
    if (overData?.type === 'card') {
      const overIndex = remaining.findIndex((c) => c.id === String(overId));
      targetIndex = overIndex === -1 ? remaining.length : overIndex;
    } else {
      targetIndex = remaining.length;
    }

    const currentIndex = sourceList.cards.findIndex((c) => c.id === cardId);
    if (sourceList.id === destListId && currentIndex === targetIndex) return;

    moveCard.mutate(
      { cardId, input: { listId: destListId, position: targetIndex } },
      {
        onError: (err) =>
          toast.error(
            'Déplacement impossible',
            err instanceof ApiRequestError ? err.message : undefined,
          ),
      },
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      <div className="scrollbar-thin flex flex-1 items-start gap-4 overflow-x-auto px-5 pb-5 sm:px-8">
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          {board.lists.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              boardId={board.id}
              matches={matches}
              filtered={filtersOn}
            />
          ))}
        </SortableContext>
        <AddList boardId={board.id} hasLists={board.lists.length > 0} />
      </div>
      <DragOverlay dropAnimation={null}>
        {drag?.type === 'card' ? (
          <div className="w-72 rotate-1">
            <CardPreview card={drag.card} />
          </div>
        ) : drag?.type === 'column' ? (
          (() => {
            const list = board.lists.find((l) => l.id === drag.listId);
            return list ? (
              <div className="rotate-1">
                <ColumnPreview list={list} />
              </div>
            ) : null;
          })()
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
