'use client';

import { Calendar, LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { BoardViewMode } from '@/lib/board-view';

const OPTIONS: { mode: BoardViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { mode: 'board', label: 'Tableau', icon: LayoutGrid },
  { mode: 'calendar', label: 'Calendrier', icon: Calendar },
  { mode: 'table', label: 'Table', icon: Table2 },
];

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: BoardViewMode;
  onChange: (mode: BoardViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Mode d'affichage"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
    >
      {OPTIONS.map(({ mode, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand/10 text-brand'
                : 'text-text-muted hover:bg-surface-muted hover:text-text',
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
