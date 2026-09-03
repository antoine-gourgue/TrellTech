'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  DownloadCloud,
  FileText,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  PenTool,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { DocSummary, User, WhiteboardSummary, WorkspaceWithBoards } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import {
  useCreateDoc,
  useCreateWhiteboard,
  useDeleteBoard,
  useDeleteDoc,
  useDeleteWhiteboard,
  useDeleteWorkspace,
  useSyncTrello,
  useWorkspaces,
} from '@/lib/hooks/use-workspaces';
import { useSharedWithMe } from '@/lib/hooks/use-board-share';
import { useLogout } from '@/lib/hooks/use-auth';
import { ShareModal } from '@/components/share/share-modal';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Dropdown } from '@/components/ui/dropdown';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { WorkspaceFormModal } from '@/components/workspaces/workspace-form-modal';
import { BoardFormModal } from '@/components/workspaces/board-form-modal';
import { CommandTrigger } from '@/components/command/command-trigger';
import { NotificationBell } from '@/components/notifications/notification-bell';

type SidebarProps = {
  user: User;
  mobileOpen: boolean;
  onNavigate: () => void;
};

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Sidebar({ user, mobileOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const toast = useToast();
  const { data: workspaces, isLoading, isError, refetch } = useWorkspaces();
  const sync = useSyncTrello();
  const logout = useLogout();

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  async function runSync() {
    try {
      await sync.mutateAsync();
      toast.success('Import terminé', 'Vos données Trello ont été synchronisées.');
    } catch (err) {
      toast.error('Import impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/login';
      },
    });
  }

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-md' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-1 px-4">
          <Link href="/" onClick={onNavigate} className="rounded-md">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <CommandTrigger />
            <NotificationBell />
          </div>
        </div>

        {user.trelloLinked ? (
          <div className="px-3">
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={runSync}
              loading={sync.isPending}
            >
              <DownloadCloud className="size-4" aria-hidden />
              Importer depuis Trello
            </Button>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between px-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Espaces de travail
          </h2>
          <IconButton
            label="Nouvel espace de travail"
            size="sm"
            onClick={() => setCreateWorkspaceOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
          </IconButton>
        </div>

        <nav className="scrollbar-thin mt-2 flex-1 overflow-y-auto px-3 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-md border border-border bg-surface-muted p-3 text-center">
              <p className="text-sm text-text-muted">Chargement impossible.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-1 text-sm font-medium text-brand hover:underline"
              >
                Réessayer
              </button>
            </div>
          ) : workspaces && workspaces.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {workspaces.map((workspace) => (
                <WorkspaceItem key={workspace.id} workspace={workspace} onNavigate={onNavigate} />
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center">
              <p className="text-sm text-text-muted">Aucun espace pour l&apos;instant.</p>
              <button
                type="button"
                onClick={() => setCreateWorkspaceOpen(true)}
                className="mt-1 text-sm font-medium text-brand hover:underline"
              >
                Créer le premier
              </button>
            </div>
          )}

          <SharedWithMeSection onNavigate={onNavigate} />
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              onClick={onNavigate}
              aria-label="Paramètres du compte"
              className={cn(
                '-m-1 flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 transition-colors hover:bg-surface-muted focus-visible:outline-2',
                pathname === '/settings' ? 'bg-surface-muted' : '',
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 text-sm font-semibold text-brand">
                {user.avatarUrl ? (
                  <img
                    src={`${user.avatarUrl}/50.png`}
                    alt=""
                    className="size-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  initials(user.fullName ?? user.username)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">
                  {user.fullName ?? user.username}
                </p>
                <p className="truncate text-xs text-text-muted">@{user.username}</p>
              </div>
            </Link>
            <ThemeToggle />
            <IconButton label="Se déconnecter" onClick={handleLogout} variant="danger" size="sm">
              <LogOut className="size-4" aria-hidden />
            </IconButton>
          </div>
        </div>
      </aside>

      <WorkspaceFormModal
        open={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        mode="create"
      />
    </>
  );
}

function WorkspaceItem({
  workspace,
  onNavigate,
}: {
  workspace: WorkspaceWithBoards;
  onNavigate: () => void;
}) {
  const toast = useToast();
  const deleteWorkspace = useDeleteWorkspace();

  const canManage = workspace.role === 'OWNER';

  const [expanded, setExpanded] = useState(true);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isEmpty =
    workspace.boards.length === 0 &&
    workspace.docs.length === 0 &&
    workspace.whiteboards.length === 0;

  async function removeWorkspace() {
    try {
      await deleteWorkspace.mutateAsync(workspace.id);
      toast.success('Espace supprimé');
      setConfirmDelete(false);
    } catch (err) {
      toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <li>
      <div className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-surface-muted">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1 pl-1 text-left"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded bg-brand/15 text-2xs font-bold text-brand">
            {initials(workspace.displayName)}
          </span>
          <span className="truncate text-base font-medium text-text">{workspace.displayName}</span>
          {!canManage ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface-muted px-1.5 py-0.5 text-2xs font-medium text-text-muted">
              <Users className="size-3" aria-hidden />
              Partagé
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-text-muted transition-transform',
              canManage ? 'ml-auto' : '',
              expanded ? 'rotate-0' : '-rotate-90',
            )}
            aria-hidden
          />
        </button>
        {canManage ? (
          <Dropdown
            trigger={({ toggle, ref }) => (
              <IconButton
                ref={ref}
                label="Options de l'espace"
                size="sm"
                onClick={toggle}
                className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </IconButton>
            )}
            items={[
              { label: 'Nouveau tableau', icon: <Plus />, onSelect: () => setBoardModalOpen(true) },
              { label: 'Partager', icon: <Share2 />, onSelect: () => setShareOpen(true) },
              { label: 'Renommer', icon: <Pencil />, onSelect: () => setEditOpen(true) },
              {
                label: 'Supprimer',
                icon: <Trash2 />,
                danger: true,
                onSelect: () => setConfirmDelete(true),
              },
            ]}
          />
        ) : null}
      </div>

      {expanded ? (
        <div className="mb-1 ml-4 flex flex-col gap-2 border-l border-border pl-3">
          {isEmpty ? (
            <div className="py-1">
              <p className="mb-1 text-xs text-text-muted">Espace vide.</p>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setBoardModalOpen(true)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-surface-muted"
                >
                  <Plus className="size-3.5" aria-hidden />
                  Créer un premier contenu
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <BoardGroup
                boards={workspace.boards}
                onNavigate={onNavigate}
                onCreate={() => setBoardModalOpen(true)}
                canManage={canManage}
              />
              <DocGroup
                workspaceId={workspace.id}
                docs={workspace.docs}
                onNavigate={onNavigate}
                canManage={canManage}
              />
              <WhiteboardGroup
                workspaceId={workspace.id}
                whiteboards={workspace.whiteboards}
                onNavigate={onNavigate}
                canManage={canManage}
              />
            </>
          )}
        </div>
      ) : null}

      <BoardFormModal
        open={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        workspaceId={workspace.id}
        workspaceName={workspace.displayName}
      />
      <WorkspaceFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        workspaceId={workspace.id}
        initialName={workspace.displayName}
        initialDescription={workspace.description}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={`Supprimer « ${workspace.displayName} » ?`}
        description="Tout le contenu de cet espace sera supprimé."
        confirmLabel="Supprimer"
        destructive
        loading={deleteWorkspace.isPending}
        onConfirm={removeWorkspace}
        onClose={() => setConfirmDelete(false)}
      />
      {canManage ? (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          type="workspace"
          entityId={workspace.id}
          isOwner
        />
      ) : null}
    </li>
  );
}

function GroupShell({
  icon: Icon,
  label,
  onCreate,
  createLabel,
  creating,
  canManage,
  children,
}: {
  icon: LucideIcon;
  label: string;
  onCreate: () => void;
  createLabel: string;
  creating?: boolean;
  canManage: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="group/head flex items-center gap-1.5 px-1 py-0.5">
        <Icon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
        <span className="flex-1 text-2xs font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </span>
        {canManage ? (
          <IconButton
            label={createLabel}
            size="sm"
            onClick={onCreate}
            disabled={creating}
            className="size-6 opacity-0 focus-visible:opacity-100 group-hover/head:opacity-100"
          >
            <Plus className="size-3.5" aria-hidden />
          </IconButton>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ContentLink({
  href,
  label,
  onNavigate,
  onDelete,
  deleteLabel,
  leading,
  canDelete = true,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
  onDelete: () => void;
  deleteLabel: string;
  leading?: React.ReactNode;
  canDelete?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <li className="group/item flex items-center">
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          active
            ? 'bg-brand/10 font-medium text-brand'
            : 'text-text-muted hover:bg-surface-muted hover:text-text',
        )}
      >
        {leading ?? (
          <span
            className={cn('size-1.5 shrink-0 rounded-full', active ? 'bg-brand' : 'bg-border')}
            aria-hidden
          />
        )}
        <span className="truncate">{label}</span>
      </Link>
      {canDelete ? (
        <IconButton
          label={deleteLabel}
          size="sm"
          variant="danger"
          onClick={onDelete}
          className="opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </IconButton>
      ) : null}
    </li>
  );
}

function BoardGroup({
  boards,
  onNavigate,
  onCreate,
  canManage,
}: {
  boards: WorkspaceWithBoards['boards'];
  onNavigate: () => void;
  onCreate: () => void;
  canManage: boolean;
}) {
  const toast = useToast();
  const deleteBoard = useDeleteBoard();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  if (boards.length === 0 && !canManage) return null;

  async function remove() {
    if (!target) return;
    try {
      await deleteBoard.mutateAsync(target.id);
      toast.success('Tableau supprimé');
      setTarget(null);
    } catch (err) {
      toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <GroupShell
      icon={LayoutGrid}
      label="Tableaux"
      onCreate={onCreate}
      createLabel="Nouveau tableau"
      canManage={canManage}
    >
      {boards.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {boards.map((board) => (
            <ContentLink
              key={board.id}
              href={`/boards/${board.id}`}
              label={board.name}
              onNavigate={onNavigate}
              onDelete={() => setTarget({ id: board.id, name: board.name })}
              deleteLabel={`Supprimer ${board.name}`}
              canDelete={canManage}
            />
          ))}
        </ul>
      ) : (
        <EmptyGroup onCreate={onCreate} label="Ajouter un tableau" />
      )}
      <ConfirmDialog
        open={target !== null}
        title={`Supprimer « ${target?.name ?? ''} » ?`}
        description="Les listes et cartes de ce tableau seront supprimées."
        confirmLabel="Supprimer"
        destructive
        loading={deleteBoard.isPending}
        onConfirm={remove}
        onClose={() => setTarget(null)}
      />
    </GroupShell>
  );
}

function DocGroup({
  workspaceId,
  docs,
  onNavigate,
  canManage,
}: {
  workspaceId: string;
  docs: DocSummary[];
  onNavigate: () => void;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateDoc();
  const remove = useDeleteDoc();
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null);

  if (docs.length === 0 && !canManage) return null;

  async function add() {
    try {
      const doc = await create.mutateAsync({ workspaceId });
      onNavigate();
      router.push(`/docs/${doc.id}`);
    } catch (err) {
      toast.error('Création impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function del() {
    if (!target) return;
    try {
      await remove.mutateAsync(target.id);
      toast.success('Document supprimé');
      setTarget(null);
    } catch (err) {
      toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <GroupShell
      icon={FileText}
      label="Docs"
      onCreate={add}
      createLabel="Nouveau document"
      creating={create.isPending}
      canManage={canManage}
    >
      {docs.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {docs.map((doc) => (
            <ContentLink
              key={doc.id}
              href={`/docs/${doc.id}`}
              label={doc.title || 'Sans titre'}
              onNavigate={onNavigate}
              onDelete={() => setTarget({ id: doc.id, title: doc.title })}
              deleteLabel={`Supprimer ${doc.title || 'le document'}`}
              leading={<FileText className="size-4 shrink-0" aria-hidden />}
              canDelete={canManage}
            />
          ))}
        </ul>
      ) : (
        <EmptyGroup onCreate={add} label="Ajouter un document" />
      )}
      <ConfirmDialog
        open={target !== null}
        title={`Supprimer « ${target?.title || 'ce document'} » ?`}
        confirmLabel="Supprimer"
        destructive
        loading={remove.isPending}
        onConfirm={del}
        onClose={() => setTarget(null)}
      />
    </GroupShell>
  );
}

function WhiteboardGroup({
  workspaceId,
  whiteboards,
  onNavigate,
  canManage,
}: {
  workspaceId: string;
  whiteboards: WhiteboardSummary[];
  onNavigate: () => void;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateWhiteboard();
  const remove = useDeleteWhiteboard();
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null);

  if (whiteboards.length === 0 && !canManage) return null;

  async function add() {
    try {
      const wb = await create.mutateAsync({ workspaceId });
      onNavigate();
      router.push(`/whiteboards/${wb.id}`);
    } catch (err) {
      toast.error('Création impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function del() {
    if (!target) return;
    try {
      await remove.mutateAsync(target.id);
      toast.success('Tableau blanc supprimé');
      setTarget(null);
    } catch (err) {
      toast.error('Suppression impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <GroupShell
      icon={PenTool}
      label="Whiteboards"
      onCreate={add}
      createLabel="Nouveau tableau blanc"
      creating={create.isPending}
      canManage={canManage}
    >
      {whiteboards.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {whiteboards.map((wb) => (
            <ContentLink
              key={wb.id}
              href={`/whiteboards/${wb.id}`}
              label={wb.title || 'Sans titre'}
              onNavigate={onNavigate}
              onDelete={() => setTarget({ id: wb.id, title: wb.title })}
              deleteLabel={`Supprimer ${wb.title || 'le tableau blanc'}`}
              canDelete={canManage}
            />
          ))}
        </ul>
      ) : (
        <EmptyGroup onCreate={add} label="Ajouter un tableau blanc" />
      )}
      <ConfirmDialog
        open={target !== null}
        title={`Supprimer « ${target?.title || 'ce tableau blanc'} » ?`}
        confirmLabel="Supprimer"
        destructive
        loading={remove.isPending}
        onConfirm={del}
        onClose={() => setTarget(null)}
      />
    </GroupShell>
  );
}

function EmptyGroup({ onCreate, label }: { onCreate: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
    >
      <Plus className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

function SharedLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          active
            ? 'bg-brand/10 font-medium text-brand'
            : 'text-text-muted hover:bg-surface-muted hover:text-text',
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}

function SharedWithMeSection({ onNavigate }: { onNavigate: () => void }) {
  const { data } = useSharedWithMe();

  const count = data ? data.boards.length + data.docs.length + data.whiteboards.length : 0;
  if (!data || count === 0) return null;

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <Users className="size-3.5 shrink-0 text-text-muted" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Partagé avec moi
        </h2>
      </div>
      <ul className="flex flex-col gap-0.5">
        {data.boards.map((board) => (
          <SharedLink
            key={board.id}
            href={`/boards/${board.id}`}
            label={board.name}
            icon={LayoutGrid}
            onNavigate={onNavigate}
          />
        ))}
        {data.docs.map((doc) => (
          <SharedLink
            key={doc.id}
            href={`/docs/${doc.id}`}
            label={doc.title || 'Sans titre'}
            icon={FileText}
            onNavigate={onNavigate}
          />
        ))}
        {data.whiteboards.map((wb) => (
          <SharedLink
            key={wb.id}
            href={`/whiteboards/${wb.id}`}
            label={wb.title || 'Sans titre'}
            icon={PenTool}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </div>
  );
}
