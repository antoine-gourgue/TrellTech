'use client';

import { useState } from 'react';
import { Check, CheckSquare, Plus, Trash2, X } from 'lucide-react';
import type { Checklist } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import {
  useCreateChecklist,
  useCreateChecklistItem,
  useDeleteChecklist,
  useDeleteChecklistItem,
  useUpdateChecklist,
  useUpdateChecklistItem,
} from '@/lib/hooks/use-card';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

type Ctx = { cardId: string; boardId: string };

export function ChecklistsSection({
  cardId,
  boardId,
  checklists,
}: Ctx & { checklists: Checklist[] }) {
  const toast = useToast();
  const create = useCreateChecklist({ cardId, boardId });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync(trimmed);
      setName('');
      setAdding(false);
    } catch (err) {
      toast.error('Ajout impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
          <CheckSquare className="size-4 text-text-muted" aria-hidden />
          Checklists
        </h3>
        {!adding ? (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            Ajouter
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div className="mb-3 flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
              if (e.key === 'Escape') {
                setAdding(false);
                setName('');
              }
            }}
            placeholder="Titre de la checklist"
            aria-label="Titre de la checklist"
            maxLength={200}
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-base text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          />
          <Button size="sm" onClick={add} loading={create.isPending}>
            Créer
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
      ) : null}

      <div className="flex flex-col gap-4">
        {checklists.map((checklist) => (
          <ChecklistBlock key={checklist.id} cardId={cardId} boardId={boardId} checklist={checklist} />
        ))}
      </div>
    </section>
  );
}

function ChecklistBlock({
  cardId,
  boardId,
  checklist,
}: Ctx & { checklist: Checklist }) {
  const toast = useToast();
  const rename = useUpdateChecklist({ cardId, boardId });
  const removeChecklist = useDeleteChecklist({ cardId, boardId });
  const addItem = useCreateChecklistItem({ cardId, boardId });
  const updateItem = useUpdateChecklistItem({ cardId, boardId });
  const removeItem = useDeleteChecklistItem({ cardId, boardId });

  const [title, setTitle] = useState(checklist.name);
  const [editingTitle, setEditingTitle] = useState(false);
  const [itemName, setItemName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const total = checklist.items.length;
  const done = checklist.items.filter((i) => i.checked).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === checklist.name) {
      setTitle(checklist.name);
      setEditingTitle(false);
      return;
    }
    try {
      await rename.mutateAsync({ id: checklist.id, input: { name: trimmed } });
    } catch (err) {
      toast.error('Renommage impossible', err instanceof ApiRequestError ? err.message : undefined);
      setTitle(checklist.name);
    } finally {
      setEditingTitle(false);
    }
  }

  async function submitItem() {
    const trimmed = itemName.trim();
    if (!trimmed) return;
    try {
      await addItem.mutateAsync({ checklistId: checklist.id, name: trimmed });
      setItemName('');
    } catch (err) {
      toast.error('Ajout impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') {
                setTitle(checklist.name);
                setEditingTitle(false);
              }
            }}
            maxLength={200}
            aria-label="Nom de la checklist"
            className="h-7 min-w-0 flex-1 rounded-sm border border-brand bg-surface px-2 text-base font-semibold text-text focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="min-w-0 flex-1 truncate rounded-sm px-1 py-0.5 text-left text-base font-semibold text-text"
          >
            {checklist.name}
          </button>
        )}
        <span className="shrink-0 text-xs font-medium text-text-muted">
          {done}/{total}
        </span>
        <IconButton
          label="Supprimer la checklist"
          size="sm"
          variant="danger"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </IconButton>
      </div>

      <div
        className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progression ${checklist.name}`}
      >
        <div
          className="h-full rounded-full bg-success transition-all duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="flex flex-col">
        {checklist.items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={() =>
              updateItem.mutate({ id: item.id, input: { checked: !item.checked } })
            }
            onRename={(next) =>
              updateItem.mutate({ id: item.id, input: { name: next } })
            }
            onDelete={() => removeItem.mutate(item.id)}
          />
        ))}
      </ul>

      <div className="mt-1.5 flex items-center gap-2">
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitItem();
          }}
          placeholder="Ajouter un élément"
          aria-label="Nouvel élément"
          maxLength={200}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 text-base text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        />
        <Button size="sm" variant="secondary" onClick={submitItem} loading={addItem.isPending}>
          Ajouter
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Supprimer « ${checklist.name} » ?`}
        confirmLabel="Supprimer"
        destructive
        loading={removeChecklist.isPending}
        onConfirm={async () => {
          try {
            await removeChecklist.mutateAsync(checklist.id);
            setConfirmDelete(false);
          } catch (err) {
            toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
          }
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function ChecklistItemRow({
  item,
  onToggle,
  onRename,
  onDelete,
}: {
  item: { id: string; name: string; checked: boolean };
  onToggle: () => void;
  onRename: (next: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.name);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== item.name) onRename(trimmed);
    else setValue(item.name);
    setEditing(false);
  }

  return (
    <li className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-surface-muted/60">
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={item.checked}
        aria-label={item.name}
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded border transition-colors',
          item.checked ? 'border-success bg-success text-white' : 'border-border bg-surface hover:border-success',
        )}
      >
        {item.checked ? <Check className="size-3" aria-hidden /> : null}
      </button>
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setValue(item.name);
              setEditing(false);
            }
          }}
          maxLength={200}
          aria-label="Renommer l'élément"
          className="h-7 min-w-0 flex-1 rounded-sm border border-brand bg-surface px-2 text-base text-text focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            'min-w-0 flex-1 truncate rounded-sm px-1 py-0.5 text-left text-base',
            item.checked ? 'text-text-muted line-through' : 'text-text',
          )}
        >
          {item.name}
        </button>
      )}
      <IconButton
        label="Supprimer l'élément"
        size="sm"
        variant="danger"
        onClick={onDelete}
        className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </IconButton>
    </li>
  );
}
