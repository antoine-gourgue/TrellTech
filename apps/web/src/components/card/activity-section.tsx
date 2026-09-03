'use client';

import { useState } from 'react';
import { Activity as ActivityIcon, ChevronDown } from 'lucide-react';
import type { Activity } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/dates';

const LABELS: Record<string, string> = {
  card_created: 'a créé cette carte',
  card_updated: 'a mis à jour la carte',
  card_moved: 'a déplacé la carte',
  comment_added: 'a ajouté un commentaire',
  attachment_added: 'a ajouté une pièce jointe',
  attachment_removed: 'a retiré une pièce jointe',
  label_added: 'a ajouté une étiquette',
  label_removed: 'a retiré une étiquette',
  member_added: 'a assigné un membre',
  member_removed: 'a retiré un membre',
  checklist_added: 'a ajouté une checklist',
  checklist_item_added: 'a ajouté un élément de checklist',
};

function describe(type: string): string {
  return LABELS[type] ?? type.replace(/_/g, ' ');
}

export function ActivitySection({ activity }: { activity: Activity[] }) {
  const [open, setOpen] = useState(false);

  if (activity.length === 0) return null;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-sm font-semibold text-text"
      >
        <ActivityIcon className="size-4 text-text-muted" aria-hidden />
        Activité
        <span className="text-xs font-normal text-text-muted">({activity.length})</span>
        <ChevronDown
          className={cn('ml-auto size-4 text-text-muted transition-transform', open ? '' : '-rotate-90')}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="mt-3 flex flex-col gap-2.5">
          {activity.map((entry) => (
            <li key={entry.id} className="flex items-baseline gap-2 text-base text-text-muted">
              <span className="size-1.5 shrink-0 translate-y-1.5 rounded-full bg-border" aria-hidden />
              <span className="min-w-0">
                <span className="font-medium text-text">
                  {entry.user ? entry.user.fullName ?? entry.user.username : 'Système'}
                </span>{' '}
                {describe(entry.type)}
                <span className="ml-1 text-xs">· {relativeTime(entry.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
