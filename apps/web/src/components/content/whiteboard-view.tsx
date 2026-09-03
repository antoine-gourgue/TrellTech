'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { PenTool, UserPlus } from 'lucide-react';
import { useWhiteboard, useUpdateWhiteboard } from '@/lib/hooks/use-content';
import { useAutosave } from '@/lib/hooks/use-autosave';
import { EditableTitle } from '@/components/content/editable-title';
import { ContentStatus } from '@/components/content/content-status';
import { SaveIndicator } from '@/components/content/save-indicator';
import type { WhiteboardScene } from '@/components/content/whiteboard-canvas';
import { ShareModal } from '@/components/share/share-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const WhiteboardCanvas = dynamic(
  () => import('@/components/content/whiteboard-canvas').then((m) => m.WhiteboardCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-text-muted">
        <Spinner className="size-5 text-brand" />
      </div>
    ),
  },
);

export function WhiteboardView({ whiteboardId }: { whiteboardId: string }) {
  const { data: whiteboard, isLoading, isError, error, refetch } = useWhiteboard(whiteboardId);
  const update = useUpdateWhiteboard(whiteboardId);
  const [shareOpen, setShareOpen] = useState(false);

  const { status, schedule } = useAutosave<WhiteboardScene>(
    useCallback((scene) => update.mutateAsync({ scene }), [update]),
  );

  if (isLoading || isError || !whiteboard) {
    return (
      <ContentStatus
        loading={isLoading}
        error={isError || !whiteboard}
        message={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-5 py-3 sm:px-8">
        <PenTool className="size-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <EditableTitle
            value={whiteboard.title}
            placeholder="Tableau blanc sans titre"
            ariaLabel="Titre du tableau blanc"
            onSave={(title) => update.mutateAsync({ title })}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveIndicator status={status} />
          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            <span className="hidden sm:inline">Partager</span>
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <WhiteboardCanvas initialScene={whiteboard.scene} onChange={schedule} />
      </div>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        type="whiteboard"
        entityId={whiteboardId}
      />
    </div>
  );
}
