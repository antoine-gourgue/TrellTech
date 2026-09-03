'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BoardDetail, Card as CardType } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { isOverdue, matchesFilters, type BoardFilters } from '@/lib/board-view';
import { getLabelColor } from '@/lib/label-colors';
import { IconButton } from '@/components/ui/icon-button';
import { useCardOpen } from '@/components/card/card-open-context';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function CalendarView({
  board,
  filters,
}: {
  board: BoardDetail;
  filters: BoardFilters;
}) {
  const { openCard } = useCardOpen();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const cardsByDay = useMemo(() => {
    const map = new Map<string, CardType[]>();
    for (const list of board.lists) {
      for (const card of list.cards) {
        if (!card.dueDate || !matchesFilters(card, filters)) continue;
        const date = new Date(card.dueDate);
        if (Number.isNaN(date.getTime())) continue;
        const key = format(date, 'yyyy-MM-dd');
        const existing = map.get(key);
        if (existing) existing.push(card);
        else map.set(key, [card]);
      }
    }
    return map;
  }, [board, filters]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const scheduledCount = useMemo(
    () => Array.from(cardsByDay.values()).reduce((sum, cards) => sum + cards.length, 0),
    [cardsByDay],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-5 pb-5 sm:px-8">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-md font-semibold capitalize text-text">
          {format(month, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex items-center gap-1">
          <IconButton label="Mois précédent" size="sm" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="size-4" aria-hidden />
          </IconButton>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            Aujourd&apos;hui
          </button>
          <IconButton label="Mois suivant" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="size-4" aria-hidden />
          </IconButton>
        </div>
      </div>

      {scheduledCount === 0 ? (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-text-muted">
          <CalendarClock className="size-4" aria-hidden />
          Aucune carte avec échéance à afficher.
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-px border-b border-border">
        {WEEKDAYS.map((day) => (
          <div key={day} className="pb-2 text-center text-2xs font-semibold uppercase tracking-wide text-text-muted">
            {day}
          </div>
        ))}
      </div>

      <div className="scrollbar-thin grid flex-1 grid-cols-7 gap-px overflow-y-auto rounded-md bg-border">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const cards = cardsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={key}
              className={cn(
                'flex min-h-24 flex-col gap-1 p-1.5',
                inMonth ? 'bg-surface' : 'bg-surface-muted',
              )}
            >
              <span
                className={cn(
                  'mb-0.5 inline-grid size-6 place-items-center rounded-full text-2xs font-semibold',
                  isToday(day)
                    ? 'bg-brand text-brand-contrast'
                    : inMonth
                      ? 'text-text'
                      : 'text-text-muted',
                )}
              >
                {format(day, 'd')}
              </span>
              {cards.map((card) => (
                <CalendarCard key={card.id} card={card} today={isSameDay(day, new Date())} onOpen={openCard} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarCard({
  card,
  today,
  onOpen,
}: {
  card: CardType;
  today: boolean;
  onOpen: (id: string) => void;
}) {
  const overdue = isOverdue(card);
  const firstLabel = card.labels[0];
  const accent = firstLabel ? getLabelColor(firstLabel.color).solid : undefined;
  return (
    <button
      type="button"
      onClick={() => onOpen(card.id)}
      title={card.name}
      className={cn(
        'flex items-center gap-1.5 rounded-sm border-l-2 bg-surface-muted px-1.5 py-1 text-left text-2xs text-text transition-colors hover:bg-brand/10',
        overdue && 'text-danger',
      )}
      style={accent ? { borderColor: accent } : undefined}
    >
      {card.dueComplete ? (
        <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
      ) : overdue ? (
        <span className="size-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
      ) : today ? (
        <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
      ) : null}
      <span className={cn('min-w-0 flex-1 truncate', card.dueComplete && 'line-through')}>
        {card.name}
      </span>
    </button>
  );
}
