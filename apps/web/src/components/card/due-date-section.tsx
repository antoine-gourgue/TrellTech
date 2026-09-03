'use client';

import { CalendarClock, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import { useUpdateCardDetail } from '@/lib/hooks/use-card';
import { fromDateInputValue, toDateInputValue, fullDate } from '@/lib/dates';
import { useToast } from '@/components/ui/toast';

type Props = {
  cardId: string;
  boardId: string;
  dueDate: string | null;
  dueComplete: boolean;
};

export function DueDateSection({ cardId, boardId, dueDate, dueComplete }: Props) {
  const toast = useToast();
  const update = useUpdateCardDetail({ cardId, boardId });

  function onError(err: unknown) {
    toast.error('Échéance non mise à jour', err instanceof ApiRequestError ? err.message : undefined);
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
        <CalendarClock className="size-4 text-text-muted" aria-hidden />
        Échéance
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {dueDate ? (
          <button
            type="button"
            aria-pressed={dueComplete}
            aria-label={dueComplete ? 'Marquer comme non terminé' : 'Marquer comme terminé'}
            onClick={() =>
              update.mutate({ dueComplete: !dueComplete }, { onError })
            }
            className={cn(
              'grid size-5 shrink-0 place-items-center rounded border transition-colors',
              dueComplete
                ? 'border-success bg-success text-white'
                : 'border-border bg-surface hover:border-success',
            )}
          >
            {dueComplete ? <Check className="size-3.5" aria-hidden /> : null}
          </button>
        ) : null}
        <label className="sr-only" htmlFor={`due-${cardId}`}>
          Date d&apos;échéance
        </label>
        <input
          id={`due-${cardId}`}
          type="date"
          value={toDateInputValue(dueDate)}
          onChange={(e) =>
            update.mutate({ dueDate: fromDateInputValue(e.target.value) }, { onError })
          }
          className="h-9 rounded-md border border-border bg-surface px-3 text-base text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        />
        {dueDate ? (
          <>
            <span
              className={cn(
                'text-sm text-text-muted',
                dueComplete && 'line-through',
              )}
            >
              {fullDate(dueDate)}
            </span>
            <button
              type="button"
              onClick={() => update.mutate({ dueDate: null, dueComplete: false }, { onError })}
              className="text-sm font-medium text-text-muted hover:text-danger"
            >
              Retirer
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
