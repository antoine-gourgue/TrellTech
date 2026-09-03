'use client';

import { Archive, ArchiveRestore, Columns3, SquareKanban } from 'lucide-react';
import type { Card, List } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import {
  useBoardArchive,
  useRestoreArchivedCard,
  useRestoreArchivedList,
} from '@/lib/hooks/use-board';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { LabelDots } from '@/components/board/label-dots';
import { useToast } from '@/components/ui/toast';

export function ArchivePanel({
  open,
  onClose,
  boardId,
}: {
  open: boolean;
  onClose: () => void;
  boardId: string;
}) {
  const toast = useToast();
  const { data, isLoading, isError, error } = useBoardArchive(boardId, open);
  const restoreList = useRestoreArchivedList(boardId);
  const restoreCard = useRestoreArchivedCard(boardId);

  async function onRestoreList(list: List) {
    try {
      await restoreList.mutateAsync(list.id);
      toast.success('Liste restaurée', `« ${list.name} » est de retour sur le tableau.`);
    } catch (err) {
      toast.error('Restauration impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function onRestoreCard(card: Card) {
    try {
      await restoreCard.mutateAsync(card.id);
      toast.success('Carte restaurée', `« ${card.name} » est de retour sur le tableau.`);
    } catch (err) {
      toast.error('Restauration impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  const isEmpty = data && data.lists.length === 0 && data.cards.length === 0;

  return (
    <Modal open={open} onClose={onClose} title="Archives" description="Restaurez les listes et cartes archivées." size="lg">
      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
          <Spinner className="size-4 text-brand" />
          Chargement des archives…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Archive className="size-6 text-text-muted" aria-hidden />
          <p className="text-base font-medium text-text">Archives indisponibles</p>
          <p className="max-w-sm text-sm text-text-muted">
            {error instanceof ApiRequestError
              ? error.message
              : "Le service d'archives n'a pas pu être contacté."}
          </p>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Archive className="size-6 text-text-muted" aria-hidden />
          <p className="text-base text-text-muted">Aucun élément archivé.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {data && data.lists.length > 0 ? (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text">
                <Columns3 className="size-4 text-text-muted" aria-hidden />
                Listes ({data.lists.length})
              </h3>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {data.lists.map((list) => (
                  <li key={list.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-base text-text">{list.name}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onRestoreList(list)}
                      loading={restoreList.isPending && restoreList.variables === list.id}
                    >
                      <ArchiveRestore className="size-4" aria-hidden />
                      Restaurer
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data && data.cards.length > 0 ? (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text">
                <SquareKanban className="size-4 text-text-muted" aria-hidden />
                Cartes ({data.cards.length})
              </h3>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {data.cards.map((card) => (
                  <li key={card.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      {card.labels.length > 0 ? (
                        <LabelDots labels={card.labels} variant="pill" className="mb-1" />
                      ) : null}
                      <span className="block truncate text-base text-text">{card.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onRestoreCard(card)}
                      loading={restoreCard.isPending && restoreCard.variables === card.id}
                    >
                      <ArchiveRestore className="size-4" aria-hidden />
                      Restaurer
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
