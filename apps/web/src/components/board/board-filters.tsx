'use client';

import { Filter, X } from 'lucide-react';
import type { BoardDetail } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import {
  countActiveFilters,
  filtersActive,
  type BoardFilters as Filters,
  type DueFilter,
} from '@/lib/board-view';
import { getLabelColor } from '@/lib/label-colors';
import { Popover } from '@/components/ui/popover';
import { Avatar } from '@/components/ui/avatar';

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'any', label: 'Toutes' },
  { value: 'has', label: 'Avec échéance' },
  { value: 'overdue', label: 'En retard' },
];

export function BoardFilters({
  board,
  filters,
  onChange,
}: {
  board: BoardDetail;
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const active = filtersActive(filters);
  const count = countActiveFilters(filters);

  function toggleLabel(id: string) {
    onChange({
      ...filters,
      labelIds: filters.labelIds.includes(id)
        ? filters.labelIds.filter((l) => l !== id)
        : [...filters.labelIds, id],
    });
  }

  function toggleMember(id: string) {
    onChange({
      ...filters,
      memberIds: filters.memberIds.includes(id)
        ? filters.memberIds.filter((m) => m !== id)
        : [...filters.memberIds, id],
    });
  }

  return (
    <Popover
      align="end"
      className="w-72"
      trigger={({ toggle, ref, open, ...aria }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup={aria['aria-haspopup']}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
            active
              ? 'border-brand/40 bg-brand/10 text-brand'
              : 'border-border bg-surface text-text-muted hover:bg-surface-muted hover:text-text',
          )}
        >
          <Filter className="size-4" aria-hidden />
          <span className="hidden sm:inline">Filtres</span>
          {count > 0 ? (
            <span className="grid size-4 place-items-center rounded-full bg-brand text-2xs font-bold text-brand-contrast">
              {count}
            </span>
          ) : null}
        </button>
      )}
    >
      {() => (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text">Filtrer les cartes</p>
            {active ? (
              <button
                type="button"
                onClick={() => onChange({ labelIds: [], memberIds: [], due: 'any' })}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                <X className="size-3.5" aria-hidden />
                Réinitialiser
              </button>
            ) : null}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-text-muted">
              Échéance
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {DUE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filters.due === option.value}
                  onClick={() => onChange({ ...filters, due: option.value })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-sm transition-colors',
                    filters.due === option.value
                      ? 'border-brand/40 bg-brand/10 text-brand'
                      : 'border-border text-text-muted hover:bg-surface-muted',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {board.labels.length > 0 ? (
            <fieldset>
              <legend className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-text-muted">
                Étiquettes
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {board.labels.map((label) => {
                  const color = getLabelColor(label.color);
                  const on = filters.labelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleLabel(label.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm transition-colors',
                        on ? 'border-transparent' : 'border-border text-text-muted hover:bg-surface-muted',
                      )}
                      style={on ? { backgroundColor: color.solid, color: color.contrast } : undefined}
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: color.solid }}
                        aria-hidden
                      />
                      {label.name || 'Sans nom'}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {board.members.length > 0 ? (
            <fieldset>
              <legend className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-text-muted">
                Membres
              </legend>
              <div className="flex flex-col gap-1">
                {board.members.map((member) => {
                  const on = filters.memberIds.includes(member.user.id);
                  const name = member.user.fullName ?? member.user.username;
                  return (
                    <button
                      key={member.user.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleMember(member.user.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-base transition-colors',
                        on ? 'bg-brand/10 text-brand' : 'text-text hover:bg-surface-muted',
                      )}
                    >
                      <Avatar user={member.user} size="xs" />
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      {on ? <span className="size-2 rounded-full bg-brand" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </div>
      )}
    </Popover>
  );
}
