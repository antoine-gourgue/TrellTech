'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import { useCreateList } from '@/lib/hooks/use-board';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';

export function AddList({ boardId, hasLists }: { boardId: string; hasLists: boolean }) {
  const toast = useToast();
  const createList = useCreateList(boardId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createList.mutateAsync({ boardId, name: trimmed });
      setName('');
      setAdding(false);
    } catch (err) {
      toast.error('Ajout impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  if (adding) {
    return (
      <div className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface-muted p-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') {
              setAdding(false);
              setName('');
            }
          }}
          maxLength={200}
          placeholder="Nom de la liste…"
          aria-label="Nom de la nouvelle liste"
          className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-base text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={submit} loading={createList.isPending}>
            Ajouter la liste
          </Button>
          <IconButton
            label="Annuler"
            size="sm"
            onClick={() => {
              setAdding(false);
              setName('');
            }}
          >
            <X className="size-4" aria-hidden />
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className={cn(
        'flex w-72 shrink-0 items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-base font-medium text-text-muted transition-colors hover:border-brand/40 hover:text-brand',
        !hasLists && 'border-brand/40 bg-brand/5 text-brand',
      )}
    >
      <Plus className="size-4" aria-hidden />
      {hasLists ? 'Ajouter une liste' : 'Créer la première liste'}
    </button>
  );
}
