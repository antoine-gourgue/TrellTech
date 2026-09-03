'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Archive,
  CalendarClock,
  CheckSquare,
  GripVertical,
  MessageSquare,
  Paperclip,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Card as CardType } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import { useArchiveCard, useDeleteCard, useUpdateCard } from '@/lib/hooks/use-board';
import { IconButton } from '@/components/ui/icon-button';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { LabelDots } from '@/components/board/label-dots';
import { useCardOpen } from '@/components/card/card-open-context';

type CardItemProps = {
  card: CardType;
  boardId: string;
};

function formatDue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function CardItem({ card, boardId }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', listId: card.listId },
  });

  const toast = useToast();
  const { openCard } = useCardOpen();
  const updateCard = useUpdateCard(boardId);
  const deleteCard = useDeleteCard(boardId);
  const archiveCard = useArchiveCard(boardId);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.name);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === card.name) {
      setTitle(card.name);
      setEditing(false);
      return;
    }
    try {
      await updateCard.mutateAsync({ id: card.id, input: { name: trimmed } });
      setEditing(false);
    } catch (err) {
      toast.error('Modification impossible', err instanceof ApiRequestError ? err.message : undefined);
      setTitle(card.name);
      setEditing(false);
    }
  }

  async function remove() {
    try {
      await deleteCard.mutateAsync(card.id);
      toast.success('Carte supprimée');
      setConfirmOpen(false);
    } catch (err) {
      toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function archive() {
    try {
      await archiveCard.mutateAsync(card.id);
      toast.success('Carte archivée');
    } catch (err) {
      toast.error('Archivage impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-md border border-border bg-surface shadow-sm transition-colors',
        isDragging ? 'opacity-40' : 'hover:border-brand/40',
      )}
    >
      {editing ? (
        <div className="p-2.5">
          <textarea
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveTitle();
              }
              if (e.key === 'Escape') {
                setTitle(card.name);
                setEditing(false);
              }
            }}
            rows={2}
            className="w-full resize-none rounded-sm bg-transparent text-base text-text focus:outline-none"
            aria-label="Titre de la carte"
          />
        </div>
      ) : (
        <>
          {card.coverUrl ? (
            <img
              src={card.coverUrl}
              alt=""
              className="h-24 w-full rounded-t-md object-cover"
            />
          ) : null}
          <div className="flex items-start gap-1 p-2.5">
            <button
              type="button"
              className="mt-0.5 cursor-grab touch-none text-border transition-colors group-hover:text-text-muted active:cursor-grabbing"
              aria-label="Déplacer la carte"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => openCard(card.id)}
              className="min-w-0 flex-1 text-left"
            >
              {card.labels.length > 0 ? (
                <LabelDots labels={card.labels} variant="pill" className="mb-1.5" />
              ) : null}
              <p className="whitespace-pre-wrap break-words text-base text-text">{card.name}</p>
              <CardMeta card={card} />
            </button>
            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <IconButton label="Renommer la carte" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" aria-hidden />
              </IconButton>
              <IconButton label="Archiver la carte" size="sm" onClick={archive}>
                <Archive className="size-3.5" aria-hidden />
              </IconButton>
              <IconButton
                label="Supprimer la carte"
                size="sm"
                variant="danger"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </IconButton>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer cette carte ?"
        confirmLabel="Supprimer"
        destructive
        loading={deleteCard.isPending}
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      />
    </li>
  );
}

function CardMeta({ card }: { card: CardType }) {
  const { done, total } = card.checklistSummary;
  const hasMeta =
    Boolean(card.dueDate) ||
    total > 0 ||
    card.commentCount > 0 ||
    card.attachmentCount > 0 ||
    card.members.length > 0;

  if (!hasMeta) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs font-medium text-text-muted">
      {card.dueDate ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5',
            card.dueComplete
              ? 'bg-success/15 text-success line-through'
              : 'bg-surface-muted text-text-muted',
          )}
        >
          <CalendarClock className="size-3" aria-hidden />
          {formatDue(card.dueDate)}
        </span>
      ) : null}
      {total > 0 ? (
        <span className="inline-flex items-center gap-1">
          <CheckSquare className="size-3" aria-hidden />
          {done}/{total}
        </span>
      ) : null}
      {card.commentCount > 0 ? (
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3" aria-hidden />
          {card.commentCount}
        </span>
      ) : null}
      {card.attachmentCount > 0 ? (
        <span className="inline-flex items-center gap-1">
          <Paperclip className="size-3" aria-hidden />
          {card.attachmentCount}
        </span>
      ) : null}
      {card.members.length > 0 ? (
        <span className="ml-auto flex -space-x-1.5">
          {card.members.slice(0, 3).map((member) => (
            <Avatar key={member.id} user={member} size="xs" />
          ))}
        </span>
      ) : null}
    </div>
  );
}

export function CardPreview({ card }: { card: CardType }) {
  return (
    <div className="rotate-2 cursor-grabbing rounded-md border border-brand/40 bg-surface p-2.5 shadow-md">
      {card.labels.length > 0 ? (
        <LabelDots labels={card.labels} variant="pill" className="mb-1.5" />
      ) : null}
      <p className="whitespace-pre-wrap break-words text-base text-text">{card.name}</p>
    </div>
  );
}
