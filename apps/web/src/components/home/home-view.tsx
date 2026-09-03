'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DownloadCloud, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import { ApiRequestError } from '@/lib/api';
import { useMe } from '@/lib/hooks/use-auth';
import { useSyncTrello, useWorkspaces } from '@/lib/hooks/use-workspaces';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { WorkspaceFormModal } from '@/components/workspaces/workspace-form-modal';
import { BoardFormModal } from '@/components/workspaces/board-form-modal';

export function HomeView() {
  const toast = useToast();
  const { data: me } = useMe();
  const { data: workspaces, isLoading, isError, refetch } = useWorkspaces();
  const sync = useSyncTrello();

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [boardTarget, setBoardTarget] = useState<{ id: string; name: string } | null>(null);

  const firstName = (me?.fullName ?? me?.username ?? '').split(/\s+/)[0];
  const totalBoards = workspaces?.reduce((sum, w) => sum + w.boards.length, 0) ?? 0;

  async function runSync() {
    try {
      await sync.mutateAsync();
      toast.success('Import terminé', 'Vos données Trello ont été synchronisées.');
    } catch (err) {
      toast.error('Import impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Bonjour{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-md text-text-muted">
            {totalBoards > 0
              ? `${totalBoards} tableau${totalBoards > 1 ? 'x' : ''} dans ${workspaces?.length} espace${(workspaces?.length ?? 0) > 1 ? 's' : ''}.`
              : 'Créez un espace de travail pour démarrer.'}
          </p>
        </div>
        <div className="flex gap-2">
          {me?.trelloLinked ? (
            <Button variant="secondary" onClick={runSync} loading={sync.isPending}>
              <DownloadCloud className="size-4" aria-hidden />
              Importer Trello
            </Button>
          ) : null}
          <Button onClick={() => setCreateWorkspaceOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Nouvel espace
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-border bg-surface p-10 text-center">
            <p className="text-md font-medium text-text">Impossible de charger vos espaces</p>
            <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        ) : workspaces && workspaces.length > 0 ? (
          <div className="flex flex-col gap-10">
            {workspaces.map((workspace) => (
              <section key={workspace.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-md font-semibold text-text">{workspace.displayName}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setBoardTarget({ id: workspace.id, name: workspace.displayName })
                    }
                  >
                    <Plus className="size-4" aria-hidden />
                    Tableau
                  </Button>
                </div>
                {workspace.boards.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {workspace.boards.map((board) => (
                      <Link
                        key={board.id}
                        href={`/boards/${board.id}`}
                        className="group relative flex h-28 flex-col justify-between overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                      >
                        <span
                          className="absolute inset-x-0 top-0 h-1 bg-brand/70"
                          aria-hidden
                        />
                        <LayoutGrid
                          className="size-5 text-brand transition-transform group-hover:scale-110"
                          aria-hidden
                        />
                        <span className="truncate text-base font-medium text-text">
                          {board.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBoardTarget({ id: workspace.id, name: workspace.displayName })}
                    className="flex h-28 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-base text-text-muted transition-colors hover:border-brand/40 hover:text-brand sm:w-1/3"
                  >
                    <Plus className="size-4" aria-hidden />
                    Créer un tableau
                  </button>
                )}
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            onCreate={() => setCreateWorkspaceOpen(true)}
            onSync={runSync}
            syncing={sync.isPending}
            trelloLinked={me?.trelloLinked ?? false}
          />
        )}
      </div>

      <WorkspaceFormModal
        open={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        mode="create"
      />
      {boardTarget ? (
        <BoardFormModal
          open
          onClose={() => setBoardTarget(null)}
          workspaceId={boardTarget.id}
          workspaceName={boardTarget.name}
        />
      ) : null}
    </div>
  );
}

function EmptyState({
  onCreate,
  onSync,
  syncing,
  trelloLinked,
}: {
  onCreate: () => void;
  onSync: () => void;
  syncing: boolean;
  trelloLinked: boolean;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-lg bg-brand/10 text-brand">
        <Sparkles className="size-7" aria-hidden />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-text">Bienvenue sur TrellTech</h2>
      <p className="mt-2 max-w-sm text-base text-text-muted">
        {trelloLinked
          ? 'Créez votre premier espace de travail, ou importez directement vos tableaux existants depuis Trello.'
          : 'Créez votre premier espace de travail pour démarrer. Vous pourrez lier Trello depuis les réglages pour importer vos tableaux.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onCreate}>
          <Plus className="size-4" aria-hidden />
          Créer un espace
        </Button>
        {trelloLinked ? (
          <Button variant="secondary" onClick={onSync} loading={syncing}>
            <DownloadCloud className="size-4" aria-hidden />
            Importer depuis Trello
          </Button>
        ) : null}
      </div>
    </div>
  );
}
