'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { Comment } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import { useMe } from '@/lib/hooks/use-auth';
import {
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '@/lib/hooks/use-card';
import { relativeTime } from '@/lib/dates';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

type Ctx = { cardId: string; boardId: string };

export function CommentsSection({
  cardId,
  boardId,
  comments,
}: Ctx & { comments: Comment[] }) {
  const toast = useToast();
  const { data: me } = useMe();
  const create = useCreateComment({ cardId, boardId });
  const [text, setText] = useState('');

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync(trimmed);
      setText('');
    } catch (err) {
      toast.error('Commentaire non publié', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
        <MessageSquare className="size-4 text-text-muted" aria-hidden />
        Commentaires
      </h3>

      <div className="mb-4 flex gap-2">
        {me ? <Avatar user={me} size="sm" /> : null}
        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={2}
            placeholder="Écrire un commentaire…"
            aria-label="Nouveau commentaire"
            maxLength={10000}
            className="w-full resize-y rounded-md border border-border bg-surface p-2.5 text-base text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          />
          {text.trim() ? (
            <div className="mt-2">
              <Button size="sm" onClick={submit} loading={create.isPending}>
                Publier
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {comments.length === 0 ? (
        <p className="text-base text-text-muted">Aucun commentaire pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              cardId={cardId}
              boardId={boardId}
              comment={comment}
              editable={me?.id === comment.author.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentRow({
  cardId,
  boardId,
  comment,
  editable,
}: Ctx & { comment: Comment; editable: boolean }) {
  const toast = useToast();
  const update = useUpdateComment({ cardId, boardId });
  const remove = useDeleteComment({ cardId, boardId });
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(comment.text);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const edited = comment.updatedAt !== comment.createdAt;

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === comment.text) {
      setValue(comment.text);
      setEditing(false);
      return;
    }
    try {
      await update.mutateAsync({ id: comment.id, text: trimmed });
      setEditing(false);
    } catch (err) {
      toast.error('Modification impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <li className="flex gap-2">
      <Avatar user={comment.author} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-base font-semibold text-text">
            {comment.author.fullName ?? comment.author.username}
          </span>
          <span className="shrink-0 text-xs text-text-muted">
            {relativeTime(comment.createdAt)}
            {edited ? ' · modifié' : ''}
          </span>
        </div>
        {editing ? (
          <div className="mt-1.5 flex flex-col gap-2">
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              aria-label="Modifier le commentaire"
              maxLength={10000}
              className="w-full resize-y rounded-md border border-border bg-surface p-2.5 text-base text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={save} loading={update.isPending}>
                Enregistrer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setValue(comment.text);
                  setEditing(false);
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-surface-muted px-3 py-2 text-base text-text">
              {comment.text}
            </p>
            {editable ? (
              <div className="mt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs font-medium text-text-muted hover:text-text hover:underline"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs font-medium text-text-muted hover:text-danger hover:underline"
                >
                  Supprimer
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce commentaire ?"
        confirmLabel="Supprimer"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(comment.id);
            setConfirmDelete(false);
          } catch (err) {
            toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
          }
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </li>
  );
}
