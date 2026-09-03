'use client';

import { useState } from 'react';
import { ImageIcon, Link2, Paperclip, Star, Trash2 } from 'lucide-react';
import type { Attachment } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import { useCreateAttachment, useDeleteAttachment } from '@/lib/hooks/use-card';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';

type Ctx = { cardId: string; boardId: string };

function isImage(a: Attachment): boolean {
  return a.mime?.startsWith('image/') ?? /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(a.url);
}

export function AttachmentsSection({
  cardId,
  boardId,
  attachments,
}: Ctx & { attachments: Attachment[] }) {
  const toast = useToast();
  const create = useCreateAttachment({ cardId, boardId });
  const remove = useDeleteAttachment({ cardId, boardId });

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [asCover, setAsCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      setError('URL invalide');
      return;
    }
    try {
      await create.mutateAsync({
        url: parsed.toString(),
        name: name.trim() || parsed.hostname,
        isCover: asCover,
      });
      setUrl('');
      setName('');
      setAsCover(false);
      setOpen(false);
    } catch (err) {
      toast.error('Ajout impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Paperclip className="size-4 text-text-muted" aria-hidden />
          Pièces jointes
        </h3>
        {!open ? (
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            <Link2 className="size-4" aria-hidden />
            Ajouter un lien
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mb-3 flex flex-col gap-2 rounded-md border border-border bg-surface-muted/40 p-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-text">
            URL
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              aria-invalid={error ? true : undefined}
              className="h-9 rounded-md border border-border bg-surface px-3 text-base text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-text">
            Nom (facultatif)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom affiché"
              maxLength={300}
              className="h-9 rounded-md border border-border bg-surface px-3 text-base text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            />
          </label>
          <label className="flex items-center gap-2 text-base text-text">
            <input
              type="checkbox"
              checked={asCover}
              onChange={(e) => setAsCover(e.target.checked)}
              className="size-4 accent-brand"
            />
            Définir comme couverture de la carte
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={submit} loading={create.isPending}>
              Ajouter
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-base text-text-muted">Aucune pièce jointe.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="group flex items-center gap-3 rounded-md border border-border bg-surface p-2"
            >
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-muted text-text-muted">
                {isImage(attachment) ? (
                  <img src={attachment.url} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-5" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block truncate text-base font-medium text-text hover:text-brand hover:underline"
                >
                  {attachment.name}
                </a>
                <span className="block truncate text-xs text-text-muted">{attachment.url}</span>
              </div>
              {attachment.isCover ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-brand/10 px-1.5 py-0.5 text-2xs font-semibold text-brand">
                  <Star className="size-3" aria-hidden />
                  Couverture
                </span>
              ) : null}
              <IconButton
                label={`Supprimer ${attachment.name}`}
                size="sm"
                variant="danger"
                onClick={() => remove.mutate(attachment.id)}
                className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
