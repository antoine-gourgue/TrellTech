'use client';

import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, GripVertical, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Card as CardType } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import type { BoardList } from '@/lib/hooks/use-board';
import {
  useArchiveList,
  useCreateCard,
  useDeleteList,
  useUpdateList,
} from '@/lib/hooks/use-board';
import { IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { CardItem } from '@/components/board/card-item';

type ListColumnProps = {
  list: BoardList;
  boardId: string;
  matches: (card: CardType) => boolean;
  filtered: boolean;
};

export function ListColumn({ list, boardId, matches, filtered }: ListColumnProps) {
  const toast = useToast();
  const updateList = useUpdateList(boardId);
  const deleteList = useDeleteList(boardId);
  const archiveList = useArchiveList(boardId);
  const createCard = useCreateCard(boardId);

  const {
    setNodeRef: setSortableRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id, data: { type: 'column', listId: list.id } });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `list:${list.id}`,
    data: { type: 'list', listId: list.id },
  });

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(list.name);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [adding, setAdding] = useState(false);
  const [cardName, setCardName] = useState('');
  const cardInputRef = useRef<HTMLTextAreaElement>(null);

  const visibleCards = list.cards.filter(matches);
  const cardIds = visibleCards.map((card) => card.id);

  const style = { transform: CSS.Transform.toString(transform), transition };

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === list.name) {
      setName(list.name);
      setEditingName(false);
      return;
    }
    try {
      await updateList.mutateAsync({ id: list.id, input: { name: trimmed } });
      setEditingName(false);
    } catch (err) {
      toast.error('Renommage impossible', err instanceof ApiRequestError ? err.message : undefined);
      setName(list.name);
      setEditingName(false);
    }
  }

  async function removeList() {
    try {
      await deleteList.mutateAsync(list.id);
      toast.success('Liste supprimée');
      setConfirmOpen(false);
    } catch (err) {
      toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function archive() {
    try {
      await archiveList.mutateAsync(list.id);
      toast.success('Liste archivée');
    } catch (err) {
      toast.error('Archivage impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function addCard() {
    const trimmed = cardName.trim();
    if (!trimmed) return;
    try {
      await createCard.mutateAsync({ listId: list.id, name: trimmed });
      setCardName('');
      requestAnimationFrame(() => cardInputRef.current?.focus());
    } catch (err) {
      toast.error('Ajout impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <section
      ref={setSortableRef}
      style={style}
      className={cn(
        'flex max-h-full w-72 shrink-0 flex-col rounded-lg border border-border bg-surface-muted',
        isDragging && 'opacity-0',
      )}
    >
      <header className="flex items-center gap-1 px-3 py-2.5">
        <button
          type="button"
          className="cursor-grab touch-none text-border transition-colors hover:text-text-muted active:cursor-grabbing"
          aria-label="Déplacer la liste"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') {
                setName(list.name);
                setEditingName(false);
              }
            }}
            maxLength={200}
            aria-label="Nom de la liste"
            className="h-7 min-w-0 flex-1 rounded-sm border border-brand bg-surface px-2 text-base font-semibold text-text focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1 py-0.5 text-left"
          >
            <h3 className="truncate text-base font-semibold text-text">{list.name}</h3>
            <span className="rounded-full bg-surface px-1.5 text-2xs font-semibold text-text-muted">
              {filtered ? `${visibleCards.length}/${list.cards.length}` : list.cards.length}
            </span>
          </button>
        )}
        <Dropdown
          trigger={({ toggle, ref }) => (
            <IconButton ref={ref} label="Options de la liste" size="sm" onClick={toggle}>
              <MoreHorizontal className="size-4" aria-hidden />
            </IconButton>
          )}
          items={[
            { label: 'Renommer', icon: <Pencil />, onSelect: () => setEditingName(true) },
            { label: 'Archiver la liste', icon: <Archive />, onSelect: archive },
            {
              label: 'Supprimer la liste',
              icon: <Trash2 />,
              danger: true,
              onSelect: () => setConfirmOpen(true),
            },
          ]}
        />
      </header>

      <div
        ref={setDropRef}
        className={cn(
          'scrollbar-thin flex min-h-2 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-1 transition-colors',
          isOver && 'bg-brand/5',
        )}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {visibleCards.map((card) => (
              <CardItem key={card.id} card={card} boardId={boardId} />
            ))}
          </ul>
        </SortableContext>
        {visibleCards.length === 0 && !adding ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-text-muted">
            {filtered && list.cards.length > 0 ? 'Aucune carte ne correspond aux filtres' : 'Aucune carte'}
          </p>
        ) : null}
      </div>

      <div className="p-2">
        {adding ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={cardInputRef}
              autoFocus
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCard();
                }
                if (e.key === 'Escape') {
                  setAdding(false);
                  setCardName('');
                }
              }}
              rows={2}
              placeholder="Intitulé de la carte…"
              aria-label="Nouvelle carte"
              className="w-full resize-none rounded-md border border-border bg-surface p-2.5 text-base text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={addCard} loading={createCard.isPending}>
                Ajouter
              </Button>
              <IconButton
                label="Annuler"
                size="sm"
                onClick={() => {
                  setAdding(false);
                  setCardName('');
                }}
              >
                <X className="size-4" aria-hidden />
              </IconButton>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-base font-medium text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <Plus className="size-4" aria-hidden />
            Ajouter une carte
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Supprimer « ${list.name} » ?`}
        description={`${list.cards.length} carte${list.cards.length > 1 ? 's' : ''} seront supprimées.`}
        confirmLabel="Supprimer"
        destructive
        loading={deleteList.isPending}
        onConfirm={removeList}
        onClose={() => setConfirmOpen(false)}
      />
    </section>
  );
}

/** Prévisualisation statique d'une colonne, rendue dans le DragOverlay
 * pendant le déplacement (une seule copie flottante, sans hooks DnD). */
export function ColumnPreview({ list }: { list: BoardList }) {
  return (
    <section className="flex max-h-[70vh] w-72 shrink-0 flex-col rounded-lg border border-border bg-surface-muted shadow-md">
      <header className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="size-4 text-text-muted" aria-hidden />
        <h3 className="truncate text-base font-semibold text-text">{list.name}</h3>
        <span className="rounded-full bg-surface px-1.5 text-2xs font-semibold text-text-muted">
          {list.cards.length}
        </span>
      </header>
      <div className="flex flex-col gap-2 px-2 pb-2">
        {list.cards.slice(0, 5).map((card) => (
          <div
            key={card.id}
            className="truncate rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            {card.name}
          </div>
        ))}
        {list.cards.length > 5 ? (
          <p className="px-1 text-2xs text-text-muted">+{list.cards.length - 5} autres</p>
        ) : null}
      </div>
    </section>
  );
}
