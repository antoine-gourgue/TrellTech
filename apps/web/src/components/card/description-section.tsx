'use client';

import { useEffect, useRef, useState } from 'react';
import { AlignLeft } from 'lucide-react';
import { ApiRequestError } from '@/lib/api';
import { useUpdateCardDetail } from '@/lib/hooks/use-card';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { useToast } from '@/components/ui/toast';

type Props = {
  cardId: string;
  boardId: string;
  description: string | null;
};

export function DescriptionSection({ cardId, boardId, description }: Props) {
  const toast = useToast();
  const update = useUpdateCardDetail({ cardId, boardId });
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setValue(description ?? '');
  }, [description, editing]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  async function save() {
    const next = value.trim() ? value : null;
    if (next === (description ?? null)) {
      setEditing(false);
      return;
    }
    try {
      await update.mutateAsync({ description: next });
      setEditing(false);
    } catch (err) {
      toast.error('Enregistrement impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
        <AlignLeft className="size-4 text-text-muted" aria-hidden />
        Description
      </h3>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setValue(description ?? '');
                setEditing(false);
              }
            }}
            rows={6}
            placeholder="Ajoutez une description… (Markdown pris en charge)"
            aria-label="Description de la carte"
            className="w-full resize-y rounded-md border border-border bg-surface p-3 font-mono text-sm text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} loading={update.isPending}>
              Enregistrer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setValue(description ?? '');
                setEditing(false);
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : description ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block w-full rounded-md border border-transparent p-1 text-left transition-colors hover:border-border hover:bg-surface-muted/50"
        >
          <Markdown>{description}</Markdown>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-md border border-dashed border-border px-3 py-3 text-left text-base text-text-muted transition-colors hover:border-brand/40 hover:text-text"
        >
          Ajouter une description plus détaillée…
        </button>
      )}
    </section>
  );
}
