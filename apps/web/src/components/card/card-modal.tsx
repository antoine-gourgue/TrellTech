'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ApiRequestError } from '@/lib/api';
import { useBoard } from '@/lib/hooks/use-board';
import { useCard, useUpdateCardDetail } from '@/lib/hooks/use-card';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { LabelDots } from '@/components/board/label-dots';
import { useToast } from '@/components/ui/toast';
import { DescriptionSection } from './description-section';
import { DueDateSection } from './due-date-section';
import { LabelsSection } from './labels-section';
import { MembersSection } from './members-section';
import { ChecklistsSection } from './checklists-section';
import { CommentsSection } from './comments-section';
import { AttachmentsSection } from './attachments-section';
import { ActivitySection } from './activity-section';

type CardModalProps = {
  cardId: string;
  boardId: string;
  onClose: () => void;
};

export function CardModal({ cardId, boardId, onClose }: CardModalProps) {
  const { data: card, isLoading, isError, error, refetch } = useCard(cardId);
  const { data: board } = useBoard(boardId);

  const listName = useMemo(
    () => board?.lists.find((list) => list.id === card?.listId)?.name ?? '',
    [board, card],
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={card?.name ?? 'Carte'}
      size="xl"
      bodyClassName="pt-2"
      renderHeader={
        card ? (
          <CardHeader cardId={cardId} boardId={boardId} name={card.name} listName={listName} />
        ) : (
          <div className="flex items-center gap-2 py-1 text-base text-text-muted">
            <CreditCard className="size-4" aria-hidden />
            Carte
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="size-6 text-brand" />
        </div>
      ) : isError || !card ? (
        <div className="grid place-items-center gap-3 py-16 text-center">
          <p className="text-base text-text-muted">
            {error instanceof ApiRequestError ? error.message : 'Carte introuvable.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {card.coverUrl ? (
            <img
              src={card.coverUrl}
              alt=""
              className="max-h-52 w-full rounded-md object-cover"
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <MembersSection cardId={cardId} boardId={boardId} members={card.members} />
            <LabelsSection
              cardId={cardId}
              boardId={boardId}
              boardLabels={board?.labels ?? []}
              cardLabels={card.labels}
            />
          </div>

          {card.members.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">Membres</span>
              <div className="flex -space-x-1.5">
                {card.members.map((member) => (
                  <Avatar key={member.id} user={member} size="sm" />
                ))}
              </div>
            </div>
          ) : null}

          {card.labels.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-text">Étiquettes</span>
              <LabelDots labels={card.labels} variant="pill" />
            </div>
          ) : null}

          <DueDateSection
            cardId={cardId}
            boardId={boardId}
            dueDate={card.dueDate}
            dueComplete={card.dueComplete}
          />

          <DescriptionSection cardId={cardId} boardId={boardId} description={card.description} />

          <ChecklistsSection cardId={cardId} boardId={boardId} checklists={card.checklists} />

          <AttachmentsSection cardId={cardId} boardId={boardId} attachments={card.attachments} />

          <CommentsSection cardId={cardId} boardId={boardId} comments={card.comments} />

          <ActivitySection activity={card.activity} />
        </div>
      )}
    </Modal>
  );
}

function CardHeader({
  cardId,
  boardId,
  name,
  listName,
}: {
  cardId: string;
  boardId: string;
  name: string;
  listName: string;
}) {
  const toast = useToast();
  const update = useUpdateCardDetail({ cardId, boardId });
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  useEffect(() => {
    if (!editing) setValue(name);
  }, [name, editing]);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setValue(name);
      setEditing(false);
      return;
    }
    try {
      await update.mutateAsync({ name: trimmed });
      setEditing(false);
    } catch (err) {
      toast.error('Renommage impossible', err instanceof ApiRequestError ? err.message : undefined);
      setValue(name);
      setEditing(false);
    }
  }

  return (
    <div className="flex gap-2.5">
      <CreditCard className="mt-1 size-5 shrink-0 text-text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                save();
              }
              if (e.key === 'Escape') {
                setValue(name);
                setEditing(false);
              }
            }}
            rows={1}
            maxLength={200}
            aria-label="Titre de la carte"
            className="w-full resize-none rounded-sm border border-brand bg-surface px-1.5 py-0.5 text-lg font-semibold text-text focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="block w-full rounded-sm px-1.5 py-0.5 text-left text-lg font-semibold text-text hover:bg-surface-muted"
          >
            {name}
          </button>
        )}
        <p className="mt-0.5 px-1.5 text-sm text-text-muted">
          dans la liste <span className="font-medium text-text">{listName || '…'}</span>
        </p>
      </div>
    </div>
  );
}
