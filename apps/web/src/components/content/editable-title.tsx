'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

type Props = {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onSave: (title: string) => Promise<unknown>;
};

/** Titre h1 éditable inline, persistant au blur/Entrée. */
export function EditableTitle({ value, placeholder, ariaLabel, onSave }: Props) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === value) {
      setDraft(value);
      return;
    }
    try {
      await onSave(trimmed);
    } catch (err) {
      toast.error('Renommage impossible', err instanceof ApiRequestError ? err.message : undefined);
      setDraft(value);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        maxLength={300}
        aria-label={ariaLabel}
        className="w-full rounded-md border border-brand bg-surface px-2 py-1 text-2xl font-semibold tracking-tight text-text focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full rounded-md px-2 py-1 text-left text-2xl font-semibold tracking-tight text-text hover:bg-surface-muted"
    >
      {value || <span className="text-text-muted">{placeholder}</span>}
    </button>
  );
}
