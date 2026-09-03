'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import type { BoardDetail, Card as CardType } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { isOverdue, matchesFilters, type BoardFilters } from '@/lib/board-view';
import { shortDate } from '@/lib/dates';
import { LabelDots } from '@/components/board/label-dots';
import { Avatar } from '@/components/ui/avatar';
import { useCardOpen } from '@/components/card/card-open-context';

type SortKey = 'list' | 'title' | 'labels' | 'members' | 'due';
type SortDir = 'asc' | 'desc';

type Row = { card: CardType; listName: string };

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'list', label: 'Liste' },
  { key: 'title', label: 'Titre' },
  { key: 'labels', label: 'Étiquettes' },
  { key: 'members', label: 'Membres' },
  { key: 'due', label: 'Échéance' },
];

function compare(a: Row, b: Row, key: SortKey): number {
  switch (key) {
    case 'list':
      return a.listName.localeCompare(b.listName, 'fr');
    case 'title':
      return a.card.name.localeCompare(b.card.name, 'fr');
    case 'labels':
      return a.card.labels.length - b.card.labels.length;
    case 'members':
      return a.card.members.length - b.card.members.length;
    case 'due': {
      const av = a.card.dueDate ? new Date(a.card.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bv = b.card.dueDate ? new Date(b.card.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return av - bv;
    }
    default:
      return 0;
  }
}

export function TableView({ board, filters }: { board: BoardDetail; filters: BoardFilters }) {
  const { openCard } = useCardOpen();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'list', dir: 'asc' });

  const rows = useMemo<Row[]>(() => {
    const collected: Row[] = [];
    for (const list of board.lists) {
      for (const card of list.cards) {
        if (matchesFilters(card, filters)) collected.push({ card, listName: list.name });
      }
    }
    collected.sort((a, b) => {
      const value = compare(a, b, sort.key);
      return sort.dir === 'asc' ? value : -value;
    });
    return collected;
  }, [board, filters, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-auto px-5 pb-5 sm:px-8">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Inbox className="size-7 text-text-muted" aria-hidden />
          <p className="text-base text-text-muted">Aucune carte à afficher.</p>
        </div>
      ) : (
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((column) => {
                const active = sort.key === column.key;
                const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="p-0 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        'flex w-full items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-colors',
                        active ? 'text-text' : 'text-text-muted hover:text-text',
                      )}
                    >
                      {column.label}
                      <Icon className="size-3.5" aria-hidden />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ card, listName }) => {
              const overdue = isOverdue(card);
              return (
                <tr
                  key={card.id}
                  onClick={() => openCard(card.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openCard(card.id);
                    }
                  }}
                  className="cursor-pointer border-b border-border transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted"
                >
                  <td className="px-3 py-2.5 align-middle text-text-muted">
                    <span className="inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-sm">
                      {listName}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-middle font-medium text-text">
                    <span className="line-clamp-2">{card.name}</span>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {card.labels.length > 0 ? (
                      <LabelDots labels={card.labels} variant="pill" />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {card.members.length > 0 ? (
                      <span className="flex -space-x-1.5">
                        {card.members.slice(0, 4).map((member) => (
                          <Avatar key={member.id} user={member} size="xs" />
                        ))}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {card.dueDate ? (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-sm px-1.5 py-0.5 text-sm',
                          card.dueComplete
                            ? 'text-success line-through'
                            : overdue
                              ? 'bg-danger/10 text-danger'
                              : 'text-text-muted',
                        )}
                      >
                        {shortDate(card.dueDate)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
