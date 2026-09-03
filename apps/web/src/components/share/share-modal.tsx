'use client';

import { useState } from 'react';
import { Check, Copy, Crown, Link2, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import type { BoardRole, Member } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import type { ShareEntityType } from '@/lib/query-keys';
import { useMe } from '@/lib/hooks/use-auth';
import {
  useMembers,
  useRemoveMember,
  useShare,
  useShareLink,
  useUpdateMember,
} from '@/lib/hooks/use-board-share';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  type: ShareEntityType;
  entityId: string;
  isOwner?: boolean;
};

const ROLE_LABEL: Record<BoardRole, string> = {
  OWNER: 'Propriétaire',
  EDITOR: 'Éditeur',
  VIEWER: 'Lecteur',
};

const ENTITY_COPY: Record<
  ShareEntityType,
  { title: string; joinNoun: string; accessNoun: string }
> = {
  workspace: {
    title: "Partager l'espace de travail",
    joinNoun: "l'espace de travail",
    accessNoun: "à l'espace de travail",
  },
  board: { title: 'Partager le tableau', joinNoun: 'le tableau', accessNoun: 'au tableau' },
  doc: { title: 'Partager le document', joinNoun: 'le document', accessNoun: 'au document' },
  whiteboard: {
    title: 'Partager le tableau blanc',
    joinNoun: 'le tableau blanc',
    accessNoun: 'au tableau blanc',
  },
};

export function ShareModal({ open, onClose, type, entityId, isOwner }: ShareModalProps) {
  const toast = useToast();
  const copy = ENTITY_COPY[type];
  const { data: me } = useMe();
  const { data: members, isLoading, isError, refetch } = useMembers(type, entityId);
  const share = useShare(type, entityId);
  const updateMember = useUpdateMember(type, entityId);
  const removeMember = useRemoveMember(type, entityId);
  const shareLink = useShareLink(type, entityId);

  const derivedOwner = members?.some(
    (member) => member.role === 'OWNER' && member.user.id === me?.id,
  );
  const canManage = isOwner ?? derivedOwner ?? false;

  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [linkRole, setLinkRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateLink() {
    try {
      const result = await shareLink.mutateAsync(linkRole);
      setLink(result.url);
      setCopied(false);
    } catch (err) {
      toast.error('Lien impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copie impossible', 'Sélectionnez et copiez le lien manuellement.');
    }
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    try {
      await share.mutateAsync({ userQuery: trimmed, role });
      toast.success('Invitation envoyée', `${trimmed} a désormais accès ${copy.accessNoun}.`);
      setUsername('');
    } catch (err) {
      toast.error('Partage impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function changeRole(userId: string, nextRole: 'EDITOR' | 'VIEWER') {
    try {
      await updateMember.mutateAsync({ userId, input: { role: nextRole } });
    } catch (err) {
      toast.error(
        'Modification impossible',
        err instanceof ApiRequestError ? err.message : undefined,
      );
    }
  }

  async function remove(userId: string, name: string) {
    try {
      await removeMember.mutateAsync(userId);
      toast.success('Membre retiré', `${name} n'a plus accès ${copy.accessNoun}.`);
    } catch (err) {
      toast.error('Retrait impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      description={
        canManage
          ? 'Invitez des membres et gérez leurs rôles.'
          : `Consultez les membres ayant accès ${copy.accessNoun}.`
      }
      size="lg"
    >
      {canManage ? (
        <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="share-username" className="mb-1.5 block text-sm font-medium text-text">
              Nom d&apos;utilisateur
            </label>
            <input
              id="share-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex. camille"
              autoComplete="off"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-base text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            />
          </div>
          <div>
            <label htmlFor="share-role" className="mb-1.5 block text-sm font-medium text-text">
              Rôle
            </label>
            <select
              id="share-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
              className="h-10 rounded-md border border-border bg-surface px-3 text-base text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              <option value="EDITOR">Éditeur</option>
              <option value="VIEWER">Lecteur</option>
            </select>
          </div>
          <Button type="submit" loading={share.isPending} disabled={!username.trim()}>
            <UserPlus className="size-4" aria-hidden />
            Inviter
          </Button>
        </form>
      ) : null}

      {canManage ? (
        <div className="mt-4 rounded-lg border border-border bg-surface-muted p-3">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-text-muted" aria-hidden />
            <h3 className="text-sm font-semibold text-text">Lien de partage</h3>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Toute personne connectée qui ouvre ce lien rejoint {copy.joinNoun} avec le rôle choisi.
          </p>
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Rôle accordé par le lien"
              value={linkRole}
              onChange={(e) => {
                setLinkRole(e.target.value as 'EDITOR' | 'VIEWER');
                setLink(null);
              }}
              className="h-10 rounded-md border border-border bg-surface px-3 text-base text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              <option value="EDITOR">Éditeur</option>
              <option value="VIEWER">Lecteur</option>
            </select>
            <Button variant="secondary" onClick={generateLink} loading={shareLink.isPending}>
              <RefreshCw className="size-4" aria-hidden />
              {link ? 'Régénérer le lien' : 'Générer un lien'}
            </Button>
          </div>
          {link ? (
            <div className="mt-2.5 flex items-center gap-2">
              <input
                readOnly
                value={link}
                aria-label="Lien de partage"
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              />
              <Button variant="secondary" onClick={copyLink}>
                {copied ? (
                  <Check className="size-4 text-success" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? 'Copié' : 'Copier'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-text">Membres</h3>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
            <Spinner className="size-4 text-brand" />
            Chargement des membres…
          </div>
        ) : isError ? (
          <div className="rounded-md border border-border bg-surface-muted p-4 text-center">
            <p className="text-sm text-text-muted">Impossible de charger les membres.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-1 text-sm font-medium text-brand hover:underline"
            >
              Réessayer
            </button>
          </div>
        ) : members && members.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {members.map((member) => (
              <MemberRow
                key={member.user.id}
                member={member}
                canManage={canManage}
                onChangeRole={changeRole}
                onRemove={remove}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-text-muted">
            Aucun membre pour l&apos;instant.
          </p>
        )}
      </div>
    </Modal>
  );
}

function MemberRow({
  member,
  canManage,
  onChangeRole,
  onRemove,
}: {
  member: Member;
  canManage: boolean;
  onChangeRole: (userId: string, role: 'EDITOR' | 'VIEWER') => void;
  onRemove: (userId: string, name: string) => void;
}) {
  const name = member.user.fullName ?? member.user.username;
  const isOwnerRow = member.role === 'OWNER';

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Avatar user={member.user} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-text">{name}</p>
        <p className="truncate text-sm text-text-muted">@{member.user.username}</p>
      </div>
      {isOwnerRow ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-sm font-medium text-brand">
          <Crown className="size-3.5" aria-hidden />
          {ROLE_LABEL.OWNER}
        </span>
      ) : canManage ? (
        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor={`role-${member.user.id}`}>
            Rôle de {name}
          </label>
          <select
            id={`role-${member.user.id}`}
            value={member.role}
            onChange={(e) => onChangeRole(member.user.id, e.target.value as 'EDITOR' | 'VIEWER')}
            className="h-8 rounded-md border border-border bg-surface px-2 text-sm text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            <option value="EDITOR">Éditeur</option>
            <option value="VIEWER">Lecteur</option>
          </select>
          <IconButton
            label={`Retirer ${name}`}
            size="sm"
            variant="danger"
            onClick={() => onRemove(member.user.id, name)}
          >
            <Trash2 className="size-4" aria-hidden />
          </IconButton>
        </div>
      ) : (
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-sm font-medium text-text-muted">
          {ROLE_LABEL[member.role]}
        </span>
      )}
    </li>
  );
}
