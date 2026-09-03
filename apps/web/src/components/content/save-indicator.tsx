'use client';

import { Check, TriangleAlert } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import type { SaveStatus } from '@/lib/hooks/use-autosave';

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-text-muted" role="status">
        <Spinner className="size-3.5 text-text-muted" />
        Enregistrement…
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-danger" role="status">
        <TriangleAlert className="size-3.5" aria-hidden />
        Échec de la sauvegarde
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-sm text-text-muted" role="status">
      <Check className="size-3.5" aria-hidden />
      Enregistré
    </span>
  );
}
