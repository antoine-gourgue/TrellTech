'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { FileText, UserPlus } from 'lucide-react';
import type { Block } from '@blocknote/core';
import { useDoc, useUpdateDoc } from '@/lib/hooks/use-content';
import { useAutosave } from '@/lib/hooks/use-autosave';
import { EditableTitle } from '@/components/content/editable-title';
import { ContentStatus } from '@/components/content/content-status';
import { SaveIndicator } from '@/components/content/save-indicator';
import { ShareModal } from '@/components/share/share-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const DocEditor = dynamic(
  () => import('@/components/content/doc-editor').then((m) => m.DocEditor),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[40dvh] place-items-center text-text-muted">
        <Spinner className="size-5 text-brand" />
      </div>
    ),
  },
);

export function DocView({ docId }: { docId: string }) {
  const { data: doc, isLoading, isError, error, refetch } = useDoc(docId);
  const update = useUpdateDoc(docId);
  const [shareOpen, setShareOpen] = useState(false);

  const { status, schedule } = useAutosave<Block[]>(
    useCallback((blocks) => update.mutateAsync({ blocks }), [update]),
  );

  if (isLoading || isError || !doc) {
    return (
      <ContentStatus
        loading={isLoading}
        error={isError || !doc}
        message={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex items-start gap-3">
        <FileText className="mt-1.5 size-6 shrink-0 text-text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <EditableTitle
            value={doc.title}
            placeholder="Document sans titre"
            ariaLabel="Titre du document"
            onSave={(title) => update.mutateAsync({ title })}
          />
        </div>
        <div className="mt-1 flex shrink-0 items-center gap-2">
          <SaveIndicator status={status} />
          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            <span className="hidden sm:inline">Partager</span>
          </Button>
        </div>
      </div>
      <div className="tt-blocknote">
        <DocEditor initialBlocks={doc.blocks} onChange={schedule} />
      </div>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        type="doc"
        entityId={docId}
      />
    </div>
  );
}
