'use client';

import { useState } from 'react';
import { Check, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import type { Label } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import { getLabelColor, LABEL_COLOR_KEYS, type LabelColorKey } from '@/lib/label-colors';
import {
  useAttachLabel,
  useCreateLabel,
  useDeleteLabel,
  useDetachLabel,
  useUpdateLabel,
} from '@/lib/hooks/use-card';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Popover } from '@/components/ui/popover';
import { useToast } from '@/components/ui/toast';

type Props = {
  cardId: string;
  boardId: string;
  boardLabels: Label[];
  cardLabels: Label[];
};

export function LabelsSection({ cardId, boardId, boardLabels, cardLabels }: Props) {
  const attach = useAttachLabel({ cardId, boardId });
  const detach = useDetachLabel({ cardId, boardId });
  const attachedIds = new Set(cardLabels.map((l) => l.id));

  function toggle(label: Label) {
    if (attachedIds.has(label.id)) detach.mutate(label.id);
    else attach.mutate(label);
  }

  return (
    <Popover
      title="Étiquettes"
      trigger={({ toggle: t, ref, ...aria }) => (
        <Button ref={ref} variant="secondary" size="sm" onClick={t} {...aria}>
          <Tag className="size-4" aria-hidden />
          Étiquettes
        </Button>
      )}
    >
      {() => (
        <LabelManager
          boardId={boardId}
          boardLabels={boardLabels}
          attachedIds={attachedIds}
          onToggle={toggle}
        />
      )}
    </Popover>
  );
}

function LabelManager({
  boardId,
  boardLabels,
  attachedIds,
  onToggle,
}: {
  boardId: string;
  boardLabels: Label[];
  attachedIds: Set<string>;
  onToggle: (label: Label) => void;
}) {
  const [editing, setEditing] = useState<Label | 'new' | null>(null);

  if (editing) {
    return (
      <LabelEditor
        boardId={boardId}
        label={editing === 'new' ? null : editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {boardLabels.length === 0 ? (
        <p className="px-1 py-2 text-center text-sm text-text-muted">
          Aucune étiquette sur ce tableau.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {boardLabels.map((label) => {
            const color = getLabelColor(label.color);
            const checked = attachedIds.has(label.id);
            return (
              <li key={label.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggle(label)}
                  aria-pressed={checked}
                  className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-base font-medium"
                  style={{ backgroundColor: color.solid, color: color.contrast }}
                >
                  <span className="min-w-0 flex-1 truncate">{label.name || 'Sans nom'}</span>
                  {checked ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                </button>
                <IconButton
                  label={`Modifier ${label.name || 'étiquette'}`}
                  size="sm"
                  onClick={() => setEditing(label)}
                >
                  <Pencil className="size-3.5" aria-hidden />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setEditing('new')}
        className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-base font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        Créer une étiquette
      </button>
    </div>
  );
}

function LabelEditor({
  boardId,
  label,
  onDone,
}: {
  boardId: string;
  label: Label | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const create = useCreateLabel(boardId);
  const update = useUpdateLabel(boardId);
  const remove = useDeleteLabel(boardId);

  const [name, setName] = useState(label?.name ?? '');
  const [color, setColor] = useState<LabelColorKey>(
    (label ? getLabelColor(label.color).key : 'indigo') as LabelColorKey,
  );

  const pending = create.isPending || update.isPending || remove.isPending;

  async function save() {
    try {
      if (label) {
        await update.mutateAsync({ id: label.id, input: { name: name.trim(), color } });
      } else {
        await create.mutateAsync({ boardId, name: name.trim(), color });
      }
      onDone();
    } catch (err) {
      toast.error('Action impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function del() {
    if (!label) return;
    try {
      await remove.mutateAsync(label.id);
      onDone();
    } catch (err) {
      toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-text">
        Nom
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          placeholder="Nom de l'étiquette"
          className="h-9 rounded-md border border-border bg-surface px-3 text-base text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        />
      </label>
      <div>
        <p className="mb-1.5 text-sm font-medium text-text">Couleur</p>
        <div className="grid grid-cols-6 gap-1.5">
          {LABEL_COLOR_KEYS.map((key) => {
            const c = getLabelColor(key);
            return (
              <button
                key={key}
                type="button"
                aria-label={c.label}
                aria-pressed={color === key}
                onClick={() => setColor(key)}
                className={cn(
                  'grid h-7 place-items-center rounded-md transition-transform',
                  color === key ? 'ring-2 ring-brand ring-offset-1 ring-offset-surface' : '',
                )}
                style={{ backgroundColor: c.solid, color: c.contrast }}
              >
                {color === key ? <Check className="size-4" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} loading={create.isPending || update.isPending}>
          {label ? 'Enregistrer' : 'Créer'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          Annuler
        </Button>
        {label ? (
          <IconButton
            label="Supprimer l'étiquette"
            size="sm"
            variant="danger"
            onClick={del}
            className="ml-auto"
          >
            <Trash2 className="size-4" aria-hidden />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}
